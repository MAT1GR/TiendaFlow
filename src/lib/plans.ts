/**
 * Definición única de los planes de TiendaFlow.
 *
 * Todo lo que dependa del plan —comisión por venta, cupos de IA, capacidad—
 * sale de acá. No hardcodees porcentajes ni topes en otro lado: si mañana
 * cambia un precio, tiene que cambiar en un solo archivo.
 *
 * ## Cómo está armada la escalera
 *
 * El modelo es el de las plataformas de infoproducto: el plan gratis no cobra
 * abono pero sí comisión, y la comisión baja a medida que sube el abono. La
 * gracia está en que cada escalón tenga una franja de facturación donde sea
 * *realmente* el más barato. Si un plan nunca es la opción más conveniente,
 * nadie lo elige nunca y solo ensucia la tabla de precios.
 *
 * Con `R` = facturación mensual del vendedor, el costo total de cada plan es
 * `abono + comisión × R`. Los puntos de cruce quedan así:
 *
 * | Plan    | Abono | Comisión | Conviene a partir de |
 * |---------|-------|----------|----------------------|
 * | Free    |  US$0 |    8%    | —                    |
 * | Starter | US$17 |    5%    | US$567/mes           |
 * | Pro     | US$60 |    2%    | US$1.433/mes         |
 * | Max     | US$80 |    1%    | US$2.000/mes         |
 *
 * Los tres cruces van en aumento (567 → 1.433 → 2.000), que es la condición
 * para que ninguno quede dominado por otro.
 *
 * Por qué Max cobra 1% y no 0%: con abono de US$80 y comisión cero, el cruce
 * contra Pro caería en US$1.000 —por debajo del cruce de Pro— y Pro pasaría a
 * ser un plan que a nadie le conviene nunca. Para poder anunciar "0% de
 * comisión" el abono de Max tendría que estar cerca de US$110.
 */

export type PlanId = "free" | "starter" | "pro" | "max";

export const PLAN_IDS: PlanId[] = ["free", "starter", "pro", "max"];

/**
 * Cupo de una función medible.
 *
 * - `month`: se reinicia el día 1 de cada mes.
 * - `total`: es una capacidad simultánea, no un consumo (ej. productos publicados).
 */
export interface Quota {
  amount: number;
  period: "month" | "total";
}

export const UNLIMITED = Number.POSITIVE_INFINITY;

export interface Plan {
  id: PlanId;
  name: string;
  /** Precio mensual en dólares. */
  priceUsd: number;
  blurb: string;
  /** Fracción del total de cada venta que se queda TiendaFlow. 0.08 = 8%. */
  commissionRate: number;
  /**
   * Facturación mensual a partir de la cual este plan sale más barato que el
   * anterior, en dólares. `null` en Free, que es el punto de partida.
   */
  worthItFromUsd: number | null;
  limits: {
    /** Generaciones con IA reales (las que consumen un proveedor). */
    aiGenerations: Quota;
    /** Productos publicados al mismo tiempo. */
    publishedProducts: Quota;
    /** Bonos por oferta. */
    bonusesPerOffer: Quota;
    /** Ofertas posteriores (upsells) por oferta. */
    upsellsPerOffer: Quota;
    /** Almacenamiento total de archivos, en megabytes. */
    storageMb: Quota;
  };
  /** Funciones que se prenden o apagan enteras según el plan. */
  features: {
    customDomain: boolean;
    cartRecovery: boolean;
    advancedAnalytics: boolean;
    affiliates: boolean;
  };
  /** Texto de la tarjeta de precios. */
  highlights: string[];
}

