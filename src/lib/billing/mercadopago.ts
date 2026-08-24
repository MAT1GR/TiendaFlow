import "server-only";

import { headers } from "next/headers";

import { PLANS, type Plan, type PlanId } from "@/lib/plans";

/**
 * El cobro del abono de TiendaFlow, con Mercado Pago.
 *
 * Ojo con no confundir esto con `integrations/mercadopago-oauth.ts`. Aquello es
 * la cuenta **del vendedor**, para que cobre sus ventas: ahí TiendaFlow nunca
 * toca la plata. Esto es al revés — es la cuenta **de TiendaFlow** cobrándole
 * el abono a sus propios usuarios. Son dos credenciales distintas y no se
 * pueden mezclar: usar el token del vendedor para cobrar el abono le sacaría
 * plata a su cuenta para pagarnos a nosotros.
 *
 * ## Suscripciones, no pagos sueltos
 *
 * Se usa `preapproval`, que es la suscripción de Mercado Pago: el usuario
 * autoriza una vez y Mercado Pago debita todos los meses solo. Un pago suelto
 * por mes obligaría a perseguir a cada uno con un mail y a apagarle el plan
 * cuando se olvida.
 *
 * ## El precio está en dólares y Mercado Pago cobra en moneda local
 *
 * Mercado Pago solo puede debitar en la moneda del país de la cuenta que
 * cobra. El plan vale US$9; lo que se debita es su equivalente, convertido con
 * la cotización configurada. Dos consecuencias que hay que tener presentes:
 *
 *  · El importe local se congela en el momento en que la persona se suscribe.
 *    Mercado Pago no reconvierte solo: el `transaction_amount` queda fijo hasta
 *    que alguien lo actualice con un PUT. Por eso se guarda la cotización usada
 *    en `external_reference` — sin eso no hay forma de saber después con qué
 *    número se armó una suscripción vieja.
 *  · La cotización es una variable de entorno y no una llamada a una API de
 *    cambio. Es a propósito: el precio que se le cobra a alguien no puede
 *    depender de que un servicio de terceros esté arriba en ese instante, ni
 *    moverse solo entre que mira la página y aprieta el botón.
 *
 * Sin configuración no se rompe nada: `billingStatus()` avisa qué falta y la
 * app sigue dejando cambiar de plan a mano, como venía haciendo.
 */

const API = "https://api.mercadopago.com";

export interface BillingConfig {
  accessToken: string;
  /** Moneda en la que Mercado Pago puede debitar. Es la del país de la cuenta. */
  currency: string;
  /** Cuántas unidades de esa moneda vale un dólar. */
  usdRate: number;
  webhookSecret: string | null;
}

export interface BillingStatus {
  configured: boolean;
  currency: string;
  usdRate: number | null;
  /** Qué falta, en criollo, para poder cobrar. */
  reason?: string;
}

function env(name: string): string | null {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : null;
}

export function billingConfig(): BillingConfig | null {
  const accessToken = env("TIENDAFLOW_BILLING_MP_ACCESS_TOKEN");
  const rate = Number(env("TIENDAFLOW_BILLING_USD_RATE") ?? "");
  if (!accessToken || !Number.isFinite(rate) || rate <= 0) return null;

  return {
    accessToken,
    currency: env("TIENDAFLOW_BILLING_CURRENCY") ?? "ARS",
    usdRate: rate,
    webhookSecret: env("TIENDAFLOW_BILLING_MP_WEBHOOK_SECRET"),
  };
}

export function billingStatus(): BillingStatus {
  const config = billingConfig();
  if (config) {
    return { configured: true, currency: config.currency, usdRate: config.usdRate };
  }

  /*
   * El mensaje dice qué falta y dónde ponerlo.
   *
   * "No se puede cobrar" manda a adivinar: son dos variables, viven en un
   * archivo y el server las lee al arrancar. Sin esas tres aclaraciones alguien
   * puede tener el token cargado y seguir sin poder cobrar porque le falta la
   * cotización, sin ninguna pista de cuál de las dos era.
   */
  return {
    configured: false,
    currency: env("TIENDAFLOW_BILLING_CURRENCY") ?? "ARS",
    usdRate: null,
    reason:
      "Falta configurar el cobro de abonos. En el archivo .env.local de la raíz del proyecto van " +
      "TIENDAFLOW_BILLING_MP_ACCESS_TOKEN (el token de la cuenta de Mercado Pago de TiendaFlow, no " +
      "la del vendedor) y TIENDAFLOW_BILLING_USD_RATE (cuántos pesos vale un dólar). Se leen al " +
      "arrancar el servidor.",
  };
}

/**
 * Lo que se va a debitar por un plan, en moneda local.
 *
 * Se redondea a dos decimales porque Mercado Pago rechaza importes con más
 * precisión que la de la moneda.
 */
