import type { Metadata } from "next";

import { ProductsTable } from "@/app/(app)/app/productos/table";
import { PageHeader } from "@/components/ui/data";
import { Card, EmptyState, LinkButton } from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { all } from "@/lib/db";
import { listProducts } from "@/lib/repo";

export const metadata: Metadata = { title: "Productos" };

export default async function ProductsPage() {
  const { workspace } = await requireSession();
  const products = listProducts(workspace.id);

  // Ventas y facturación por producto, en una sola consulta.
  const stats = all<{ product_id: string; orders: number; revenue: number }>(
    `SELECT i.product_id AS product_id, COUNT(DISTINCT o.id) AS orders,
            COALESCE(SUM(i.unit_price * i.quantity), 0) AS revenue
     FROM order_items i
     JOIN orders o ON o.id = i.order_id AND o.status = 'paid'
     WHERE i.workspace_id = ? AND i.product_id IS NOT NULL
     GROUP BY i.product_id`,
    workspace.id,
  );
  const statsMap = Object.fromEntries(stats.map((row) => [row.product_id, row]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Productos"
        subtitle="Todo lo que vendés, en un solo lugar."
        actions={
          <>
            <LinkButton href="/app/productos/nuevo?fuente=ia" variant="ai" icon="sparkles">
              Crear con IA
            </LinkButton>
            <LinkButton href="/app/productos/nuevo" icon="plus">
              Crear producto
            </LinkButton>
          </>
        }
      />

      {products.length === 0 ? (
        <EmptyState
          icon="box"
          title="Todavía no tenés productos"
          description="Creá o importá tu primer producto y empezá a construir tu oferta. Si querés, la IA te arma el índice, la descripción y los beneficios."
          action={
            <LinkButton href="/app/productos/nuevo" icon="plus">
              Crear producto
            </LinkButton>
          }
          secondary={
            <LinkButton href="/app/productos/nuevo?fuente=ia" variant="ai" icon="sparkles">
              Crear con IA
            </LinkButton>
          }
        />
      ) : (
        <Card>
          <ProductsTable
            products={products}
            stats={statsMap}
            currency={workspace.currency}
          />
        </Card>
      )}
    </div>
  );
}
