import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { LinkButton } from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { productContext, productJourney } from "@/lib/product-workspace";
import { formatMoney, formatNumber, formatPercent } from "@/lib/utils";

export const metadata: Metadata = { title: "Resultados" };

/**
 * Resultados del producto.
 *
 * Regla que ordena la pantalla: **sin datos no hay métricas**. Mostrar seis
 * tarjetas en cero a alguien que todavía no publicó no le dice nada y le hace
 * creer que la app está vacía o rota. En su lugar le explicamos qué falta para
 * que empiece a haber números.
 */
export default async function ResultsTab({ params }: { params: Promise<{ id: string }> }) {
  const { workspace } = await requireSession();
  const { id } = await params;

  const context = productContext(workspace.id, id);
  const journey = productJourney(workspace.id, id);
  if (!context || !journey) notFound();

  const { offer, stats } = context;
  const currency = offer?.currency ?? workspace.currency;

  // Todavía no publicó: no hay nada que medir.
  if (!journey.live) {
    return (
      <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center">
        <p className="tf-emoji !inline-flex text-[32px]" aria-hidden="true">
          📊
        </p>
        <h2 className="mt-4 text-[19px] font-semibold tracking-tight text-ink-900">
          Todavía no hay nada para medir
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink-500">
          Cuando tu producto esté publicado y empiece a recibir visitas, acá vas a ver cuánta gente
          entró, cuántos compraron y cuánto facturaste.
        </p>
        <div className="mt-6 flex justify-center">
          <LinkButton href={`/app/productos/${id}`} icon="arrowRight">
            Prepararlo para vender
          </LinkButton>
        </div>
      </div>
    );
  }

  // Publicado pero sin tráfico: tampoco tiene sentido mostrar porcentajes.
  if (stats.visits === 0) {
    return (
      <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center">
        <p className="tf-emoji !inline-flex text-[32px]" aria-hidden="true">
          👀
        </p>
        <h2 className="mt-4 text-[19px] font-semibold tracking-tight text-ink-900">
          Tu página todavía no recibió visitas
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink-500">
          Ya podés vender: lo que falta es que la gente llegue. Compartí tu link o armá una campaña
          y en cuanto entre la primera persona vas a ver los números acá.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <LinkButton href="/app/marketing" icon="megaphone">
            Armar una campaña
          </LinkButton>
        </div>
      </div>
    );
  }

  const ticket = stats.orders > 0 ? stats.revenue / stats.orders : 0;

  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric emoji="💰" label="Facturación" value={formatMoney(stats.revenue, currency)} />
        <Metric emoji="🛒" label="Ventas" value={formatNumber(stats.orders)} />
        <Metric emoji="👀" label="Visitas" value={formatNumber(stats.visits)} />
        <Metric
          emoji="📈"
          label="Personas que compraron"
          value={stats.conversion === null ? "—" : formatPercent(stats.conversion)}
          hint="De cada 100 que entran"
        />
      </dl>

      {stats.orders > 0 ? (
        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">
            Cuánto deja cada venta
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Inline label="Ticket promedio" value={formatMoney(ticket, currency)} />
            <Inline label="Precio de lista" value={offer ? formatMoney(offer.price, offer.currency) : "—"} />
            <Inline
              label="Diferencia"
              value={
                offer && offer.price > 0
                  ? `${ticket >= offer.price ? "+" : ""}${formatMoney(ticket - offer.price, currency)}`
                  : "—"
              }
              hint={
                offer && ticket > offer.price
                  ? "Tus ofertas extra están funcionando"
                  : "Un order bump o una segunda oferta suben este número"
              }
            />
          </dl>
        </div>
      ) : null}
    </div>
  );
}

function Metric({
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
    <div className="rounded-2xl border border-ink-200 bg-white p-4">
      <dt className="flex items-center gap-2 text-[12.5px] font-medium text-ink-500">
        <span className="tf-emoji" aria-hidden="true">
          {emoji}
        </span>
        {label}
      </dt>
      <dd className="mt-1.5 text-[24px] font-semibold tracking-tight text-ink-900 tabular-nums">
        {value}
      </dd>
      {hint ? <p className="mt-0.5 text-[11.5px] text-ink-400">{hint}</p> : null}
    </div>
  );
}

function Inline({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-[12.5px] font-medium text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-[17px] font-semibold text-ink-900 tabular-nums">{value}</dd>
      {hint ? <p className="mt-0.5 text-[11.5px] leading-snug text-ink-400">{hint}</p> : null}
    </div>
  );
}
