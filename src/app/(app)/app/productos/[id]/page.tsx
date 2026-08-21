import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Journey } from "@/app/(app)/app/productos/[id]/journey";
import { AdviceCard } from "@/app/(app)/app/productos/[id]/advice";
import { ShareLink } from "@/app/(app)/app/productos/[id]/share-link";
import { SectionIntro } from "@/components/app/section-intro";
import { productAdvice, productContext, productJourney, sectionBlurb } from "@/lib/product-workspace";
import { requireSession } from "@/lib/auth";
import { formatMoney, formatNumber, formatPercent } from "@/lib/utils";

export const metadata: Metadata = { title: "Resumen" };

/**
 * Resumen del producto: el GPS.
 *
 * Está ordenada por lo que la persona necesita saber, en ese orden y no otro:
 *
 *   1. ¿Qué me falta y qué hago ahora?  → el camino
 *   2. ¿Qué me conviene hacer?          → la recomendación
 *   3. ¿Está funcionando?               → los números
 *
 * Los números aparecen solo cuando el producto ya está a la venta. Cuatro
 * métricas en cero a alguien que todavía no publicó no le dicen nada y le tapan
 * lo único que tiene que hacer.
 */
export default async function ProductOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requireSession();
  const { id } = await params;

  const context = productContext(workspace.id, id);
  const journey = productJourney(workspace.id, id);
  if (!context || !journey) notFound();

  const { publicUrl, stats, offer } = context;
  const advice = productAdvice(workspace.id, id);
  const currency = offer?.currency ?? workspace.currency;
  const ticket = stats.orders > 0 ? stats.revenue / stats.orders : 0;

  return (
    <div className="flex flex-col gap-5">
      <SectionIntro emoji="🏠" title="Resumen" blurb={sectionBlurb("")} />

      <Journey journey={journey} />

      {advice ? <AdviceCard advice={advice} /> : null}

      {publicUrl ? <ShareLink url={publicUrl} /> : null}

      {journey.live ? (
        <section>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink-900">
            <span className="tf-emoji" aria-hidden="true">
              📊
            </span>
            Cómo viene
          </h2>

          <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Quick emoji="💰" label="Facturación" value={formatMoney(stats.revenue, currency)} />
            <Quick emoji="🛒" label="Ventas" value={formatNumber(stats.orders)} />
            <Quick
              emoji="📈"
              label="Conversión"
              value={stats.conversion === null ? "—" : formatPercent(stats.conversion)}
              hint={stats.conversion === null ? "Sin visitas todavía" : "De cada 100 que entran"}
            />
            <Quick emoji="💵" label="Ticket promedio" value={formatMoney(ticket, currency)} />
          </dl>
        </section>
      ) : null}
    </div>
  );
}

function Quick({
  emoji,
  label,
  value,
  hint,
}: {
  emoji: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-4 transition-shadow hover:shadow-soft">
      <dt className="flex items-center gap-2 text-[12.5px] font-medium text-ink-500">
        <span className="tf-emoji" aria-hidden="true">
          {emoji}
        </span>
        {label}
      </dt>
      <dd className="mt-1.5 text-[24px] font-semibold leading-none tracking-tight text-ink-900 tabular-nums">
        {value}
      </dd>
      {hint ? <p className="mt-1.5 text-[11.5px] text-ink-400">{hint}</p> : null}
    </div>
  );
}
