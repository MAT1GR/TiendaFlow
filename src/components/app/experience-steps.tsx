import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * El recorrido que hace tu cliente, como navegación.
 *
 * Por debajo esto es un funnel con sus pasos, sus slugs y su tabla. Arriba no:
 * arriba son las cuatro pantallas por las que pasa una persona que compra, en
 * el orden en que las ve. El vendedor nunca necesita saber la palabra "funnel"
 * para editar su página de venta, igual que no necesita saber qué es un
 * `landing_page_id` para cambiar un titular.
 *
 * Los cuatro pasos existen siempre, aunque estén vacíos. Ver el recorrido
 * completo —incluso las partes que todavía no configuró— es la mitad de lo que
 * esta barra tiene que enseñar.
 */

export type ExperienceStep = "venta" | "checkout" | "despues" | "gracias";

interface Paso {
  id: ExperienceStep;
  emoji: string;
  label: string;
  /** La frase que explica qué es esa pantalla, en criollo. */
  blurb: string;
  segmento: string;
}

export const EXPERIENCE_STEPS: Paso[] = [
  {
    id: "venta",
    emoji: "🛍️",
    label: "Página de venta",
    blurb: "Estás editando la página que ve tu cliente antes de comprar.",
    segmento: "pagina",
  },
  {
    id: "checkout",
    emoji: "💳",
    label: "Checkout",
    blurb: "Así ve tu cliente la pantalla donde completa sus datos y paga.",
    segmento: "pagina/checkout",
  },
  {
    id: "despues",
    emoji: "🎁",
    label: "Después de comprar",
    blurb: "Lo que le ofrecés a tu cliente justo después de que pagó.",
    segmento: "despues",
  },
  {
    id: "gracias",
    emoji: "🎉",
    label: "Gracias",
    blurb: "La última pantalla: acá recibe lo que compró.",
    segmento: "pagina/gracias",
  },
];

export function stepBlurb(step: ExperienceStep): string {
  return EXPERIENCE_STEPS.find((paso) => paso.id === step)?.blurb ?? "";
}

export function ExperienceSteps({
  productId,
  current,
  className,
}: {
  productId: string;
  current: ExperienceStep;
  className?: string;
}) {
  return (
    <nav aria-label="Recorrido de compra" className={cn("flex flex-col gap-2", className)}>
      <ol className="tf-scroll flex items-center gap-1 overflow-x-auto pb-1">
        {EXPERIENCE_STEPS.map((paso, index) => {
          const activo = paso.id === current;
          return (
            <li key={paso.id} className="flex shrink-0 items-center gap-1">
              <Link
                href={`/app/productos/${productId}/${paso.segmento}`}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors",
                  activo
                    ? "border-brand-300 bg-brand-50 text-brand-800"
                    : "border-transparent text-ink-600 hover:bg-ink-100 hover:text-ink-900",
                )}
              >
                <span className="tf-emoji text-[15px]" aria-hidden="true">
                  {paso.emoji}
                </span>
                <span className="whitespace-nowrap text-[13.5px] font-semibold">{paso.label}</span>
                {activo ? (
                  <span className="rounded-md bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Editando
                  </span>
                ) : null}
              </Link>

              {index < EXPERIENCE_STEPS.length - 1 ? (
                <Icon
                  name="chevronRight"
                  size={14}
                  className="shrink-0 text-ink-300"
                  aria-hidden="true"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
