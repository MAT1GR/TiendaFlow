import "server-only";

import { freshAccessToken, publicConfig } from "@/lib/integrations/mercadopago-oauth";
import { commissionFor } from "@/lib/plans";
import { getIntegration, getSubscription, readIntegrationSecret } from "@/lib/repo";
import { parseJson } from "@/lib/utils";

/**
 * Abstracción de proveedores de pago.
 *
 * TiendaFlow no procesa pagos por sí misma. Cada proveedor implementa
 * `PaymentProvider`; mientras no haya credenciales válidas, `createCheckout`
 * devuelve un resultado explícito de "no configurado" y el checkout público
 * lo muestra tal cual.
 *
 * Regla que gobierna todo este módulo: **una orden se marca como pagada solo
 * después de preguntárselo al proveedor con sus propias credenciales**. El
 * webhook es apenas un aviso de que algo pasó; nunca es la fuente de verdad.
 * Por eso `fetchPayment` existe y por eso nadie acredita una venta leyendo el
 * cuerpo de un webhook.
 */

export type ProviderId = "stripe" | "mercadopago";

export interface ProviderStatus {
  id: ProviderId;
  name: string;
  connected: boolean;
  mode: "test" | "live" | null;
  publicKey: string | null;
  lastError: string | null;
  /** `true` si además cargaron la clave para verificar la firma del webhook. */
  webhookVerified: boolean;
  /** Cómo se conectó: apretando un botón (`oauth`) o pegando claves. */
  connection: "oauth" | "manual" | null;
  /** Con qué cuenta quedó conectado, cuando el proveedor nos lo dice. */
  accountName: string | null;
  /** Cuándo vence la conexión, si vence. */
  expiresAt: number | null;
}

export interface CheckoutRequest {
  orderId: string;
  reference: string;
  amount: number;
  currency: string;
  description: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  /** URL a la que el proveedor tiene que avisar cuando cambia el pago. */
  notifyUrl: string;
}

export type CheckoutResult =
  | { status: "redirect"; url: string }
  | { status: "not_configured"; reason: string }
  | { status: "error"; reason: string };

/** Estado real de un pago, consultado contra la API del proveedor. */
export interface RemotePayment {
  status: "approved" | "pending" | "rejected" | "unknown";
  /** `external_reference` en Mercado Pago, `client_reference_id` en Stripe. */
  reference: string | null;
  orderId: string | null;
  amount: number | null;
  currency: string | null;
  raw: unknown;
}

export type FetchPaymentResult =
  | { ok: true; payment: RemotePayment }
  | { ok: false; reason: string };

export interface PaymentProvider {
  id: ProviderId;
  name: string;
  createCheckout(workspaceId: string, request: CheckoutRequest): Promise<CheckoutResult>;
  /** Consulta autoritativa del estado de un pago. */
  fetchPayment(workspaceId: string, providerPaymentId: string): Promise<FetchPaymentResult>;
}

interface ProviderCredentials {
  secretKey: string;
  publicKey?: string;
  mode: string;
  webhookSecret?: string;
}

interface ProviderSecret extends Record<string, unknown> {
  secret_key?: string;
  webhook_secret?: string;
}

function credentials(workspaceId: string, provider: ProviderId): ProviderCredentials | null {
  const integration = getIntegration(workspaceId, provider);
  if (!integration || integration.status !== "connected") return null;

  const secret = readIntegrationSecret<ProviderSecret>(workspaceId, provider);
  if (!secret.secret_key) return null;

  const config = parseJson<{ public_key?: string; mode?: string }>(integration.public_config, {});
  return {
    secretKey: secret.secret_key,
    publicKey: config.public_key,
    mode: config.mode ?? "test",
    webhookSecret: secret.webhook_secret,
  };
}

/** Clave para verificar la firma de un webhook, si el vendedor la cargó. */
export function webhookSecret(workspaceId: string, provider: ProviderId): string | null {
  return credentials(workspaceId, provider)?.webhookSecret ?? null;
}

