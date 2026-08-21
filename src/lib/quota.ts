import "server-only";

import { get } from "@/lib/db";
import { planOf, UNLIMITED } from "@/lib/plans";
import { getSubscription } from "@/lib/repo";

/**
 * Los topes del plan, aplicados de verdad.
 *
 * Hasta acá los planes eran una tabla de precios y nada más: los límites
 * estaban escritos en `plans.ts` pero no los leía nadie, así que el plan Free
 * daba exactamente lo mismo que el plan Max. Un tope que no se aplica no es un
 * tope, es una promesa incumplida en la dirección contraria.
 *
 * Se aplican dos, que son los que tienen un costo real detrás:
 *
 *  · **IA**: cada generación le cuesta plata a TiendaFlow. Solo se cuentan las
 *    que efectivamente fueron a un proveedor — cuando no hay proveedor
 *    conectado la app arma un borrador local, y cobrar cupo por eso sería
 *    mentir.
 *  · **Productos publicados**: es la capacidad que el vendedor está usando.
 *
 * Lo que NO se aplica todavía, y hay que decirlo: el almacenamiento. No hay
 * storage conectado, así que un tope en megabytes hoy no significa nada.
 *
 * Los mensajes hablan de lo que la persona quiere hacer, nunca de "cuota
 * excedida": dicen qué se acabó, cuándo vuelve y qué plan lo destraba.
 */

export interface QuotaCheck {
  ok: boolean;
  /** Por qué no se puede, listo para mostrar. Vacío cuando `ok`. */
  reason?: string;
  used: number;
  limit: number;
}

/** Generaciones reales de IA del mes en curso (las locales no cuentan). */
export function aiGenerationsThisMonth(workspaceId: string): number {
  const inicioDeMes = new Date();
  inicioDeMes.setUTCDate(1);
  inicioDeMes.setUTCHours(0, 0, 0, 0);

  return (
    get<{ total: number }>(
      `SELECT COUNT(*) AS total FROM ai_generations
       WHERE workspace_id = ? AND provider != 'template' AND created_at >= ?`,
      workspaceId,
      inicioDeMes.toISOString(),
    )?.total ?? 0
  );
}

/** Productos con su página de venta publicada ahora mismo. */
export function publishedProducts(workspaceId: string): number {
  return (
    get<{ total: number }>(
      `SELECT COUNT(*) AS total FROM funnels WHERE workspace_id = ? AND status = 'published'`,
      workspaceId,
    )?.total ?? 0
  );
}

function planFor(workspaceId: string) {
  return planOf(getSubscription(workspaceId)?.plan);
}

export function checkAiQuota(workspaceId: string): QuotaCheck {
  const plan = planFor(workspaceId);
  const limit = plan.limits.aiGenerations.amount;
  if (limit === UNLIMITED) return { ok: true, used: 0, limit };

  const used = aiGenerationsThisMonth(workspaceId);
  if (used < limit) return { ok: true, used, limit };

  return {
    ok: false,
    used,
    limit,
    reason:
      `Usaste los ${limit} pedidos de IA que trae el plan ${plan.name} este mes. ` +
      "Se renuevan el 1°. Si los necesitás ahora, subí de plan desde Configuración.",
  };
}

export function checkPublishQuota(workspaceId: string, funnelId: string): QuotaCheck {
  const plan = planFor(workspaceId);
  const limit = plan.limits.publishedProducts.amount;
  if (limit === UNLIMITED) return { ok: true, used: 0, limit };

  // Republicar algo que ya está publicado no ocupa un lugar nuevo.
  const yaPublicado =
    get<{ status: string }>(
      `SELECT status FROM funnels WHERE workspace_id = ? AND id = ?`,
      workspaceId,
      funnelId,
    )?.status === "published";
  if (yaPublicado) return { ok: true, used: publishedProducts(workspaceId), limit };

  const used = publishedProducts(workspaceId);
  if (used < limit) return { ok: true, used, limit };

  return {
    ok: false,
    used,
    limit,
    reason:
      `El plan ${plan.name} te deja ${limit} ${limit === 1 ? "producto publicado" : "productos publicados"} a la vez, ` +
      `y ya ${limit === 1 ? "tenés uno" : `tenés ${used}`}. Podés despublicar el que no estés usando, o subir de plan.`,
  };
}
