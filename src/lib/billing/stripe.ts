import "server-only";

import { headers } from "next/headers";

import { PLANS, type PlanId } from "@/lib/plans";

/**
 * El cobro del abono de TiendaFlow, con Stripe.
 *
 * Es el camino principal, y la razón es la moneda. El precio de TiendaFlow
 * está en dólares para que signifique lo mismo en todos lados; Stripe cobra
 * dólares de forma nativa desde cualquier tarjeta del mundo, así que el número
 * que ve la persona en la página de precios es exactamente el que se le
 * debita. Mercado Pago —que vive al lado, en `mercadopago.ts`— solo puede
 * debitar en la moneda del país de la cuenta que cobra, y por eso necesita una
 * cotización y un importe que se congela. Sirve para quien no tiene tarjeta
 * internacional, que en Argentina es mucha gente, pero no puede ser el camino
 * por defecto de un precio en dólares.
 *
 ## Dos formas de decirle a Stripe cuánto cobrar
 *
 * **Por defecto, `price_data` inline.** El precio sale de `plans.ts` y no hace
 * falta crear nada en el panel de Stripe: se levanta el proyecto, se pega la
 * secret key y funciona. `plans.ts` es la única fuente de verdad.
 *
 * **Con un Price ID, si se configura uno.** Es la forma que recomienda la
 * documentación de Stripe, y sirve para manejar precios, cupones y pruebas
 * desde el panel sin tocar código. Se prende poniendo
 * `TIENDAFLOW_BILLING_STRIPE_PRICE_<PLAN>` en el entorno.
 *
 * Esa segunda forma tiene un peligro que no es teórico: el precio pasa a vivir
 * en dos lados —el número que muestra la página de precios y el Price de
 * Stripe que efectivamente se cobra— y nada impide que digan cosas distintas.
 * Publicar US$9 y debitar US$20 no es un bug menor. Por eso, cuando hay Price
 * ID configurado, antes de mandar a nadie al checkout se le pregunta a Stripe
 * cuánto vale ese Price y se corta si no coincide con `plans.ts`.
 *
 * Sin configuración no se rompe nada: `stripeBillingStatus()` avisa qué falta
 * y la app sigue dejando cambiar de plan a mano.
 */

const API = "https://api.stripe.com/v1";

export interface StripeBillingConfig {
  secretKey: string;
  webhookSecret: string | null;
  /** Días de prueba antes del primer cobro. 0 = se cobra al toque. */
  trialDays: number;
}

export interface StripeBillingStatus {
  configured: boolean;
  trialDays: number;
  reason?: string;
}

function env(name: string): string | null {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : null;
}

export function stripeBillingConfig(): StripeBillingConfig | null {
  const secretKey = env("TIENDAFLOW_BILLING_STRIPE_SECRET_KEY");
  if (!secretKey) return null;

  const trial = Number(env("TIENDAFLOW_BILLING_TRIAL_DAYS") ?? "0");
  return {
    secretKey,
    webhookSecret: env("TIENDAFLOW_BILLING_STRIPE_WEBHOOK_SECRET"),
    trialDays: Number.isFinite(trial) && trial > 0 ? Math.floor(trial) : 0,
  };
}

export function stripeBillingStatus(): StripeBillingStatus {
  const config = stripeBillingConfig();
  if (config) return { configured: true, trialDays: config.trialDays };

  return {
    configured: false,
    trialDays: 0,
    reason:
      "Falta configurar el cobro con tarjeta. En el archivo .env.local de la raíz del proyecto va " +
      "TIENDAFLOW_BILLING_STRIPE_SECRET_KEY (la secret key de la cuenta de Stripe de TiendaFlow, no " +
      "la del vendedor). Se lee al arrancar el servidor.",
  };
}

/* -------------------------------------------------------------------------- */
/* Llamadas a la API                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Stripe habla `application/x-www-form-urlencoded` con corchetes para lo
 * anidado (`line_items[0][price_data][currency]`). Este helper aplana un
 * objeto a esa forma para no tener que escribir las claves a mano.
 */
