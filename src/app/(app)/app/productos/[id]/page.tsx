import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ProductEditor } from "@/app/(app)/app/productos/[id]/editor";
import { PageHeader } from "@/components/ui/data";
import { Alert } from "@/components/ui/feedback";
import { LinkButton } from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { getProduct, listOffers, listProductFiles } from "@/lib/repo";
import { parseJson, toLines } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { workspace } = await requireSession();
  const { id } = await params;
  const product = getProduct(workspace.id, id);
  return { title: product?.name ?? "Producto" };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const { workspace } = await requireSession();
  const { id } = await params;
  const { nuevo } = await searchParams;

  const product = getProduct(workspace.id, id);
  if (!product) notFound();

  const files = listProductFiles(workspace.id, id);
  const offers = listOffers(workspace.id).filter((offer) => offer.product_id === id);
  const outline = parseJson<{ chapters?: Array<{ chapter: string; summary: string }>; faq?: Array<{ question: string; answer: string }> }>(
    product.outline,
    {},
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={product.name}
        subtitle={product.subtitle ?? "Editá el producto y su entrega."}
        breadcrumb={[{ label: "Productos", href: "/app/productos" }, { label: product.name }]}
        actions={
          <LinkButton href={`/app/ofertas/nueva?producto=${product.id}`} icon="tag">
            Crear oferta
          </LinkButton>
        }
      />

      {nuevo ? (
        <Alert
          tone="ai"
          title="Producto creado. El siguiente paso es la oferta."
          action={
            <LinkButton href={`/app/ofertas/nueva?producto=${product.id}`} size="sm" variant="ai">
              Construyamos tu oferta
            </LinkButton>
          }
        >
          Definí precio, promesa, bonos y order bump. Después armamos el funnel.
        </Alert>
      ) : null}

      <ProductEditor
        product={product}
        files={files}
        benefits={toLines(product.benefits)}
        outline={outline}
        offers={offers.map((offer) => ({ id: offer.id, name: offer.name, status: offer.status }))}
        currency={workspace.currency}
      />
    </div>
  );
}
