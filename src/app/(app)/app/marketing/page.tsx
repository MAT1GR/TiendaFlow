import type { Metadata } from "next";

import { MarketingWorkspace } from "@/app/(app)/app/marketing/workspace";
import { PageHeader } from "@/components/ui/data";
import { requireSession } from "@/lib/auth";
import { getCampaignPerformance, resolveRange } from "@/lib/analytics";
import { getIntegration, listFunnels, listOffers } from "@/lib/repo";
import { publicSlug } from "@/lib/repo";

export const metadata: Metadata = { title: "Marketing" };

export default async function MarketingPage() {
  const { workspace } = await requireSession();

  const campaigns = getCampaignPerformance(workspace.id, resolveRange("30d"));
  const funnels = listFunnels(workspace.id);
  const offers = listOffers(workspace.id).filter((offer) => offer.status !== "archived");
  const meta = getIntegration(workspace.id, "meta");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Marketing"
        subtitle="Campañas, creativos y el copy que trae el tráfico."
      />

      <MarketingWorkspace
        campaigns={campaigns}
        funnels={funnels.map((funnel) => ({
          id: funnel.id,
          name: funnel.name,
          status: funnel.status,
          publicUrl: funnel.published_url ?? `/f/${publicSlug(funnel)}`,
        }))}
        offers={offers.map((offer) => ({ id: offer.id, name: offer.name }))}
        currency={workspace.currency}
        metaConnected={meta?.status === "connected"}
      />
    </div>
  );
}
