import { LinkButton } from "@/components/ui/primitives";
import type { ProductAdvice } from "@/lib/product-workspace";

/**
 * "TiendaFlow recomienda".
 *
 * Una sola tarjeta, una sola recomendación, un solo botón. Es deliberado: si
 * mostramos tres cosas para mejorar, la persona no hace ninguna.
 */
export function AdviceCard({ advice }: { advice: ProductAdvice }) {
  return (
    <section className="rounded-2xl border border-brand-200 bg-brand-50/50 p-5">
      <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-brand-700">
        <span className="tf-emoji" aria-hidden="true">
          🤖
        </span>
        TiendaFlow recomienda
      </p>

      <div className="mt-2.5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h3 className="flex items-start gap-2 text-[15.5px] font-semibold tracking-tight text-ink-900">
            <span className="tf-emoji shrink-0" aria-hidden="true">
              {advice.emoji}
            </span>
            {advice.title}
          </h3>
          <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-ink-600">{advice.body}</p>
        </div>

        <LinkButton href={advice.ctaHref} size="sm" iconRight="arrowRight" className="shrink-0">
          {advice.ctaLabel}
        </LinkButton>
      </div>
    </section>
  );
}
