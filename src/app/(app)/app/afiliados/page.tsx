import type { Metadata } from "next";

import { AffiliatesPanel } from "@/app/(app)/app/afiliados/panel";
import { MetricCard, PageHeader } from "@/components/ui/data";
import { requireSession } from "@/lib/auth";
import {
  listAffiliateLinks,
  listAffiliates,
  listCommissions,
  listFunnels,
} from "@/lib/repo";
import { formatMoney, formatNumber, formatPercent } from "@/lib/utils";

export const metadata: Metadata = { title: "Afiliados" };

export default async function AffiliatesPage() {
  const { workspace } = await requireSession();

  const affiliates = listAffiliates(workspace.id);
  const links = listAffiliateLinks(workspace.id);
  const commissions = listCommissions(workspace.id);
  const funnels = listFunnels(workspace.id);

  const totalClicks = links.reduce((acc, link) => acc + link.clicks, 0);
  const totalConversions = links.reduce((acc, link) => acc + link.conversions, 0);
  const totalRevenue = links.reduce((acc, link) => acc + link.revenue, 0);
  const pendingCommissions = commissions
    .filter((commission) => commission.status === "pending")
    .reduce((acc, commission) => acc + commission.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Afiliados"
        subtitle="Que otros vendan por vos y cobren su comisión."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard label="Afiliados" value={formatNumber(affiliates.length)} icon="handshake" />
        <MetricCard label="Clics" value={formatNumber(totalClicks, true)} icon="target" />
        <MetricCard
          label="Conversión"
          value={formatPercent(totalClicks ? (totalConversions / totalClicks) * 100 : 0)}
          icon="trendUp"
          emptyReason={totalClicks === 0 ? "Sin clics registrados" : undefined}
        />
        <MetricCard
          label="Facturación por afiliados"
          value={formatMoney(totalRevenue, workspace.currency, true)}
          icon="chart"
        />
        <MetricCard
          label="Comisiones pendientes"
          value={formatMoney(pendingCommissions, workspace.currency, true)}
          icon="card"
        />
      </div>

      <AffiliatesPanel
        affiliates={affiliates}
        links={links}
        funnels={funnels.map((funnel) => ({ id: funnel.id, name: funnel.name }))}
        currency={workspace.currency}
      />
    </div>
  );
}
