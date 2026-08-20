import type { Metadata } from "next";

import { NewFunnelForm } from "@/app/(app)/app/funnels/nuevo/form";
import { PageHeader } from "@/components/ui/data";
import { EmptyState, LinkButton } from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { listOffers, listProducts } from "@/lib/repo";

export const metadata: Metadata = { title: "Crear funnel" };

export default async function NewFunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ oferta?: string }>;
}) {
  const { workspace } = await requireSession();
  const { oferta } = await searchParams;

  const offers = listOffers(workspace.id).filter((offer) => offer.status !== "archived");
  const products = listProducts(workspace.id, false);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title="Armá tu funnel"
        subtitle="Creamos landing, checkout, upsell y página de gracias. Después editás cada paso."
        breadcrumb={[{ label: "Funnels", href: "/app/funnels" }, { label: "Nuevo" }]}
      />

      {offers.length === 0 ? (
        <EmptyState
          icon="tag"
          title="Primero necesitás una oferta"
          description="El funnel vende una oferta: precio, promesa y bonos. Creá una y volvemos acá."
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
        />
      )}
    </div>
  );
}
