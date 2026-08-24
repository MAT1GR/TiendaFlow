"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Icon } from "@/components/ui/icon";
import { FLOW_PARAM, withFlow, withoutFlow } from "@/lib/product-flow";

/**
 * El paso a paso, reducido a un link.
 *
 * En el resto del producto el paso a paso se muestra con una barra que dice
 * "Paso 3 de 5" y dibuja el progreso. En el constructor de la página no entra:
 * ahí la barra de arriba es el encabezado de toda la pantalla, y sumarle una
 * franja con otro progreso distinto empuja para abajo lo único que la persona
 * vino a mirar.
 *
 * Lo que sí hace falta es no cortar la cadena: si viene encadenando la
 * creación de su producto, tiene que poder seguir sin volver al menú. Eso es
 * un link, y entra al lado de Publicar.
 */

export function FlowContinue({ productId }: { productId: string }) {
  return (
    <Suspense fallback={null}>
      <FlowContinueInner productId={productId} />
    </Suspense>
  );
}

function FlowContinueInner({ productId }: { productId: string }) {
  const params = useSearchParams();
  const pathname = usePathname();

  if (params.get(FLOW_PARAM) !== "1") return null;

  const query = params.toString();
  const salir = withoutFlow(query ? `${pathname}?${query}` : pathname);

  return (
    <span className="flex shrink-0 items-center gap-2">
      {/* El separador deja claro que esto es de otra naturaleza que Guardar y
          Publicar: no es una acción sobre la página, es el hilo del paso a paso. */}
      <span className="h-5 w-px bg-ink-200" aria-hidden="true" />
      <Link
        href={salir}
        className="hidden text-[12px] font-medium text-ink-400 underline-offset-2 hover:text-ink-700 hover:underline xl:inline"
      >
        Salir del paso a paso
      </Link>
      <Link
        href={withFlow(`/app/productos/${productId}/cobro`)}
        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-emerald-700"
      >
        <span className="hidden sm:inline">Seguir con el cobro</span>
        <span className="sm:hidden">Seguir</span>
        <Icon name="arrowRight" size={14} />
      </Link>
    </span>
  );
}
