import { NextResponse, type NextRequest } from "next/server";

import { getProvider, webhookSecret } from "@/lib/integrations/payments";
import { settleOrder } from "@/lib/integrations/settlement";
import { verifyStripe } from "@/lib/integrations/webhook-verify";
import * as repo from "@/lib/repo";

/**
 * Webhook de Stripe.
 *
 * A diferencia de Mercado Pago, Stripe no acepta una URL de aviso por sesión:
 * el vendedor tiene que dar de alta el endpoint en su panel. La pantalla de
 * Pagos le muestra la URL exacta y el campo para pegar la clave de firma.
 *
 * Igual que en Mercado Pago, el cuerpo del evento solo aporta el id de la
 * sesión; el estado real se consulta contra la API de Stripe con la secret key
 * del vendedor antes de acreditar nada.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Eventos que pueden significar "esta sesión de checkout quedó paga". */
const RELEVANT_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

const FAILED_EVENTS = new Set([
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);

interface StripeEvent {
  type?: string;
  data?: { object?: { id?: string } };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const rawBody = await request.text();

  const verification = verifyStripe({
    secret: webhookSecret(workspaceId, "stripe"),
    signatureHeader: request.headers.get("stripe-signature"),
    rawBody,
  });

  if (verification.ok === false) {
    console.warn(`[tiendaflow] webhook Stripe rechazado (${workspaceId}): ${verification.reason}`);
    return NextResponse.json({ error: verification.reason }, { status: 401 });
  }

  let event: StripeEvent = {};
  try {
    event = rawBody ? (JSON.parse(rawBody) as StripeEvent) : {};
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const type = event.type ?? "";
  const sessionId = event.data?.object?.id;

  if (!sessionId || (!RELEVANT_EVENTS.has(type) && !FAILED_EVENTS.has(type))) {
    return NextResponse.json({ ignored: type || "sin tipo" }, { status: 200 });
  }

  if (FAILED_EVENTS.has(type)) {
    const remote = await getProvider("stripe").fetchPayment(workspaceId, sessionId);
    const reference = remote.ok ? remote.payment.reference : null;
    const order = reference ? repo.getOrderByReference(workspaceId, reference) : null;
    if (order) {
      repo.recordFailedPayment(
        workspaceId,
        order.id,
        "stripe",
        type === "checkout.session.expired"
          ? "La sesión de checkout venció sin pagarse."
          : "Stripe no pudo cobrar el pago diferido.",
        sessionId,
      );
    }
    return NextResponse.json({ ok: true, status: "failed" }, { status: 200 });
  }

  // Fuente de verdad: la API de Stripe, con las credenciales del vendedor.
  const remote = await getProvider("stripe").fetchPayment(workspaceId, sessionId);
  if (!remote.ok) {
    console.error(`[tiendaflow] webhook Stripe (${workspaceId}): ${remote.reason}`);
    return NextResponse.json({ error: remote.reason }, { status: 503 });
  }

  const payment = remote.payment;
  if (payment.status !== "approved") {
    return NextResponse.json({ ok: true, status: payment.status }, { status: 200 });
  }

  const order =
    (payment.orderId ? repo.getOrder(workspaceId, payment.orderId) : null) ??
    (payment.reference ? repo.getOrderByReference(workspaceId, payment.reference) : null);

  if (!order) {
    console.warn(
      `[tiendaflow] webhook Stripe (${workspaceId}): sesión ${sessionId} sin orden asociada.`,
    );
    return NextResponse.json({ ignored: "orden no encontrada" }, { status: 200 });
  }

  const outcome = await settleOrder(workspaceId, order.id, {
    provider: "stripe",
    providerPaymentId: sessionId,
    rawPayload: payment.raw,
    clientIp: request.headers.get("x-forwarded-for")?.split(",")[0] ?? null,
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true, ...outcome }, { status: 200 });
}
