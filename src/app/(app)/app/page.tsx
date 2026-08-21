import Link from "next/link";
import type { Metadata } from "next";

import { DashboardChart } from "@/app/(app)/app/chart";
import { InsightsPanel } from "@/app/(app)/app/insights";
import { RangeFilter } from "@/components/app/range-filter";
import { DemoTag } from "@/components/ui/feedback";
import { Avatar, MetricCard, PageHeader, Table, Td, Tr } from "@/components/ui/data";
import { Icon } from "@/components/ui/icon";
import { Badge, Card, CardHeader, EmptyState, LinkButton } from "@/components/ui/primitives";
import {
  compare,
  getSeries,
  getTotals,
  previousRange,
  resolveRange,
} from "@/lib/analytics";
import { requireSession } from "@/lib/auth";
import { buildInsights } from "@/lib/insights";
import { productLibrary } from "@/lib/product-workspace";
import { all } from "@/lib/db";
import {
  cn,
  formatMoney,
  formatNumber,
  formatPercent,
  greeting,
  relativeTime,
  STATUS_LABEL,
  statusTone,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Inicio" };

interface RecentSale {
  id: string;
  reference: string;
  total: number;
  currency: string;
  status: string;
  created_at: string;
  is_demo: number;
  customer_name: string | null;
  product_name: string | null;
}

/**
 * Inicio.
 *
 * Responde una sola pregunta: **¿cómo viene el negocio y qué hago ahora?**
 *
 * Por eso no hay quince indicadores ni una tabla de rendimiento por funnel: hay
 * cuatro números que cualquiera entiende, el estado de cada producto —que es
 * donde de verdad se trabaja— y las últimas ventas.
 */
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
  const insights = buildInsights(workspace.id, range);
  const products = productLibrary(workspace.id);

  const recentSales = all<RecentSale>(
    `SELECT o.id, o.reference, o.total, o.currency, o.status, o.created_at, o.is_demo,
            c.full_name AS customer_name,
            (SELECT i.name FROM order_items i WHERE i.order_id = o.id AND i.kind = 'main' LIMIT 1) AS product_name
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     WHERE o.workspace_id = ?
     ORDER BY o.created_at DESC LIMIT 8`,
    workspace.id,
  );

  const hasAnyData = totals.orders > 0 || totals.visitors > 0 || products.length > 0;
  const firstName = user.full_name.split(" ")[0];

  const revenue = compare(totals.revenue, previousTotals.revenue);
  const orders = compare(totals.orders, previousTotals.orders);
  const conversion = compare(totals.conversionRate, previousTotals.conversionRate);
  const aov = compare(totals.averageOrderValue, previousTotals.averageOrderValue);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        subtitle="¿Qué querés vender hoy?"
        actions={
          <>
            <LinkButton href="/app/productos/nuevo?fuente=ia" variant="ai" icon="sparkles" size="sm">
              Crear con IA
            </LinkButton>
            <LinkButton href="/app/productos/nuevo" icon="plus" size="sm">
              Crear producto
            </LinkButton>
          </>
        }
      />

      {!hasAnyData ? <FirstRunCard /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
          <span className="tf-emoji" aria-hidden="true">
            📊
          </span>
          Cómo viene tu negocio
        </h2>
        <RangeFilter current={range.key} />
      </div>

      {/* Cuatro números, no quince. Cada uno se explica solo. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Facturación"
          value={formatMoney(totals.revenue, workspace.currency, true)}
          deltaPercent={revenue.deltaPercent}
          hint="vs período anterior"
          icon="chart"
          trend={series.map((point) => point.revenue)}
        />
        <MetricCard
          label="Ventas"
          value={formatNumber(totals.orders)}
          deltaPercent={orders.deltaPercent}
          hint="vs período anterior"
          icon="cart"
        />
        <MetricCard
          label="Conversión"
          explain="conversion"
          value={formatPercent(totals.conversionRate)}
          deltaPercent={conversion.deltaPercent}
          hint={`${formatNumber(totals.visitors)} personas entraron`}
          icon="target"
          emptyReason={totals.visitors === 0 ? "Todavía nadie visitó tus páginas" : undefined}
        />
        <MetricCard
          label="Ticket promedio"
          explain="ticket_promedio"
          value={formatMoney(totals.averageOrderValue, workspace.currency, true)}
          deltaPercent={aov.deltaPercent}
          hint="Cuánto deja cada venta"
          icon="tag"
          emptyReason={totals.orders === 0 ? "Todavía no hay ventas" : undefined}
        />
      </div>

      <Card>
        <DashboardChart series={series} currency={workspace.currency} />
      </Card>

      <InsightsPanel insights={insights} />

      {products.length > 0 ? (
        <Card>
          <CardHeader
            title="Tus productos"
            subtitle="En qué está cada uno y qué le falta para poder venderse"
            action={
              <LinkButton href="/app/productos" variant="ghost" size="sm" iconRight="arrowRight">
                Ver todos
              </LinkButton>
            }
          />
          <ul className="flex flex-col divide-y divide-ink-100">
            {products.slice(0, 5).map((product) => (
              <li key={product.id}>
                <Link
                  href={product.href}
                  className="group flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-ink-50"
                >
                  <span
                    className="tf-emoji !inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink-100 !text-[19px]"
                    aria-hidden="true"
                  >
                    {product.emoji}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[14px] font-semibold text-ink-900">
                        {product.name}
                      </span>
                      {product.isDemo ? <DemoTag /> : null}
                    </span>
                    <span
                      className={cn(
                        "flex items-center gap-1.5 text-[12.5px]",
                        product.status === "listo"
                          ? "text-accent-700"
                          : product.status === "preparacion"
                            ? "text-amber-700"
                            : "text-ink-500",
                      )}
                    >
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          product.status === "listo"
                            ? "bg-accent-500"
                            : product.status === "preparacion"
                              ? "bg-amber-400"
                              : "bg-ink-300",
                        )}
                        aria-hidden="true"
                      />
                      {product.statusLabel}
                    </span>
                  </span>

                  {product.orders > 0 ? (
                    <span className="hidden shrink-0 text-right sm:block">
                      <span className="block text-[13.5px] font-semibold tabular-nums text-ink-900">
                        {formatMoney(product.revenue, product.currency, true)}
                      </span>
                      <span className="block text-[11.5px] text-ink-400">
                        {formatNumber(product.orders)} {product.orders === 1 ? "venta" : "ventas"}
                      </span>
                    </span>
                  ) : null}

                  <Icon
                    name="chevronRight"
                    size={16}
                    className="shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

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
                description="Cuando publiques tu producto y llegue la primera compra, la vas a ver acá con su cliente, qué compró y cuánto pagó."
                action={
                  <LinkButton href="/app/productos" icon="box">
                    Ir a mis productos
                  </LinkButton>
                }
              />
            </div>
          ) : (
            <Table
              columns={[
                { key: "customer", label: "Cliente" },
                { key: "product", label: "Producto" },
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
                  <Td align="right" className="font-semibold text-ink-900">
                    {formatMoney(sale.total, sale.currency)}
                  </Td>
                  <Td>
                    <Badge tone={statusTone(sale.status)}>
                      {STATUS_LABEL[sale.status] ?? sale.status}
                    </Badge>
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

function FirstRunCard() {
  return (
    <Card className="overflow-hidden">
      <div className="tf-grid-bg relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11.5px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
            <Icon name="rocket" size={13} />
            Empecemos
          </p>
          <h2 className="mt-3 text-[20px] font-semibold tracking-tight text-ink-900">
            Todo empieza por tu producto
          </h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-500">
            Creá tu producto y desde adentro te vamos guiando: precio, página de venta, cobro y
            publicación. Si querés ver primero cómo se ve todo funcionando, podés cargar datos de
            ejemplo desde Configuración.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <LinkButton href="/app/productos/nuevo" icon="plus">
            Crear producto
          </LinkButton>
          <LinkButton href="/app/configuracion" variant="secondary">
            Cargar datos de ejemplo
          </LinkButton>
        </div>
      </div>
    </Card>
  );
}
