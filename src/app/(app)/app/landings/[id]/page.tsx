import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { LandingEditor } from "@/app/(app)/app/landings/[id]/editor";
import { requireSession } from "@/lib/auth";
import { getLandingPage, getOffer, listLandingSections } from "@/lib/repo";
import { formatMoney, parseJson } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { workspace } = await requireSession();
  const { id } = await params;
  const page = getLandingPage(workspace.id, id);
  return { title: page?.name ?? "Landing" };
}

export default async function LandingEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requireSession();
  const { id } = await params;

  const page = getLandingPage(workspace.id, id);
  if (!page) notFound();

  const sections = listLandingSections(workspace.id, id);
  const offer = page.offer_id ? getOffer(workspace.id, page.offer_id) : null;
  const theme = parseJson<unknown>(page.theme, {});

  return (
    <LandingEditor
      page={{
        id: page.id,
        name: page.name,
        status: page.status,
        theme: theme,
        seoTitle: page.seo_title,
        seoDescription: page.seo_description,
      }}
      sections={sections.map((section) => ({
        id: section.id,
        type: section.type,
        content: parseJson<Record<string, unknown>>(section.content, {}),
      }))}
      offer={
        offer
          ? {
              id: offer.id,
              name: offer.name,
              priceLabel: formatMoney(offer.price, offer.currency),
              compareLabel: offer.compare_at_price
                ? formatMoney(offer.compare_at_price, offer.currency)
                : null,
            }
          : null
      }
    />
  );
}