export function localAmountFor(plan: Plan, config: BillingConfig): number {
  return Math.round(plan.priceUsd * config.usdRate * 100) / 100;
}

/* -------------------------------------------------------------------------- */
/* Suscripciones                                                               */
/* -------------------------------------------------------------------------- */

export interface PreapprovalResult {
  id: string;
  /** Adónde hay que mandar a la persona para que autorice el débito. */
  initPoint: string;
  amount: number;
  currency: string;
}

interface MpPreapproval {
  id?: string;
  init_point?: string;
  status?: string;
  external_reference?: string;
  next_payment_date?: string;
  auto_recurring?: { transaction_amount?: number; currency_id?: string };
}

async function mpFetch(path: string, config: BillingConfig, init?: RequestInit) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.accessToken}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detalle =
      (payload as { message?: string })?.message ?? text.slice(0, 200) ?? "sin detalle";
    throw new Error(`Mercado Pago respondió ${response.status}: ${detalle}`);
  }
  return payload;
}

/**
 * La referencia externa que viaja con la suscripción.
 *
 * Lleva el workspace, el plan y la cotización usada. El workspace es lo que
 * permite saber a quién acreditarle un pago cuando llega el webhook —el aviso
 * de Mercado Pago no trae nada nuestro—, y la cotización es lo que permite
 * entender, seis meses después, por qué a alguien se le está debitando ese
 * número y no otro.
 */
export function buildReference(workspaceId: string, planId: PlanId, rate: number) {
  return `tf:${workspaceId}:${planId}:${rate}`;
}

export function parseReference(
  reference: string | null | undefined,
): { workspaceId: string; planId: string; rate: number } | null {
  if (!reference?.startsWith("tf:")) return null;
  const [, workspaceId, planId, rate] = reference.split(":");
  if (!workspaceId || !planId) return null;
  return { workspaceId, planId, rate: Number(rate) || 0 };
}

/**
 * Crea la suscripción y devuelve el link donde la persona la autoriza.
 *
 * Nace en `pending`: recién pasa a `authorized` cuando la persona confirma en
 * Mercado Pago. El plan del workspace **no** se toca acá — se toca cuando
 * llega el webhook diciendo que quedó autorizada. Cambiarlo antes le daría el
 * plan pago a alguien que todavía no autorizó nada, y basta con abandonar la
 * pantalla de Mercado Pago para quedarse con él gratis.
 */
export async function createPreapproval(input: {
  workspaceId: string;
  planId: PlanId;
  payerEmail: string;
}): Promise<PreapprovalResult> {
  const config = billingConfig();
  if (!config) throw new Error(billingStatus().reason);

  const plan = PLANS[input.planId];
  if (plan.priceUsd <= 0) throw new Error("El plan Free no se cobra.");

  const amount = localAmountFor(plan, config);

  const payload = (await mpFetch("/preapproval", config, {
    method: "POST",
    body: JSON.stringify({
      reason: `TiendaFlow ${plan.name}`,
      external_reference: buildReference(input.workspaceId, input.planId, config.usdRate),
      payer_email: input.payerEmail,
      back_url: `${await origin()}/app/configuracion?abono=listo`,
      status: "pending",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: amount,
        currency_id: config.currency,
      },
    }),
  })) as MpPreapproval;

  if (!payload?.id || !payload?.init_point) {
    throw new Error("Mercado Pago no devolvió el link de autorización.");
  }

  return { id: payload.id, initPoint: payload.init_point, amount, currency: config.currency };
}

export async function getPreapproval(preapprovalId: string) {
  const config = billingConfig();
  if (!config) return null;
  return (await mpFetch(`/preapproval/${encodeURIComponent(preapprovalId)}`,
    config)) as MpPreapproval;
}

/**
 * Da de baja la suscripción en Mercado Pago.
 *
 * Es lo primero que se hace al cancelar, antes de tocar nada nuestro: si
 * bajáramos el plan primero y esto fallara, la persona quedaría en Free y
 * Mercado Pago le seguiría debitando todos los meses.
 */
export async function cancelPreapproval(preapprovalId: string) {
  const config = billingConfig();
  if (!config) throw new Error(billingStatus().reason);

  await mpFetch(`/preapproval/${encodeURIComponent(preapprovalId)}`, config, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  });
}

/**
 * El origen público, respetando el proxy que haya adelante.
 *
 * Mercado Pago necesita una URL absoluta para devolver a la persona después de
 * autorizar. Se arma igual que en el OAuth de vendedores: la variable de
 * entorno manda, y si no está se deduce de los headers.
 */
async function origin(): Promise<string> {
  if (process.env.TIENDAFLOW_SITE_URL) return process.env.TIENDAFLOW_SITE_URL.replace(/\/$/, "");
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const host = headerList.get("host") ?? "localhost:6600";
  return `${proto}://${host}`;
}
