import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { UpsellView } from "@/components/public/upsell-view";
import { VisitTracker } from "@/components/public/visit-tracker";
import { tiendaActual } from "@/lib/public-url";
import {
  resolvePublicFunnel,
  getOrder,
  getProduct,
  listUpsells,
} from "@/lib/repo";

export const metadata: Metadata = {
  title: "Una última cosa",
  robots: { index: false, follow: false },
};

export default async function UpsellPage({
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
  if (!upsell) notFound();

  const product = upsell.product_id ? getProduct(funnel.workspace_id, upsell.product_id) : null;

  return (
    <>
      <VisitTracker slug={slug} stepType="upsell" />
      <UpsellView
        kind="upsell"
        slug={slug}
        stepId={stepId}
        orderId={order.id}
        token={t ?? ""}
        data={{
          name: upsell.name,
          headline: upsell.headline,
          description: upsell.description,
          price: upsell.price,
          compareAtPrice: upsell.compare_at_price,
          currency: order.currency,
          acceptLabel: upsell.accept_label,
          declineLabel: upsell.decline_label,
          benefits: product?.benefits ?? null,
        }}
        orderReference={order.reference}
      />
    </>
  );
}
