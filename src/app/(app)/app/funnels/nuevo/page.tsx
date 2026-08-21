import type { Metadata } from "next";

import { NewFunnelForm } from "@/app/(app)/app/funnels/nuevo/form";
import { FlowBar } from "@/components/app/flow-bar";
import { PageHeader } from "@/components/ui/data";
import { EmptyState, LinkButton } from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { isFlowActive } from "@/lib/product-flow";
import { listOffers, listProducts } from "@/lib/repo";

export const metadata: Metadata = { title: "Armar mi página" };

export default async function NewFunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ oferta?: string; guia?: string }>;
}) {
  const { workspace } = await requireSession();
  const { oferta, guia } = await searchParams;
  const enFlujo = isFlowActive(guia);

  const offers = listOffers(workspace.id).filter((offer) => offer.status !== "archived");
  const products = listProducts(workspace.id, false);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title="🛍️ Armemos tu página de venta"
        subtitle="Preparamos la página donde lo contás, la página donde te pagan y la de gracias. Después editás lo que quieras."
      />

      <FlowBar step="pagina" />

      {offers.length === 0 ? (
        <EmptyState
          icon="tag"
          title="Primero necesitás una oferta"
          description="La página vende una oferta: precio, promesa y bonos. Armá una y volvemos acá."
          action={
            <LinkButton href="/app/ofertas/nueva" icon="plus">
              Crear oferta
            </LinkButton>
          }
        />
      ) : (
        <NewFunnelForm
          offers={offers.map((offer) => ({
            id: offer.id,
            name: offer.name,
            productId: offer.product_id,
          }))}
          products={products.map((product) => ({ id: product.id, name: product.name }))}
          initialOfferId={oferta}
          enFlujo={enFlujo}
        />
      )}
    </div>
  );
}
