import { NextResponse, type NextRequest } from "next/server";

import { getProvider, webhookSecret } from "@/lib/integrations/payments";
import { settleOrder } from "@/lib/integrations/settlement";
import { verifyMercadoPago } from "@/lib/integrations/webhook-verify";
import * as repo from "@/lib/repo";

/**
 * Webhook de Mercado Pago.
 *
 * La URL lleva el workspace adentro (`/api/webhooks/mercadopago/<workspaceId>`)
 * y se la mandamos a Mercado Pago en cada preferencia con `notification_url`,
 * así el vendedor no tiene que configurar nada en su panel.
 *
 * El cuerpo del webhook NO se usa para decidir si una venta se cobró: solo
 * sacamos de ahí el id del pago y después se lo preguntamos a Mercado Pago con
 * el access token del vendedor. Un webhook falsificado no puede acreditar una
 * venta que no existe.
 *
 * Códigos de respuesta:
 *  - 200 → procesado, o no había nada que hacer. Mercado Pago deja de reintentar.
 *  - 401 → la firma no valida.
 *  - 503 → no pudimos consultar la API. Mercado Pago reintenta más tarde.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface MpWebhookBody {
  type?: string;
  topic?: string;
  action?: string;
  data?: { id?: string | number };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const rawBody = await request.text();

  let body: MpWebhookBody = {};
  try {
    body = rawBody ? (JSON.parse(rawBody) as MpWebhookBody) : {};
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  // Mercado Pago manda varios tipos de aviso; solo nos interesan los pagos.
  const kind = body.type ?? body.topic ?? request.nextUrl.searchParams.get("topic");
  if (kind && kind !== "payment") {
    return NextResponse.json({ ignored: kind }, { status: 200 });
  }

  const paymentId =
    (body.data?.id !== undefined ? String(body.data.id) : null) ??
    request.nextUrl.searchParams.get("data.id") ??
    request.nextUrl.searchParams.get("id");

  if (!paymentId) {
    return NextResponse.json({ ignored: "sin id de pago" }, { status: 200 });
  }

  const verification = verifyMercadoPago({
    secret: webhookSecret(workspaceId, "mercadopago"),
    signatureHeader: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId: paymentId,
  });

  if (verification.ok === false) {
    console.warn(`[tiendaflow] webhook MP rechazado (${workspaceId}): ${verification.reason}`);
    return NextResponse.json({ error: verification.reason }, { status: 401 });
  }

  // Fuente de verdad: la API de Mercado Pago, con las credenciales del vendedor.
  const remote = await getProvider("mercadopago").fetchPayment(workspaceId, paymentId);
  if (!remote.ok) {
    console.error(`[tiendaflow] webhook MP (${workspaceId}): ${remote.reason}`);
    return NextResponse.json({ error: remote.reason }, { status: 503 });
  }

  const payment = remote.payment;
  const order =
    (payment.orderId ? repo.getOrder(workspaceId, payment.orderId) : null) ??
    (payment.reference ? repo.getOrderByReference(workspaceId, payment.reference) : null);

  if (!order) {
    console.warn(
      `[tiendaflow] webhook MP (${workspaceId}): pago ${paymentId} sin orden asociada.`,
    );
    return NextResponse.json({ ignored: "orden no encontrada" }, { status: 200 });
  }

  if (payment.status === "approved") {
    const outcome = await settleOrder(workspaceId, order.id, {
      provider: "mercadopago",
      providerPaymentId: paymentId,
      rawPayload: payment.raw,
      clientIp: request.headers.get("x-forwarded-for")?.split(",")[0] ?? null,
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json({ ok: true, ...outcome }, { status: 200 });
  }

  if (payment.status === "rejected") {
    repo.recordFailedPayment(
      workspaceId,
      order.id,
      "mercadopago",
      "Mercado Pago rechazó el pago.",
      paymentId,
    );
  }

  return NextResponse.json({ ok: true, status: payment.status }, { status: 200 });
}

/** Mercado Pago pega un GET al validar la URL desde su panel. */
export async function GET() {
  return NextResponse.json({ service: "tiendaflow", webhook: "mercadopago" }, { status: 200 });
}