function toForm(value: unknown, prefix = "", out = new URLSearchParams()): URLSearchParams {
  if (value === undefined || value === null) return out;

  if (Array.isArray(value)) {
    value.forEach((item, index) => toForm(item, `${prefix}[${index}]`, out));
    return out;
  }
  if (typeof value === "object") {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      toForm(item, prefix ? `${prefix}[${key}]` : key, out);
    }
    return out;
  }
  out.append(prefix, String(value));
  return out;
}

async function stripeFetch(path: string, config: StripeBillingConfig, body?: unknown) {
  const response = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${config.secretKey}`,
      ...(body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
    body: body ? toForm(body).toString() : undefined,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: { message?: string } }
    | Record<string, unknown>
    | null;

  if (!response.ok) {
    const detalle = (payload as { error?: { message?: string } })?.error?.message;
    throw new Error(`Stripe respondió ${response.status}${detalle ? `: ${detalle}` : "."}`);
  }
  return payload as Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* Suscripciones                                                               */
/* -------------------------------------------------------------------------- */

export interface StripeCheckout {
  url: string;
  amountUsd: number;
  trialDays: number;
}

/**
 * Crea la sesión de Checkout y devuelve el link.
 *
 * `client_reference_id` lleva el workspace: es lo que permite saber a quién
 * activarle el plan cuando llegue el webhook. El plan pedido va en `metadata`
 * porque el evento de Stripe no trae los precios desarmados y no queremos
 * deducir el plan a partir del importe —dos planes podrían costar lo mismo
 * después de un cambio de precios y el que quedara segundo nunca se activaría—.
 */
export async function createCheckoutSession(input: {
  workspaceId: string;
  planId: PlanId;
  customerEmail: string;
}): Promise<StripeCheckout> {
  const config = stripeBillingConfig();
  if (!config) throw new Error(stripeBillingStatus().reason);

  const plan = PLANS[input.planId];
  if (plan.priceUsd <= 0) throw new Error("El plan Free no se cobra.");

  const base = await origin();
  const priceId = env(`TIENDAFLOW_BILLING_STRIPE_PRICE_${input.planId.toUpperCase()}`);
  const lineItem = priceId
    ? { quantity: 1, price: await verificarPrice(priceId, plan.priceUsd, config) }
    : {
        quantity: 1,
        price_data: {
          currency: "usd",
          // Stripe trabaja en centavos.
          unit_amount: Math.round(plan.priceUsd * 100),
          recurring: { interval: "month" },
          product_data: { name: `TiendaFlow ${plan.name}` },
        },
      };

  const payload = await stripeFetch("/checkout/sessions", config, {
    mode: "subscription",
    client_reference_id: input.workspaceId,
    customer_email: input.customerEmail,
    // `?abono=listo` es solo para saludar; el plan lo activa el webhook.
    success_url: `${base}/app/configuracion?abono=listo`,
    cancel_url: `${base}/app/configuracion?abono=cancelado`,
    allow_promotion_codes: true,
    line_items: [lineItem],
    subscription_data: {
      metadata: { workspace_id: input.workspaceId, plan: input.planId },
      ...(config.trialDays > 0 ? { trial_period_days: config.trialDays } : {}),
    },
    metadata: { workspace_id: input.workspaceId, plan: input.planId },
  });

  const url = payload.url;
  if (typeof url !== "string") throw new Error("Stripe no devolvió el link de pago.");

  return { url, amountUsd: plan.priceUsd, trialDays: config.trialDays };
}

/**
 * Confirma que el Price de Stripe cobra lo que la página de precios promete.
 *
 * Devuelve el mismo id si está todo bien y explota con un mensaje concreto si
 * no. Es preferible que el botón no funcione y diga exactamente qué número no
 * coincide, a que funcione y le debite a alguien un importe distinto del que
 * aceptó: lo primero se arregla en dos minutos, lo segundo es un reclamo y una
 * devolución.
 */
async function verificarPrice(
  priceId: string,
  esperadoUsd: number,
  config: StripeBillingConfig,
): Promise<string> {
  const price = await stripeFetch(`/prices/${encodeURIComponent(priceId)}`, config);

  const centavos = typeof price.unit_amount === "number" ? price.unit_amount : null;
  const moneda = typeof price.currency === "string" ? price.currency : null;
  const recurrencia = (price.recurring ?? null) as { interval?: string } | null;

  if (centavos === null || moneda === null) {
    throw new Error(`El precio ${priceId} de Stripe no tiene importe o moneda.`);
  }
  if (moneda !== "usd") {
    throw new Error(`El precio ${priceId} de Stripe está en ${moneda.toUpperCase()} y los planes están en dólares.`);
  }
  if (recurrencia?.interval !== "month") {
    throw new Error(`El precio ${priceId} de Stripe no es mensual.`);
  }
  if (centavos !== Math.round(esperadoUsd * 100)) {
    throw new Error(
      `El precio ${priceId} de Stripe cobra US$${(centavos / 100).toFixed(2)} pero el plan dice ` +
        `US$${esperadoUsd}. No mandamos a nadie a pagar un importe distinto del que le mostramos: ` +
        "corregí el precio en Stripe o en plans.ts.",
    );
  }
  return priceId;
}

/**
 * El portal de cliente de Stripe.
 *
 * Cambiar la tarjeta, ver las facturas y cancelar se hacen ahí y no acá. No es
 * pereza: cada una de esas pantallas maneja datos de tarjeta y estados de
 * cobro que Stripe ya resuelve bien, y hacerlas de nuevo significa manipular
 * información sensible sin ninguna ventaja para el usuario.
 */
export async function createPortalSession(customerId: string): Promise<string> {
  const config = stripeBillingConfig();
  if (!config) throw new Error(stripeBillingStatus().reason);

  const payload = await stripeFetch("/billing_portal/sessions", config, {
    customer: customerId,
    return_url: `${await origin()}/app/configuracion`,
  });

  const url = payload.url;
  if (typeof url !== "string") throw new Error("Stripe no devolvió el link del portal.");
  return url;
}

export interface StripeSubscriptionView {
  id: string;
  status: string;
  customerId: string | null;
  planId: string | null;
  /** Viaja en la metadata que mandamos al crear la suscripción. */
  workspaceId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export async function getSubscription(
  subscriptionId: string,
): Promise<StripeSubscriptionView | null> {
  const config = stripeBillingConfig();
  if (!config) return null;

  const payload = await stripeFetch(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    config,
  );
  return readSubscription(payload);
}

/** Traduce la forma que devuelve Stripe a la nuestra. */
export function readSubscription(payload: Record<string, unknown>): StripeSubscriptionView | null {
  const id = payload.id;
  const status = payload.status;
  if (typeof id !== "string" || typeof status !== "string") return null;

  const customer = payload.customer;
  const metadata = (payload.metadata ?? {}) as Record<string, unknown>;
  const periodEnd = payload.current_period_end;

  return {
    id,
    status,
    customerId: typeof customer === "string" ? customer : null,
    planId: typeof metadata.plan === "string" ? metadata.plan : null,
    workspaceId: typeof metadata.workspace_id === "string" ? metadata.workspace_id : null,
    currentPeriodEnd:
      typeof periodEnd === "number" ? new Date(periodEnd * 1000).toISOString() : null,
    cancelAtPeriodEnd: payload.cancel_at_period_end === true,
  };
}

/** El origen público, respetando el proxy que haya adelante. */
async function origin(): Promise<string> {
  if (process.env.TIENDAFLOW_SITE_URL) return process.env.TIENDAFLOW_SITE_URL.replace(/\/$/, "");
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const host = headerList.get("host") ?? "localhost:6600";
  return `${proto}://${host}`;
}
