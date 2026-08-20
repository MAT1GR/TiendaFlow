import { Icon } from "@/components/ui/icon";
import { LinkButton } from "@/components/ui/primitives";
import type { ProductJourney } from "@/lib/product-workspace";
import { cn } from "@/lib/utils";

/**
 * El camino a la primera venta.
 *
 * La regla que gobierna todo el diseño: **un solo paso a la vez pide atención**.
 * Los que ya hiciste son un tilde y nada más; los que vienen están apagados y
 * sin botón. Así se ve el recorrido completo de un vistazo, pero solo hay una
 * cosa para hacer, que es lo que evita la sensación de tablero lleno de tareas.
 */
export function Journey({ journey }: { journey: ProductJourney }) {
  const { steps, completed, total, live } = journey;

  return (
    <section className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">
            {live ? "Tu producto está a la venta" : "Camino a tu primera venta"}
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-500">
            {live
              ? "Ya podés recibir compras. Lo que sigue es traer gente."
              : `Paso ${Math.min(completed + 1, total)} de ${total}`}
          </p>
        </div>

        <div className="flex items-center gap-2" aria-hidden="true">
          {steps.map((step) => (
            <span
              key={step.code}
              className={cn(
                "h-1.5 rounded-full transition-all",
                step.state === "done" && "w-6 bg-accent-500",
                step.state === "current" && "w-10 bg-brand-600",
                step.state === "pending" && "w-6 bg-ink-200",
              )}
            />
          ))}
        </div>
      </header>

      <ol className="flex flex-col">
        {steps.map((step, index) => {
          const done = step.state === "done";
          const current = step.state === "current";
          const last = index === steps.length - 1;

          return (
            <li
              key={step.code}
              className={cn(
                "relative flex gap-4 px-5",
                current ? "bg-brand-50/40 py-5" : "py-3.5",
                !last && "border-b border-ink-100",
              )}
            >
              {/* Línea que une los pasos */}
              {!last ? (
                <span
                  className={cn(
                    "absolute left-[2.1rem] top-11 bottom-0 w-px",
                    done ? "bg-accent-200" : "bg-ink-100",
                  )}
                  aria-hidden="true"
                />
              ) : null}

              <span
                className={cn(
                  "relative z-10 grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold",
                  done && "bg-accent-500 text-white",
                  current && "bg-brand-600 text-white ring-4 ring-brand-500/15",
                  step.state === "pending" && "bg-ink-100 text-ink-400",
                )}
              >
                {done ? <Icon name="check" size={14} /> : index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p
                    className={cn(
                      "flex items-center gap-2 text-[14.5px] font-semibold",
                      current ? "text-ink-900" : done ? "text-ink-700" : "text-ink-400",
                    )}
                  >
                    <span
                      className={cn("tf-emoji", !current && !done && "opacity-40")}
                      aria-hidden="true"
                    >
                      {step.emoji}
                    </span>
                    {step.title}
                  </p>
                  {done ? (
                    <span className="text-[12.5px] font-medium text-accent-600">Listo</span>
                  ) : null}
                </div>

                {/* Solo el paso actual explica y ofrece acción. */}
                {current ? (
                  <>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">
                      {step.description}
                    </p>

                    {step.missing.length > 0 ? (
                      <ul className="mt-3 flex flex-col gap-1.5">
                        {step.missing.map((item) => (
                          <li
                            key={item}
                            className="flex gap-2 text-[13px] leading-relaxed text-ink-600"
                          >
                            <span
                              className="mt-[7px] size-1.5 shrink-0 rounded-full bg-amber-500"
                              aria-hidden="true"
                            />
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <LinkButton href={step.ctaHref} icon="arrowRight" className="mt-4">
                      {step.ctaLabel}
                    </LinkButton>
                  </>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
