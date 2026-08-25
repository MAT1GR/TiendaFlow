"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Icon } from "@/components/ui/icon";
import { FLOW_PARAM, withoutFlow } from "@/lib/product-flow";

/**
 * El paso siguiente, reducido a un link.
 *
 * En el resto del producto "lo que sigue" es una barra abajo de la pantalla. En
 * el constructor de la página no entra: ahí la barra de arriba es el encabezado
 * de toda la pantalla, el editor ocupa el alto completo de la ventana y no hay
 * un "abajo" adonde poner nada.
 *
 * Así que acá el paso siguiente es un botón, al lado de Publicar.
 *
 * Antes esto aparecía **solo** si en la URL viajaba `guia=1`, o sea únicamente
 * si la persona venía encadenando la creación desde cero. El que entraba a
 * editar su página desde el menú terminaba, apretaba Publicar y se quedaba sin
 * saber qué seguía. Ahora el botón está siempre y dice adónde va; lo único que
 * sigue atado a la marca es el "salir del paso a paso", que sin paso a paso
 * activo no significa nada.
 */

export interface FlowNext {
  href: string;
  /** El verbo de lo que sigue: "Conectar mis cobros", "Publicar mi producto". */
  label: string;
  /** Versión corta, para que entre en un teléfono. */
  short: string;
}

export function FlowContinue({ next }: { next: FlowNext | null }) {
  return (
    <Suspense fallback={null}>
      <FlowContinueInner next={next} />
    </Suspense>
  );
}

function FlowContinueInner({ next }: { next: FlowNext | null }) {
  const params = useSearchParams();
  const pathname = usePathname();

  if (!next) return null;

  const enFlujo = params.get(FLOW_PARAM) === "1";
  const query = params.toString();
  const salir = withoutFlow(query ? `${pathname}?${query}` : pathname);

  return (
    <span className="flex shrink-0 items-center gap-2">
      {/* El separador deja claro que esto es de otra naturaleza que Guardar y
          Publicar: no es una acción sobre la página, es hacia dónde se sigue. */}
      <span className="h-5 w-px bg-ink-200" aria-hidden="true" />

      {enFlujo ? (
        <Link
          href={salir}
          className="hidden text-[12px] font-medium text-ink-400 underline-offset-2 hover:text-ink-700 hover:underline xl:inline"
        >
          Salir del paso a paso
        </Link>
      ) : null}

      <Link
        href={next.href}
        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-emerald-700"
      >
        <span className="hidden sm:inline">{next.label}</span>
        <span className="sm:hidden">{next.short}</span>
        <Icon name="arrowRight" size={14} />
      </Link>
    </span>
  );
}
