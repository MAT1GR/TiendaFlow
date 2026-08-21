import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ProductEditor } from "@/app/(app)/app/productos/[id]/editor";
import { SectionIntro } from "@/components/app/section-intro";
import { requireSession } from "@/lib/auth";
import { sectionBlurb } from "@/lib/product-nav";
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

/**
 * Pestaña "Producto": el contenido en sí —información, archivos, entrega—.
 * El precio y los bonos viven en la pestaña de al lado, porque son decisiones
 * de venta y no del producto.
 */
export default async function ProductContentTab({ params }: { params: Promise<{ id: string }> }) {
  const { workspace } = await requireSession();
  const { id } = await params;

  const product = getProduct(workspace.id, id);
  if (!product) notFound();

  const files = listProductFiles(workspace.id, id);
  const offers = listOffers(workspace.id).filter((offer) => offer.product_id === id);
  const outline = parseJson<{
    chapters?: Array<{ chapter: string; summary: string }>;
    faq?: Array<{ question: string; answer: string }>;
  }>(product.outline, {});

  return (
    <div className="flex flex-col gap-5">
      <SectionIntro emoji="📕" title="Mi producto" blurb={sectionBlurb("producto")} />

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
