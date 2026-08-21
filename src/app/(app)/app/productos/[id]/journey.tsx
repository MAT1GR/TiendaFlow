import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { withFlow } from "@/lib/product-flow";
import type { JourneyStep, ProductJourney } from "@/lib/product-workspace";
import { cn } from "@/lib/utils";

/**
 * El GPS del producto.
 *
 * Responde de un vistazo las dos preguntas que trae la persona cuando entra:
 * **¿qué me falta?** y **¿qué hago ahora?**. Cada línea es un link: no hay que
 * buscar el paso en ningún menú, se clickea donde dice qué falta.
 *
 * Un solo paso lleva botón —el siguiente— para que nunca haya dos cosas
 * compitiendo por ser "lo que sigue".
 */
export function Journey({ journey }: { journey: ProductJourney }) {
  const { steps, completed, total, percent, live } = journey;

  return (
    <section className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
      <header className="border-b border-ink-100 px-5 py-4">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink-900">
          <span className="tf-emoji" aria-hidden="true">
            {live ? "🎉" : "🚀"}
          </span>
          {live ? "Tu producto está a la venta" : "Prepará tu producto para vender"}
        </h2>

        <div className="mt-3 flex items-center gap-3">
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso del producto"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-700 ease-out",
                percent === 100 ? "bg-accent-500" : "bg-brand-600",
              )}
              style={{ width: `${Math.max(percent, 3)}%` }}
            />
          </div>
          <p className="shrink-0 text-[12.5px] font-medium tabular-nums text-ink-500">
            {completed}/{total} pasos · {percent}%
          </p>
        </div>
      </header>

      <ol className="flex flex-col divide-y divide-ink-100">
        {steps.map((step) => (
          <StepRow key={step.code} step={step} />
        ))}
      </ol>
    </section>
  );
}

function StepRow({ step }: { step: JourneyStep }) {
  const done = step.state === "done";
  const todo = step.state === "todo";

  return (
    <li>
      {/* El paso que sigue retoma el paso a paso: la persona confirma y la app
          la lleva sola hasta el final, sin volver acá entre paso y paso. */}
      <Link
        href={withFlow(step.href, step.next)}
        className={cn(
          "group flex items-center gap-3 px-5 py-3.5 transition-colors",
          step.next ? "bg-brand-50/50 hover:bg-brand-50" : "hover:bg-ink-50",
        )}
      >
        <Marker state={step.state} />

        <span className="tf-emoji shrink-0" aria-hidden="true">
          {step.emoji}
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block text-[14px] font-semibold",
              done || todo || step.next ? "text-ink-900" : "text-ink-500",
            )}
          >
            {step.title}
          </span>
          <span
            className={cn(
              "block truncate text-[12.5px]",
              done ? "text-accent-700" : todo ? "text-amber-700" : "text-ink-400",
            )}
          >
            {step.status}
          </span>
        </span>

        {step.next ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors group-hover:bg-brand-700">
            Continuar
            <Icon name="arrowRight" size={13} />
          </span>
        ) : (
          <Icon
            name="chevronRight"
            size={16}
            className="shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5"
          />
        )}
      </Link>
    </li>
  );
}

/**
 * El semáforo de la izquierda.
 *
 * Verde con tilde = hecho. Ámbar = falta y bloquea. Gris = todavía no te toca,
 * o es opcional. Tres estados y nada más: en cuanto hay un cuarto color, deja
 * de leerse de un vistazo.
 */
function Marker({ state }: { state: JourneyStep["state"] }) {
  if (state === "done") {
    return (
      <span
        className="tf-pop grid size-5 shrink-0 place-items-center rounded-full bg-accent-500 text-white"
        aria-label="Listo"
      >
        <Icon name="check" size={12} />
      </span>
    );
  }

  if (state === "todo") {
    return (
      <span className="grid size-5 shrink-0 place-items-center" aria-label="Falta">
        <span className="size-2.5 rounded-full bg-amber-400 ring-4 ring-amber-400/20" />
      </span>
    );
  }

  return (
    <span
      className="grid size-5 shrink-0 place-items-center"
      aria-label={state === "optional" ? "Opcional" : "Todavía no"}
    >
      <span className="size-2.5 rounded-full border border-ink-300 bg-white" />
    </span>
  );
}
