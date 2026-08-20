import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { FunnelBuilder } from "@/app/(app)/app/funnels/[id]/builder";
import { PageHeader } from "@/components/ui/data";
import { getFunnelMetrics, resolveRange } from "@/lib/analytics";
import { requireSession } from "@/lib/auth";
import { funnelPublishBlockers } from "@/lib/launch";
import {
  getFunnel,
  getLandingPageByStep,
  listFunnelSteps,
  listOffers,
} from "@/lib/repo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { workspace } = await requireSession();
  const { id } = await params;
  const funnel = getFunnel(workspace.id, id);
  return { title: funnel?.name ?? "Funnel" };
}

export default async function FunnelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const { workspace } = await requireSession();
  const { id } = await params;
  const { nuevo } = await searchParams;

  const funnel = getFunnel(workspace.id, id);
  if (!funnel) notFound();

  const steps = listFunnelSteps(workspace.id, id);
  const metrics = getFunnelMetrics(workspace.id, resolveRange("30d")).find(
    (item) => item.funnelId === id,
  );
  const blockers = funnelPublishBlockers(workspace.id, id);
  const offers = listOffers(workspace.id);

  const landingByStep: Record<string, string> = {};
  for (const step of steps) {
    if (step.type === "landing") {
      const page = getLandingPageByStep(workspace.id, step.id);
      if (page) landingByStep[step.id] = page.id;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={funnel.name}
        subtitle="Agregá, ordená y editá cada paso del recorrido."
        breadcrumb={[{ label: "Funnels", href: "/app/funnels" }, { label: funnel.name }]}
      />

      <FunnelBuilder
        funnel={funnel}
        steps={steps}
        metrics={metrics ?? null}
        blockers={blockers}
        landingByStep={landingByStep}
        offers={offers.map((offer) => ({ id: offer.id, name: offer.name }))}
        currency={workspace.currency}
        justCreated={nuevo === "1"}
      />
    </div>
  );
}
