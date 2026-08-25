import "server-only";

import { cache } from "react";

import { all, get } from "@/lib/db";
import { readIdealClient } from "@/lib/ai/research";
import { funnelPublishBlockers } from "@/lib/launch";
import { withFlow } from "@/lib/product-flow";
import * as repo from "@/lib/repo";
import {
  PRODUCT_SECTIONS,
  STAGE_LABEL,
  STAGE_TONE,
  sectionBlurb,
  type ProductNavEntry,
  type ProductStage,
} from "@/lib/product-nav";
import type { Funnel, Offer, Product } from "@/lib/types";

// Se reexportan para que el código de servidor tenga un solo lugar de import.
export { PRODUCT_SECTIONS, STAGE_LABEL, STAGE_TONE, sectionBlurb };
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

/**
 * Devuelve `null` si el producto no existe o no es de este workspace.
 *
 * Va memoizado por request con `cache()`. No es un detalle: en una sola
 * navegación al espacio de trabajo del producto, esta función se llama tres
 * veces —el layout la pide, el `productJourney` la pide de nuevo por dentro, y
 * la pantalla la vuelve a pedir— y cada llamada disparaba las mismas ocho
 * consultas. `cache()` las deja en una.
 */
export const productContext = cache(function productContext(
  workspaceId: string,
  productId: string,
): ProductContext | null {
  const product = repo.getProduct(workspaceId, productId);
  if (!product) return null;

  /*
   * Las ofertas y el funnel se buscan por su clave, no filtrando en memoria.
   *
   * Antes esto traía TODAS las ofertas y TODOS los funnels del workspace para
   * quedarse con uno. Con tres productos da igual; con doscientos, cada click
   * en el panel arrastra el catálogo entero.
   */
  const offers = all<Offer>(
    `SELECT * FROM offers WHERE workspace_id = ? AND product_id = ? ORDER BY created_at`,
    workspaceId,
    productId,
  );

  const offer = offers[0] ?? null;
  const funnel = offer
    ? get<Funnel>(
        `SELECT * FROM funnels WHERE workspace_id = ? AND offer_id = ? LIMIT 1`,
        workspaceId,
        offer.id,
      )
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
            hint: "La página donde lo contás y donde te pagan. La IA puede escribirla por vos.",
          }
        : stage === "sin_publicar"
          ? {
              label: blockers.length ? "Resolver lo que falta" : "Publicar",
              href: blockers.length ? `${base}/pagina` : `${base}/publicar`,
              hint: blockers.length
                ? `Falta: ${blockers[0]}`
                : "Está todo listo. Al publicar tenés un link para empezar a vender.",
            }
          : stage === "sin_cobros"
            ? {
                label: "Conectar un medio de pago",
                href: `${base}/cobro`,
                hint: "Tu página ya está online, pero sin un medio de pago los pedidos quedan pendientes.",
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
});

/* -------------------------------------------------------------------------- */
/* El GPS del producto                                                         */
/* -------------------------------------------------------------------------- */

/**
 * `todo`      → falta y bloquea la venta.
 * `done`      → resuelto.
 * `optional`  → suma, pero nadie lo necesita para cobrar el primer peso.
 * `waiting`   → depende de que resuelvas un paso anterior.
 */
export type StepState = "done" | "todo" | "optional" | "waiting";

export interface JourneyStep {
  code: string;
  emoji: string;
  title: string;
  /** El estado en una línea: "Listo", "Falta conectar un medio de pago". */
  status: string;
  state: StepState;
  href: string;
  /** Los opcionales no cuentan para el porcentaje. */
  required: boolean;
  /** El único paso que le proponemos hacer ahora. */
  next: boolean;
}

export interface ProductJourney {
  steps: JourneyStep[];
  /** Pasos obligatorios resueltos. */
  completed: number;
  /** Total de pasos obligatorios. Los opcionales quedan afuera. */
  total: number;
  percent: number;
  /** `true` cuando el producto ya se puede comprar de verdad. */
  live: boolean;
  nextStep: JourneyStep | null;
}

