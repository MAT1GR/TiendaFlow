import type { Metadata } from "next";

import { NewOfferForm } from "@/app/(app)/app/ofertas/nueva/form";
import { PageHeader } from "@/components/ui/data";
import { EmptyState, LinkButton } from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { listProducts } from "@/lib/repo";

export const metadata: Metadata = { title: "Ponerle precio" };

export default async function NewOfferPage({
  searchParams,
}: {
  searchParams: Promise<{ producto?: string; ia?: string }>;
}) {
  const { workspace } = await requireSession();
  const { producto, ia } = await searchParams;

  const products = listProducts(workspace.id, false);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title="💰 Armemos tu oferta"
        subtitle="Lo que compra la gente no es un archivo: es una promesa, a un precio, con lo que la acompaña."
      />

      {products.length === 0 ? (
        <EmptyState
          icon="box"
          title="Primero necesitás un producto"
          description="Todo empieza por el producto: es lo que vendés. Creá uno y volvemos acá."
          action={
            <LinkButton href="/app/productos/nuevo" icon="plus">
              Crear producto
            </LinkButton>
          }
        />
      ) : (
        <NewOfferForm
          products={products.map((product) => ({
            id: product.id,
            name: product.name,
            price: product.base_price,
            audience: product.audience,
            problem: product.main_problem,
            transformation: product.transformation,
          }))}
          currency={workspace.currency}
          initialProductId={producto}
          autoAi={ia === "1"}
        />
      )}
    </div>
  );
}
