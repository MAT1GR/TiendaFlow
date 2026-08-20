import type { Metadata } from "next";

import { NewOfferForm } from "@/app/(app)/app/ofertas/nueva/form";
import { PageHeader } from "@/components/ui/data";
import { EmptyState, LinkButton } from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { listProducts } from "@/lib/repo";

export const metadata: Metadata = { title: "Crear oferta" };

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
        title="Construyamos tu oferta"
        subtitle="La oferta es lo que realmente compra la gente: producto + promesa + precio + bonos."
        breadcrumb={[{ label: "Ofertas", href: "/app/ofertas" }, { label: "Nueva" }]}
      />

      {products.length === 0 ? (
        <EmptyState
          icon="box"
          title="Primero necesitás un producto"
          description="La oferta se arma sobre un producto. Creá o importá uno y volvemos acá."
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
