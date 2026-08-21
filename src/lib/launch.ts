import "server-only";

import { get } from "@/lib/db";
import { getIntegration, listFunnelSteps } from "@/lib/repo";

/**
 * Validaciones que debe pasar una página de venta antes de publicarse.
 * Devuelve la lista de bloqueantes; vacía significa que se puede publicar.
 *
 * El "camino a la primera venta" que el usuario ve vive en
 * `product-workspace.ts`, por producto. Acá solo queda la verificación dura que
 * corre en el servidor en el momento de publicar: es la última puerta, y no
 * confía en lo que la pantalla haya mostrado antes.
 */
export function funnelPublishBlockers(workspaceId: string, funnelId: string): string[] {
  const blockers: string[] = [];
  const funnel = get<{ id: string; offer_id: string | null }>(
    `SELECT id, offer_id FROM funnels WHERE workspace_id = ? AND id = ?`,
    workspaceId,
    funnelId,
  );
  if (!funnel) return ["La página no existe."];

  const steps = listFunnelSteps(workspaceId, funnelId);
  if (!steps.some((s) => s.type === "landing")) blockers.push("Falta la página donde contás tu producto.");
  if (!steps.some((s) => s.type === "checkout")) blockers.push("Falta la página donde te pagan.");
  if (!steps.some((s) => s.type === "thankyou")) blockers.push("Falta la página de gracias.");

  if (!funnel.offer_id) {
    blockers.push("El producto todavía no tiene precio.");
  } else {
    const offer = get<{ price: number }>(
      `SELECT price FROM offers WHERE workspace_id = ? AND id = ?`,
      workspaceId,
      funnel.offer_id,
    );
    if (!offer || offer.price <= 0) blockers.push("El precio está en cero.");
  }

  const stripe = getIntegration(workspaceId, "stripe");
  const mercadopago = getIntegration(workspaceId, "mercadopago");
  if (stripe?.status !== "connected" && mercadopago?.status !== "connected") {
    blockers.push("No hay un medio de pago conectado: sin eso nadie puede pagarte.");
  }

  return blockers;
}
