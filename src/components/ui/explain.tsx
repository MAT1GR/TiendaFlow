"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { GLOSSARY, type GlossaryEntry, type GlossaryKey } from "@/lib/glossary";
import { cn } from "@/lib/utils";

/**
 * El "?" que explica un término del rubro.
 *
 * Se abre con clic o con Enter, no solo con hover: en celular el hover no
 * existe, y ahí es donde más se necesita la explicación. Se cierra con Escape
 * o tocando afuera.
 */
export function Explain({
  term,
  className,
  align = "left",
}: {
  term: GlossaryKey;
  className?: string;
  align?: "left" | "right";
}) {
  const entry: GlossaryEntry = GLOSSARY[term];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className={cn("relative inline-flex align-middle", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Qué es ${entry.term}`}
        className={cn(
          "grid size-[18px] shrink-0 place-items-center rounded-full border text-[11px] font-bold leading-none transition-colors",
          open
            ? "border-brand-400 bg-brand-600 text-white"
            : "border-ink-300 text-ink-400 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600",
        )}
      >
        ?
      </button>

      {open ? (
        <span
          id={panelId}
          role="note"
          className={cn(
            "tf-rise absolute bottom-[calc(100%+8px)] z-50 w-72 rounded-2xl border border-ink-200 bg-white p-4 text-left shadow-[0_2px_4px_rgba(15,23,42,.04),0_20px_44px_-18px_rgba(15,23,42,.4)]",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <span className="flex items-center gap-1.5">
            <Icon name="info" size={14} className="shrink-0 text-brand-600" />
            <span className="text-[13px] font-semibold text-ink-900">{entry.term}</span>
          </span>

          <span className="mt-1.5 block text-[12.5px] leading-relaxed text-ink-600">
            {entry.definition}
          </span>

          {entry.example ? (
            <span className="mt-2.5 block rounded-xl bg-ink-50 px-3 py-2 text-[12px] leading-relaxed text-ink-600">
              <span className="mb-0.5 block text-[10.5px] font-semibold uppercase tracking-wider text-ink-400">
                Por ejemplo
              </span>
              {entry.example}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Etiqueta con su "?" al lado. Para encabezados y nombres de campo.
 */
export function TermLabel({
  term,
  children,
  className,
  align,
}: {
  term: GlossaryKey;
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {children}
      <Explain term={term} align={align} />
    </span>
  );
}

/**
 * Bloque de campos que la mayoría no necesita tocar.
 *
 * Nada se elimina: se guarda detrás de un desplegable para que la pantalla
 * arranque con lo mínimo indispensable. Quien sabe lo que busca, lo abre.
 */
export function MoreOptions({
  children,
  label = "Opciones avanzadas",
  hint,
  className,
}: {
  children: ReactNode;
  label?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <details className={cn("group rounded-2xl border border-ink-200 bg-ink-50/40", className)}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13.5px] font-medium text-ink-700 transition-colors hover:text-ink-900">
        <Icon
          name="chevronRight"
          size={15}
          className="shrink-0 text-ink-400 transition-transform group-open:rotate-90"
        />
        {label}
        {hint ? <span className="text-[12px] font-normal text-ink-400">· {hint}</span> : null}
      </summary>
      <div className="flex flex-col gap-4 border-t border-ink-200 px-4 py-4">{children}</div>
    </details>
  );
}

/**
 * Instrucciones numeradas de "dónde encuentro este dato".
 *
 * Se usa en las pantallas de integraciones, que son las que más frenan a
 * alguien sin perfil técnico: el problema casi nunca es la app, es encontrar
 * la credencial en el panel del otro servicio.
 */
export function HowTo({
  title = "¿Dónde encuentro esto?",
  steps,
  className,
}: {
  title?: string;
  steps: ReactNode[];
  className?: string;
}) {
  return (
    <details className={cn("group rounded-2xl border border-brand-200 bg-brand-50/50", className)}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13.5px] font-semibold text-brand-800">
        <Icon
          name="chevronRight"
          size={15}
          className="shrink-0 text-brand-500 transition-transform group-open:rotate-90"
        />
        {title}
      </summary>
      <ol className="flex flex-col gap-2.5 border-t border-brand-200/70 px-4 py-4">
        {steps.map((stepContent, index) => (
          <li key={index} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-700">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
              {index + 1}
            </span>
            <span className="min-w-0">{stepContent}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}
