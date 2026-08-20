import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { OfferBuilder } from "@/app/(app)/app/ofertas/[id]/builder";
import { PageHeader } from "@/components/ui/data";
import { requireSession } from "@/lib/auth";
import {
  getOffer,
  listBonuses,
  listDownsells,
  listOrderBumps,
  listProducts,
  listUpsells,
} from "@/lib/repo";
import { toLines } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { workspace } = await requireSession();
  const { id } = await params;
  const offer = getOffer(workspace.id, id);
  return { title: offer?.name ?? "Oferta" };
}

export default async function OfferPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nueva?: string }>;
}) {
  const { workspace } = await requireSession();
  const { id } = await params;
  const { nueva } = await searchParams;

  const offer = getOffer(workspace.id, id);
  if (!offer) notFound();

  const bonuses = listBonuses(workspace.id, id);
  const bumps = listOrderBumps(workspace.id, id);
  const upsells = listUpsells(workspace.id, id);
  const downsells = upsells.flatMap((upsell) => listDownsells(workspace.id, upsell.id));
  const products = listProducts(workspace.id, false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={offer.name}
        subtitle={offer.headline ?? "Armá la oferta completa: promesa, bonos, bump y upsells."}
        breadcrumb={[{ label: "Ofertas", href: "/app/ofertas" }, { label: offer.name }]}
      />

      <OfferBuilder
        offer={offer}
        benefits={toLines(offer.benefits)}
        bonuses={bonuses}
        bumps={bumps}
        upsells={upsells}
        downsells={downsells}
        products={products.map((product) => ({ id: product.id, name: product.name }))}
        currency={workspace.currency}
        justCreated={nueva === "1"}
      />
    </div>
  );
}
