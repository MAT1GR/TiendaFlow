import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { SectionIntro } from "@/components/app/section-intro";
import { Icon } from "@/components/ui/icon";
import { LinkButton } from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import {
  productAdvice,
  productBoosters,
  productContext,
  productJourney,
  sectionBlurb,
} from "@/lib/product-workspace";
import { cn, formatMoney, formatNumber, formatPercent } from "@/lib/utils";

export const metadata: Metadata = { title: "Resultados" };

/**
 * Resultados del producto.
 *
 * Regla que ordena la pantalla: **sin datos no hay métricas**. Mostrar seis
 * tarjetas en cero a alguien que todavía no publicó no le dice nada y le hace
 * creer que la app está vacía o rota. En su lugar le explicamos qué falta para
 * que empiece a haber números.
 *
 * Y cuando sí hay datos, lo primero no es una tabla: es el recorrido dibujado
 * —cuánta gente entró, cuánta llegó a pagar, cuánta compró—, que es lo único
 * que de verdad se lee de un vistazo.
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
      <Gate
        emoji="📊"
        title="Todavía no hay nada para medir"
        body="Cuando tu producto esté publicado y empiece a recibir visitas, acá vas a ver cuánta gente entró, cuántas compraron y cuánto facturaste."
        href={`/app/productos/${id}`}
        cta="Prepararlo para vender"
      />
    );
  }

  // Publicado pero sin tráfico: tampoco tiene sentido mostrar porcentajes.
  if (stats.visits === 0) {
    return (
      <Gate
        emoji="👀"
        title="Tu página todavía no recibió visitas"
        body="Ya podés vender: lo que falta es que la gente llegue. Compartí tu link o armá un anuncio, y en cuanto entre la primera persona vas a ver los números acá."
        href="/app/marketing"
        cta="Conseguir visitas"
      />
    );
  }

  const ticket = stats.orders > 0 ? stats.revenue / stats.orders : 0;
  const advice = productAdvice(workspace.id, id);
  const boosters = productBoosters(workspace.id, id).filter((booster) => !booster.done);

  return (
    <div className="flex flex-col gap-5">
      <SectionIntro emoji="📊" title="Resultados" blurb={sectionBlurb("resultados")} />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric emoji="💰" label="Facturación" value={formatMoney(stats.revenue, currency)} />
        <Metric emoji="🛒" label="Ventas" value={formatNumber(stats.orders)} />
        <Metric
          emoji="📈"
          label="Conversión"
          value={stats.conversion === null ? "—" : formatPercent(stats.conversion)}
          hint="De cada 100 que entran"
        />
        <Metric emoji="💵" label="Ticket promedio" value={formatMoney(ticket, currency)} />
      </dl>

      {/* El recorrido, dibujado. Nada de "tasa de checkout": entraron tantos,
          compraron tantos, y este porcentaje. */}
      <section className="rounded-2xl border border-ink-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink-900">
          <span className="tf-emoji" aria-hidden="true">
            👀
          </span>
          Qué pasó con la gente que llegó
        </h2>

        <div className="mt-5 flex items-stretch gap-2 sm:gap-4">
          <Funnel
            emoji="👀"
            label="Entraron a tu página"
            value={formatNumber(stats.visits)}
            share={1}
          />
          <Arrow />
          <Funnel
            emoji="🛒"
            label="Te compraron"
            value={formatNumber(stats.orders)}
            share={stats.visits > 0 ? stats.orders / stats.visits : 0}
            highlight
          />
        </div>

        <p className="mt-5 border-t border-ink-100 pt-4 text-[13.5px] leading-relaxed text-ink-600">
          De cada 100 personas que entraron,{" "}
          <strong className="text-ink-900">
            {stats.conversion === null ? "—" : formatPercent(stats.conversion)}
          </strong>{" "}
          terminó comprando.{" "}
          {stats.conversion !== null && stats.conversion >= 2
            ? "Está bien: entre 1% y 3% es lo normal para una página de venta."
            : "Entre 1% y 3% es lo normal. Si estás por debajo, casi siempre es la promesa del título o la falta de garantía."}
        </p>
      </section>

      {advice ? (
        <section className="rounded-2xl border border-brand-200 bg-brand-50/50 p-5">
          <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-brand-700">
            <span className="tf-emoji" aria-hidden="true">
              🤖
            </span>
            Qué está pasando
          </p>
          <h3 className="mt-2.5 text-[15.5px] font-semibold tracking-tight text-ink-900">
            {advice.title}
          </h3>
          <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-ink-600">{advice.body}</p>
          <LinkButton
            href={advice.ctaHref}
            size="sm"
            iconRight="arrowRight"
            className="mt-3.5"
          >
            {advice.ctaLabel}
          </LinkButton>
        </section>
      ) : null}

      {boosters.length > 0 ? (
        <section className="rounded-2xl border border-ink-200 bg-white p-5">
          <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">
            Dónde podés vender más
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-500">
            Nada de esto es obligatorio. Son las cosas que más mueven la aguja cuando ya vendés.
          </p>

          <ul className="mt-4 flex flex-col divide-y divide-ink-100">
            {boosters.map((booster) => (
              <li key={booster.code} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink-100 text-ink-400">
                  <Icon name="plus" size={13} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-ink-900">{booster.title}</p>
                  <p className="text-[12.5px] text-ink-500">{booster.description}</p>
                </div>
                <LinkButton href={booster.href} variant="secondary" size="sm">
                  Agregar
                </LinkButton>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

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

/**
 * Un escalón del recorrido.
 *
 * La altura de la barra es proporcional a la gente que llegó hasta ahí: la
 * caída se ve antes de leer ningún número.
 */
function Funnel({
  emoji,
  label,
  value,
  share,
  highlight,
}: {
  emoji: string;
  label: string;
  value: string;
  share: number;
  highlight?: boolean;
}) {
  const height = Math.max(share * 100, 8);

  return (
    <div className="flex min-w-0 flex-1 flex-col justify-end">
      <p className="text-[22px] font-semibold leading-none tracking-tight text-ink-900 tabular-nums sm:text-[26px]">
        {value}
      </p>
      <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-ink-500">
        <span className="tf-emoji" aria-hidden="true">
          {emoji}
        </span>
        <span className="truncate">{label}</span>
      </p>
      <div className="mt-3 flex h-24 items-end">
        <div
          className={cn(
            "w-full rounded-t-xl transition-[height] duration-700 ease-out",
            highlight ? "bg-accent-500" : "bg-brand-500",
          )}
          style={{ height: `${height}%` }}
        />
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex shrink-0 items-end pb-9 text-ink-300">
      <Icon name="arrowRight" size={20} />
    </div>
  );
}

function Gate({
  emoji,
  title,
  body,
  href,
  cta,
}: {
  emoji: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <SectionIntro emoji="📊" title="Resultados" blurb={sectionBlurb("resultados")} />

      <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center">
        <p className="tf-emoji !inline-flex text-[32px]" aria-hidden="true">
          {emoji}
        </p>
        <h2 className="mt-4 text-[19px] font-semibold tracking-tight text-ink-900">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink-500">{body}</p>
        <div className="mt-6 flex justify-center">
          <LinkButton href={href} icon="arrowRight">
            {cta}
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
