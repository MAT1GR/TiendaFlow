"use server";

import { revalidatePath } from "next/cache";

import { fail, guarded, ok, type ActionResult } from "@/app/actions/shared";
import { requireSession } from "@/lib/auth";
import { applyPreapprovalStatus, applyStripeStatus } from "@/lib/billing/apply";
import {
  billingStatus,
  cancelPreapproval,
  createPreapproval,
  getPreapproval,
} from "@/lib/billing/mercadopago";
import {
  createCheckoutSession,
  createPortalSession,
  getSubscription as getStripeSubscription,
  stripeBillingStatus,
} from "@/lib/billing/stripe";
import { PLANS, isPlanId, type PlanId } from "@/lib/plans";
import * as repo from "@/lib/repo";

/**
 * Alta y baja del abono de TiendaFlow.
 *
 * La regla que ordena todo este archivo: **el plan lo cambia el proveedor de
 * cobro, no el botón**. Acá solo se crea la suscripción y se manda a la
 * persona a autorizarla; el plan pago se activa cuando Mercado Pago avisa que
 * quedó autorizada, y se apaga cuando avisa que se canceló o que no pudo
 * cobrar. Si el botón activara el plan, alcanzaría con abrir el link y cerrar
 * la pestaña para tener Pro gratis.
 *
 * La excepción es bajar a Free, que sí se hace en el momento: nadie tiene que
 * esperar a un webhook para dejar de pagar.
 */

export interface CheckoutStart {
  /** Adónde mandar a la persona para autorizar el débito. */
  url: string;
  /** Lo que se le va a debitar por mes, en moneda local. */
  amount: number;
  currency: string;
}

/**
 * Arranca la suscripción a un plan pago.
 *
 * Devuelve el link de Mercado Pago. La redirección la hace el cliente y no un
 * `redirect()` del servidor a propósito: así el botón puede mostrar el importe
 * convertido antes de sacar a la persona de la app.
 */
/**
 * Arranca la suscripción con tarjeta (Stripe).
 *
 * Es el camino por defecto: el precio está en dólares y Stripe cobra dólares
 * de cualquier tarjeta del mundo, así que el número que vio en la página de
 * precios es exactamente el que se le va a debitar.
 *
 * No toca el plan. Lo activa el webhook cuando Stripe confirma el cobro — si
 * lo activara este botón, alcanzaría con abrir el checkout y cerrar la pestaña
 * para tener Pro gratis.
 */
export async function startStripeCheckoutAction(
  plan: string,
): Promise<ActionResult<{ url: string; amountUsd: number; trialDays: number }>> {
  return guarded(async () => {
    const { workspace, user } = await requireSession();

    if (!isPlanId(plan)) return fail("Ese plan no existe.");
    if (PLANS[plan].priceUsd <= 0) {
      return fail("El plan Free no se cobra. Para volver a Free usá el botón de cancelar.");
    }

    const estado = stripeBillingStatus();
    if (!estado.configured) return fail(estado.reason!);

    repo.ensureSubscription(workspace.id);

    try {
      const sesion = await createCheckoutSession({
        workspaceId: workspace.id,
        planId: plan as PlanId,
        customerEmail: user.email,
      });
      return ok(sesion);
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "No pudimos abrir el checkout de Stripe.",
      );
    }
  });
}

/**
 * Abre el portal de Stripe, donde cambia la tarjeta, ve sus facturas y cancela.
 *
 * Todo eso lo resuelve Stripe mejor de lo que lo resolveríamos nosotros, y sin
 * que datos de tarjeta pasen nunca por TiendaFlow.
 */
export async function openBillingPortalAction(): Promise<ActionResult<{ url: string }>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const actual = repo.ensureSubscription(workspace.id);

    if (actual.provider !== "stripe" || !actual.provider_customer_id) {
      return fail("Tu abono no se cobra con tarjeta, así que no hay portal de Stripe que abrir.");
    }

    try {
      return ok({ url: await createPortalSession(actual.provider_customer_id) });
    } catch (error) {
      return fail(error instanceof Error ? error.message : "No pudimos abrir el portal de Stripe.");
    }
  });
}

/**
 * Arranca la suscripción con Mercado Pago.
 *
 * Es el camino alternativo, para quien no tiene una tarjeta que pueda pagar en
 * dólares. Mercado Pago debita en moneda local: el importe sale de convertir
 * el precio en dólares con la cotización configurada, y queda congelado hasta
 * que se actualice.
 */
