/**
 * Definición única de los planes de TiendaFlow.
 *
 * Todo lo que dependa del plan —comisión por venta, cupos de IA, límites de
 * capacidad— sale de acá. No hardcodees porcentajes ni topes en otro lado: si
 * mañana cambia un precio, tiene que cambiar en un solo archivo.
 *
 * El modelo es el mismo de las plataformas de infoproducto: el plan gratis no
 * cobra abono pero sí comisión por venta, y la comisión baja a medida que el
 * abono sube. Quien factura mucho termina eligiendo el plan caro porque le
 * conviene.
 */

export type PlanId = "free" | "starter" | "pro" | "max";

export const PLAN_IDS: PlanId[] = ["free", "starter", "pro", "max"];

/**
 * Cupo de una función medible.
 *
 * - `once`: se cuenta sobre toda la vida del workspace (el regalo del plan free).
 * - `month`: se reinicia cada mes calendario.
 * - `total`: es una capacidad simultánea, no un consumo (ej. cantidad de funnels).
 */
export interface Quota {
  amount: number;
  period: "once" | "month" | "total";
}

export const UNLIMITED = Number.POSITIVE_INFINITY;

export interface Plan {
  id: PlanId;
  name: string;
  /** Precio mensual en dólares. */
  priceUsd: number;
  blurb: string;
  /** Fracción del total de cada venta que se queda TiendaFlow. 0.10 = 10%. */
  commissionRate: number;
  limits: {
    /** Generaciones con IA que puede pedir el workspace. */
    aiGenerations: Quota;
    /** Funnels publicados al mismo tiempo. */
    funnels: Quota;
    /** Bonos por oferta. */
    bonusesPerOffer: Quota;
    /** Upsells por oferta. */
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
    blurb: "Para validar tu primer producto digital.",
    commissionRate: 0.1,
    limits: {
      aiGenerations: q(1, "once"),
      funnels: q(1, "total"),
      bonusesPerOffer: q(1, "total"),
      upsellsPerOffer: q(1, "total"),
      storageMb: q(50, "total"),
    },
    features: {
      customDomain: false,
      cartRecovery: false,
      advancedAnalytics: false,
      affiliates: false,
    },
    highlights: [
      "1 funnel publicado",
      "1 generación con IA (una sola vez)",
      "Comisión TiendaFlow 10%",
      "Checkout, bump y 1 upsell",
    ],
  },

  starter: {
    id: "starter",
    name: "Starter",
    priceUsd: 19,
    blurb: "Para arrancar tu negocio digital en serio.",
    commissionRate: 0.08,
    limits: {
      aiGenerations: q(4, "month"),
      funnels: q(2, "total"),
      bonusesPerOffer: q(2, "total"),
      upsellsPerOffer: q(1, "total"),
      storageMb: q(200, "total"),
    },
    features: {
      customDomain: false,
      cartRecovery: true,
      advancedAnalytics: false,
      affiliates: false,
    },
    highlights: [
      "2 funnels publicados",
      "4 generaciones con IA por mes",
      "Comisión TiendaFlow 8%",
      "Recuperación de carrito",
    ],
  },

  pro: {
    id: "pro",
    name: "Pro",
    priceUsd: 60,
    blurb: "Para negocios digitales que ya facturan.",
    commissionRate: 0.06,
    limits: {
      aiGenerations: q(20, "month"),
      funnels: q(5, "total"),
      bonusesPerOffer: q(3, "total"),
      upsellsPerOffer: q(2, "total"),
      storageMb: q(500, "total"),
    },
    features: {
      customDomain: true,
      cartRecovery: true,
      advancedAnalytics: true,
      affiliates: true,
    },
    highlights: [
      "5 funnels publicados",
      "20 generaciones con IA por mes",
      "Comisión TiendaFlow 6%",
      "Dominio propio y afiliados",
    ],
  },

  max: {
    id: "max",
    name: "Max",
    priceUsd: 100,
    blurb: "Sin techo. La comisión más baja.",
    commissionRate: 0.02,
    limits: {
      aiGenerations: q(UNLIMITED, "month"),
      funnels: q(UNLIMITED, "total"),
      bonusesPerOffer: q(5, "total"),
      upsellsPerOffer: q(3, "total"),
      storageMb: q(1024, "total"),
    },
    features: {
      customDomain: true,
      cartRecovery: true,
      advancedAnalytics: true,
      affiliates: true,
    },
    highlights: [
      "Funnels ilimitados",
      "IA sin tope",
      "Comisión TiendaFlow 2%",
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
  const suffix = quota.period === "month" ? " por mes" : quota.period === "once" ? " (una vez)" : "";
  return `${quota.amount}${suffix}`;
}
