import "server-only";

import {
  compare,
  getFunnelMetrics,
  getTakeRates,
  getTotals,
  previousRange,
  type DateRange,
} from "@/lib/analytics";
import { all } from "@/lib/db";
import { getIntegration } from "@/lib/repo";
import { formatMoney, formatPercent } from "@/lib/utils";

export interface Insight {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "success";
  actionLabel: string;
  actionHref: string;
}

/**
 * Lo que está pasando con el negocio, en criollo.
 *
 * Se calcula con reglas sobre los datos reales del workspace: compara el
 * período actual contra el anterior y mira dónde se cae la gente. Cuando no hay
 * volumen suficiente, lo dice en vez de afirmar una tendencia que los datos no
 * soportan.
 *
 * Regla de escritura: **acá no entra jerga**. Nada de funnel, checkout, upsell,
 * order bump, take rate, ROAS ni CPA. Todo eso existe por debajo; lo que el
 * usuario lee es qué pasó y qué puede hacer al respecto. Y una sola acción por
 * insight: dos botones es no tener ninguno.
 */
export function buildInsights(workspaceId: string, range: DateRange): Insight[] {
  const insights: Insight[] = [];

  const current = getTotals(workspaceId, range);
  const previous = getTotals(workspaceId, previousRange(range));
  const takeRates = getTakeRates(workspaceId, range);
  const funnels = getFunnelMetrics(workspaceId, range);

  // De qué producto es cada página de venta, para poder mandar a la persona
  // directo a la pantalla donde se arregla lo que le estamos señalando.
  const productByPage = new Map(
    all<{ funnel_id: string; product_id: string }>(
      `SELECT f.id AS funnel_id, o.product_id AS product_id
       FROM funnels f
       JOIN offers o ON o.id = f.offer_id
       WHERE f.workspace_id = ? AND o.product_id IS NOT NULL`,
      workspaceId,
    ).map((row) => [row.funnel_id, row.product_id]),
  );

  const revenueDelta = compare(current.revenue, previous.revenue).deltaPercent;
  const conversionDelta = compare(current.conversionRate, previous.conversionRate).deltaPercent;

  const lowVolume = current.visitors < 100 && current.orders < 5;

  if (lowVolume) {
    insights.push({
      id: "low-volume",
      title: "Todavía no llegó suficiente gente como para sacar conclusiones",
      body: `En este período entraron ${current.visitors} ${current.visitors === 1 ? "persona" : "personas"} y hubo ${current.orders} ${current.orders === 1 ? "venta" : "ventas"}. Con estos números, cualquier subida o bajada es casualidad.`,
      severity: "info",
      actionLabel: "Conseguir visitas",
      actionHref: "/app/marketing",
    });
  }

  if (!lowVolume && revenueDelta !== null && Math.abs(revenueDelta) >= 10) {
    const up = revenueDelta > 0;
    insights.push({
      id: "revenue-trend",
      title: up
        ? `Facturaste ${formatPercent(Math.abs(revenueDelta))} más que el período anterior`
        : `Facturaste ${formatPercent(Math.abs(revenueDelta))} menos que el período anterior`,
      body: `Pasaste de ${formatMoney(previous.revenue, "ARS", true)} a ${formatMoney(current.revenue, "ARS", true)}. ${
        up
          ? "Mirá de dónde viene esa gente antes de poner más plata en anuncios."
          : "Revisá si cambió algo en tus páginas o si dejó de llegar gente."
      }`,
      severity: up ? "success" : "warning",
      actionLabel: up ? "Ver de dónde viene" : "Revisar mis productos",
      actionHref: up ? "/app/marketing" : "/app/productos",
    });
  }

  if (!lowVolume && conversionDelta !== null && conversionDelta <= -10) {
    insights.push({
      id: "conversion-drop",
      title: "De cada 100 personas que entran, ahora te compran menos",
      body: `Pasaste de ${formatPercent(previous.conversionRate)} a ${formatPercent(current.conversionRate)} con un tráfico parecido. Casi siempre es la promesa del título, el precio o que falta una garantía.`,
      severity: "warning",
      actionLabel: "Revisar mis productos",
      actionHref: "/app/productos",
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
    const productId = productByPage.get(weakCheckout.funnel.funnelId);
    insights.push({
      id: `checkout-${weakCheckout.funnel.funnelId}`,
      title: `Mucha gente llega a pagar “${weakCheckout.funnel.name}” y no termina la compra`,
      body: `${weakCheckout.checkout.visitors} personas llegaron hasta la página de pago y solo ${formatPercent(
        weakCheckout.checkout.conversionRate,
      )} terminó comprando. Pedí menos datos y poné la garantía al lado del botón.`,
      severity: "warning",
      actionLabel: "Revisar mi página",
      actionHref: productId ? `/app/productos/${productId}/pagina` : "/app/productos",
    });
  }

  if (takeRates.upsellTakeRate !== null && current.orders >= 10) {
    const good = takeRates.upsellTakeRate >= 15;
    insights.push({
      id: "upsell-take-rate",
      title: `${formatPercent(takeRates.upsellTakeRate)} de tus compradores acepta la oferta que les hacés después de comprar`,
      body: good
        ? "Está en buen nivel. Probá subirle el precio a esa oferta antes de tocar cualquier otra cosa."
        : "Está por debajo de lo esperable. Suele funcionar mejor cuando lo que ofrecés es la continuación natural de lo que acaban de comprar.",
      severity: good ? "success" : "info",
      actionLabel: "Ver mis productos",
      actionHref: "/app/productos",
    });
  }

  if (takeRates.bumpTakeRate !== null && current.orders >= 10 && takeRates.bumpTakeRate < 15) {
    insights.push({
      id: "bump-take-rate",
      title: `Solo ${formatPercent(takeRates.bumpTakeRate)} de tus compradores agrega el extra al pagar`,
      body: "Cuando está bien armado suele pasar el 20%. Bajalo a algo entre el 15% y el 25% del precio principal, y escribí en una línea qué gana quien lo suma.",
      severity: "info",
      actionLabel: "Ver mis productos",
      actionHref: "/app/productos",
    });
  }

  const meta = getIntegration(workspaceId, "meta");
  if (!meta || meta.status !== "connected") {
    insights.push({
      id: "meta-missing",
      title: "Todavía no sabemos de dónde vienen tus ventas",
      body: "Conectá tu cuenta de Meta y vamos a poder decirte qué anuncio trajo cada compra, y cuánto te costó conseguirla.",
      severity: "warning",
      actionLabel: "Conectar Meta",
      actionHref: "/app/integraciones/meta",
    });
  } else if (current.roas !== null) {
    const healthy = current.roas >= 2;
    insights.push({
      id: "roas",
      title: `Por cada $1 que ponés en anuncios, te vuelven $${current.roas.toFixed(2)}`,
      body:
        current.cpa !== null
          ? `Cada venta te está costando ${formatMoney(current.cpa, "ARS")} de publicidad. ${
              healthy
                ? "Tenés margen para invertir un poco más."
                : "Antes de poner más plata, conviene arreglar la página: hoy se te escapa demasiada gente."
            }`
          : "Todavía no hay ventas suficientes para saber cuánto te cuesta conseguir cada una.",
      severity: healthy ? "success" : "warning",
      actionLabel: "Ver mis anuncios",
      actionHref: "/app/marketing",
    });
  }

  return insights.slice(0, 4);
}
