import "server-only";

import { isPlanId } from "@/lib/plans";
import * as repo from "@/lib/repo";

/**
 * Traduce el estado de Mercado Pago a nuestro plan, y lo guarda.
 *
 * Vive acá y no en el webhook porque lo usan los dos —el aviso de Mercado Pago
 * y la consulta al volver del navegador— y son exactamente la misma decisión.
 * Dos copias de esta traducción es tener dos definiciones de qué significa
 * estar al día.
 */
export function applyPreapprovalStatus(
  workspaceId: string,
  estadoRemoto: string,
  referencia?: string | null,
  proximoPago?: string | null,
): string {
  const suscripcion = repo.getSubscription(workspaceId);
  const planPedido = leerPlanDeReferencia(referencia);

  switch (estadoRemoto) {
    case "authorized": {
      const plan = planPedido ?? suscripcion?.plan ?? "free";
      repo.updateSubscription(workspaceId, {
        plan,
        status: "active",
        currentPeriodEnd: proximoPago ?? null,
        cancelAtPeriodEnd: false,
      });
      return plan;
    }

    /*
     * `paused` es Mercado Pago avisando que no pudo cobrar.
     *
     * No se baja el plan de una: se marca la suscripción y se le deja el plan
     * hasta el fin del período que ya pagó. Apagarle el producto el mismo día
     * que se le venció una tarjeta castiga un descuido administrativo como si
     * fuera una baja.
     */
    case "paused": {
      repo.updateSubscription(workspaceId, { status: "past_due" });
      return suscripcion?.plan ?? "free";
    }

    case "cancelled": {
      repo.updateSubscription(workspaceId, {
        plan: "free",
        status: "active",
        provider: null,
        providerSubscriptionId: null,
        cancelAtPeriodEnd: false,
      });
      return "free";
    }

    /* `pending` y cualquier estado nuevo: no se toca nada. */
    default:
      return suscripcion?.plan ?? "free";
  }
}

function leerPlanDeReferencia(referencia?: string | null): string | null {
  if (!referencia?.startsWith("tf:")) return null;
  const planId = referencia.split(":")[2];
  return planId && isPlanId(planId) ? planId : null;
}

/* -------------------------------------------------------------------------- */
/* Stripe                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Traduce el estado de una suscripción de Stripe a nuestro plan, y lo guarda.
 *
 * Los estados de Stripe se agrupan en tres, no en siete:
 *
 *  · **Está al día** (`active`, `trialing`) → tiene el plan que pagó.
 *  · **Debe** (`past_due`, `unpaid`, `incomplete`) → conserva el plan y queda
 *    marcado. No se le apaga el producto el mismo día que se le venció una
 *    tarjeta: eso castiga un descuido administrativo como si fuera una baja, y
 *    Stripe todavía va a reintentar el cobro varias veces.
 *  · **Se terminó** (`canceled`, `incomplete_expired`) → vuelve a Free.
 */
const AL_DIA = new Set(["active", "trialing"]);
const TERMINADA = new Set(["canceled", "incomplete_expired"]);

export function applyStripeStatus(
  workspaceId: string,
  remota: {
    id: string;
    status: string;
    customerId: string | null;
    planId: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  },
): string {
  const suscripcion = repo.getSubscription(workspaceId);
  const planPedido = remota.planId && isPlanId(remota.planId) ? remota.planId : null;

  if (TERMINADA.has(remota.status)) {
    repo.updateSubscription(workspaceId, {
      plan: "free",
      status: "active",
      provider: null,
      providerSubscriptionId: null,
      providerCustomerId: null,
      cancelAtPeriodEnd: false,
    });
    return "free";
  }

  if (AL_DIA.has(remota.status)) {
    const plan = planPedido ?? suscripcion?.plan ?? "free";
    repo.updateSubscription(workspaceId, {
      plan,
      status: "active",
      provider: "stripe",
      providerSubscriptionId: remota.id,
      providerCustomerId: remota.customerId,
      currentPeriodEnd: remota.currentPeriodEnd,
      cancelAtPeriodEnd: remota.cancelAtPeriodEnd,
    });
    return plan;
  }

  /* Debe: se marca, pero conserva lo que ya tenía. */
  repo.updateSubscription(workspaceId, {
    status: "past_due",
    provider: "stripe",
    providerSubscriptionId: remota.id,
    providerCustomerId: remota.customerId,
    currentPeriodEnd: remota.currentPeriodEnd,
  });
  return suscripcion?.plan ?? "free";
}
