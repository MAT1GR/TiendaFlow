import type { Metadata } from "next";

import { AnalyticsCharts } from "@/app/(app)/app/analytics/charts";
import { RangeFilter } from "@/components/app/range-filter";
import { MetricCard, PageHeader, Table, Td, Tr } from "@/components/ui/data";
import { Alert } from "@/components/ui/feedback";
import { BarList, FunnelChart } from "@/components/ui/chart";
import { Card, CardHeader, EmptyState, LinkButton } from "@/components/ui/primitives";
import {
  compare,
  getCampaignPerformance,
  getFunnelMetrics,
  getOfferPerformance,
  getProductPerformance,
  getSeries,
  getTakeRates,
  getTotals,
  getTrafficSources,
  previousRange,
  resolveRange,
} from "@/lib/analytics";
import { requireSession } from "@/lib/auth";
import { getIntegration } from "@/lib/repo";
import { formatMoney, formatNumber, formatPercent } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string; desde?: string; hasta?: string; funnel?: string }>;
}) {
  const { workspace } = await requireSession();
  const params = await searchParams;
  const range = resolveRange(params.rango, params.desde, params.hasta);

  const totals = getTotals(workspace.id, range);
  const previous = getTotals(workspace.id, previousRange(range));
  const series = getSeries(workspace.id, range);
  const takeRates = getTakeRates(workspace.id, range);
  const funnels = getFunnelMetrics(workspace.id, range);
  const sources = getTrafficSources(workspace.id, range);
  const products = getProductPerformance(workspace.id, range);
  const offers = getOfferPerformance(workspace.id, range);
  const campaigns = getCampaignPerformance(workspace.id, range);

  const meta = getIntegration(workspace.id, "meta");
  const metaConnected = meta?.status === "connected";

  const selectedFunnel =
    funnels.find((funnel) => funnel.funnelId === params.funnel) ?? funnels[0] ?? null;

  const hasData = totals.orders > 0 || totals.visitors > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytics"
        subtitle="Todo lo que pasa entre el anuncio y la venta."
        actions={<RangeFilter current={range.key} />}
      />

      {!metaConnected ? (
        <Alert
          tone="warning"
          title="Sin la integración de Meta no podemos calcular inversión, CPA ni ROAS"
          action={
            <LinkButton href="/app/integraciones/meta" size="sm" variant="secondary">
              Configurar
            </LinkButton>
          }
        >
          El resto de las métricas sale de tus ventas reales y funciona igual.
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <MetricCard
          label="Facturación"
          value={formatMoney(totals.revenue, workspace.currency, true)}
          deltaPercent={compare(totals.revenue, previous.revenue).deltaPercent}
          icon="chart"
        />
        <MetricCard
          label="Ventas"
          value={formatNumber(totals.orders)}
          deltaPercent={compare(totals.orders, previous.orders).deltaPercent}
          icon="cart"
        />
        <MetricCard
          label="Visitantes"
          value={formatNumber(totals.visitors, true)}
          deltaPercent={compare(totals.visitors, previous.visitors).deltaPercent}
          icon="users"
        />
        <MetricCard
          label="Conversión"
          value={formatPercent(totals.conversionRate)}
          deltaPercent={compare(totals.conversionRate, previous.conversionRate).deltaPercent}
          icon="target"
          emptyReason={totals.visitors === 0 ? "Sin visitas registradas" : undefined}
        />
        <MetricCard
          label="Ticket promedio"
          value={formatMoney(totals.averageOrderValue, workspace.currency, true)}
          deltaPercent={compare(totals.averageOrderValue, previous.averageOrderValue).deltaPercent}
          icon="tag"
          emptyReason={totals.orders === 0 ? "Todavía no hay ventas" : undefined}
        />
        <MetricCard
          label="Tasa de reembolso"
          value={formatPercent(totals.refundRate)}
          deltaPercent={compare(totals.refundRate, previous.refundRate).deltaPercent}
          invertDelta
          icon="refresh"
          emptyReason={totals.orders === 0 ? "Todavía no hay ventas" : undefined}
        />
        <MetricCard
          label="Inversión"
          value={totals.adSpend !== null ? formatMoney(totals.adSpend, workspace.currency, true) : "—"}
          icon="megaphone"
          emptyReason={totals.adSpend === null ? "Requiere integración con Meta" : undefined}
        />
        <MetricCard
          label="ROAS"
          value={totals.roas ? `${totals.roas.toFixed(2)}x` : "—"}
          icon="trendUp"
          emptyReason={totals.roas === null ? "Requiere integración con Meta" : undefined}
        />
        <MetricCard
          label="CPA"
          value={totals.cpa ? formatMoney(totals.cpa, workspace.currency) : "—"}
          invertDelta
          icon="target"
          emptyReason={totals.cpa === null ? "Requiere integración con Meta" : undefined}
        />
        <MetricCard
          label="Take rate order bump"
          value={takeRates.bumpTakeRate !== null ? formatPercent(takeRates.bumpTakeRate) : "—"}
          icon="plus"
          emptyReason={takeRates.bumpTakeRate === null ? "Sin ventas en el período" : undefined}
        />
        <MetricCard
          label="Take rate upsell"
          value={takeRates.upsellTakeRate !== null ? formatPercent(takeRates.upsellTakeRate) : "—"}
          icon="trendUp"
          emptyReason={takeRates.upsellTakeRate === null ? "Sin ventas en el período" : undefined}
        />
        <MetricCard
          label="Checkouts iniciados"
          value={formatNumber(totals.checkouts)}
          icon="card"
        />
      </div>

      {!hasData ? (
        <EmptyState
          icon="chart"
          title="Todavía no hay datos en este período"
          description="Publicá tu funnel y mandá tráfico. Apenas entren las primeras visitas y ventas, esta pantalla se llena sola."
          action={
            <LinkButton href="/app/lanzamiento" icon="rocket">
              Ir a Modo Lanzamiento
            </LinkButton>
          }
        />
      ) : null}

      <Card>
        <AnalyticsCharts series={series} currency={workspace.currency} />
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Recorrido del funnel"
            subtitle={selectedFunnel ? selectedFunnel.name : "Sin funnels todavía"}
          />
          <div className="p-5 pt-4">
            {selectedFunnel ? (
              <FunnelChart
                steps={selectedFunnel.steps.map((step, index) => ({
                  label: step.name,
                  value: step.visitors,
                  rate: index < selectedFunnel.steps.length - 1 ? step.conversionRate : null,
                }))}
              />
            ) : (
              <p className="py-8 text-center text-[13.5px] text-ink-500">
                Creá un funnel para ver su recorrido acá.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Fuentes de tráfico" subtitle="Según los UTM de cada visita y venta" />
          <div className="p-5 pt-4">
            {sources.length === 0 ? (
              <p className="py-8 text-center text-[13.5px] text-ink-500">
                Sin datos de atribución todavía. Agregá UTMs a los links de tus anuncios.
              </p>
            ) : (
              <BarList
                data={sources.map((source) => ({ label: source.source, value: source.revenue }))}
                format="money"
                currency={workspace.currency}
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Productos" subtitle="Por facturación en el período" />
          <div className="p-5 pt-4">
            <BarList
              data={products.map((product) => ({ label: product.name, value: product.revenue }))}
              format="money"
              currency={workspace.currency}
              emptyLabel="Todavía no hay productos vendidos."
              color="#22C55E"
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Ofertas" subtitle="Por facturación en el período" />
          <div className="p-5 pt-4">
            <BarList
              data={offers.map((offer) => ({ label: offer.name, value: offer.revenue }))}
              format="money"
              currency={workspace.currency}
              emptyLabel="Todavía no hay ofertas con ventas."
              color="#22D3EE"
            />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Campañas"
          subtitle="Atribución por utm_campaign de cada venta"
          action={
            <LinkButton href="/app/marketing" variant="ghost" size="sm" iconRight="arrowRight">
              Ir a Marketing
            </LinkButton>
          }
        />
        <div className="pb-2 pt-3">
          {campaigns.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13.5px] text-ink-500">
              Todavía no cargaste campañas. Creá una en Marketing para poder atribuir ventas.
            </p>
          ) : (
            <Table
              columns={[
                { key: "name", label: "Campaña" },
                { key: "spend", label: "Inversión", align: "right" },
                { key: "orders", label: "Ventas", align: "right" },
                { key: "revenue", label: "Facturación", align: "right" },
                { key: "cpa", label: "CPA", align: "right" },
                { key: "roas", label: "ROAS", align: "right" },
              ]}
            >
              {campaigns.map((campaign) => (
                <Tr key={campaign.id}>
                  <Td className="font-medium text-ink-900">{campaign.name}</Td>
                  <Td align="right">
                    {campaign.spend > 0
                      ? formatMoney(campaign.spend, workspace.currency, true)
                      : "—"}
                  </Td>
                  <Td align="right">{formatNumber(campaign.orders)}</Td>
                  <Td align="right" className="font-medium text-ink-900">
                    {formatMoney(campaign.revenue, workspace.currency, true)}
                  </Td>
                  <Td align="right">
                    {campaign.cpa ? formatMoney(campaign.cpa, workspace.currency) : "—"}
                  </Td>
                  <Td align="right" className="font-semibold text-ink-900">
                    {campaign.roas ? `${campaign.roas.toFixed(2)}x` : "—"}
                  </Td>
                </Tr>
              ))}
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
