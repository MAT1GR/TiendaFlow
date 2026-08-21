import type { Metadata } from "next";

import { ProductLibrary } from "@/app/(app)/app/productos/library";
import { PageHeader } from "@/components/ui/data";
import { EmptyState, LinkButton } from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { productLibrary } from "@/lib/product-workspace";

export const metadata: Metadata = { title: "Mis productos" };

export default async function ProductsPage() {
  const { workspace } = await requireSession();
  const products = productLibrary(workspace.id);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Mis productos"
        subtitle="Todo lo que vendés, y qué le falta a cada uno para poder venderse."
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
          description="Creá tu primer producto y TiendaFlow te va guiando paso a paso hasta tener un link para vender. Si querés, la IA te arma el índice, la descripción y los beneficios."
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
        <ProductLibrary products={products} />
      )}
    </div>
  );
}