/* -------------------------------------------------------------------------- */
/* Stripe                                                                      */
/* -------------------------------------------------------------------------- */

const stripeProvider: PaymentProvider = {
  id: "stripe",
  name: "Stripe",

  async createCheckout(workspaceId, request) {
    const creds = credentials(workspaceId, "stripe");
    if (!creds) {
      return {
        status: "not_configured",
        reason:
          "Stripe no está conectado. Cargá tus claves en Pagos para poder cobrar con este proveedor.",
      };
    }

    try {
      const body = new URLSearchParams({
        mode: "payment",
        success_url: request.successUrl,
        cancel_url: request.cancelUrl,
        client_reference_id: request.reference,
        customer_email: request.customerEmail,
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": request.currency.toLowerCase(),
        "line_items[0][price_data][unit_amount]": String(Math.round(request.amount * 100)),
        "line_items[0][price_data][product_data][name]": request.description,
        "metadata[order_id]": request.orderId,
      });

      const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${creds.secretKey}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body,
      });

      const payload = (await response.json()) as { url?: string; error?: { message?: string } };
      if (!response.ok || !payload.url) {
        return {
          status: "error",
          reason: payload.error?.message ?? `Stripe respondió ${response.status}.`,
        };
      }
      return { status: "redirect", url: payload.url };
    } catch (error) {
      return {
        status: "error",
        reason: error instanceof Error ? error.message : "No pudimos contactar a Stripe.",
      };
    }
  },

  async fetchPayment(workspaceId, sessionId) {
    const creds = credentials(workspaceId, "stripe");
    if (!creds) return { ok: false, reason: "Stripe no está conectado en este workspace." };

    try {
      const response = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
        { headers: { authorization: `Bearer ${creds.secretKey}` } },
      );

      const payload = (await response.json()) as {
        payment_status?: string;
        client_reference_id?: string;
        metadata?: { order_id?: string };
        amount_total?: number;
        currency?: string;
        error?: { message?: string };
      };

      if (!response.ok) {
        return { ok: false, reason: payload.error?.message ?? `Stripe respondió ${response.status}.` };
      }

      const paid = payload.payment_status === "paid" || payload.payment_status === "no_payment_required";

      return {
        ok: true,
        payment: {
          status: paid ? "approved" : payload.payment_status === "unpaid" ? "pending" : "unknown",
          reference: payload.client_reference_id ?? null,
          orderId: payload.metadata?.order_id ?? null,
          amount: typeof payload.amount_total === "number" ? payload.amount_total / 100 : null,
          currency: payload.currency?.toUpperCase() ?? null,
          raw: payload,
        },
      };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : "No pudimos contactar a Stripe.",
      };
    }
  },
};

/* -------------------------------------------------------------------------- */
/* Mercado Pago                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Credenciales de Mercado Pago, con el token ya renovado si hacía falta.
 *
 * Es asíncrono a propósito y no puede reemplazarse por `credentials()`: los
 * tokens de OAuth vencen, y renovar es un pedido de red. Preferimos que la
 * demora la pague la creación del checkout —donde ya estamos esperando a
 * Mercado Pago— antes que devolverle un error a alguien que quiere comprar.
 */
async function mercadoPagoCredentials(workspaceId: string): Promise<{
  accessToken: string;
  mode: string;
  connection: "oauth" | "manual";
} | null> {
  const integration = getIntegration(workspaceId, "mercadopago");
  if (!integration || integration.status !== "connected") return null;

  const accessToken = await freshAccessToken(workspaceId);
  if (!accessToken) return null;

  const config = publicConfig(workspaceId);
  return {
    accessToken,
    mode: config.mode ?? "test",
    connection: config.connection === "oauth" ? "oauth" : "manual",
  };
}

/**
 * La comisión de TiendaFlow sobre una venta.
 *
 * Solo se puede cobrar cuando el vendedor conectó su cuenta por OAuth: ahí el
 * token lo emitió nuestra aplicación y Mercado Pago sabe a quién depositarle la
 * parte que nos toca. Con un token cargado a mano, la cuenta del vendedor no
 * tiene nada que ver con nosotros y `marketplace_fee` no aplica.
 *
 * Devuelve `0` cuando no corresponde cobrar nada.
 */
