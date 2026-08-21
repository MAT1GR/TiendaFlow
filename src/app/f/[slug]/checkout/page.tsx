import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { CheckoutForm } from "@/app/f/[slug]/checkout/form";
import { MetaPixel } from "@/components/public/meta-pixel";
import { VisitTracker } from "@/components/public/visit-tracker";
import { getMetaPublicConfig } from "@/lib/integrations/meta";
import { listProviderStatus } from "@/lib/integrations/payments";
import { tiendaActual } from "@/lib/public-url";
import {
  resolvePublicFunnel,
  getOffer,
  getProduct,
  listBonuses,
  listOrderBumps,
} from "@/lib/repo";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cancelado?: string }>;
}) {
  const { slug } = await params;
  const { cancelado } = await searchParams;

  const funnel = resolvePublicFunnel(slug, await tiendaActual());
  if (!funnel) notFound();

  const offer = funnel.offer_id ? getOffer(funnel.workspace_id, funnel.offer_id) : null;
  if (!offer) notFound();

  const product = offer.product_id ? getProduct(funnel.workspace_id, offer.product_id) : null;
  const bumps = listOrderBumps(funnel.workspace_id, offer.id).filter((bump) => bump.active);
  const bonuses = listBonuses(funnel.workspace_id, offer.id);
  const providers = listProviderStatus(funnel.workspace_id);
  const connectedProvider = providers.find((provider) => provider.connected) ?? null;
  const pixel = getMetaPublicConfig(funnel.workspace_id);

  return (
    <>
      {pixel ? (
        <MetaPixel
          pixelId={pixel.pixelId}
          events={["InitiateCheckout"]}
          value={offer.price}
          currency={offer.currency}
        />
      ) : null}
      <VisitTracker slug={slug} stepType="checkout" />

      <CheckoutForm
        slug={slug}
        offer={{
          name: offer.name,
          headline: offer.headline,
          price: offer.price,
          compareAtPrice: offer.compare_at_price,
          currency: offer.currency,
          ctaText: offer.cta_text,
          guarantee: offer.guarantee,
        }}
        productName={product?.name ?? offer.name}
        bumps={bumps.map((bump) => ({
          id: bump.id,
          name: bump.name,
          description: bump.description,
          label: bump.checkbox_label,
          price: bump.price,
        }))}
        bonuses={bonuses.map((bonus) => ({ name: bonus.name, value: bonus.value }))}
        provider={
          connectedProvider
            ? { name: connectedProvider.name, mode: connectedProvider.mode }
            : null
        }
        cancelled={cancelado === "1"}
      />
    </>
  );
}