/**
 * El camino a la primera venta, para UN producto.
 *
 * Es el GPS de la pantalla de Resumen: seis líneas, cada una con su estado en
 * criollo y su link. No hay que buscar nada — si algo falta, la línea dice qué
 * falta y se clickea.
 *
 * Regla del porcentaje: **los pasos opcionales no cuentan**. Si contaran, un
 * producto que ya vende perfecto nunca llegaría al 100% y la barra pasaría de
 * ser una guía a ser un reproche.
 */
export const productJourney = cache(function productJourney(
  workspaceId: string,
  productId: string,
): ProductJourney | null {
  const context = productContext(workspaceId, productId);
  if (!context) return null;

  const { product, offer, funnel } = context;
  const base = `/app/productos/${productId}`;

  const files = repo.listProductFiles(workspaceId, productId);
  const hasContent = files.length > 0 || Boolean(product.description?.trim());

  const funnelSteps = funnel ? repo.listFunnelSteps(workspaceId, funnel.id) : [];
  const landingStep = funnelSteps.find((step) => step.type === "landing");
  const landingPage = landingStep ? repo.getLandingPageByStep(workspaceId, landingStep.id) : null;
  const landingSections = landingPage
    ? repo.listLandingSections(workspaceId, landingPage.id).length
    : 0;

  const mercadopago = repo.getIntegration(workspaceId, "mercadopago")?.status === "connected";
  const stripe = repo.getIntegration(workspaceId, "stripe")?.status === "connected";
  const canCharge = mercadopago || stripe;

  const extras = offer
    ? repo.listOrderBumps(workspaceId, offer.id).length +
      repo.listUpsells(workspaceId, offer.id).length
    : 0;

  const published = funnel?.status === "published";
  const productDone = hasContent;
  const clienteDone = Boolean(readIdealClient(workspaceId, productId));
  const offerDone = Boolean(offer && offer.price > 0);

  const pageIssue = !funnel
    ? "Falta armar la página"
    : !funnelSteps.some((step) => step.type === "landing")
      ? "Falta la página donde lo contás"
      : !funnelSteps.some((step) => step.type === "checkout")
        ? "Falta la página donde te pagan"
        : !funnelSteps.some((step) => step.type === "thankyou")
          ? "Falta la página de gracias"
          : landingSections === 0
            ? "La página todavía está vacía"
            : null;

  const chargeStatus = canCharge
    ? `${[mercadopago ? "Mercado Pago" : null, stripe ? "Stripe" : null].filter(Boolean).join(" y ")} conectado`
    : "Falta conectar un medio de pago";

  const raw: Array<Omit<JourneyStep, "next">> = [
    {
      code: "producto",
      emoji: "📕",
      title: "Producto",
      status: productDone ? "Listo" : "Falta subir el archivo o contar de qué se trata",
      state: productDone ? "done" : "todo",
      href: `${base}/producto`,
      required: true,
    },
    /*
     * Conocer al cliente no bloquea la venta, pero cambia todo lo que se
     * escribe después. Va en el recorrido —y no escondido en un menú— porque
     * si no aparece acá nadie lo encuentra hasta que ya escribió la página
     * entera hablándole a nadie.
     */
    {
      code: "cliente",
      emoji: "🎯",
      title: "Mi cliente",
      status: clienteDone
        ? "Investigado"
        : "Opcional, pero mejora todo lo que escribe la IA después",
      state: clienteDone ? "done" : "optional",
      href: `${base}/cliente`,
      required: false,
    },
    {
      code: "oferta",
      emoji: "💰",
      title: "Oferta",
      status: offerDone ? "Lista" : offer ? "El precio está en cero" : "Falta ponerle precio",
      state: offerDone ? "done" : "todo",
      href: `${base}/oferta`,
      required: true,
    },
    {
      code: "pagina",
      emoji: "🛍️",
      title: "Página de venta",
      status: !offerDone ? "Primero necesitás la oferta" : (pageIssue ?? "Lista"),
      state: !offerDone ? "waiting" : pageIssue ? "todo" : "done",
      href: `${base}/pagina`,
      required: true,
    },
    {
      code: "cobro",
      emoji: "💳",
      title: "Cobros",
      status: chargeStatus,
      state: canCharge ? "done" : "todo",
      href: `${base}/cobro`,
      required: true,
    },
    {
      code: "despues",
      emoji: "🎁",
      title: "Después de comprar",
      status:
        extras > 0
          ? `${extras} ${extras === 1 ? "oferta extra activa" : "ofertas extra activas"}`
          : "Opcional",
      state: extras > 0 ? "done" : "optional",
      href: `${base}/despues`,
      required: false,
    },
    {
      code: "publicar",
      emoji: "🚀",
      title: "Publicar",
      status: published
        ? "Publicado"
        : pageIssue || !offerDone
          ? "Esperando configuración"
          : "Todo listo para publicar",
      state: published ? "done" : pageIssue || !offerDone ? "waiting" : "todo",
      href: `${base}/publicar`,
      required: true,
    },
  ];

  // El siguiente paso es el primero obligatorio que se puede hacer ahora. Los
  // que están esperando a otro paso no se ofrecen: llevarían a una pantalla que
  // solo dice "primero hacé otra cosa".
  const nextIndex = raw.findIndex((step) => step.required && step.state === "todo");

  const steps: JourneyStep[] = raw.map((step, index) => ({ ...step, next: index === nextIndex }));

  const required = steps.filter((step) => step.required);
  const completed = required.filter((step) => step.state === "done").length;

  return {
    steps,
    completed,
    total: required.length,
    percent: Math.round((completed / required.length) * 100),
    live: published && canCharge,
    nextStep: steps.find((step) => step.next) ?? null,
  };
});

