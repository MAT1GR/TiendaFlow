import Link from "next/link";
import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/data";
import { DemoTag } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
} from "@/components/ui/primitives";
import { getFunnelMetrics, resolveRange } from "@/lib/analytics";
import { requireSession } from "@/lib/auth";
import { listFunnels } from "@/lib/repo";
import { formatMoney, formatNumber, formatPercent, STATUS_LABEL, statusTone, STEP_TYPE_LABEL } from "@/lib/utils";

export const metadata: Metadata = { title: "Funnels" };

export default async function FunnelsPage() {
  const { workspace } = await requireSession();
  const funnels = listFunnels(workspace.id);
  const metrics = getFunnelMetrics(workspace.id, resolveRange("30d"));
  const metricsMap = Object.fromEntries(metrics.map((item) => [item.funnelId, item]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Funnels"
        subtitle="El recorrido completo, desde el anuncio hasta la página de gracias."
        actions={
          <LinkButton href="/app/funnels/nuevo" icon="plus">
            Crear funnel
          </LinkButton>
        }
      />

      {funnels.length === 0 ? (
        <EmptyState
          icon="funnel"
          title="Tu primer funnel está a un clic"
          description="Armamos landing, checkout, upsell y página de gracias en un solo paso. Después editás lo que quieras."
          action={
            <LinkButton href="/app/funnels/nuevo" icon="plus">
              Crear funnel
            </LinkButton>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {funnels.map((funnel) => {
            const metric = metricsMap[funnel.id];
            return (
              <Card key={funnel.id} hover as="article" className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/app/funnels/${funnel.id}`}
                        className="truncate text-[15px] font-semibold text-ink-900 hover:text-brand-700"
                      >
                        {funnel.name}
                      </Link>
                      {funnel.is_demo ? <DemoTag /> : null}
                    </div>
                    {funnel.published_url ? (
                      <Link
                        href={funnel.published_url}
                        target="_blank"
                        className="mt-1 inline-flex items-center gap-1 text-[12px] text-brand-700 hover:text-brand-800"
                      >
                        {funnel.published_url}
                        <Icon name="arrowUpRight" size={12} />
                      </Link>
                    ) : (
                      <p className="mt-1 text-[12px] text-ink-500">Sin publicar</p>
                    )}
                  </div>
                  <Badge tone={statusTone(funnel.status)}>
                    {STATUS_LABEL[funnel.status] ?? funnel.status}
                  </Badge>
                </div>

                <div className="tf-scroll mt-4 flex items-center gap-1.5 overflow-x-auto pb-1">
                  {(metric?.steps ?? []).map((step, index) => (
                    <div key={step.stepId} className="flex shrink-0 items-center gap-1.5">
                      <span className="rounded-lg bg-ink-100 px-2.5 py-1 text-[11.5px] font-medium text-ink-700">
                        {STEP_TYPE_LABEL[step.type] ?? step.name}
                      </span>
                      {index < (metric?.steps.length ?? 0) - 1 ? (
                        <Icon name="chevronRight" size={13} className="text-ink-300" />
                      ) : null}
                    </div>
                  ))}
                  {!metric?.steps.length ? (
                    <span className="text-[12.5px] text-ink-500">Sin pasos configurados</span>
                  ) : null}
                </div>

                <dl className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
                  <Stat label="Visitantes" value={formatNumber(metric?.visitors ?? 0, true)} />
                  <Stat label="A checkout" value={formatPercent(metric?.checkoutRate ?? 0)} />
                  <Stat label="Conversión" value={formatPercent(metric?.conversionRate ?? 0)} />
                  <Stat label="Ventas" value={formatNumber(metric?.orders ?? 0)} />
                  <Stat
                    label="Facturación"
                    value={formatMoney(metric?.revenue ?? 0, workspace.currency, true)}
                  />
                </dl>

                <div className="mt-5 flex items-center justify-between gap-2">
                  <span className="text-[12px] text-ink-500">Últimos 30 días</span>
                  <LinkButton href={`/app/funnels/${funnel.id}`} variant="secondary" size="sm">
                    Editar funnel
                  </LinkButton>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-[14px] font-semibold tabular-nums text-ink-900">{value}</dd>
    </div>
  );
}
