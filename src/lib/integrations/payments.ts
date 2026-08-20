import "server-only";

import { getIntegration } from "@/lib/repo";
import { parseJson } from "@/lib/utils";

/**
 * Abstracción de proveedores de pago.
 *
 * TiendaFlow no procesa pagos por sí misma. Cada proveedor implementa
 * `PaymentProvider`; mientras no haya credenciales válidas, `createCheckout`
 * devuelve un resultado explícito de "no configurado" y el checkout público
 * lo muestra tal cual. En ningún caso se marca una orden como pagada sin que
 * el proveedor lo confirme.
 */

export type ProviderId = "stripe" | "mercadopago";

export interface ProviderStatus {
  id: ProviderId;
  name: string;
  connected: boolean;
  mode: "test" | "live" | null;
  publicKey: string | null;
  lastError: string | null;
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
}

export type CheckoutResult =
  | { status: "redirect"; url: string }
  | { status: "not_configured"; reason: string }
  | { status: "error"; reason: string };

export interface PaymentProvider {
  id: ProviderId;
  name: string;
  createCheckout(workspaceId: string, request: CheckoutRequest): Promise<CheckoutResult>;
}

function credentials(workspaceId: string, provider: ProviderId) {
  const integration = getIntegration(workspaceId, provider);
  if (!integration || integration.status !== "connected") return null;
  const secret = parseJson<{ secret_key?: string }>(integration.secret_config, {});
  const config = parseJson<{ public_key?: string; mode?: string }>(integration.public_config, {});
  if (!secret.secret_key) return null;
  return { secretKey: secret.secret_key, publicKey: config.public_key, mode: config.mode ?? "test" };
}

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
};

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
          back_urls: { success: request.successUrl, pending: request.successUrl, failure: request.cancelUrl },
          auto_return: "approved",
          metadata: { order_id: request.orderId },
        }),
      });

      const payload = (await response.json()) as {
        init_point?: string;
        sandbox_init_point?: string;
        message?: string;
      };
      const url = creds.mode === "live" ? payload.init_point : payload.sandbox_init_point ?? payload.init_point;

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
};

const PROVIDERS: Record<ProviderId, PaymentProvider> = {
  stripe: stripeProvider,
  mercadopago: mercadoPagoProvider,
};

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
