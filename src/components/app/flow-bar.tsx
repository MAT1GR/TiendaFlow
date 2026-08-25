"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Icon } from "@/components/ui/icon";
import {
  FLOW_PARAM,
  FLOW_STEPS,
  flowIndex,
  flowStep,
  nextFlowStep,
  withoutFlow,
  type FlowStepCode,
} from "@/lib/product-flow";
import { cn } from "@/lib/utils";

/**
 * La barra del paso a paso, para las pantallas de creación sueltas.
 *
 * Aparece en las tres pantallas que están fuera del espacio de trabajo de un
 * producto —crear producto, crear oferta, armar página— porque ahí todavía no
 * hay producto adonde colgar el recorrido, y sin esta barra la persona no
 * tendría forma de saber que está en el medio de una cadena de cinco pasos.
 *
 * Adentro del producto ya no se usa. Ahí el progreso vive en el renglón del
 * encabezado (`ProgressLine`, que además marca dónde estás y te deja saltar a
 * cualquier paso) y el paso siguiente en la barra de abajo (`ProductNextStep`).
 * Los tres juntos eran tres formas de decir lo mismo en la misma pantalla.
 *
 * "Salir del paso a paso" no cancela nada ni borra nada: saca la marca de la
 * URL y deja a la persona en la misma pantalla, ahora suelta. Un proceso del
 * que no se puede salir sin miedo a perder lo hecho no lo usa nadie.
 */
export function FlowBar(props: FlowBarProps) {
  return (
    <Suspense fallback={null}>
      <FlowBarInner {...props} />
    </Suspense>
  );
}

interface FlowBarProps {
  step: FlowStepCode;
  /** El botón para seguir. Los pasos que terminan con un formulario no lo llevan. */
  next?: { href: string; label: string } | null;
  /** Para la pantalla que arranca el paso a paso, que no necesita la marca. */
  always?: boolean;
}

function FlowBarInner({ step, next, always = false }: FlowBarProps) {
  const params = useSearchParams();
  const pathname = usePathname();

  const active = always || params.get(FLOW_PARAM) === "1";
  if (!active) return null;

  const index = flowIndex(step);
  const current = flowStep(step);
  const siguiente = nextFlowStep(step);

  const query = params.toString();
  const salir = withoutFlow(query ? `${pathname}?${query}` : pathname);

  return (
    <section
      aria-label="Paso a paso"
      className="rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-3.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-900">
            <span className="tf-emoji" aria-hidden="true">
              {current.emoji}
            </span>
            Paso {index + 1} de {FLOW_STEPS.length}: {current.label}
          </p>
          <p className="mt-0.5 text-[12.5px] text-ink-500">
            {siguiente
              ? `Cuando termines seguimos con ${siguiente.label.toLowerCase()}.`
              : "Es el último paso: al publicar, tu producto queda a la venta."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ol className="hidden items-center gap-1.5 sm:flex" aria-hidden="true">
            {FLOW_STEPS.map((paso, position) => (
              <li
                key={paso.code}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  position < index && "w-5 bg-brand-400",
                  position === index && "w-8 bg-brand-600",
                  position > index && "w-5 bg-brand-200",
                )}
              />
            ))}
          </ol>

          {next ? (
            <Link
              href={next.href}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-700"
            >
              {next.label}
              <Icon name="arrowRight" size={15} />
            </Link>
          ) : null}

          <Link
            href={salir}
            className="text-[12.5px] font-medium text-ink-500 underline-offset-2 hover:text-ink-800 hover:underline"
          >
            Salir
          </Link>
        </div>
      </div>
    </section>
  );
}
