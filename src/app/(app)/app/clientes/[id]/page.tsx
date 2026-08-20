import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Avatar, MetricCard, PageHeader, Table, Td, Tr } from "@/components/ui/data";
import { DemoTag } from "@/components/ui/feedback";
import {
  Badge,
  Card,
  CardHeader,
} from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { all } from "@/lib/db";
import { getCustomer, listOrdersByCustomer } from "@/lib/repo";
import { formatDate, formatDateTime, formatMoney, formatNumber, STATUS_LABEL, statusTone } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { workspace } = await requireSession();
  const { id } = await params;
  const customer = getCustomer(workspace.id, id);
  return { title: customer?.full_name ?? "Cliente" };
}

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { workspace } = await requireSession();
  const { id } = await params;

  const customer = getCustomer(workspace.id, id);
  if (!customer) notFound();

  const orders = listOrdersByCustomer(workspace.id, id);

  const products = all<{ name: string; n: number }>(
    `SELECT i.name AS name, COUNT(*) AS n FROM order_items i
     JOIN orders o ON o.id = i.order_id
     WHERE i.workspace_id = ? AND o.customer_id = ? AND o.status = 'paid'
     GROUP BY i.name ORDER BY n DESC`,
    workspace.id,
    id,
  );

  const funnels = all<{ name: string; n: number }>(
    `SELECT f.name AS name, COUNT(*) AS n FROM orders o
     JOIN funnels f ON f.id = o.funnel_id
     WHERE o.workspace_id = ? AND o.customer_id = ?
     GROUP BY f.name ORDER BY n DESC`,
    workspace.id,
    id,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={customer.full_name}
        subtitle={customer.email}
        breadcrumb={[{ label: "Clientes", href: "/app/clientes" }, { label: customer.full_name }]}
        actions={
          <span className="flex items-center gap-2">
            {customer.is_demo ? <DemoTag /> : null}
            <Badge tone={statusTone(customer.status)} dot>
              {STATUS_LABEL[customer.status] ?? customer.status}
            </Badge>
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Compras" value={formatNumber(customer.orders_count)} icon="cart" />
        <MetricCard
          label="Total gastado"
          value={formatMoney(customer.total_spent, workspace.currency)}
          icon="chart"
        />
        <MetricCard
          label="Ticket promedio"
          value={formatMoney(
            customer.orders_count ? customer.total_spent / customer.orders_count : 0,
            workspace.currency,
          )}
          icon="tag"
          emptyReason={customer.orders_count === 0 ? "Sin compras todavía" : undefined}
        />
        <MetricCard
          label="Última compra"
          value={customer.last_purchase_at ? formatDate(customer.last_purchase_at) : "—"}
          icon="clock"
          emptyReason={!customer.last_purchase_at ? "Sin compras todavía" : undefined}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader title="Pedidos" />
          <div className="pb-2 pt-3">
            {orders.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13.5px] text-ink-500">
                Este cliente todavía no tiene pedidos.
              </p>
            ) : (
              <Table
                columns={[
                  { key: "ref", label: "Pedido" },
                  { key: "amount", label: "Importe", align: "right" },
                  { key: "status", label: "Estado" },
                  { key: "date", label: "Fecha", align: "right" },
                ]}
              >
                {orders.map((order) => (
                  <Tr key={order.id}>
                    <Td>
                      <Link
                        href={`/app/ventas/${order.id}`}
                        className="font-medium text-ink-900 hover:text-brand-700"
                      >
                        {order.reference}
                      </Link>
                    </Td>
                    <Td align="right" className="font-semibold text-ink-900">
                      {formatMoney(order.total, order.currency)}
                    </Td>
                    <Td>
                      <Badge tone={statusTone(order.status)}>
                        {STATUS_LABEL[order.status] ?? order.status}
                      </Badge>
                    </Td>
                    <Td align="right" className="text-ink-500">
                      {formatDateTime(order.created_at)}
                    </Td>
                  </Tr>
                ))}
              </Table>
            )}
          </div>
        </Card>

        <aside className="flex flex-col gap-5">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Avatar name={customer.full_name} size={44} />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-ink-900">
                  {customer.full_name}
                </p>
                <p className="truncate text-[12.5px] text-ink-500">{customer.email}</p>
              </div>
            </div>
            <dl className="mt-4 flex flex-col gap-2 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Teléfono</dt>
                <dd className="font-medium text-ink-900">{customer.phone ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">País</dt>
                <dd className="font-medium text-ink-900">{customer.country ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Cliente desde</dt>
                <dd className="font-medium text-ink-900">{formatDate(customer.created_at)}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">
              Productos comprados
            </p>
            {products.length === 0 ? (
              <p className="mt-3 text-[13px] text-ink-500">Todavía ninguno.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-1.5">
                {products.map((product) => (
                  <li key={product.name} className="flex justify-between gap-3 text-[13px]">
                    <span className="min-w-0 truncate text-ink-700">{product.name}</span>
                    <span className="shrink-0 font-medium text-ink-900">×{product.n}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">
              Funnels por los que entró
            </p>
            {funnels.length === 0 ? (
              <p className="mt-3 text-[13px] text-ink-500">Sin datos de funnel.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-1.5">
                {funnels.map((funnel) => (
                  <li key={funnel.name} className="flex justify-between gap-3 text-[13px]">
                    <span className="min-w-0 truncate text-ink-700">{funnel.name}</span>
                    <span className="shrink-0 font-medium text-ink-900">×{funnel.n}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