/* -------------------------------------------------------------------------- */
/* Qué te conviene hacer ahora                                                 */
/* -------------------------------------------------------------------------- */

export interface ProductAdvice {
  emoji: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}

/**
 * La tarjeta "TiendaFlow recomienda".
 *
 * Una sola recomendación a la vez, siempre la más urgente, y **solo cuando el
 * producto ya está a la venta**.
 *
 * Antes de publicar también daba consejos, y el consejo era siempre el mismo:
 * cuál era el paso siguiente. Eso ya lo dice el recorrido, que está justo
 * arriba y lo dice mejor —con los seis pasos, cuáles están hechos y en cuál
 * vas—, así que la tarjeta terminaba siendo la misma frase escrita dos veces en
 * la misma pantalla, con dos botones que llevaban al mismo lado. Cuando algo
 * aparece duplicado, lo que se pone en duda es si son dos cosas distintas.
 *
 * Después de publicar sí tiene algo propio que decir: ahí ya no habla de lo que
 * falta configurar sino de lo que está pasando de verdad con las visitas y las
 * ventas, que es información que el recorrido no tiene.
 */
export function productAdvice(workspaceId: string, productId: string): ProductAdvice | null {
  const context = productContext(workspaceId, productId);
  const journey = productJourney(workspaceId, productId);
  if (!context || !journey) return null;

  // Todavía no vende: de esto se ocupa el recorrido, y con más detalle.
  if (!journey.live) return null;

  const { offer, stats } = context;
  const base = `/app/productos/${productId}`;

  if (stats.visits === 0) {
    return {
      emoji: "📣",
      title: "Ya podés vender, falta que llegue gente",
      body: "Tu página está online pero todavía nadie la vio. Compartí tu link o armá un anuncio.",
      ctaLabel: "Conseguir visitas",
      ctaHref: "/app/marketing",
    };
  }

  if (stats.orders === 0) {
    return {
      emoji: "📈",
      title: "Tu página recibe visitas pero todavía nadie compró",
      body: `Entraron ${stats.visits} ${stats.visits === 1 ? "persona" : "personas"} y ninguna terminó la compra. Casi siempre es la promesa, el precio o que falta una garantía.`,
      ctaLabel: "Revisar mi página",
      ctaHref: `${base}/pagina`,
    };
  }

  // Conversión baja: menos de una compra cada cien visitas, ya con tráfico real.
  if (stats.conversion !== null && stats.conversion < 1 && stats.visits >= 100) {
    return {
      emoji: "📈",
      title: "Tu página recibe visitas pero pocas personas compran",
      body: "De cada cien personas que entran, compra menos de una. Revisá el título, la garantía y el botón de compra.",
      ctaLabel: "Ver mi página",
      ctaHref: `${base}/pagina`,
    };
  }

  const extras = offer
    ? repo.listOrderBumps(workspaceId, offer.id).length +
      repo.listUpsells(workspaceId, offer.id).length
    : 0;

  if (extras === 0) {
    return {
      emoji: "🎁",
      title: "Cada venta podría dejarte más",
      body: "Ya estás vendiendo. Ofrecerle algo más a quien acaba de comprarte es la forma más barata de facturar más sin conseguir más gente.",
      ctaLabel: "Agregar una oferta extra",
      ctaHref: `${base}/despues`,
    };
  }

  const bonuses = offer ? repo.listBonuses(workspaceId, offer.id).length : 0;
  if (bonuses === 0) {
    return {
      emoji: "🎁",
      title: "Probá sumarle un bono",
      body: "Un regalo que acompaña al producto hace la oferta más difícil de rechazar, y lo producís una sola vez.",
      ctaLabel: "Crear un bono",
      ctaHref: `${base}/oferta`,
    };
  }

  return null;
}

