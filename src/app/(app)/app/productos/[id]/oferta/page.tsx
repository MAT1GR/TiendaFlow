import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { OfferBuilder } from "@/app/(app)/app/ofertas/[id]/builder";
import { Icon } from "@/components/ui/icon";
import { Card, LinkButton } from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { productContext } from "@/lib/product-workspace";
import { listBonuses, listDownsells, listOrderBumps, listProducts, listUpsells } from "@/lib/repo";
import { toLines } from "@/lib/utils";

export const metadata: Metadata = { title: "Precio y bonos" };

/**
 * Pestaña "Precio y bonos".
 *
 * Es la oferta del producto, pero el usuario nunca lee la palabra "oferta" como
 * una entidad aparte: para él es simplemente cuánto sale su producto y qué le
 * suma. Un producto tiene una sola oferta.
 */
export default async function ProductOfferTab({ params }: { params: Promise<{ id: string }> }) {
  const { workspace } = await requireSession();
  const { id } = await params;

  const context = productContext(workspace.id, id);
  if (!context) notFound();

  const { offer } = context;

  if (!offer) {
    return (
      <Card className="p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon name="tag" size={22} />
        </span>
        <h2 className="mt-5 text-[19px] font-semibold tracking-tight text-ink-900">
          Todavía no le pusiste precio
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink-500">
          Definí cuánto sale y qué promete tu producto. Después vas a poder sumarle bonos, un order
          bump y upsells para subir el ticket.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <LinkButton href={`/app/ofertas/nueva?producto=${id}`} icon="plus">
            Ponerle precio
          </LinkButton>
        </div>
      </Card>
    );
  }

  const bonuses = listBonuses(workspace.id, offer.id);
  const bumps = listOrderBumps(workspace.id, offer.id);
  const upsells = listUpsells(workspace.id, offer.id);
  const downsells = upsells.flatMap((upsell) => listDownsells(workspace.id, upsell.id));
  const products = listProducts(workspace.id, false);

  return (
    <OfferBuilder
      offer={offer}
      benefits={toLines(offer.benefits)}
      bonuses={bonuses}
      bumps={bumps}
      upsells={upsells}
      downsells={downsells}
      products={products.map((product) => ({ id: product.id, name: product.name }))}
      currency={workspace.currency}
      justCreated={false}
    />
  );
}
