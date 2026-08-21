import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Encabezado de sección.
 *
 * La regla más importante de la app: **en cada pantalla, arriba, una frase que
 * explica qué está haciendo la persona**. No un título decorativo — una oración
 * en criollo que responde "¿dónde estoy y para qué sirve esto?".
 *
 * Es lo que nos permite no tener tutoriales, tours ni tooltips por todos lados.
 */
export function SectionIntro({
  emoji,
  title,
  blurb,
  actions,
  className,
}: {
  emoji: string;
  title: string;
  blurb: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-[18px] font-semibold tracking-tight text-ink-900">
          <span className="tf-emoji !text-[18px]" aria-hidden="true">
            {emoji}
          </span>
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-ink-500">{blurb}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
