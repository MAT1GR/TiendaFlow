import "server-only";

import { all } from "@/lib/db";
import { funnelPublishBlockers } from "@/lib/launch";
import * as repo from "@/lib/repo";
import {
  PRODUCT_SECTIONS,
  STAGE_LABEL,
  STAGE_TONE,
  type ProductNavEntry,
  type ProductStage,
} from "@/lib/product-nav";
import type { Funnel, Offer, Product } from "@/lib/types";

// Se reexportan para que el código de servidor tenga un solo lugar de import.
export { PRODUCT_SECTIONS, STAGE_LABEL, STAGE_TONE };
export type { ProductNavEntry, ProductStage };

/**
 * Contexto completo de un producto.
 *
 * Es la pieza central del enfoque producto-céntrico: en vez de que cada
 * pantalla vaya a buscar por su cuenta la oferta, el funnel y las métricas,
 * todo sale de acá. Eso también es lo que después le vamos a poder pasar al
 * copiloto para que sepa sobre qué producto está trabajando el usuario.
 *
 * Regla del modelo: **un producto tiene una sola oferta**. Si por datos viejos
 * hubiera más de una, gana la más antigua y el resto queda accesible pero fuera
 * del camino principal.
 */

export interface ProductStats {
  orders: number;
  revenue: number;
  visits: number;
  conversion: number | null;
}

export interface NextStep {
  label: string;
  href: string;
  hint: string;
}

export interface ProductContext {
  product: Product;
  offer: Offer | null;
  /** Ofertas extra heredadas de datos viejos. Normalmente está vacío. */
  extraOffers: Offer[];
  funnel: Funnel | null;
  stats: ProductStats;
  stage: ProductStage;
  /** Lo que le falta al funnel para poder publicarse. */
  blockers: string[];
  /** La única acción que le proponemos al usuario ahora mismo. */
  nextStep: NextStep | null;
  publicUrl: string | null;
}

function statsFor(workspaceId: string, productId: string, funnelId: string | null): ProductStats {
  const sale = all<{ orders: number; revenue: number }>(
    `SELECT COUNT(DISTINCT o.id) AS orders,
            COALESCE(SUM(i.unit_price * i.quantity), 0) AS revenue
     FROM order_items i
     JOIN orders o ON o.id = i.order_id AND o.status = 'paid'
     WHERE i.workspace_id = ? AND i.product_id = ?`,
    workspaceId,
    productId,
  )[0] ?? { orders: 0, revenue: 0 };

  const visits = funnelId
    ? (all<{ total: number }>(
        `SELECT COUNT(*) AS total FROM analytics_events
         WHERE workspace_id = ? AND funnel_id = ? AND name = 'page_view'`,
        workspaceId,
        funnelId,
      )[0]?.total ?? 0)
    : 0;

  return {
    orders: sale.orders,
    revenue: sale.revenue,
    visits,
    conversion: visits > 0 ? (sale.orders / visits) * 100 : null,
  };
}

