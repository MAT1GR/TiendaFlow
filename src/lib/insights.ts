import "server-only";

import {
  compare,
  getFunnelMetrics,
  getTakeRates,
  getTotals,
  previousRange,
  type DateRange,
} from "@/lib/analytics";
import { getIntegration } from "@/lib/repo";
import { formatMoney, formatPercent } from "@/lib/utils";

export interface Insight {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "success";
  actionLabel: string;
  actionHref: string;
  analysisHref: string;
}

/**
 * Insights del dashboard.
 *
 * Se calculan con reglas sobre los datos reales del workspace: comparan el
 * período actual contra el anterior y miran las tasas de cada paso del funnel.
 * Cuando no hay volumen suficiente, el insight lo dice en vez de afirmar una
 * tendencia que los datos no soportan.
 */
export function buildInsights(workspaceId: string, range: DateRange): Insight[] {
  const insights: Insight[] = [];

  const current = getTotals(workspaceId, range);
  const previous = getTotals(workspaceId, previousRange(range));
  const takeRates = getTakeRates(workspaceId, range);
  const funnels = getFunnelMetrics(workspaceId, range);

  const revenueDelta = compare(current.revenue, previous.revenue).deltaPercent;
  const conversionDelta = compare(current.conversionRate, previous.conversionRate).deltaPercent;

  const lowVolume = current.visitors < 100 && current.orders < 5;

  if (lowVolume) {
    insights.push({
      id: "low-volume",
      title: "Todavía no hay tráfico suficiente para leer tendencias",
      body: `En este período registramos ${current.visitors} visitantes y ${current.orders} ventas. Publicá el funnel y mandá tráfico: con estos números cualquier variación es ruido.`,
      severity: "info",
      actionLabel: "Ir a Modo Lanzamiento",
      actionHref: "/app/lanzamiento",
      analysisHref: "/app/analytics",
    });
  }

  if (!lowVolume && revenueDelta !== null && Math.abs(revenueDelta) >= 10) {
    const up = revenueDelta > 0;
    insights.push({
      id: "revenue-trend",
      title: up
        ? `Tu facturación subió ${formatPercent(Math.abs(revenueDelta))} contra el período anterior`
        : `Tu facturación bajó ${formatPercent(Math.abs(revenueDelta))} contra el período anterior`,
      body: `Pasaste de ${formatMoney(previous.revenue, "ARS", true)} a ${formatMoney(
        current.revenue,
        "ARS",
        true,
      )}. ${up ? "Mirá qué campaña la está empujando antes de escalar." : "Revisá qué paso del funnel cambió."}`,
      severity: up ? "success" : "warning",
      actionLabel: up ? "Ver campañas" : "Revisar funnel",
      actionHref: up ? "/app/marketing" : "/app/funnels",
      analysisHref: "/app/analytics",
    });
  }

  if (!lowVolume && conversionDelta !== null && conversionDelta <= -10) {
    insights.push({
      id: "conversion-drop",
      title: `Tu conversión cayó ${formatPercent(Math.abs(conversionDelta))}`,
      body: `Pasaste de ${formatPercent(previous.conversionRate)} a ${formatPercent(
        current.conversionRate,
      )} con un volumen de tráfico parecido. El primer lugar donde mirar es el checkout.`,
      severity: "warning",
      actionLabel: "Optimizar funnel",
      actionHref: "/app/funnels",
      analysisHref: "/app/analytics",
    });
  }

  const weakCheckout = funnels
    .filter((funnel) => funnel.visitors >= 100)
    .map((funnel) => ({
      funnel,
      checkout: funnel.steps.find((step) => step.type === "checkout"),
    }))
    .find(({ checkout }) => checkout && checkout.visitors >= 50 && checkout.conversionRate < 20);

  if (weakCheckout?.checkout) {
    insights.push({
      id: `checkout-${weakCheckout.funnel.funnelId}`,
      title: `El checkout de "${weakCheckout.funnel.name}" recibe visitas pero cierra pocas ventas`,
      body: `${weakCheckout.checkout.visitors} personas llegaron al checkout y solo ${formatPercent(
        weakCheckout.checkout.conversionRate,
      )} avanzó. Simplificá los campos y poné la garantía cerca del botón.`,
      severity: "warning",
      actionLabel: "Editar funnel",
      actionHref: `/app/funnels/${weakCheckout.funnel.funnelId}`,
      analysisHref: `/app/funnels/${weakCheckout.funnel.funnelId}`,
    });
  }

  if (takeRates.upsellTakeRate !== null && current.orders >= 10) {
    const good = takeRates.upsellTakeRate >= 15;
    insights.push({
      id: "upsell-take-rate",
      title: `Tu upsell tiene un take rate del ${formatPercent(takeRates.upsellTakeRate)}`,
      body: good
        ? "Está en buen nivel. Probá subir el precio del upsell antes de tocar otra cosa."
        : "Está por debajo de lo esperable. Conectá el upsell con el resultado del producto principal.",
      severity: good ? "success" : "info",
      actionLabel: "Ver upsells",
      actionHref: "/app/ofertas",
      analysisHref: "/app/analytics",
    });
  }

  if (takeRates.bumpTakeRate !== null && current.orders >= 10 && takeRates.bumpTakeRate < 15) {
    insights.push({
      id: "bump-take-rate",
      title: `Tu order bump se toma en el ${formatPercent(takeRates.bumpTakeRate)} de las compras`,
      body: "Un bump bien armado suele estar arriba del 20%. Bajá el precio al 15-25% del ticket y reescribí el checkbox.",
      severity: "info",
      actionLabel: "Editar order bump",
      actionHref: "/app/ofertas",
      analysisHref: "/app/analytics",
    });
  }

  const meta = getIntegration(workspaceId, "meta");
  if (!meta || meta.status !== "connected") {
    insights.push({
      id: "meta-missing",
      title: "El seguimiento de Meta todavía no está configurado",
      body: "Sin el Pixel y la API de Conversiones no podemos calcular tu ROAS ni tu CPA reales. Los números de inversión aparecen vacíos hasta que lo conectes.",
      severity: "warning",
      actionLabel: "Configurar ahora",
      actionHref: "/app/integraciones/meta",
      analysisHref: "/app/integraciones/meta",
    });
  } else if (current.roas !== null) {
    const healthy = current.roas >= 2;
    insights.push({
      id: "roas",
      title: `Tu ROAS del período es ${current.roas.toFixed(2)}x`,
      body:
        current.cpa !== null
          ? `Con un CPA de ${formatMoney(current.cpa, "ARS")}. ${
              healthy ? "Buen margen para escalar de a poco." : "Antes de escalar, arreglá la conversión del funnel."
            }`
          : "Todavía no hay ventas suficientes para calcular el CPA.",
      severity: healthy ? "success" : "warning",
      actionLabel: "Ver campañas",
      actionHref: "/app/marketing",
      analysisHref: "/app/analytics",
    });
  }

  return insights.slice(0, 4);
}
