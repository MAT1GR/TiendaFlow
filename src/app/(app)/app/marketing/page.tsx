import type { Metadata } from "next";

import { MarketingWorkspace } from "@/app/(app)/app/marketing/workspace";
import { MoreLink } from "@/components/app/more-link";
import { PageHeader } from "@/components/ui/data";
import { requireSession } from "@/lib/auth";
import { getCampaignPerformance, resolveRange } from "@/lib/analytics";
import { all } from "@/lib/db";
import { getIntegration, listOffers, publicSlug } from "@/lib/repo";

export const metadata: Metadata = { title: "Marketing" };

export default async function MarketingPage() {
  const { workspace } = await requireSession();

  const campaigns = getCampaignPerformance(workspace.id, resolveRange("30d"));
  const offers = listOffers(workspace.id).filter((offer) => offer.status !== "archived");
  const meta = getIntegration(workspace.id, "meta");

  // Los destinos posibles son productos, no "funnels": la persona elige adónde
  // mandar la gente pensando en qué vende, no en cómo se llama la entidad que
  // hay por debajo.
  const destinations = all<{
    id: string;
    slug: string;
    published_url: string | null;
    product_name: string;
  }>(
    `SELECT f.id, f.slug, f.published_url, p.name AS product_name
     FROM funnels f
     JOIN offers o ON o.id = f.offer_id
     JOIN products p ON p.id = o.product_id
     WHERE f.workspace_id = ? AND p.status != 'archived'
     ORDER BY p.created_at DESC`,
    workspace.id,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="🚀 Conseguí más ventas"
        subtitle="Acá armás los links y los anuncios que llevan gente a tus páginas."
      />

      <MarketingWorkspace
        campaigns={campaigns}
        destinations={destinations.map((row) => ({
          id: row.id,
          name: row.product_name,
          publicUrl: row.published_url ?? `/f/${publicSlug({ slug: row.slug, id: row.id })}`,
        }))}
        offers={offers.map((offer) => ({ id: offer.id, name: offer.name }))}
        currency={workspace.currency}
        metaConnected={meta?.status === "connected"}
      />

      <MoreLink
        emoji="🤝"
        title="Afiliados"
        blurb="Que otras personas vendan tus productos y se lleven una comisión."
        href="/app/afiliados"
      />
    </div>
  );
}