/** Devuelve `null` si el producto no existe o no es de este workspace. */
export function productContext(workspaceId: string, productId: string): ProductContext | null {
  const product = repo.getProduct(workspaceId, productId);
  if (!product) return null;

  const offers = repo
    .listOffers(workspaceId)
    .filter((offer) => offer.product_id === productId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const offer = offers[0] ?? null;
  const funnel = offer
    ? (repo.listFunnels(workspaceId).find((item) => item.offer_id === offer.id) ?? null)
    : null;

  const stats = statsFor(workspaceId, productId, funnel?.id ?? null);
  const blockers = funnel ? funnelPublishBlockers(workspaceId, funnel.id) : [];
  const published = funnel?.status === "published";
  const canCharge = Boolean(repo.getIntegration(workspaceId, "mercadopago")?.status === "connected")
    || Boolean(repo.getIntegration(workspaceId, "stripe")?.status === "connected");

  const stage: ProductStage = !offer
    ? "sin_oferta"
    : !funnel
      ? "sin_funnel"
      : !published
        ? "sin_publicar"
        : !canCharge
          ? "sin_cobros"
          : "vendiendo";

  const base = `/app/productos/${productId}`;

  const nextStep: NextStep | null =
    stage === "sin_oferta"
      ? {
          label: "Ponerle precio",
          href: `${base}/oferta`,
          hint: "Definí cuánto sale y qué promete. Es lo único que falta para poder armar la página.",
        }
      : stage === "sin_funnel"
        ? {
            label: "Armar la página de venta",
            href: `${base}/pagina`,
            hint: "Landing, checkout y página de gracias. La IA puede escribir la landing por vos.",
          }
        : stage === "sin_publicar"
          ? {
              label: blockers.length ? "Resolver lo que falta" : "Publicar",
              href: `${base}/pagina`,
              hint: blockers.length
                ? `Falta: ${blockers[0]}`
                : "Está todo listo. Al publicar tenés un link para empezar a vender.",
            }
          : stage === "sin_cobros"
            ? {
                label: "Conectar un medio de pago",
                href: "/app/pagos",
                hint: "Tu página ya está online, pero sin proveedor de pago los pedidos quedan pendientes.",
              }
            : null;

  return {
    product,
    offer,
    extraOffers: offers.slice(1),
    funnel,
    stats,
    stage,
    blockers,
    nextStep,
    publicUrl: funnel && published ? `/f/${repo.publicSlug(funnel)}` : null,
  };
}

/* -------------------------------------------------------------------------- */
/* El camino a la primera venta                                                */
/* -------------------------------------------------------------------------- */

export type JourneyState = "done" | "current" | "pending";

export interface JourneyStep {
  code: string;
  emoji: string;
  title: string;
  /** Una línea, en criollo, de qué se hace en este paso. */
  description: string;
  state: JourneyState;
  /** Qué falta puntualmente. Solo se muestra en el paso actual. */
  missing: string[];
  ctaLabel: string;
  ctaHref: string;
}

export interface ProductJourney {
  steps: JourneyStep[];
  /** Índice del paso actual, o `-1` si están todos hechos. */
  currentIndex: number;
  completed: number;
  total: number;
  /** `true` cuando el producto ya se puede comprar. */
  live: boolean;
}

/**
 * El camino a la primera venta, para UN producto.
 *
 * A diferencia de `getLaunchStatus`, que mira todo el workspace y mezcla
 * opcionales, acá están **solo los pasos que bloquean la venta**. Los bonos, el
 * pixel y las campañas no entran: suben la conversión, pero nadie los necesita
 * para cobrar el primer peso. Meterlos en el camino crítico es lo que hace que
 * el usuario sienta que nunca termina.
 *
 * La regla de oro de la pantalla que lo consume: **un solo paso a la vez tiene
 * detalle y botón**. Los anteriores son un tilde, los siguientes están apagados.
 */
export function productJourney(workspaceId: string, productId: string): ProductJourney | null {
  const context = productContext(workspaceId, productId);
  if (!context) return null;

  const { product, offer, funnel } = context;
  const base = `/app/productos/${productId}`;

  const files = repo.listProductFiles(workspaceId, productId);
  const hasContent = files.length > 0 || Boolean(product.description?.trim());

  const steps = funnel ? repo.listFunnelSteps(workspaceId, funnel.id) : [];
  const landingStep = steps.find((step) => step.type === "landing");
  const landingPage = landingStep ? repo.getLandingPageByStep(workspaceId, landingStep.id) : null;
  const landingSections = landingPage
    ? repo.listLandingSections(workspaceId, landingPage.id).length
    : 0;

  const canCharge =
    repo.getIntegration(workspaceId, "mercadopago")?.status === "connected" ||
    repo.getIntegration(workspaceId, "stripe")?.status === "connected";

  const published = funnel?.status === "published";

  /* --- 1. El producto --- */
  const productMissing: string[] = [];
  if (!hasContent) {
    productMissing.push("Falta subir el archivo que recibe tu comprador, o escribir de qué se trata");
  }

  /* --- 2. El precio --- */
  const priceMissing: string[] = [];
  if (!offer) priceMissing.push("Todavía no le pusiste precio");
  else if (!offer.price) priceMissing.push("El precio está en cero");

  /* --- 3. La página --- */
  const pageMissing: string[] = [];
  if (!funnel) pageMissing.push("Todavía no armaste la página de venta");
  else {
    if (!steps.some((step) => step.type === "landing")) pageMissing.push("Falta la landing");
    if (!steps.some((step) => step.type === "checkout")) pageMissing.push("Falta el checkout");
    if (!steps.some((step) => step.type === "thankyou")) pageMissing.push("Falta la página de gracias");
    if (landingStep && landingSections === 0) pageMissing.push("La landing todavía está vacía");
  }

  /* --- 4. El cobro --- */
  const chargeMissing = canCharge
    ? []
    : ["Sin un medio de pago conectado, los pedidos quedan pendientes y nadie recibe su compra"];

  /* --- 5. Publicar --- */
  const publishMissing = published
    ? []
    : pageMissing.length
      ? ["Primero resolvé lo que falta en la página"]
      : ["Está todo listo: falta apretar publicar"];

  const raw: Array<Omit<JourneyStep, "state">> = [
    {
      code: "producto",
      emoji: "📕",
      title: "Tu producto",
      description: "Qué vendés y qué recibe la persona cuando compra.",
      missing: productMissing,
      ctaLabel: "Cargar el producto",
      ctaHref: `${base}/producto`,
    },
    {
      code: "precio",
      emoji: "💰",
      title: "Tu precio",
      description: "Cuánto sale y qué promete.",
      missing: priceMissing,
      ctaLabel: offer ? "Revisar el precio" : "Ponerle precio",
      ctaHref: `${base}/oferta`,
    },
    {
      code: "pagina",
      emoji: "🛍️",
      title: "Tu página de venta",
      description: "Donde lo contás, donde te pagan y donde lo entregás.",
      missing: pageMissing,
      ctaLabel: funnel ? "Editar la página" : "Armar la página",
      ctaHref: `${base}/pagina`,
    },
    {
      code: "cobro",
      emoji: "💳",
      title: "Cómo vas a cobrar",
      description: "Mercado Pago o Stripe, con tu propia cuenta.",
      missing: chargeMissing,
      ctaLabel: "Conectar un medio de pago",
      ctaHref: `${base}/cobro`,
    },
    {
      code: "publicar",
      emoji: "🚀",
      title: "Publicar",
      description: "Tenés un link para empezar a vender.",
      missing: publishMissing,
      ctaLabel: "Ir a publicar",
      ctaHref: `${base}/pagina`,
    },
  ];

  // El primer paso con algo pendiente es el actual; los de antes van como
  // hechos aunque tengan detalles menores, para no dejar al usuario trabado.
  const firstPending = raw.findIndex((step) => step.missing.length > 0);

  const journey = raw.map((step, index) => ({
    ...step,
    state: (firstPending === -1
      ? "done"
      : index < firstPending
        ? "done"
        : index === firstPending
          ? "current"
          : "pending") as JourneyState,
  }));

  return {
    steps: journey,
    currentIndex: firstPending,
    completed: journey.filter((step) => step.state === "done").length,
    total: journey.length,
    live: published && canCharge,
  };
}

/** Sugerencias para después de publicar. No bloquean nada. */
export function productBoosters(workspaceId: string, productId: string) {
  const context = productContext(workspaceId, productId);
  if (!context?.offer) return [];

  const offerId = context.offer.id;
  const base = `/app/productos/${productId}`;

  const boosters = [
    {
      code: "bonos",
      title: "Sumale bonos",
      description: "Regalos que hacen que la oferta sea difícil de rechazar.",
      done: repo.listBonuses(workspaceId, offerId).length > 0,
      href: `${base}/oferta`,
    },
    {
      code: "bump",
      title: "Agregá un order bump",
      description: "Un extra barato que se tilda en el checkout.",
      done: repo.listOrderBumps(workspaceId, offerId).length > 0,
      href: `${base}/oferta`,
    },
    {
      code: "upsell",
      title: "Ofrecé un upsell",
      description: "Una segunda compra justo después de la primera.",
      done: repo.listUpsells(workspaceId, offerId).length > 0,
      href: `${base}/oferta`,
    },
    {
      code: "pixel",
      title: "Medí con Meta",
      description: "Para saber qué anuncio trajo cada venta.",
      done: repo.getIntegration(workspaceId, "meta")?.status === "connected",
      href: "/app/integraciones/meta",
    },
  ];

  return boosters;
}

/* -------------------------------------------------------------------------- */
/* Lista para el selector del sidebar                                          */
/* -------------------------------------------------------------------------- */

/**
 * Productos del workspace con su etapa, para el selector del sidebar.
 *
 * Se resuelve en tres consultas fijas en vez de armar el contexto completo de
 * cada producto: esto corre en TODAS las pantallas de la app, así que no puede
 * escalar con la cantidad de productos.
 */
export function productNavList(workspaceId: string): ProductNavEntry[] {
  const products = all<{ id: string; name: string }>(
    `SELECT id, name FROM products
     WHERE workspace_id = ? AND status != 'archived'
     ORDER BY created_at DESC`,
    workspaceId,
  );
  if (products.length === 0) return [];

  const offers = all<{ product_id: string; offer_id: string }>(
    `SELECT product_id, id AS offer_id FROM offers
     WHERE workspace_id = ? AND product_id IS NOT NULL`,
    workspaceId,
  );
  const offerByProduct = new Map(offers.map((row) => [row.product_id, row.offer_id]));

  const funnels = all<{ offer_id: string; status: string }>(
    `SELECT offer_id, status FROM funnels WHERE workspace_id = ? AND offer_id IS NOT NULL`,
    workspaceId,
  );
  const funnelByOffer = new Map(funnels.map((row) => [row.offer_id, row.status]));

  const canCharge =
    repo.getIntegration(workspaceId, "mercadopago")?.status === "connected" ||
    repo.getIntegration(workspaceId, "stripe")?.status === "connected";

  return products.map((product) => {
    const offerId = offerByProduct.get(product.id);
    const funnelStatus = offerId ? funnelByOffer.get(offerId) : undefined;

    const stage: ProductStage = !offerId
      ? "sin_oferta"
      : !funnelStatus
        ? "sin_funnel"
        : funnelStatus !== "published"
          ? "sin_publicar"
          : !canCharge
            ? "sin_cobros"
            : "vendiendo";

    return { id: product.id, name: product.name, stage };
  });
}

/** Secciones de un producto. Es la navegación real del espacio de trabajo. */
