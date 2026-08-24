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
 * | Plan    | Abono      | Comisión | Conviene a partir de |
 * |---------|------------|----------|----------------------|
 * | Free    |    US$0    |    8%    | —                    |
 * | Creator |  US$9/mes  |    5%    | US$300/mes           |
 * | Pro     | US$17/mes  |    3%    | US$400/mes           |
 *
 * Los dos cruces van en aumento (300 → 400), que es la condición para que
 * ninguno quede dominado por otro: entre esos dos números Creator es
 * estrictamente el más barato de los tres.
 *
 * Por qué Pro cobra 3% y no 0%: con abono de US$17 y comisión cero el cruce
 * contra Creator caería en US$160 —por debajo del cruce de Creator— y Creator
 * pasaría a ser un plan que a nadie le conviene nunca.
 *
 * ## Por qué en dólares
 *
 * TiendaFlow se cobra en dólares para que el precio signifique lo mismo en
 * todos los países y no haya que retocarlo cada vez que se mueve una moneda
 * local. Quien paga por Mercado Pago ve el equivalente en su moneda al cambio
 * del día, y por eso el importe puede variar de un mes a otro: lo fijo es el
 * precio en dólares, no el débito.
 *
 * Ojo con mezclar monedas: la comisión por venta se calcula sobre el total de
 * la orden, que está en la moneda del vendedor. Es una fracción, así que no
 * necesita conversión —el 5% de una venta en pesos son pesos—. El abono es lo
 * único que vive en dólares.
 */

export type PlanId = "free" | "creator" | "pro";

export const PLAN_IDS: PlanId[] = ["free", "creator", "pro"];

/**
 * Nombres viejos que todavía pueden estar guardados en `subscriptions.plan`.
 *
 * La escalera pasó de cuatro escalones a tres. Sin esta tabla, un workspace
 * con `starter` o `max` guardado caería en `free` la próxima vez que se lea:
 * alguien que estaba pagando pasaría a comisión del 8% sin que nadie lo toque.
 * Se mapea hacia arriba, nunca hacia abajo — ante la duda, a favor del que ya
 * estaba pagando.
 */
const PLANES_VIEJOS: Record<string, PlanId> = {
  starter: "creator",
  max: "pro",
};

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
  /** Abono mensual en dólares. */
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

  creator: {
    id: "creator",
    name: "Creator",
    priceUsd: 9,
    blurb: "Cuando ya vendés todos los meses y la comisión empieza a doler.",
    commissionRate: 0.05,
    worthItFromUsd: 300,
    limits: {
      aiGenerations: q(50, "month"),
      /*
       * Sin tope de productos ya en Creator.
       * El límite de productos es lo primero contra lo que choca alguien que
       * empieza a funcionar, y cobrarle el salto más caro justo ahí castiga
       * exactamente el momento que queremos premiar. Pro no se diferencia por
       * cuántos productos podés tener sino por cuánto te queda de cada venta.
       */
      publishedProducts: q(UNLIMITED, "total"),
      bonusesPerOffer: q(10, "total"),
      upsellsPerOffer: q(3, "total"),
      storageMb: q(2048, "total"),
    },
    features: {
      customDomain: false,
      cartRecovery: true,
      advancedAnalytics: false,
      affiliates: false,
    },
    highlights: [
      "Comisión del 5% por venta",
      "Productos publicados sin tope",
      "50 usos de IA por mes",
      "Recuperación de carrito",
    ],
  },

  pro: {
    id: "pro",
    name: "Pro",
    priceUsd: 17,
    blurb: "Para el que vive de esto: la comisión más baja y sin topes.",
    commissionRate: 0.03,
    worthItFromUsd: 400,
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
      "Comisión del 3% por venta",
      "IA sin tope",
      "Dominio propio y afiliados",
      "Estadísticas avanzadas",
    ],
  },
};

export function isPlanId(value: string): value is PlanId {
  return (PLAN_IDS as string[]).includes(value);
}

/**
 * Plan del workspace.
 *
 * Traduce los nombres viejos y cae en `free` solo si el valor no significa
 * nada. Nunca rompe.
 */
export function planOf(plan: string | null | undefined): Plan {
  if (!plan) return PLANS.free;
  if (isPlanId(plan)) return PLANS[plan];
  const migrado = PLANES_VIEJOS[plan];
  return migrado ? PLANS[migrado] : PLANS.free;
}

/** Comisión que retiene TiendaFlow sobre una venta, redondeada a dos decimales. */
export function commissionFor(plan: string | null | undefined, total: number) {
  const rate = planOf(plan).commissionRate;
  return { rate, amount: Math.round(total * rate * 100) / 100 };
}

/**
 * El abono, como se escribe en una tarjeta de precios.
 *
 * Está acá y no en cada pantalla porque "Gratis" y "$7.990" son la misma
 * decisión: si mañana el plan gratuito pasa a costar algo, no puede quedar una
 * pantalla diciendo "Gratis" porque nadie se acordó de tocarla.
 */
export function planPriceLabel(plan: Plan) {
  return plan.priceUsd === 0 ? "Gratis" : usd(plan.priceUsd);
}

/**
 * Una cifra en dólares.
 *
 * Se escribe "US$9" y no "$9": en la mitad de los países donde va a leerse
 * esta página el signo pelado significa la moneda local, y el precio de un
 * plan es justo el número que no se puede prestar a confusión.
 */
export function usd(amount: number) {
  return `US$${amount.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
}

/** La comisión como se escribe: "8%", "1,5%". Sin decimales cuando es entero. */
export function commissionLabel(plan: Plan) {
  const porcentaje = plan.commissionRate * 100;
  return `${Number.isInteger(porcentaje) ? porcentaje : porcentaje.toFixed(1).replace(".", ",")}%`;
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
 * Devuelve los tres planes ordenados de más barato a más caro.
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
 * 20 productos, la tarjeta lo dice sola. Es también lo que nos impide anunciar
 * una función que todavía no existe: si no hay una llave que la prenda, no hay
 * renglón que la prometa.
 *
 * Cada plan lista solo lo que agrega sobre el anterior, con un primer ítem que
 * arrastra todo lo de abajo ("Todo lo del plan Creator"). Es la forma más corta
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
