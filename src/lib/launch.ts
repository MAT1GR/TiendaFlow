import "server-only";

import { get } from "@/lib/db";
import { getIntegration, listBonuses, listFunnelSteps } from "@/lib/repo";

export type StepState = "done" | "warning" | "todo";

export interface LaunchStep {
  code: string;
  index: string;
  title: string;
  description: string;
  state: StepState;
  missing: string[];
  ctaLabel: string;
  ctaHref: string;
}

export interface LaunchStatus {
  steps: LaunchStep[];
  completion: number;
  ready: boolean;
  nextStep: LaunchStep | null;
}

/**
 * Estado real de lanzamiento del workspace.
 *
 * Cada paso se evalúa contra la base de datos. Nada se marca como listo por
 * defecto: si falta configuración, se enumera exactamente qué falta.
 */
export function getLaunchStatus(workspaceId: string): LaunchStatus {
  const productCount =
    get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM products WHERE workspace_id = ? AND status != 'archived'`,
      workspaceId,
    )?.n ?? 0;

  const activeOffer = get<{ id: string; price: number; headline: string | null; benefits: string | null }>(
    `SELECT id, price, headline, benefits FROM offers WHERE workspace_id = ?
     ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, created_at DESC LIMIT 1`,
    workspaceId,
  );

  const funnel = get<{ id: string; status: string; name: string }>(
    `SELECT id, status, name FROM funnels WHERE workspace_id = ?
     ORDER BY CASE status WHEN 'published' THEN 0 ELSE 1 END, created_at DESC LIMIT 1`,
    workspaceId,
  );

  const bonuses = activeOffer ? listBonuses(workspaceId, activeOffer.id) : [];
  const steps = funnel ? listFunnelSteps(workspaceId, funnel.id) : [];

  const meta = getIntegration(workspaceId, "meta");
  const stripe = getIntegration(workspaceId, "stripe");
  const mercadopago = getIntegration(workspaceId, "mercadopago");
  const paymentConnected =
    stripe?.status === "connected" || mercadopago?.status === "connected";

  const campaign = get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM campaigns WHERE workspace_id = ?`,
    workspaceId,
  )?.n ?? 0;

  const list: LaunchStep[] = [];

  // 01 — Producto
  list.push({
    code: "producto",
    index: "01",
    title: "Producto",
    description: "Creá o importá el producto digital que vas a vender.",
    state: productCount > 0 ? "done" : "todo",
    missing: productCount > 0 ? [] : ["Todavía no cargaste ningún producto"],
    ctaLabel: productCount > 0 ? "Ver productos" : "Crear producto",
    ctaHref: productCount > 0 ? "/app/productos" : "/app/productos/nuevo",
  });

  // 02 — Oferta
  const offerMissing: string[] = [];
  if (!activeOffer) offerMissing.push("Todavía no armaste una oferta");
  else {
    if (!activeOffer.price) offerMissing.push("Falta definir el precio");
    if (!activeOffer.headline) offerMissing.push("Falta el headline de la oferta");
    if (!activeOffer.benefits) offerMissing.push("Faltan los beneficios");
  }
  list.push({
    code: "oferta",
    index: "02",
    title: "Oferta",
    description: "Definí precio, promesa, beneficios y garantía.",
    state: !activeOffer ? "todo" : offerMissing.length ? "warning" : "done",
    missing: offerMissing,
    ctaLabel: activeOffer ? "Editar oferta" : "Crear oferta",
    ctaHref: activeOffer ? `/app/ofertas/${activeOffer.id}` : "/app/ofertas/nueva",
  });

  // 03 — Bonos
  list.push({
    code: "bonos",
    index: "03",
    title: "Bonos",
    description: "Sumá bonos para que la oferta sea difícil de rechazar.",
    state: bonuses.length ? "done" : "warning",
    missing: bonuses.length ? [] : ["La oferta todavía no tiene bonos (opcional, pero suben la conversión)"],
    ctaLabel: activeOffer ? "Agregar bonos" : "Crear la oferta primero",
    ctaHref: activeOffer ? `/app/ofertas/${activeOffer.id}` : "/app/ofertas/nueva",
  });

  // 04 — Funnel
  const funnelMissing: string[] = [];
  if (!funnel) funnelMissing.push("Todavía no armaste un funnel");
  else {
    if (!steps.some((s) => s.type === "landing")) funnelMissing.push("Falta el paso de landing");
    if (!steps.some((s) => s.type === "checkout")) funnelMissing.push("Falta el paso de checkout");
    if (!steps.some((s) => s.type === "thankyou")) funnelMissing.push("Falta la página de gracias");
  }
  list.push({
    code: "funnel",
    index: "04",
    title: "Funnel",
    description: "Landing, checkout, upsell y página de gracias.",
    state: !funnel ? "todo" : funnelMissing.length ? "warning" : "done",
    missing: funnelMissing,
    ctaLabel: funnel ? "Editar funnel" : "Crear funnel",
    ctaHref: funnel ? `/app/funnels/${funnel.id}` : "/app/funnels/nuevo",
  });

  // 05 — Checkout
  const checkoutMissing: string[] = [];
  if (!activeOffer) checkoutMissing.push("Necesitás una oferta con precio");
  if (!paymentConnected) checkoutMissing.push("No hay proveedor de pago conectado");
  list.push({
    code: "checkout",
    index: "05",
    title: "Checkout",
    description: "Conectá un proveedor de pago para poder cobrar.",
    state: checkoutMissing.length ? "warning" : "done",
    missing: checkoutMissing,
    ctaLabel: "Configurar pagos",
    ctaHref: "/app/pagos",
  });

  // 06 — Tracking
  const trackingMissing: string[] = [];
  if (!meta || meta.status === "disconnected") trackingMissing.push("Meta Pixel sin configurar");
  else if (meta.status === "error") trackingMissing.push(meta.last_error ?? "La integración de Meta tiene un error");
  list.push({
    code: "tracking",
    index: "06",
    title: "Tracking",
    description: "Pixel y API de Conversiones para medir cada venta.",
    state: trackingMissing.length ? "warning" : "done",
    missing: trackingMissing,
    ctaLabel: "Configurar ahora",
    ctaHref: "/app/integraciones/meta",
  });

  // 07 — Meta Ads
  list.push({
    code: "meta_ads",
    index: "07",
    title: "Meta Ads",
    description: "Preparás la campaña y los creativos que van a traer el tráfico.",
    state: campaign > 0 ? "done" : "todo",
    missing: campaign > 0 ? [] : ["Todavía no creaste ninguna campaña"],
    ctaLabel: "Ir a Marketing",
    ctaHref: "/app/marketing",
  });

  // 08 — Lanzamiento
  const readyToLaunch =
    productCount > 0 &&
    !!activeOffer &&
    !!funnel &&
    !funnelMissing.length &&
    paymentConnected;
  list.push({
    code: "lanzamiento",
    index: "08",
    title: "Lanzamiento",
    description: "Publicás el funnel y empezás a recibir tráfico.",
    state: funnel?.status === "published" ? "done" : readyToLaunch ? "warning" : "todo",
    missing:
      funnel?.status === "published"
        ? []
        : readyToLaunch
          ? ["El funnel está listo pero todavía no lo publicaste"]
          : ["Completá los pasos anteriores para poder publicar"],
    ctaLabel: funnel ? "Ir al funnel" : "Crear funnel",
    ctaHref: funnel ? `/app/funnels/${funnel.id}` : "/app/funnels/nuevo",
  });

  const done = list.filter((step) => step.state === "done").length;
  const completion = Math.round((done / list.length) * 100);

  return {
    steps: list,
    completion,
    ready: funnel?.status === "published" && paymentConnected,
    nextStep: list.find((step) => step.state !== "done") ?? null,
  };
}

