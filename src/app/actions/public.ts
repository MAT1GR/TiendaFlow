"use server";

import { cookies, headers } from "next/headers";
import crypto from "node:crypto";

import { get } from "@/lib/db";
import { activeProvider, getProvider } from "@/lib/integrations/payments";
import { settleOrder } from "@/lib/integrations/settlement";
import * as repo from "@/lib/repo";
import { fail, guarded, ok, type ActionResult } from "@/app/actions/shared";
import type { Funnel } from "@/lib/types";

/**
 * Acciones de las páginas públicas del funnel (landing, checkout, upsells).
 *
 * No hay sesión de usuario acá: el workspace se deriva SIEMPRE del funnel al
 * que apunta la URL, nunca de datos enviados por el cliente.
 */

const SESSION_COOKIE = "tf_visit";

async function visitorSession(): Promise<string> {
  const store = await cookies();
  const existing = store.get(SESSION_COOKIE)?.value;
  if (existing) return existing;

  const key = crypto.randomUUID();
  store.set(SESSION_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return key;
}

function funnelBySlugOrThrow(slug: string): Funnel {
  const funnel = repo.getFunnelByPublicSlug(slug);
  if (!funnel) throw new Error("FUNNEL_NOT_FOUND");
  return funnel;
}

/** Registra una visita a un paso del funnel y su atribución UTM. */
export async function trackVisitAction(input: {
  slug: string;
  stepType: string;
  utm?: Record<string, string>;
  referrer?: string;
  path?: string;
}): Promise<{ ok: boolean }> {
  try {
    const funnel = funnelBySlugOrThrow(input.slug);
    const sessionKey = await visitorSession();

    const step = get<{ id: string }>(
      `SELECT id FROM funnel_steps WHERE workspace_id = ? AND funnel_id = ? AND type = ? ORDER BY position LIMIT 1`,
      funnel.workspace_id,
      funnel.id,
      input.stepType,
    );

    repo.trackEvent(funnel.workspace_id, {
      name: "page_view",
      funnel_id: funnel.id,
      funnel_step_id: step?.id ?? null,
      session_key: sessionKey,
      metadata: { path: input.path },
    });

    const hasUtm = Object.values(input.utm ?? {}).some(Boolean);
    if (hasUtm || input.stepType === "landing") {
      repo.recordAttribution(funnel.workspace_id, {
        funnel_id: funnel.id,
        session_key: sessionKey,
        utm: input.utm ?? {},
        referrer: input.referrer ?? null,
        landing_path: input.path ?? null,
      });
    }

    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export interface CheckoutOutcome {
  orderId: string;
  reference: string;
  accessToken: string;
  /** URL del proveedor de pago, si hay uno conectado. */
  paymentUrl?: string;
  /** Motivo por el que no se pudo iniciar el cobro real. */
  paymentIssue?: string;
  nextUrl: string;
}

/**
 * Crea la orden y, si hay proveedor de pago conectado, inicia el cobro.
 *
 * Sin proveedor conectado la orden queda en `pending` y se devuelve
 * `paymentIssue`: NUNCA se marca como pagada sin confirmación del proveedor.
 */
export async function submitCheckoutAction(input: {
  slug: string;
  fullName: string;
  email: string;
  phone?: string;
  bumpIds: string[];
  coupon?: string;
  utm?: Record<string, string>;
}): Promise<ActionResult<CheckoutOutcome>> {
  return guarded<CheckoutOutcome>(async () => {
    const funnel = repo.getFunnelByPublicSlug(input.slug);
    if (!funnel) return fail("No encontramos este funnel.");
    if (funnel.status !== "published") {
      return fail("Este funnel no está publicado todavía.");
    }

    const offer = funnel.offer_id ? repo.getOffer(funnel.workspace_id, funnel.offer_id) : null;
    if (!offer || offer.price <= 0) {
      return fail("Esta oferta no está disponible en este momento.");
    }

    const email = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return fail("Ingresá un email válido: ahí te mandamos el acceso.");
    }
    if (!input.fullName.trim()) {
      return fail("Necesitamos tu nombre para emitir la compra.");
    }

    // Los bumps se re-leen de la base: nunca confiamos en el precio del cliente.
    const availableBumps = repo.listOrderBumps(funnel.workspace_id, offer.id).filter((b) => b.active);
    const selectedBumps = availableBumps.filter((bump) => input.bumpIds.includes(bump.id));
    const bumpTotal = selectedBumps.reduce((acc, bump) => acc + bump.price, 0);

    const customer = repo.upsertCustomer(funnel.workspace_id, {
      email,
      full_name: input.fullName.trim(),
      phone: input.phone?.trim() || null,
    });

    const product = offer.product_id
      ? repo.getProduct(funnel.workspace_id, offer.product_id)
      : null;

    const order = repo.createOrder(funnel.workspace_id, {
      customer_id: customer.id,
      offer_id: offer.id,
      funnel_id: funnel.id,
      status: "pending",
      subtotal: offer.price,
      bump_total: bumpTotal,
      currency: offer.currency,
      utm: input.utm ?? {},
      items: [
        {
          product_id: offer.product_id,
          kind: "main",
          name: product?.name ?? offer.name,
          unit_price: offer.price,
        },
        ...selectedBumps.map((bump) => ({
          product_id: bump.product_id,
          kind: "bump" as const,
          name: bump.name,
          unit_price: bump.price,
        })),
      ],
    });

    const sessionKey = await visitorSession();
    repo.trackEvent(funnel.workspace_id, {
      name: "initiate_checkout",
      funnel_id: funnel.id,
      order_id: order.id,
      session_key: sessionKey,
      value: order.total,
    });

    const headerList = await headers();
    const origin =
      headerList.get("origin") ??
      `${headerList.get("x-forwarded-proto") ?? "http"}://${headerList.get("host") ?? "localhost:3000"}`;

    const nextUrl = await nextStepUrl(funnel, order.id, order.access_token ?? "");
    const providerId = activeProvider(funnel.workspace_id);

    if (!providerId) {
      return ok<CheckoutOutcome>({
        orderId: order.id,
        reference: order.reference,
        accessToken: order.access_token ?? "",
        nextUrl,
        paymentIssue:
          "Esta tienda todavía no tiene un proveedor de pago conectado, así que no se puede completar el cobro. Guardamos tu pedido como pendiente.",
      });
    }

    const result = await getProvider(providerId).createCheckout(funnel.workspace_id, {
      orderId: order.id,
      reference: order.reference,
      amount: order.total,
      currency: order.currency,
      description: offer.name,
      customerEmail: email,
      successUrl: `${origin}${nextUrl}`,
      cancelUrl: `${origin}/f/${input.slug}/checkout?cancelado=1`,
      // El workspace viaja en la URL para que el webhook sepa de quién es la
      // venta antes de tener que confiar en nada del cuerpo del aviso.
      notifyUrl: `${origin}/api/webhooks/${providerId}/${funnel.workspace_id}`,
    });

    if (result.status === "redirect") {
      return ok({
        orderId: order.id,
        reference: order.reference,
        accessToken: order.access_token ?? "",
        paymentUrl: result.url,
        nextUrl,
      });
    }

    return ok({
      orderId: order.id,
      reference: order.reference,
      accessToken: order.access_token ?? "",
      nextUrl,
      paymentIssue: result.reason,
    });
  });
}

/** Siguiente paso después del checkout: primer upsell, o la página de gracias. */
async function nextStepUrl(funnel: Funnel, orderId: string, token: string) {
  const steps = repo.listFunnelSteps(funnel.workspace_id, funnel.id);
  const checkoutIndex = steps.findIndex((step) => step.type === "checkout");
  const next = steps.slice(checkoutIndex + 1).find((step) => step.type !== "checkout");
  const slug = repo.publicSlug(funnel);

  if (next?.type === "upsell") {
    return `/f/${slug}/upsell/${next.id}?pedido=${orderId}&t=${token}`;
  }
  return `/f/${slug}/gracias?pedido=${orderId}&t=${token}`;
}

/** Acepta un upsell y lo suma al pedido. */
export async function acceptUpsellAction(input: {
  slug: string;
  stepId: string;
  orderId: string;
  token: string;
}): Promise<ActionResult<{ nextUrl: string }>> {
  return guarded(async () => {
    const funnel = repo.getFunnelByPublicSlug(input.slug);
    if (!funnel) return fail("No encontramos este funnel.");

    const order = repo.getOrder(funnel.workspace_id, input.orderId);
    if (!order || order.access_token !== input.token) {
      return fail("No pudimos verificar tu pedido.");
    }

    const upsell = funnel.offer_id
      ? repo.listUpsells(funnel.workspace_id, funnel.offer_id).find((item) => item.active)
      : null;

    if (!upsell) return fail("Esta oferta ya no está disponible.");

    repo.addOrderItem(funnel.workspace_id, order.id, {
      product_id: upsell.product_id,
      kind: "upsell",
      name: upsell.name,
      unit_price: upsell.price,
    });

    return ok({ nextUrl: await advanceAfter(funnel, input.stepId, order.id, input.token, true) });
  });
}

/** Rechaza el upsell: va al downsell si existe, si no a la página de gracias. */
export async function declineUpsellAction(input: {
  slug: string;
  stepId: string;
  orderId: string;
  token: string;
}): Promise<ActionResult<{ nextUrl: string }>> {
  return guarded(async () => {
    const funnel = repo.getFunnelByPublicSlug(input.slug);
    if (!funnel) return fail("No encontramos este funnel.");

    const order = repo.getOrder(funnel.workspace_id, input.orderId);
    if (!order || order.access_token !== input.token) {
      return fail("No pudimos verificar tu pedido.");
    }

    return ok({ nextUrl: await advanceAfter(funnel, input.stepId, order.id, input.token, false) });
  });
}

async function advanceAfter(
  funnel: Funnel,
  stepId: string,
  orderId: string,
  token: string,
  accepted: boolean,
) {
  const steps = repo.listFunnelSteps(funnel.workspace_id, funnel.id);
  const index = steps.findIndex((step) => step.id === stepId);
  const slug = repo.publicSlug(funnel);
  const query = `?pedido=${orderId}&t=${token}`;

  for (let i = index + 1; i < steps.length; i += 1) {
    const step = steps[i];
    // Un downsell solo se muestra si la persona rechazó el paso anterior.
    if (step.type === "downsell" && accepted) continue;
    if (step.type === "upsell") return `/f/${slug}/upsell/${step.id}${query}`;
    if (step.type === "downsell") return `/f/${slug}/downsell/${step.id}${query}`;
    if (step.type === "thankyou") return `/f/${slug}/gracias${query}`;
  }
  return `/f/${slug}/gracias${query}`;
}

/**
 * Confirmación manual de pago desde la página de gracias.
 *
 * Solo disponible cuando el workspace NO tiene proveedor conectado: sirve para
 * probar el recorrido completo en desarrollo. Si hay proveedor conectado, la
 * orden solo se marca pagada cuando el proveedor lo confirma.
 */
export async function confirmManualPaymentAction(input: {
  slug: string;
  orderId: string;
  token: string;
}): Promise<ActionResult<null>> {
  return guarded(async () => {
    const funnel = repo.getFunnelByPublicSlug(input.slug);
    if (!funnel) return fail("No encontramos este funnel.");

    if (activeProvider(funnel.workspace_id)) {
      return fail(
        "Este workspace tiene un proveedor de pago conectado: la orden se confirma cuando el proveedor lo notifica, no desde acá.",
      );
    }

    const order = repo.getOrder(funnel.workspace_id, input.orderId);
    if (!order || order.access_token !== input.token) {
      return fail("No pudimos verificar tu pedido.");
    }

    const headerList = await headers();
    const outcome = await settleOrder(funnel.workspace_id, order.id, {
      provider: "manual",
      sessionKey: await visitorSession(),
      clientIp: headerList.get("x-forwarded-for")?.split(",")[0] ?? null,
      userAgent: headerList.get("user-agent"),
    });

    if (outcome.alreadyPaid) return ok(null, "Este pedido ya estaba confirmado.");
    if (!outcome.settled) return fail(outcome.reason ?? "No pudimos confirmar el pedido.");

    return ok(null, "Confirmamos el pedido.");
  });
}
