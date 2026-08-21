import type { Metadata } from "next";

import { CustomersTable } from "@/app/(app)/app/clientes/table";
import { MetricCard, PageHeader } from "@/components/ui/data";
import { Card, EmptyState, LinkButton } from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { get } from "@/lib/db";
import { listCustomers } from "@/lib/repo";
import { formatMoney, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Clientes" };

export default async function CustomersPage() {
  const { workspace } = await requireSession();
  const customers = listCustomers(workspace.id);

  const totals = get<{ n: number; revenue: number }>(
    `SELECT COUNT(*) AS n, COALESCE(SUM(total_spent), 0) AS revenue FROM customers WHERE workspace_id = ?`,
    workspace.id,
  ) ?? { n: 0, revenue: 0 };

  const repeat = customers.filter((customer) => customer.orders_count > 1).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clientes"
        subtitle="Quiénes te compraron, cuánto gastaron y cuándo volvieron."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Clientes" value={formatNumber(totals.n)} icon="users" />
        <MetricCard
          label="Facturación total"
          value={formatMoney(totals.revenue, workspace.currency, true)}
          icon="chart"
        />
        <MetricCard
          label="Clientes recurrentes"
          value={formatNumber(repeat)}
          icon="refresh"
          hint={totals.n ? `${Math.round((repeat / totals.n) * 100)}% del total` : undefined}
        />
        <MetricCard
          label="Valor promedio"
          value={formatMoney(totals.n ? totals.revenue / totals.n : 0, workspace.currency, true)}
          icon="tag"
          emptyReason={totals.n === 0 ? "Todavía no hay clientes" : undefined}
        />
      </div>

      {customers.length === 0 ? (
        <EmptyState
          icon="users"
          title="Todavía no tenés clientes"
          description="Apenas entre la primera venta vas a ver acá el historial completo de cada persona: qué compró, cuánto gastó y por qué funnel entró."
          action={
            <LinkButton href="/app/productos" icon="box">
              Ir a Modo Lanzamiento
            </LinkButton>
          }
        />
      ) : (
        <Card>
          <CustomersTable customers={customers} currency={workspace.currency} />
        </Card>
      )}
    </div>
  );
}
