import type { Metadata } from "next";

import { OrdersTable } from "@/app/(app)/app/ventas/table";
import { MetricCard, PageHeader } from "@/components/ui/data";
import { Card, EmptyState, LinkButton } from "@/components/ui/primitives";
import { getTotals, resolveRange } from "@/lib/analytics";
import { requireSession } from "@/lib/auth";
import { all } from "@/lib/db";
import { formatMoney, formatNumber, formatPercent } from "@/lib/utils";

export const metadata: Metadata = { title: "Ventas" };

interface Row {
  id: string;
  reference: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  is_demo: number;
  customer_name: string | null;
  customer_email: string | null;
  offer_name: string | null;
  product_name: string | null;
}

export default async function OrdersPage() {
  const { workspace } = await requireSession();
  const range = resolveRange("30d");
  const totals = getTotals(workspace.id, range);

  const orders = all<Row>(
    `SELECT o.id, o.reference, o.status, o.total, o.currency, o.created_at, o.is_demo,
            c.full_name AS customer_name, c.email AS customer_email, f.name AS offer_name,
            (SELECT i.name FROM order_items i WHERE i.order_id = o.id AND i.kind = 'main' LIMIT 1) AS product_name
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     LEFT JOIN offers f ON f.id = o.offer_id
     WHERE o.workspace_id = ?
     ORDER BY o.created_at DESC LIMIT 300`,
    workspace.id,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Ventas" subtitle="Cada pedido con su cliente, su oferta y su estado." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Ventas (30 días)" value={formatNumber(totals.orders)} icon="cart" />
        <MetricCard
          label="Facturación (30 días)"
          value={formatMoney(totals.revenue, workspace.currency, true)}
          icon="chart"
        />
        <MetricCard
          label="Ticket promedio"
          explain="ticket_promedio"
          value={formatMoney(totals.averageOrderValue, workspace.currency, true)}
          icon="tag"
          emptyReason={totals.orders === 0 ? "Todavía no hay ventas" : undefined}
        />
        <MetricCard
          label="Tasa de reembolso"
          explain="reembolso"
          value={formatPercent(totals.refundRate)}
          icon="refresh"
          invertDelta
          emptyReason={totals.orders === 0 ? "Todavía no hay ventas" : undefined}
        />
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon="cart"
          title="Todavía no entró ninguna venta"
          description="Cuando publiques tu funnel y llegue la primera compra vas a ver acá el detalle completo: cliente, producto, upsells y datos de campaña."
          action={
            <LinkButton href="/app/productos" icon="box">
              Ir a Modo Lanzamiento
            </LinkButton>
          }
        />
      ) : (
        <Card>
          <OrdersTable orders={orders} />
        </Card>
      )}
    </div>
  );
}
