import "server-only";

import { getIntegration, readIntegrationSecret } from "@/lib/repo";
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

/** Estados de Mercado Pago que cuentan como cobro efectivo. */
const MP_APPROVED = new Set(["approved", "authorized"]);
const MP_PENDING = new Set(["pending", "in_process", "in_mediation"]);

const mercadoPagoProvider: PaymentProvider = {
  id: "mercadopago",
  name: "Mercado Pago",

  async createCheckout(workspaceId, request) {
    const creds = credentials(workspaceId, "mercadopago");
    if (!creds) {
      return {
        status: "not_configured",
        reason:
          "Mercado Pago no está conectado. Cargá tu access token en Pagos para poder cobrar con este proveedor.",
      };
    }

    try {
      const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          authorization: `Bearer ${creds.secretKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
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
          auto_return: "approved",
          metadata: { order_id: request.orderId },
        }),
      });

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
    const creds = credentials(workspaceId, "mercadopago");
    if (!creds) return { ok: false, reason: "Mercado Pago no está conectado en este workspace." };

    try {
      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
        { headers: { authorization: `Bearer ${creds.secretKey}` } },
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
    const config = parseJson<{ public_key?: string; mode?: string }>(
      integration?.public_config ?? null,
      {},
    );
    return {
      id,
      name: PROVIDERS[id].name,
      connected: integration?.status === "connected",
      mode: (config.mode as "test" | "live") ?? null,
      publicKey: config.public_key ?? null,
      lastError: integration?.last_error ?? null,
      webhookVerified: Boolean(webhookSecret(workspaceId, id)),
    };
  });
}

/** Primer proveedor conectado del workspace, o `null` si no hay ninguno. */
export function activeProvider(workspaceId: string): ProviderId | null {
  for (const id of Object.keys(PROVIDERS) as ProviderId[]) {
    const integration = getIntegration(workspaceId, id);
    if (integration?.status === "connected") return id;
  }
  return null;
}