/**
 * Validaciones que debe pasar un funnel antes de publicarse.
 * Devuelve la lista de bloqueantes; vacía significa que se puede publicar.
 */
export function funnelPublishBlockers(workspaceId: string, funnelId: string): string[] {
  const blockers: string[] = [];
  const funnel = get<{ id: string; offer_id: string | null }>(
    `SELECT id, offer_id FROM funnels WHERE workspace_id = ? AND id = ?`,
    workspaceId,
    funnelId,
  );
  if (!funnel) return ["El funnel no existe."];

  const steps = listFunnelSteps(workspaceId, funnelId);
  if (!steps.some((s) => s.type === "landing")) blockers.push("El funnel no tiene una landing page.");
  if (!steps.some((s) => s.type === "checkout")) blockers.push("El funnel no tiene un paso de checkout.");
  if (!steps.some((s) => s.type === "thankyou")) blockers.push("El funnel no tiene página de gracias.");

  if (!funnel.offer_id) {
    blockers.push("El funnel no tiene una oferta asociada.");
  } else {
    const offer = get<{ price: number }>(
      `SELECT price FROM offers WHERE workspace_id = ? AND id = ?`,
      workspaceId,
      funnel.offer_id,
    );
    if (!offer || offer.price <= 0) blockers.push("La oferta asociada no tiene precio definido.");
  }

  const stripe = getIntegration(workspaceId, "stripe");
  const mercadopago = getIntegration(workspaceId, "mercadopago");
  if (stripe?.status !== "connected" && mercadopago?.status !== "connected") {
    blockers.push(
      "No hay proveedor de pago conectado: sin eso el checkout no puede cobrar.",
    );
  }

  return blockers;
}