const q = (amount: number, period: Quota["period"]): Quota => ({ amount, period });

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceUsd: 0,
    blurb: "Vendé tu primer producto sin poner un peso por adelantado.",
    commissionRate: 0.08,
    worthItFromUsd: null,
    limits: {
      /*
       * Cinco generaciones alcanzan para completar un producto de punta a
       * punta: la carta de ventas, la oferta y la página, con margen para
       * regenerar algo que no gustó. Con menos, el vendedor choca contra el
       * tope antes de ver funcionar la app, que es la peor forma de perder a
       * alguien que todavía no pagó nada.
       */
      aiGenerations: q(5, "month"),
      publishedProducts: q(1, "total"),
      bonusesPerOffer: q(2, "total"),
      upsellsPerOffer: q(1, "total"),
      storageMb: q(100, "total"),
    },
    features: {
      customDomain: false,
      cartRecovery: false,
      advancedAnalytics: false,
      affiliates: false,
    },
    highlights: [
      "Sin abono: pagás solo cuando vendés",
      "Comisión del 8% por venta",
      "1 producto publicado",
      "5 usos de IA por mes",
    ],
  },

  starter: {
    id: "starter",
    name: "Starter",
    priceUsd: 17,
    blurb: "Cuando ya vendés todos los meses y la comisión empieza a doler.",
    commissionRate: 0.05,
    worthItFromUsd: 567,
    limits: {
      aiGenerations: q(30, "month"),
      publishedProducts: q(3, "total"),
      bonusesPerOffer: q(5, "total"),
      upsellsPerOffer: q(2, "total"),
      storageMb: q(500, "total"),
    },
    features: {
      customDomain: false,
      cartRecovery: true,
      advancedAnalytics: false,
      affiliates: false,
    },
    highlights: [
      "Comisión del 5% por venta",
      "3 productos publicados",
      "30 usos de IA por mes",
      "Recuperación de carrito",
    ],
  },

  pro: {
    id: "pro",
    name: "Pro",
    priceUsd: 60,
    blurb: "Para el que vive de esto y quiere su propia marca.",
    commissionRate: 0.02,
    worthItFromUsd: 1433,
    limits: {
      aiGenerations: q(150, "month"),
      publishedProducts: q(10, "total"),
      bonusesPerOffer: q(10, "total"),
      upsellsPerOffer: q(5, "total"),
      storageMb: q(5120, "total"),
    },
    features: {
      customDomain: true,
      cartRecovery: true,
      advancedAnalytics: true,
      affiliates: true,
    },
    highlights: [
      "Comisión del 2% por venta",
      "10 productos publicados",
      "150 usos de IA por mes",
      "Dominio propio y afiliados",
    ],
  },

  max: {
    id: "max",
    name: "Max",
    priceUsd: 80,
    blurb: "Sin topes y con la comisión más baja que damos.",
    commissionRate: 0.01,
    worthItFromUsd: 2000,
    limits: {
      aiGenerations: q(UNLIMITED, "month"),
      publishedProducts: q(UNLIMITED, "total"),
      bonusesPerOffer: q(UNLIMITED, "total"),
      upsellsPerOffer: q(UNLIMITED, "total"),
      storageMb: q(25600, "total"),
    },
    features: {
      customDomain: true,
      cartRecovery: true,
      advancedAnalytics: true,
      affiliates: true,
    },
    highlights: [
      "Comisión del 1% por venta",
      "Productos publicados sin tope",
      "IA sin tope",
      "Todo lo de Pro incluido",
    ],
  },
};

export function isPlanId(value: string): value is PlanId {
  return (PLAN_IDS as string[]).includes(value);
}

/** Plan del workspace. Cualquier valor desconocido cae en `free`, nunca rompe. */
export function planOf(plan: string | null | undefined): Plan {
  return plan && isPlanId(plan) ? PLANS[plan] : PLANS.free;
}

/** Comisión que retiene TiendaFlow sobre una venta, redondeada a dos decimales. */
export function commissionFor(plan: string | null | undefined, total: number) {
  const rate = planOf(plan).commissionRate;
  return { rate, amount: Math.round(total * rate * 100) / 100 };
}

export function formatQuota(quota: Quota) {
  if (quota.amount === UNLIMITED) return "Sin tope";
  return `${quota.amount}${quota.period === "month" ? " por mes" : ""}`;
}

/* -------------------------------------------------------------------------- */
/* Comparar planes con números propios                                         */
/* -------------------------------------------------------------------------- */

/**
 * Qué le costaría a alguien cada plan si factura `revenueUsd` por mes.
 *
 * Es la única forma honesta de recomendar un plan: en vez de decirle "pasate a
 * Pro", mostrarle que con lo que factura hoy Pro le sale más barato que Free.
 * Devuelve los cuatro planes ordenados de más barato a más caro.
 */
