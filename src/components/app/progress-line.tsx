"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * El renglón de progreso del producto.
 *
 * `✓ Producto · ✓ Oferta · ● Página (estás acá) · Cobros · Publicar`,
 * arriba de todo y en todas las pantallas del producto.
 *
 * Es una línea de texto y hace tres trabajos:
 *
 *  1. **Cuánto llevo.** Convierte el encabezado de un panel administrativo
 *     —nombre, precio, ventas— en el estado de un lanzamiento. La diferencia
 *     entre "estoy configurando cosas" y "me faltan dos para estar vendiendo"
 *     no está en las funciones que tiene la app, está en si te lo dice.
 *  2. **Dónde estoy.** El paso de la pantalla actual queda marcado. Sin eso, a
 *     la tercera sección ya no se sabe si lo que estás haciendo era el paso dos
 *     o el cuatro.
 *  3. **Ir a cualquier lado.** Cada paso es un link. Es la navegación más corta
 *     que hay entre dos secciones del producto: un click desde cualquiera a
 *     cualquiera, sin pasar por el menú ni volver al resumen.
 *
 * Va acá arriba además de la barra de "lo que sigue" que va abajo porque
 * contestan preguntas distintas: esto es dónde estoy y cuánto llevo, aquello es
 * qué hago ahora.
 */

export interface ProgressStep {
  code: string;
  title: string;
  status: string;
  state: "done" | "todo" | "optional" | "waiting";
  href: string;
  required: boolean;
}

export function ProgressLine({
  steps,
  className,
}: {
  steps: ProgressStep[];
  className?: string;
}) {
  return (
    <Suspense fallback={null}>
      <ProgressLineInner steps={steps} className={className} />
    </Suspense>
  );
}

function ProgressLineInner({ steps, className }: { steps: ProgressStep[]; className?: string }) {
  const pathname = usePathname();

  /*
   * Los opcionales quedan afuera.
   *
   * "Mi cliente" y "Después de comprar" suman mucho, pero nadie los necesita
   * para cobrar el primer peso. Mostrarlos como pendientes en el mismo renglón
   * que las cosas que sí bloquean la venta hace que un producto listo para
   * vender parezca incompleto.
   */
  const camino = steps.filter((step) => step.required);
  if (camino.length === 0) return null;

  const match = pathname.match(/^\/app\/productos\/[^/]+\/?(.*)$/);
  const actual = match ? match[1].split("/")[0] : "";

  /*
   * En el Resumen no va.
   *
   * Es la única pantalla donde el recorrido completo ocupa el centro: seis
   * pasos, cada uno con su estado y su link. Este renglón es la versión
   * comprimida de exactamente eso, así que ahí arriba sería la misma
   * información dos veces, una encima de la otra. En el resto de las secciones
   * es al revés: el recorrido no está a la vista y este renglón es lo único
   * que dice dónde estás parado.
   */
  if (actual === "") return null;

  const hechos = camino.filter((step) => step.state === "done").length;
  const listo = hechos === camino.length;

  return (
    <div className={cn("flex flex-wrap items-center gap-x-1 gap-y-1.5", className)}>
      {camino.map((step, index) => {
        const done = step.state === "done";
        const falta = step.state === "todo";
        const aqui = step.code === actual;

        return (
          <span key={step.code} className="flex items-center gap-1">
            {index > 0 ? (
              <span className="px-0.5 text-ink-300" aria-hidden="true">
                ·
              </span>
            ) : null}

            <Link
              href={step.href}
              aria-current={aqui ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] transition-colors",
                // El paso donde está parada la persona se lee primero: fondo,
                // borde y peso. Los demás son texto suelto.
                aqui
                  ? "bg-white font-semibold text-ink-900 ring-1 ring-ink-200"
                  : done
                    ? "text-accent-700 hover:bg-accent-50"
                    : falta
                      ? "font-medium text-amber-700 hover:bg-amber-50"
                      : "text-ink-400 hover:bg-ink-100",
              )}
            >
              {done ? (
                <Icon name="check" size={12} className="shrink-0 text-accent-600" />
              ) : (
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    falta ? "bg-amber-400" : "bg-ink-300",
                  )}
                  aria-hidden="true"
                />
              )}

              {done ? (HECHO[step.code] ?? step.title) : etiquetaPendiente(step)}

              {aqui ? (
                <span className="text-[11px] font-medium text-ink-400">· estás acá</span>
              ) : null}
            </Link>
          </span>
        );
      })}

      {listo ? null : (
        <span className="ml-1.5 text-[12px] text-ink-400" aria-hidden="true">
          {hechos} de {camino.length}
        </span>
      )}
    </div>
  );
}

/**
 * Cómo se lee cada paso cuando está resuelto.
 *
 * Escrito a mano y no armado pegando "listo" al título: son cinco pasos fijos y
 * ninguno concuerda igual. "Cobros listo" y "Publicar listo" están mal, y
 * "Página de venta lista" ocupa media línea al lado de otros cuatro. Cinco
 * frases sueltas son más fáciles de leer y de corregir que una regla que
 * intente adivinar el género y el número de un sustantivo cualquiera.
 */
const HECHO: Record<string, string> = {
  producto: "Producto",
  oferta: "Oferta",
  pagina: "Página",
  cobro: "Cobros",
  publicar: "Publicado",
};

/**
 * Lo que falta, dicho corto.
 *
 * El `status` del recorrido es una frase entera —"Falta conectar un medio de
 * pago"— pensada para una lista con espacio. Acá van cinco en un renglón, así
 * que se recorta a lo mínimo que se entiende solo.
 */
const PENDIENTE: Record<string, string> = {
  producto: "Falta el producto",
  oferta: "Falta el precio",
  pagina: "Falta la página",
  cobro: "Faltan los cobros",
  publicar: "Falta publicar",
};

function etiquetaPendiente(step: ProgressStep) {
  if (step.state === "waiting") return step.title;
  return PENDIENTE[step.code] ?? step.status;
}
