import "server-only";

import { sendConversionEvent } from "@/lib/integrations/meta";
import { collectsCommission } from "@/lib/integrations/payments";
import * as repo from "@/lib/repo";
import { formatMoney } from "@/lib/utils";

/**
 * Todo lo que tiene que pasar cuando una venta se cobra de verdad.
 *
 * Antes esto vivía suelto dentro de la confirmación manual, así que el día que
 * apareciera un webhook iba a haber dos caminos distintos para acreditar una
 * venta y solo uno iba a avisarle a Meta. Ahora hay uno solo: los webhooks y la
 * confirmación manual entran los dos por acá.
 *
 * Es seguro llamarlo de más. Si la orden ya estaba paga devuelve
 * `alreadyPaid: true` y no vuelve a disparar el evento de conversión ni la
 * notificación: los proveedores reintentan sus webhooks y no queremos contar
 * dos veces la misma compra en Meta.
 */

export interface SettleContext {
  provider: string;
  providerPaymentId?: string | null;
  rawPayload?: unknown;
  sessionKey?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
}

export interface SettleOutcome {
  /** `true` si esta llamada fue la que acreditó la venta. */
  settled: boolean;
  alreadyPaid: boolean;
  reason?: string;
}

export async function settleOrder(
  workspaceId: string,
  orderId: string,
  context: SettleContext,
): Promise<SettleOutcome> {
  const result = repo.markOrderPaid(workspaceId, orderId, {
    provider: context.provider,
    providerPaymentId: context.providerPaymentId,
    rawPayload: context.rawPayload,
    collectsCommission: collectsCommission(workspaceId, context.provider),
  });

  if (!result.order) {
    return { settled: false, alreadyPaid: false, reason: "No encontramos la orden." };
  }
  if (result.alreadyPaid) {
    return { settled: false, alreadyPaid: true };
  }

  const order = result.order;
  const customer = order.customer_id ? repo.getCustomer(workspaceId, order.customer_id) : null;

  repo.trackEvent(workspaceId, {
    name: "purchase",
    funnel_id: order.funnel_id,
    order_id: order.id,
    session_key: context.sessionKey ?? null,
    value: order.total,
  });

  // Evento de servidor a Meta. Si no está configurado, `sent` viene en false y
  // no pasa nada más: no se simula un envío exitoso.
  await sendConversionEvent(workspaceId, {
    event: "Purchase",
    eventId: order.id,
    value: order.total,
    currency: order.currency,
    user: {
      email: customer?.email,
      phone: customer?.phone,
      clientIp: context.clientIp ?? null,
      userAgent: context.userAgent ?? null,
    },
  });

  const commission = order.commission_amount
    ? ` · Comisión TiendaFlow ${formatMoney(order.commission_amount, order.currency)}`
    : "";

  repo.createNotification(workspaceId, {
    title: `Nueva venta: ${order.reference}`,
    body: `${customer?.full_name ?? "Cliente"} compró por ${formatMoney(order.total, order.currency)}.${commission}`,
    href: `/app/ventas/${order.id}`,
    type: "success",
  });

  return { settled: true, alreadyPaid: false };
}