export function planCosts(revenueUsd: number) {
  return PLAN_IDS.map((id) => {
    const plan = PLANS[id];
    return {
      plan,
      total: plan.priceUsd + revenueUsd * plan.commissionRate,
    };
  }).sort((a, b) => a.total - b.total);
}

/** El plan más barato para esa facturación mensual. */
export function bestPlanFor(revenueUsd: number): Plan {
  return planCosts(revenueUsd)[0].plan;
}

/* -------------------------------------------------------------------------- */
/* Beneficios para la tabla de precios                                         */
/* -------------------------------------------------------------------------- */

/** El escalón anterior de la escalera. `null` en Free, que es el primero. */
export function previousPlan(id: PlanId): Plan | null {
  const index = PLAN_IDS.indexOf(id);
  return index > 0 ? PLANS[PLAN_IDS[index - 1]] : null;
}

function formatStorage(mb: number) {
  if (mb === UNLIMITED) return "Sin tope";
  return mb >= 1024 ? `${Math.round(mb / 1024)} GB` : `${mb} MB`;
}

function formatLimit(amount: number, singular: string, plural: string) {
  if (amount === UNLIMITED) return `${plural} sin tope`;
  return `${amount} ${amount === 1 ? singular : plural}`;
}

/** Los ítems se arman por pedazos, así que la mayúscula inicial se pone al final. */
function capitalizar(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Bonos y ofertas posteriores van en un solo ítem: son dos números chicos que
 * el vendedor mira juntos —cuánto puede meterle a una oferta— y separarlos
 * gasta dos renglones de la tarjeta para decir lo mismo.
 */
function offerExtras(plan: Plan) {
  const bonuses = plan.limits.bonusesPerOffer.amount;
  const upsells = plan.limits.upsellsPerOffer.amount;
  if (bonuses === UNLIMITED && upsells === UNLIMITED) {
    return "Bonos y ofertas posteriores sin tope";
  }
  const bonusesText = formatLimit(bonuses, "bono", "bonos");
  const upsellsText = formatLimit(upsells, "oferta posterior", "ofertas posteriores");
  return `${bonusesText} y ${upsellsText} por oferta`;
}

const FEATURE_LABELS: Array<[keyof Plan["features"], string]> = [
  ["cartRecovery", "Recuperación de carritos abandonados"],
  ["customDomain", "Tu dominio propio"],
  ["advancedAnalytics", "Estadísticas avanzadas"],
  ["affiliates", "Programa de afiliados"],
];

/**
 * La lista de beneficios de la tarjeta de precios, derivada de los límites.
 *
 * Sale de `limits` y `features` en vez de estar escrita a mano para que no se
 * despegue nunca de lo que la app efectivamente permite: si mañana Pro pasa a
 * 20 productos, la tarjeta lo dice sola.
 *
 * Cada plan lista solo lo que agrega sobre el anterior, con un primer ítem que
 * arrastra todo lo de abajo ("Todo lo del plan Starter"). Es la forma más corta
 * de que se lea la escalera: el que mira sabe que subir nunca le saca nada.
 */
export function planBenefits(id: PlanId): string[] {
  const plan = PLANS[id];
  const prev = previousPlan(id);
  const items: string[] = [];

  if (prev) items.push(`Todo lo del plan ${prev.name}`);

  items.push(
    `Te quedás con el ${Math.round((1 - plan.commissionRate) * 100)}% de cada venta`,
    formatLimit(plan.limits.publishedProducts.amount, "producto publicado", "productos publicados"),
    plan.limits.aiGenerations.amount === UNLIMITED
      ? "Textos e imágenes con IA sin tope"
      : `${plan.limits.aiGenerations.amount} usos de IA por mes`,
    offerExtras(plan),
    `${formatStorage(plan.limits.storageMb.amount)} para tus archivos`,
  );

  for (const [feature, label] of FEATURE_LABELS) {
    if (plan.features[feature] && !prev?.features[feature]) items.push(label);
  }

  return items.map(capitalizar);
}