/** Sugerencias para después de publicar. No bloquean nada. */
export function productBoosters(workspaceId: string, productId: string) {
  const context = productContext(workspaceId, productId);
  if (!context?.offer) return [];

  const offerId = context.offer.id;
  const base = `/app/productos/${productId}`;

  return [
    {
      code: "bonos",
      title: "Sumale bonos",
      description: "Regalos que hacen que la oferta sea difícil de rechazar.",
      done: repo.listBonuses(workspaceId, offerId).length > 0,
      href: `${base}/oferta`,
    },
    {
      code: "bump",
      title: "Ofrecé algo extra al pagar",
      description: "Un agregado barato que se tilda con un clic.",
      done: repo.listOrderBumps(workspaceId, offerId).length > 0,
      href: `${base}/despues`,
    },
    {
      code: "upsell",
      title: "Ofrecé algo más después de comprar",
      description: "Una segunda compra justo después de la primera.",
      done: repo.listUpsells(workspaceId, offerId).length > 0,
      href: `${base}/despues`,
    },
    {
      code: "pixel",
      title: "Medí de dónde vienen tus ventas",
      description: "Para saber qué anuncio trajo cada compra.",
      done: repo.getIntegration(workspaceId, "meta")?.status === "connected",
      href: "/app/integraciones/meta",
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* La biblioteca de productos                                                  */
/* -------------------------------------------------------------------------- */

/** Los tres estados que ve el usuario en la biblioteca. */
export type LibraryStatus = "listo" | "preparacion" | "borrador";

export interface ProductCard {
  id: string;
  name: string;
  subtitle: string | null;
  typeLabel: string;
  emoji: string;
  price: number;
  currency: string;
  status: LibraryStatus;
  /** "Listo para vender", "Falta conectar el pago", "Falta ponerle precio". */
  statusLabel: string;
  orders: number;
  revenue: number;
  href: string;
  ctaLabel: string;
  isDemo: boolean;
}

const TYPE_EMOJI: Record<string, string> = {
  ebook: "📕",
  pdf: "📄",
  template: "🧩",
  guide: "🧭",
  file: "📦",
  other: "📦",
};

const TYPE_LABEL: Record<string, string> = {
  ebook: "Ebook",
  pdf: "PDF",
  template: "Plantilla",
  guide: "Guía",
  file: "Archivo digital",
  other: "Producto digital",
};

/**
 * Los productos del workspace, listos para dibujar como tarjetas.
 *
 * Se resuelve en cinco consultas fijas y no una por producto: esta pantalla es
 * de las más visitadas y no puede escalar con el tamaño del catálogo.
 */
export function productLibrary(workspaceId: string): ProductCard[] {
  const products = repo.listProducts(workspaceId, false);
  if (products.length === 0) return [];

  const offers = all<{ id: string; product_id: string; price: number; currency: string }>(
    `SELECT id, product_id, price, currency FROM offers
     WHERE workspace_id = ? AND product_id IS NOT NULL
     ORDER BY created_at`,
    workspaceId,
  );
  const offerByProduct = new Map<string, (typeof offers)[number]>();
  for (const offer of offers) {
    if (!offerByProduct.has(offer.product_id)) offerByProduct.set(offer.product_id, offer);
  }

  const funnels = all<{ offer_id: string; status: string }>(
    `SELECT offer_id, status FROM funnels WHERE workspace_id = ? AND offer_id IS NOT NULL`,
    workspaceId,
  );
  const funnelByOffer = new Map(funnels.map((row) => [row.offer_id, row.status]));

  const stats = all<{ product_id: string; orders: number; revenue: number }>(
    `SELECT i.product_id AS product_id, COUNT(DISTINCT o.id) AS orders,
            COALESCE(SUM(i.unit_price * i.quantity), 0) AS revenue
     FROM order_items i
     JOIN orders o ON o.id = i.order_id AND o.status = 'paid'
     WHERE i.workspace_id = ? AND i.product_id IS NOT NULL
     GROUP BY i.product_id`,
    workspaceId,
  );
  const statsByProduct = new Map(stats.map((row) => [row.product_id, row]));

  const canCharge =
    repo.getIntegration(workspaceId, "mercadopago")?.status === "connected" ||
    repo.getIntegration(workspaceId, "stripe")?.status === "connected";

  return products.map((product) => {
    const offer = offerByProduct.get(product.id) ?? null;
    const funnelStatus = offer ? funnelByOffer.get(offer.id) : undefined;
    const published = funnelStatus === "published";
    const stat = statsByProduct.get(product.id);

    // El estado dice **qué falta**, no en qué etapa abstracta está. Es la
    // diferencia entre "sin_funnel" y "falta armar la página de venta".
    let status: LibraryStatus;
    let statusLabel: string;

    if (published && canCharge) {
      status = "listo";
      statusLabel = "Listo para vender";
    } else if (published) {
      status = "preparacion";
      statusLabel = "Falta conectar el pago";
    } else if (!offer) {
      status = "borrador";
      statusLabel = "Falta ponerle precio";
    } else if (!funnelStatus) {
      status = "preparacion";
      statusLabel = "Falta armar la página de venta";
    } else {
      status = "preparacion";
      statusLabel = "Falta publicarlo";
    }

    return {
      id: product.id,
      name: product.name,
      subtitle: product.subtitle,
      typeLabel: TYPE_LABEL[product.type] ?? "Producto digital",
      emoji: TYPE_EMOJI[product.type] ?? "📦",
      price: offer?.price ?? product.base_price,
      currency: offer?.currency ?? product.currency,
      status,
      statusLabel,
      orders: stat?.orders ?? 0,
      revenue: stat?.revenue ?? 0,
      href: `/app/productos/${product.id}`,
      ctaLabel: status === "listo" ? "Abrir producto" : "Continuar",
      isDemo: Boolean(product.is_demo),
    };
  });
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
