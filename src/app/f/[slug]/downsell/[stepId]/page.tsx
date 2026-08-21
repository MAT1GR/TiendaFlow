import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { UpsellView } from "@/components/public/upsell-view";
import { VisitTracker } from "@/components/public/visit-tracker";
import { tiendaActual } from "@/lib/public-url";
import {
  resolvePublicFunnel,
  getOrder,
  getProduct,
  listDownsells,
  listUpsells,
} from "@/lib/repo";

export const metadata: Metadata = {
  title: "Última oportunidad",
  robots: { index: false, follow: false },
};

export default async function DownsellPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; stepId: string }>;
  searchParams: Promise<{ pedido?: string; t?: string }>;
}) {
  const { slug, stepId } = await params;
  const { pedido, t } = await searchParams;

  const funnel = resolvePublicFunnel(slug, await tiendaActual());
  if (!funnel || !funnel.offer_id) notFound();

  const order = pedido ? getOrder(funnel.workspace_id, pedido) : null;
  if (!order || order.access_token !== t) notFound();

  const upsell = listUpsells(funnel.workspace_id, funnel.offer_id).find((item) => item.active);
  const downsell = upsell ? listDownsells(funnel.workspace_id, upsell.id)[0] : null;
  if (!downsell) notFound();

  const product = downsell.product_id
    ? getProduct(funnel.workspace_id, downsell.product_id)
    : null;

  return (
    <>
      <VisitTracker slug={slug} stepType="downsell" />
      <UpsellView
        kind="downsell"
        slug={slug}
        stepId={stepId}
        orderId={order.id}
        token={t ?? ""}
        data={{
          name: downsell.name,
          headline: downsell.headline,
          description: downsell.description,
          price: downsell.price,
          compareAtPrice: downsell.compare_at_price,
          currency: order.currency,
          acceptLabel: downsell.accept_label,
          declineLabel: downsell.decline_label,
          benefits: product?.benefits ?? null,
        }}
        orderReference={order.reference}
      />
    </>
  );
}