export async function startSubscriptionAction(plan: string): Promise<ActionResult<CheckoutStart>> {
  return guarded(async () => {
    const { workspace, user } = await requireSession();

    if (!isPlanId(plan)) return fail("Ese plan no existe.");
    if (PLANS[plan].priceUsd <= 0) {
      return fail("El plan Free no se cobra. Para volver a Free usá el botón de cancelar.");
    }

    const estado = billingStatus();
    if (!estado.configured) return fail(estado.reason!);

    const actual = repo.ensureSubscription(workspace.id);

    /*
     * Una suscripción activa por workspace.
     *
     * Si ya hay una viva y la persona elige otro plan, primero se da de baja la
     * anterior. Sin esto, Mercado Pago le debitaría las dos todos los meses y
     * el reclamo llegaría un mes después, cuando ya cobró de más.
     */
    if (actual.provider_subscription_id && actual.status === "active") {
      try {
        await cancelPreapproval(actual.provider_subscription_id);
      } catch (error) {
        return fail(
          `No pudimos dar de baja tu suscripción anterior, así que no seguimos para no cobrarte dos veces. ${
            error instanceof Error ? error.message : ""
          }`.trim(),
        );
      }
    }

    let creada;
    try {
      creada = await createPreapproval({
        workspaceId: workspace.id,
        planId: plan as PlanId,
        payerEmail: user.email,
      });
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "No pudimos crear la suscripción en Mercado Pago.",
      );
    }

    /*
     * Se guarda el id en `pending`, antes de que autorice.
     *
     * Es lo que permite reconocer el webhook cuando llegue: el aviso de Mercado
     * Pago trae su id y nada más, y si no lo tenemos guardado no hay forma de
     * saber a qué workspace corresponde. El plan sigue siendo el de antes.
     */
    repo.updateSubscription(workspace.id, {
      status: "pending",
      provider: "mercadopago",
      providerSubscriptionId: creada.id,
      cancelAtPeriodEnd: false,
    });

    return ok({ url: creada.initPoint, amount: creada.amount, currency: creada.currency });
  });
}

/**
 * Da de baja el abono y vuelve a Free.
 *
 * Primero se cancela en Mercado Pago y después se baja el plan. En ese orden:
 * si se hiciera al revés y la baja fallara, la persona quedaría en Free con el
 * débito automático todavía vivo.
 */
export async function cancelSubscriptionAction(): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const actual = repo.ensureSubscription(workspace.id);

    if (actual.provider_subscription_id) {
      try {
        await cancelPreapproval(actual.provider_subscription_id);
      } catch (error) {
        return fail(
          `No pudimos cancelar el débito en Mercado Pago, así que no bajamos tu plan: si lo bajáramos igual te seguiría debitando. ${
            error instanceof Error ? error.message : ""
          }`.trim(),
        );
      }
    }

    repo.updateSubscription(workspace.id, {
      plan: "free",
      status: "active",
      provider: null,
      providerSubscriptionId: null,
      cancelAtPeriodEnd: false,
    });
    revalidatePath("/app", "layout");

    return ok(
      null,
      "Cancelamos tu abono y volviste al plan Free. No se te vuelve a debitar. Tus productos y tus ventas quedan como están.",
    );
  });
}

/**
 * Vuelve a preguntarle a Mercado Pago en qué estado quedó la suscripción.
 *
 * Existe para el momento en que la persona vuelve de autorizar: el webhook
 * puede tardar unos segundos, y quedarse mirando una pantalla que todavía dice
 * "Free" después de haber pagado es la peor primera impresión posible. No
 * confía en la vuelta del navegador —consulta la API— así que no se puede
 * activar un plan escribiendo la URL de retorno a mano.
 */
export async function syncSubscriptionAction(): Promise<ActionResult<{ plan: string }>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const actual = repo.ensureSubscription(workspace.id);

    if (!actual.provider_subscription_id) return ok({ plan: actual.plan });

    const remota = await getPreapproval(actual.provider_subscription_id);
    if (!remota?.status) return ok({ plan: actual.plan });

    const aplicado = applyPreapprovalStatus(workspace.id, remota.status, remota.external_reference, remota.next_payment_date);
    revalidatePath("/app", "layout");
    return ok({ plan: aplicado });
  });
}

/**
 * Vuelve a preguntarle a Stripe en qué estado quedó la suscripción.
 *
 * Mismo motivo que su gemela de Mercado Pago: al volver del checkout el
 * webhook puede tardar unos segundos, y ver "Free" después de haber pagado es
 * la peor primera impresión posible. Consulta la API, así que no se puede
 * activar un plan escribiendo la URL de retorno a mano.
 */
export async function syncStripeSubscriptionAction(): Promise<ActionResult<{ plan: string }>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const actual = repo.ensureSubscription(workspace.id);

    if (actual.provider !== "stripe" || !actual.provider_subscription_id) {
      return ok({ plan: actual.plan });
    }

    const remota = await getStripeSubscription(actual.provider_subscription_id);
    if (!remota) return ok({ plan: actual.plan });

    const plan = applyStripeStatus(workspace.id, remota);
    revalidatePath("/app", "layout");
    return ok({ plan });
  });
}
