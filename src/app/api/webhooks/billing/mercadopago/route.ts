import { NextResponse, type NextRequest } from "next/server";

import { applyPreapprovalStatus } from "@/lib/billing/apply";
import { billingConfig, getPreapproval } from "@/lib/billing/mercadopago";
import { verifyMercadoPago } from "@/lib/integrations/webhook-verify";
import * as repo from "@/lib/repo";

/**
 * Webhook del abono de TiendaFlow.
 *
 * Ojo con no confundirlo con `/api/webhooks/mercadopago/[workspaceId]`, que es
 * el de las ventas **del vendedor**. Este es el de la suscripción que le
 * cobramos nosotros a él, y por eso no lleva el workspace en la URL: la cuenta
 * que cobra es una sola —la de TiendaFlow— y hay un solo endpoint para todas
 * las suscripciones. A quién corresponde cada aviso lo resolvemos por el id de
 * la suscripción, que guardamos al crearla.
 *
 * El cuerpo del aviso NO decide nada. De ahí sale un id y nada más; el estado
 * se le pregunta a Mercado Pago con nuestro access token. Un webhook
 * falsificado no puede activarle Pro a nadie.
 *
 * Códigos de respuesta:
 *  - 200 → procesado, o no había nada que hacer. Mercado Pago deja de reintentar.
 *  - 401 → la firma no valida.
 *  - 503 → no pudimos consultar la API. Mercado Pago reintenta más tarde.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface MpAviso {
  type?: string;
  topic?: string;
  action?: string;
  data?: { id?: string | number };
}

/** Los avisos que hablan de una suscripción. El resto se ignora. */
const TEMAS = new Set([
  "subscription_preapproval",
  "preapproval",
  "subscription_authorized_payment",
]);

export async function POST(request: NextRequest) {
  const config = billingConfig();
  if (!config) {
    // Sin cobro configurado no hay nada que procesar. 200 para que Mercado
    // Pago no se quede reintentando contra un endpoint que nunca va a servir.
    return NextResponse.json({ ignored: "El cobro de abonos no está configurado." });
  }

  const rawBody = await request.text();

  let aviso: MpAviso = {};
  try {
    aviso = rawBody ? (JSON.parse(rawBody) as MpAviso) : {};
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const tema = aviso.type ?? aviso.topic ?? "";
  if (!TEMAS.has(tema)) {
    return NextResponse.json({ ignored: `Tema no manejado: ${tema || "sin tema"}` });
  }

  const dataId = aviso.data?.id != null ? String(aviso.data.id) : null;
  if (!dataId) return NextResponse.json({ ignored: "El aviso no trae id." });

  const firma = verifyMercadoPago({
    secret: config.webhookSecret,
    signatureHeader: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId,
  });
  if (firma.ok === false) {
    return NextResponse.json({ error: firma.reason }, { status: 401 });
  }

  /*
   * El aviso de un cobro mensual trae el id del pago, no el de la suscripción.
   * Los dos terminan en el mismo lugar —consultar la suscripción y aplicar su
   * estado—, así que lo único que cambia es de dónde se saca el id.
   */
  const preapprovalId =
    tema === "subscription_authorized_payment"
      ? ((await idDeSuscripcionDelPago(dataId)) ?? null)
      : dataId;

  if (!preapprovalId) {
    return NextResponse.json({ ignored: "No pudimos resolver la suscripción del aviso." });
  }

  const suscripcion = repo.getSubscriptionByProviderId(preapprovalId);
  if (!suscripcion) {
    // Puede ser una suscripción de otro entorno apuntando al mismo endpoint.
    // No es un error nuestro y no hay nada que reintentar.
    return NextResponse.json({ ignored: "Esa suscripción no es de este entorno." });
  }

  let remota;
  try {
    remota = await getPreapproval(preapprovalId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No pudimos consultar Mercado Pago." },
      { status: 503 },
    );
  }

  if (!remota?.status) {
    return NextResponse.json({ ignored: "Mercado Pago no devolvió el estado." });
  }

  const plan = applyPreapprovalStatus(
    suscripcion.workspace_id,
    remota.status,
    remota.external_reference,
    remota.next_payment_date,
  );

  return NextResponse.json({ ok: true, status: remota.status, plan });
}

/**
 * El id de la suscripción a partir del id de un cobro mensual.
 *
 * Devuelve `null` si no se puede resolver, y quien llama trata eso como "no
 * hay nada que hacer" en vez de romper: un aviso que no sabemos leer no puede
 * cambiarle el plan a nadie.
 */
async function idDeSuscripcionDelPago(paymentId: string): Promise<string | null> {
  const config = billingConfig();
  if (!config) return null;

  try {
    const response = await fetch(
      `https://api.mercadopago.com/authorized_payments/${encodeURIComponent(paymentId)}`,
      {
        headers: { authorization: `Bearer ${config.accessToken}` },
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { preapproval_id?: string };
    return payload.preapproval_id ?? null;
  } catch {
    return null;
  }
}