function marketplaceFee(
  workspaceId: string,
  connection: "oauth" | "manual",
  amount: number,
): number {
  if (connection !== "oauth") return 0;

  const plan = getSubscription(workspaceId)?.plan ?? "free";
  const { amount: fee } = commissionFor(plan, amount);

  // Una comisión que se come toda la venta sería un error de configuración, no
  // un cobro: en ese caso preferimos no cobrar nada antes que romper la compra.
  if (!Number.isFinite(fee) || fee <= 0 || fee >= amount) return 0;
  return fee;
}

/** Estados de Mercado Pago que cuentan como cobro efectivo. */
const MP_APPROVED = new Set(["approved", "authorized"]);
const MP_PENDING = new Set(["pending", "in_process", "in_mediation"]);

const mercadoPagoProvider: PaymentProvider = {
  id: "mercadopago",
  name: "Mercado Pago",

  async createCheckout(workspaceId, request) {
    const creds = await mercadoPagoCredentials(workspaceId);
    if (!creds) {
      return {
        status: "not_configured",
        reason:
          "Mercado Pago no está conectado. Conectá tu cuenta desde Pagos para poder cobrar.",
      };
    }

    const fee = marketplaceFee(workspaceId, creds.connection, request.amount);

    /**
     * `auto_return` devuelve al comprador a tu página apenas paga, sin que
     * tenga que apretar "volver al sitio".
     *
     * Pero Mercado Pago solo lo acepta si la URL de vuelta es pública: con
     * `localhost` rechaza la preferencia ENTERA con un mensaje que confunde
     * ("back_url.success must be defined", aunque esté definida) y nadie puede
     * comprar. En desarrollo preferimos perder la vuelta automática antes que
     * el checkout.
     */
    const vueltaEsPublica =
      /^https:\/\//i.test(request.successUrl) &&
      !/\/\/([^/]*\.)?(localhost|127\.0\.0\.1)/i.test(request.successUrl);

    const preference = (withFee: boolean) => ({
      items: [
        {
          title: request.description,
          quantity: 1,
          unit_price: request.amount,
          currency_id: request.currency,
        },
      ],
      payer: { email: request.customerEmail },
      external_reference: request.reference,
      // Mercado Pago acepta la URL de aviso por preferencia, así que el
      // vendedor no tiene que configurar nada en su panel.
      notification_url: request.notifyUrl,
      back_urls: {
        success: request.successUrl,
        pending: request.successUrl,
        failure: request.cancelUrl,
      },
      ...(vueltaEsPublica ? { auto_return: "approved" } : {}),
      metadata: { order_id: request.orderId },
      ...(withFee && fee > 0 ? { marketplace_fee: fee } : {}),
    });

    const create = (withFee: boolean) =>
      fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          authorization: `Bearer ${creds.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(preference(withFee)),
      });

    try {
      let response = await create(fee > 0);

      /**
       * Si Mercado Pago rechaza la preferencia y le habíamos puesto comisión,
       * reintentamos sin ella.
       *
       * El motivo más probable es que la aplicación de la plataforma no esté
       * habilitada como marketplace. Eso es un problema nuestro, y hacer que un
       * comprador se quede sin poder pagar por una configuración nuestra sería
       * el peor error posible: una comisión perdida cuesta centavos, una venta
       * perdida cuesta la venta entera y la confianza del vendedor.
       */
      if (!response.ok && fee > 0) {
        console.error(
          `[tiendaflow] Mercado Pago rechazó la preferencia con comisión (${response.status}). Reintentando sin comisión.`,
        );
        response = await create(false);
      }

      const payload = (await response.json()) as {
        init_point?: string;
        sandbox_init_point?: string;
        message?: string;
      };
      const url =
        creds.mode === "live" ? payload.init_point : (payload.sandbox_init_point ?? payload.init_point);

      if (!response.ok || !url) {
        return {
          status: "error",
          reason: payload.message ?? `Mercado Pago respondió ${response.status}.`,
        };
      }
      return { status: "redirect", url };
    } catch (error) {
      return {
        status: "error",
        reason: error instanceof Error ? error.message : "No pudimos contactar a Mercado Pago.",
      };
    }
  },

  async fetchPayment(workspaceId, paymentId) {
    const creds = await mercadoPagoCredentials(workspaceId);
    if (!creds) return { ok: false, reason: "Mercado Pago no está conectado en este workspace." };

    try {
      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
        { headers: { authorization: `Bearer ${creds.accessToken}` } },
      );

      const payload = (await response.json()) as {
        status?: string;
        external_reference?: string;
        metadata?: { order_id?: string };
        transaction_amount?: number;
        currency_id?: string;
        message?: string;
      };

      if (!response.ok) {
        return {
          ok: false,
          reason: payload.message ?? `Mercado Pago respondió ${response.status}.`,
        };
      }

      const raw = payload.status ?? "";

      return {
        ok: true,
        payment: {
          status: MP_APPROVED.has(raw)
            ? "approved"
            : MP_PENDING.has(raw)
              ? "pending"
              : raw
                ? "rejected"
                : "unknown",
          reference: payload.external_reference ?? null,
          // Mercado Pago devuelve las claves de metadata en snake_case.
          orderId: payload.metadata?.order_id ?? null,
          amount: payload.transaction_amount ?? null,
          currency: payload.currency_id ?? null,
          raw: payload,
        },
      };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : "No pudimos contactar a Mercado Pago.",
      };
    }
  },
};

/* -------------------------------------------------------------------------- */

const PROVIDERS: Record<ProviderId, PaymentProvider> = {
  stripe: stripeProvider,
  mercadopago: mercadoPagoProvider,
};

export function isProviderId(value: string): value is ProviderId {
  return value === "stripe" || value === "mercadopago";
}

export function getProvider(id: ProviderId): PaymentProvider {
  return PROVIDERS[id];
}

export function listProviderStatus(workspaceId: string): ProviderStatus[] {
  return (Object.keys(PROVIDERS) as ProviderId[]).map((id) => {
    const integration = getIntegration(workspaceId, id);
    const config = parseJson<{
      public_key?: string;
      mode?: string;
      connection?: "oauth" | "manual";
      nickname?: string;
      expires_at?: number;
    }>(integration?.public_config ?? null, {});

    return {
      id,
      name: PROVIDERS[id].name,
      connected: integration?.status === "connected",
      mode: (config.mode as "test" | "live") ?? null,
      publicKey: config.public_key ?? null,
      lastError: integration?.last_error ?? null,
      webhookVerified: Boolean(webhookSecret(workspaceId, id)),
      connection: config.connection ?? (integration?.status === "connected" ? "manual" : null),
      accountName: config.nickname ?? null,
      expiresAt: config.expires_at ?? null,
    };
  });
}

/**
 * `true` si en este workspace la comisión de TiendaFlow se cobra de verdad.
 *
 * Hoy solo pasa con Mercado Pago conectado por OAuth, que es donde podemos
 * mandar `marketplace_fee`. Con claves cargadas a mano, o con Stripe —que
 * todavía no manda `application_fee`—, el 100% de la venta va al vendedor.
 */
export function collectsCommission(workspaceId: string, provider: string): boolean {
  if (provider !== "mercadopago") return false;
  const integration = getIntegration(workspaceId, "mercadopago");
  if (integration?.status !== "connected") return false;
  return publicConfig(workspaceId).connection === "oauth";
}

/** Primer proveedor conectado del workspace, o `null` si no hay ninguno. */
export function activeProvider(workspaceId: string): ProviderId | null {
  for (const id of Object.keys(PROVIDERS) as ProviderId[]) {
    const integration = getIntegration(workspaceId, id);
    if (integration?.status === "connected") return id;
  }
  return null;
}
