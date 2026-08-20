import Link from "next/link";
import type { Metadata } from "next";

import { DashboardChart } from "@/app/(app)/app/chart";
import { InsightsPanel } from "@/app/(app)/app/insights";
import { RangeFilter } from "@/components/app/range-filter";
import { DemoTag } from "@/components/ui/feedback";
import { Avatar, MetricCard, PageHeader, Table, Td, Tr } from "@/components/ui/data";
import { Icon } from "@/components/ui/icon";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  LinkButton,
  ProgressBar,
} from "@/components/ui/primitives";
import {
  compare,
  getFunnelMetrics,
  getSeries,
  getTotals,
  previousRange,
  resolveRange,
} from "@/lib/analytics";
import { requireSession } from "@/lib/auth";
import { buildInsights } from "@/lib/insights";
import { getLaunchStatus } from "@/lib/launch";
import { all } from "@/lib/db";
import { formatMoney, formatNumber, formatPercent, greeting, relativeTime, STATUS_LABEL, statusTone } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

interface RecentSale {
  id: string;
  reference: string;
  total: number;
  currency: string;
  status: string;
  created_at: string;
  is_demo: number;
  customer_name: string | null;
  offer_name: string | null;
  product_name: string | null;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string; desde?: string; hasta?: string }>;
}) {
  const { user, workspace } = await requireSession();
  const params = await searchParams;
  const range = resolveRange(params.rango, params.desde, params.hasta);
  const prev = previousRange(range);

  const totals = getTotals(workspace.id, range);
  const previousTotals = getTotals(workspace.id, prev);
  const series = getSeries(workspace.id, range);
  const funnels = getFunnelMetrics(workspace.id, range);
  const insights = buildInsights(workspace.id, range);
  const launch = getLaunchStatus(workspace.id);

  const recentSales = all<RecentSale>(
    `SELECT o.id, o.reference, o.total, o.currency, o.status, o.created_at, o.is_demo,
            c.full_name AS customer_name, f.name AS offer_name,
            (SELECT i.name FROM order_items i WHERE i.order_id = o.id AND i.kind = 'main' LIMIT 1) AS product_name
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     LEFT JOIN offers f ON f.id = o.offer_id
     WHERE o.workspace_id = ?
     ORDER BY o.created_at DESC LIMIT 8`,
    workspace.id,
  );

  const hasAnyData = totals.orders > 0 || totals.visitors > 0 || funnels.length > 0;
  const firstName = user.full_name.split(" ")[0];

  const revenue = compare(totals.revenue, previousTotals.revenue);
  const orders = compare(totals.orders, previousTotals.orders);
  const conversion = compare(totals.conversionRate, previousTotals.conversionRate);
  const aov = compare(totals.averageOrderValue, previousTotals.averageOrderValue);
  const roas = compare(totals.roas, previousTotals.roas);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        subtitle="¿Qué querés vender hoy?"
        actions={
          <>
            <LinkButton href="/app/productos/nuevo" variant="secondary" icon="box" size="sm">
              Crear producto
            </LinkButton>
            <LinkButton href="/app/ofertas/nueva" variant="secondary" icon="tag" size="sm">
              Crear oferta
            </LinkButton>
            <LinkButton href="/app/funnels/nuevo" variant="secondary" icon="funnel" size="sm">
              Crear funnel
            </LinkButton>
            <LinkButton href="/app/ia" variant="ai" icon="sparkles" size="sm">
              Crear con IA
            </LinkButton>
          </>
        }
      />

      {!hasAnyData ? <FirstRunCard /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-ink-900">Rendimiento</h2>
        <RangeFilter current={range.key} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard
          label="Ventas"
          value={formatNumber(totals.orders)}
          deltaPercent={orders.deltaPercent}
          hint="vs período anterior"
          icon="cart"
        />
        <MetricCard
          label="Facturación"
          value={formatMoney(totals.revenue, workspace.currency, true)}
          deltaPercent={revenue.deltaPercent}
          hint="vs período anterior"
          icon="chart"
          trend={series.map((point) => point.revenue)}
        />
        <MetricCard
          label="Conversión"
          explain="conversion"
          value={formatPercent(totals.conversionRate)}
          deltaPercent={conversion.deltaPercent}
          hint={`${formatNumber(totals.visitors)} visitantes`}
          icon="target"
          emptyReason={totals.visitors === 0 ? "Sin visitas registradas" : undefined}
        />
        <MetricCard
          label="ROAS"
          explain="roas"
          value={totals.roas ? `${totals.roas.toFixed(2)}x` : "—"}
          deltaPercent={roas.deltaPercent}
          icon="megaphone"
          emptyReason={
            totals.adSpend === null
              ? "Conectá Meta para medir inversión"
              : undefined
          }
        />
        <MetricCard
          label="Ticket promedio"
          explain="ticket_promedio"
          value={formatMoney(totals.averageOrderValue, workspace.currency, true)}
          deltaPercent={aov.deltaPercent}
          hint="vs período anterior"
          icon="tag"
          emptyReason={totals.orders === 0 ? "Todavía no hay ventas" : undefined}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <DashboardChart series={series} currency={workspace.currency} />
        </Card>

        <Card className="flex flex-col">
          <CardHeader
            title="Tu próxima oferta"
            subtitle="Lo que falta para poder recibir tráfico"
          />
          <div className="px-5 pb-2 pt-4">
            <ProgressBar value={launch.completion} showLabel tone={launch.completion === 100 ? "success" : "brand"} />
          </div>
          <ol className="flex flex-1 flex-col gap-1 px-3 py-2">
            {launch.steps.slice(0, 6).map((step) => (
              <li key={step.code}>
                <Link
                  href={step.ctaHref}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-ink-50"
                >
                  <span
                    className={
                      step.state === "done"
                        ? "grid size-5 shrink-0 place-items-center rounded-full bg-accent-500 text-white"
                        : step.state === "warning"
                          ? "grid size-5 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700"
                          : "grid size-5 shrink-0 place-items-center rounded-full border-2 border-ink-200"
                    }
                  >
                    {step.state === "done" ? (
                      <Icon name="check" size={12} />
                    ) : step.state === "warning" ? (
                      <Icon name="warning" size={11} />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium text-ink-800">{step.title}</span>
                    {step.missing[0] ? (
                      <span className="block truncate text-[11.5px] text-ink-500">{step.missing[0]}</span>
                    ) : null}
                  </span>
                  <Icon name="chevronRight" size={15} className="shrink-0 text-ink-300" />
                </Link>
              </li>
            ))}
          </ol>
          <div className="border-t border-ink-100 p-4">
            <LinkButton href="/app/lanzamiento" full icon="rocket">
              Continuar lanzamiento
            </LinkButton>
          </div>
        </Card>
      </div>

      <InsightsPanel insights={insights} />

      <Card>
        <CardHeader
          title="Rendimiento por funnel"
          subtitle="Cada funnel con su recorrido y sus números del período"
          action={
            <LinkButton href="/app/funnels" variant="ghost" size="sm" iconRight="arrowRight">
              Ver todos
            </LinkButton>
          }
        />
        <div className="p-5 pt-4">
          {funnels.length === 0 ? (
            <EmptyState
              icon="funnel"
              title="Tu primer funnel está a un clic"
              description="Armá el recorrido completo: landing, checkout, upsell y página de gracias. Podés generar la landing con IA."
              action={
                <LinkButton href="/app/funnels/nuevo" icon="plus">
                  Crear funnel
                </LinkButton>
              }
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {funnels.slice(0, 4).map((funnel) => (
                <div
                  key={funnel.funnelId}
                  className="rounded-2xl border border-ink-200 p-4 transition-colors hover:border-ink-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-ink-900">{funnel.name}</p>
                      <p className="mt-1 truncate text-[12px] text-ink-500">
                        {funnel.steps.map((step) => step.name).join(" → ") || "Sin pasos"}
                      </p>
                    </div>
                    <Badge tone={statusTone(funnel.status)}>{STATUS_LABEL[funnel.status] ?? funnel.status}</Badge>
                  </div>

                  <dl className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                    <Metric label="Visitantes" value={formatNumber(funnel.visitors, true)} />
                    <Metric label="A checkout" value={formatPercent(funnel.checkoutRate)} />
                    <Metric label="Conversión" value={formatPercent(funnel.conversionRate)} />
                    <Metric label="Ventas" value={formatNumber(funnel.orders)} />
                    <Metric
                      label="Facturación"
                      value={formatMoney(funnel.revenue, workspace.currency, true)}
                    />
                  </dl>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="text-[12px] text-ink-500">
                      ROAS:{" "}
                      {funnel.roas ? (
                        <strong className="text-ink-800">{funnel.roas.toFixed(2)}x</strong>
                      ) : (
                        <span className="text-ink-400">sin datos de inversión</span>
                      )}
                    </span>
                    <LinkButton href={`/app/funnels/${funnel.funnelId}`} variant="secondary" size="sm">
                      Editar funnel
                    </LinkButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Últimas ventas"
          action={
            <LinkButton href="/app/ventas" variant="ghost" size="sm" iconRight="arrowRight">
              Ver todas
            </LinkButton>
          }
        />
        <div className="pb-2 pt-3">
          {recentSales.length === 0 ? (
            <div className="px-5 pb-4">
              <EmptyState
                icon="cart"
                title="Todavía no entró ninguna venta"
                description="Cuando publiques tu funnel y llegue la primera compra, la vas a ver acá con su cliente, producto y estado."
                action={
                  <LinkButton href="/app/lanzamiento" icon="rocket">
                    Ir a Modo Lanzamiento
                  </LinkButton>
                }
              />
            </div>
          ) : (
            <Table
              columns={[
                { key: "customer", label: "Cliente" },
                { key: "product", label: "Producto" },
                { key: "offer", label: "Oferta" },
                { key: "amount", label: "Importe", align: "right" },
                { key: "status", label: "Estado" },
                { key: "date", label: "Fecha", align: "right" },
              ]}
            >
              {recentSales.map((sale) => (
                <Tr key={sale.id}>
                  <Td>
                    <Link href={`/app/ventas/${sale.id}`} className="flex items-center gap-2.5">
                      <Avatar name={sale.customer_name ?? "Anónimo"} size={28} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate font-medium text-ink-900">
                            {sale.customer_name ?? "Cliente sin nombre"}
                          </span>
                          {sale.is_demo ? <DemoTag /> : null}
                        </span>
                        <span className="block text-[11.5px] text-ink-400">{sale.reference}</span>
                      </span>
                    </Link>
                  </Td>
                  <Td>{sale.product_name ?? "—"}</Td>
                  <Td>{sale.offer_name ?? "—"}</Td>
                  <Td align="right" className="font-semibold text-ink-900">
                    {formatMoney(sale.total, sale.currency)}
                  </Td>
                  <Td>
                    <Badge tone={statusTone(sale.status)}>{STATUS_LABEL[sale.status] ?? sale.status}</Badge>
                  </Td>
                  <Td align="right" className="text-ink-500">
                    {relativeTime(sale.created_at)}
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-[14px] font-semibold tabular-nums text-ink-900">{value}</dd>
    </div>
  );
}

function FirstRunCard() {
  return (
    <Card className="overflow-hidden">
      <div className="tf-grid-bg relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11.5px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
            <Icon name="rocket" size={13} />
            Tu workspace está vacío
          </p>
          <h2 className="mt-3 text-[20px] font-semibold tracking-tight text-ink-900">
            Empecemos por tu producto
          </h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-500">
            Creá o importá tu producto digital y te llevamos derecho a armar la oferta, el funnel y
            el checkout. Si querés ver cómo se ve todo funcionando, podés cargar datos de
            demostración desde Configuración.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <LinkButton href="/app/productos/nuevo" icon="plus">
            Crear producto
          </LinkButton>
          <LinkButton href="/app/configuracion" variant="secondary">
            Cargar datos demo
          </LinkButton>
        </div>
      </div>
    </Card>
  );
}
