import { NextResponse, type NextRequest } from "next/server";

import { applyStripeStatus } from "@/lib/billing/apply";
import { getSubscription, stripeBillingConfig } from "@/lib/billing/stripe";
import { verifyStripe } from "@/lib/integrations/webhook-verify";
import * as repo from "@/lib/repo";

/**
 * Webhook del abono de TiendaFlow, con Stripe.
 *
 * Ojo con no confundirlo con `/api/webhooks/stripe/[workspaceId]`, que es el de
 * las ventas **del vendedor**. Este es el de la suscripción que le cobramos
 * nosotros a él, y por eso no lleva el workspace en la URL: la cuenta que cobra
 * es una sola —la de TiendaFlow— y hay un solo endpoint para todas las
 * suscripciones.
 *
 * Es este endpoint, y no el botón, el que activa un plan pago. El evento trae
 * el workspace en `client_reference_id` (checkout) o en `metadata` (la
 * suscripción), y el estado se vuelve a consultar contra la API de Stripe
 * antes de tocar nada.
 *
 * Códigos de respuesta:
 *  - 200 → procesado, o no había nada que hacer. Stripe deja de reintentar.
 *  - 401 → la firma no valida.
 *  - 503 → no pudimos consultar la API. Stripe reintenta más tarde.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Eventos que cambian el estado de una suscripción. El resto se ignora. */
const EVENTOS = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
  "invoice.payment_succeeded",
]);

interface StripeEvent {
  type?: string;
  data?: { object?: Record<string, unknown> };
}

export async function POST(request: NextRequest) {
  const config = stripeBillingConfig();
  if (!config) {
    return NextResponse.json({ ignored: "El cobro con tarjeta no está configurado." });
  }

  const rawBody = await request.text();

  const firma = verifyStripe({
    secret: config.webhookSecret,
    signatureHeader: request.headers.get("stripe-signature"),
    rawBody,
  });
  if (firma.ok === false) {
    return NextResponse.json({ error: firma.reason }, { status: 401 });
  }

  let evento: StripeEvent = {};
  try {
    evento = rawBody ? (JSON.parse(rawBody) as StripeEvent) : {};
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const tipo = evento.type ?? "";
  if (!EVENTOS.has(tipo)) {
    return NextResponse.json({ ignored: `Evento no manejado: ${tipo || "sin tipo"}` });
  }

  const objeto = evento.data?.object ?? {};

  /*
   * De dónde sale el id de la suscripción según el evento:
   *
   *  · `checkout.session.*`  → el objeto es la sesión, y trae `subscription`.
   *  · `customer.subscription.*` → el objeto YA es la suscripción.
   *  · `invoice.*`           → la factura trae `subscription`.
   */
  const subscriptionId =
    typeof objeto.subscription === "string"
      ? objeto.subscription
      : typeof objeto.id === "string" && tipo.startsWith("customer.subscription.")
        ? objeto.id
        : null;

  if (!subscriptionId) {
    return NextResponse.json({ ignored: "El evento no apunta a ninguna suscripción." });
  }

  /*
   * El workspace, por orden de confianza:
   *
   *  1. `client_reference_id` de la sesión de checkout, que es lo que mandamos
   *     nosotros al crearla.
   *  2. La metadata de la suscripción, para los eventos posteriores.
   *  3. Lo que tengamos guardado con ese id de suscripción.
   *
   * Si ninguna de las tres da, no se toca nada: un evento que no sabemos a
   * quién corresponde no puede cambiarle el plan a nadie.
   */
  const metadata = (objeto.metadata ?? {}) as Record<string, unknown>;
  let workspaceId =
    (typeof objeto.client_reference_id === "string" ? objeto.client_reference_id : null) ??
    (typeof metadata.workspace_id === "string" ? metadata.workspace_id : null);

  if (!workspaceId) {
    workspaceId = repo.getSubscriptionByProviderId(subscriptionId)?.workspace_id ?? null;
  }

  let remota;
  try {
    remota = await getSubscription(subscriptionId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No pudimos consultar Stripe." },
      { status: 503 },
    );
  }

  if (!remota) {
    return NextResponse.json({ ignored: "Stripe no devolvió la suscripción." });
  }

  // Último recurso: la metadata que Stripe guardó en la suscripción misma.
  workspaceId ??= remota.workspaceId;

  if (!workspaceId) {
    return NextResponse.json({ ignored: "No pudimos resolver el workspace del evento." });
  }

  const plan = applyStripeStatus(workspaceId, remota);
  return NextResponse.json({ ok: true, status: remota.status, plan });
}
