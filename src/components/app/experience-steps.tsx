"use client";

import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { Dropdown } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * Las cuatro pantallas por las que pasa tu cliente, como selector.
 *
 * Por debajo esto es un funnel con sus pasos, sus slugs y su tabla. Arriba no:
 * arriba son cuatro pantallas, en el orden en que las ve una persona que
 * compra. El vendedor nunca necesita saber la palabra "funnel" para editar su
 * página de venta, igual que no necesita saber qué es un `landing_page_id`
 * para cambiar un titular.
 *
 * Es un desplegable y no una fila de tarjetas. Las tarjetas explicaban bien el
 * recorrido, pero costaban una franja entera de pantalla en cada una de las
 * cuatro vistas, y esa franja se la sacaban al único lugar donde el vendedor
 * mira de verdad: su página. La explicación de cada pantalla no se perdió —
 * está adentro del menú, que es donde alguien la lee justo antes de elegir—
 * y el nombre de la pantalla en la que está parado se sigue viendo siempre,
 * sin abrir nada.
 */

export type ExperienceStep = "venta" | "checkout" | "despues" | "gracias";

interface Pantalla {
  id: ExperienceStep;
  emoji: string;
  label: string;
  /** Qué pasa en esa pantalla, en tres palabras. */
  rol: string;
  segmento: string;
}

export const EXPERIENCE_STEPS: Pantalla[] = [
  {
    id: "venta",
    emoji: "🛍️",
    label: "Página de venta",
    rol: "Lo que ve tu cliente antes de comprar",
    segmento: "pagina",
  },
  {
    id: "checkout",
    emoji: "💳",
    label: "Checkout",
    rol: "Donde completa sus datos y te paga",
    segmento: "pagina/checkout",
  },
  {
    id: "despues",
    emoji: "🎁",
    label: "Después de comprar",
    rol: "Una oferta extra, apenas pagó. Opcional",
    segmento: "despues",
  },
  {
    id: "gracias",
    emoji: "🎉",
    label: "Gracias",
    rol: "La pantalla final: acá recibe su compra",
    segmento: "pagina/gracias",
  },
];

/**
 * El desplegable.
 *
 * `compacto` es para cuando vive adentro de la barra del editor, que ya tiene
 * su propio marco: ahí el botón no lleva borde y no compite con los demás.
 */
export function PantallaSelector({
  productId,
  current,
  compacto = false,
  className,
}: {
  productId: string;
  current: ExperienceStep;
  compacto?: boolean;
  className?: string;
}) {
  const activa = EXPERIENCE_STEPS.find((pantalla) => pantalla.id === current) ?? EXPERIENCE_STEPS[0];

  return (
    <Dropdown
      align="left"
      className="w-[min(19rem,calc(100vw-2rem))]"
      trigger={(open) => (
        <span
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors",
            compacto
              ? "hover:bg-ink-100"
              : "border border-ink-200 bg-white px-3 py-2 hover:border-ink-300",
            open && "bg-ink-100",
            className,
          )}
        >
          <span className="tf-emoji shrink-0 text-[16px]" aria-hidden="true">
            {activa.emoji}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-semibold text-ink-900">
              {activa.label}
            </span>
            {!compacto ? (
              <span className="block truncate text-[12px] text-ink-500">{activa.rol}</span>
            ) : null}
          </span>
          <Icon
            name="chevronDown"
            size={15}
            className={cn("ml-0.5 shrink-0 text-ink-400 transition-transform", open && "rotate-180")}
          />
        </span>
      )}
    >
      {(close) => (
        <>
          <p className="px-3 pb-1.5 pt-2 text-[11.5px] font-semibold uppercase tracking-wider text-ink-400">
            El recorrido de tu cliente
          </p>
          {EXPERIENCE_STEPS.map((pantalla, index) => {
            const esActiva = pantalla.id === current;
            return (
              <Link
                key={pantalla.id}
                href={`/app/productos/${productId}/${pantalla.segmento}`}
                role="menuitem"
                onClick={close}
                aria-current={esActiva ? "page" : undefined}
                className={cn(
                  "flex items-start gap-2.5 rounded-xl px-3 py-2.5 transition-colors",
                  esActiva ? "bg-brand-50" : "hover:bg-ink-100",
                )}
              >
                {/* El número es el orden del recorrido: primero mira, después
                    paga, después le ofrecemos algo más, después recibe. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10.5px] font-bold",
                    esActiva ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500",
                  )}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "flex items-center gap-1.5 text-[13.5px] font-semibold",
                      esActiva ? "text-brand-900" : "text-ink-800",
                    )}
                  >
                    <span className="tf-emoji text-[14px]" aria-hidden="true">
                      {pantalla.emoji}
                    </span>
                    {pantalla.label}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-ink-500">
                    {pantalla.rol}
                  </span>
                </span>
                {esActiva ? (
                  <Icon name="check" size={15} className="mt-1 shrink-0 text-brand-600" />
                ) : null}
              </Link>
            );
          })}
        </>
      )}
    </Dropdown>
  );
}
