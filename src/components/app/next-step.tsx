"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * "¿Y ahora qué?", contestado en todas las pantallas del producto.
 *
 * Hasta acá el paso a paso existía pero era invisible: la barra de progreso
 * solo aparecía si en la URL viajaba `guia=1`, o sea únicamente si la persona
 * venía encadenando la creación desde cero y no se había ido a ningún lado. El
 * que entraba por el menú —que es lo que hace todo el mundo el segundo día—
 * terminaba una sección, se quedaba mirando la pantalla y tenía que adivinar
 * cuál era el paso siguiente.
 *
 * Esta barra va abajo de cada sección, siempre, sin depender de ninguna marca
 * en la URL, y dice dos cosas:
 *
 *  1. **Cómo quedó esto** — si la sección donde está ya está resuelta o qué le
 *     falta. Es la confirmación que antes no había en ningún lado.
 *  2. **Qué sigue** — un botón con el verbo de la acción, no "Continuar".
 *     "Ponerle precio" se entiende sin leer nada más; "Continuar" obliga a
 *     hacer click para averiguar adónde lleva.
 *
 * El orden de la cadena está acá y no en el recorrido porque son dos cosas
 * distintas: el recorrido dice qué falta para poder vender, y esta cadena dice
 * en qué orden conviene recorrer las pantallas. "Mi cliente" no hace falta para
 * cobrar el primer peso, pero va antes de la oferta porque todo lo que se
 * escribe después sale de ahí.
 */

/** Los pasos de un producto, en el orden en que conviene hacerlos. */
const CADENA = ["producto", "cliente", "oferta", "pagina", "cobro", "despues", "publicar"] as const;

/**
 * El botón, escrito con el verbo de lo que va a pasar.
 *
 * Cada etiqueta es lo que la persona va a hacer en la pantalla siguiente. Es la
 * diferencia entre un botón que informa y uno que hay que probar.
 */
const ACCION: Record<string, string> = {
  producto: "Cargar mi producto",
  cliente: "Conocer a mi cliente",
  oferta: "Ponerle precio",
  pagina: "Armar mi página",
  cobro: "Conectar mis cobros",
  despues: "Sumar ofertas extra",
  publicar: "Publicar mi producto",
};

/**
 * Qué hacer cuando lo que falta es de la pantalla donde ya estás.
 *
 * Sin esto la barra saltaba por encima de la sección actual: parada en Cobros
 * con la cuenta sin conectar, ofrecía "Publicar mi producto" en un botón
 * grande y azul. Dos problemas a la vez — proponía saltear justo el paso que
 * bloquea la venta, y prometía algo que al llegar allá no se iba a poder hacer.
 *
 * Ahora el botón resuelve lo de acá y lo dice con todas las letras. Las
 * secciones que se completan con un formulario en la misma pantalla no entran
 * en esta lista: ahí el botón es el de guardar, y agregar otro que apunte a la
 * pantalla donde ya estás es ruido.
 */
const RESOLVER_AQUI: Record<string, { href: string; label: string }> = {
  cobro: { href: "/app/pagos", label: "Conectá tus cobros para publicar" },
};

export interface NextStepData {
  code: string;
  title: string;
  status: string;
  state: "done" | "todo" | "optional" | "waiting";
  href: string;
  /** Los opcionales nunca frenan a nadie: la barra los saltea sin avisar. */
  required: boolean;
}

export function ProductNextStep({
  steps,
  publicUrl,
}: {
  /** Los pasos del recorrido, ya calculados en el servidor. */
  steps: NextStepData[];
  /** El link público, si el producto ya está publicado. */
  publicUrl: string | null;
}) {
  return (
    <Suspense fallback={null}>
      <ProductNextStepInner steps={steps} publicUrl={publicUrl} />
    </Suspense>
  );
}

function ProductNextStepInner({
  steps,
  publicUrl,
}: {
  steps: NextStepData[];
  publicUrl: string | null;
}) {
  const pathname = usePathname();

  /*
   * En qué sección estamos, sacado de la ruta.
   *
   * Sale del pathname y no de una prop para que ninguna pantalla nueva se
   * tenga que acordar de sumarse: alcanza con existir bajo la ruta del
   * producto. Es el mismo criterio que usa la barra de pestañas.
   */
  const match = pathname.match(/^\/app\/productos\/[^/]+\/?(.*)$/);
  if (!match) return null;
  const actual = match[1].split("/")[0];

  /*
   * El Resumen no lleva esta barra.
   *
   * Es la única pantalla donde el recorrido completo está a la vista: seis
   * pasos con su estado, cuál está hecho y en cuál vas. Poner debajo una barra
   * que repite el paso siguiente es decir dos veces lo mismo en la misma
   * pantalla, y lo que eso genera no es refuerzo sino la duda de si son dos
   * cosas distintas. En las demás secciones no hay recorrido a la vista, y ahí
   * la barra es lo único que contesta "¿y ahora qué?".
   */
  if (actual === "") return null;

  const porCodigo = new Map(steps.map((step) => [step.code, step]));
  const aqui = porCodigo.get(actual) ?? null;

  /*
   * El paso siguiente.
   *
   * Se busca desde la posición actual hacia adelante y se saltean los que ya
   * están resueltos: mandar a alguien a "ponerle precio" cuando el precio ya
   * está puesto es hacerle perder un click y confianza en el botón.
   *
   * Desde el resumen o los resultados —que no están en la cadena— arranca
   * desde el principio, así que ofrece lo primero que falte.
   */
  const desde = CADENA.indexOf(actual as (typeof CADENA)[number]);
  const siguiente =
    CADENA.slice(desde + 1)
      .map((code) => porCodigo.get(code))
      .find((step) => step && step.state !== "done") ?? null;

  /*
   * El producto ya está publicado y no queda nada por hacer: el botón deja de
   * empujar hacia adelante y pasa a ser la recompensa. Ver la página funcionando
   * es el final del camino, no un paso más.
   */
  if (!siguiente) {
    if (!publicUrl) return null;

    return (
      <Barra
        tono="listo"
        titulo={aqui?.state === "done" ? `${aqui.title}: listo` : "Está todo listo"}
        detalle="Tu producto está publicado y se puede comprar."
        accion={{ href: publicUrl, label: "Ver mi página", icon: "eye", externo: true }}
      />
    );
  }

  const resuelto = aqui?.state === "done";

  /*
   * Lo de acá primero.
   *
   * Si la sección donde está parada la persona todavía bloquea la venta, la
   * barra no ofrece seguir de largo: ofrece resolver esto. Recién cuando queda
   * hecho aparece el paso que viene, y entonces el botón grande sí promete algo
   * que se va a poder hacer al llegar.
   */
  if (aqui && aqui.state === "todo" && aqui.required !== false) {
    const resolver = RESOLVER_AQUI[aqui.code];

    return (
      <Barra
        tono="falta"
        titulo={aqui.title}
        detalle={aqui.status}
        accion={resolver ? { ...resolver, icon: "arrowRight" } : null}
      />
    );
  }

  return (
    <Barra
      tono={resuelto ? "listo" : "camino"}
      titulo={aqui ? (resuelto ? `${aqui.title}: listo` : aqui.title) : "Lo que sigue"}
      detalle={`Lo que sigue: ${siguiente.title.toLowerCase()}. ${siguiente.status}.`}
      accion={{
        href: siguiente.href,
        label: ACCION[siguiente.code] ?? `Ir a ${siguiente.title.toLowerCase()}`,
        icon: "arrowRight",
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Tres tonos, tres significados, y ninguno decorativo.
 *
 * Verde: esto quedó resuelto. Ámbar: falta algo acá y sin eso no se vende.
 * Azul: acá está todo bien, el camino sigue por allá. El color es lo primero
 * que se lee de la barra, antes que el texto, así que tiene que ser cierto.
 */
const TONOS = {
  listo: {
    caja: "border-accent-200 bg-accent-50/50",
    punto: "bg-accent-500",
    boton: "bg-accent-600 hover:bg-accent-700",
    icono: "check",
  },
  falta: {
    caja: "border-amber-200 bg-amber-50/60",
    punto: "bg-amber-500",
    boton: "bg-amber-600 hover:bg-amber-700",
    icono: "warning",
  },
  camino: {
    caja: "border-brand-200 bg-brand-50/60",
    punto: "bg-brand-600",
    boton: "bg-brand-600 hover:bg-brand-700",
    icono: "arrowRight",
  },
} as const;

function Barra({
  tono,
  titulo,
  detalle,
  accion,
}: {
  tono: keyof typeof TONOS;
  titulo: string;
  detalle: string;
  /** Sin acción la barra sigue sirviendo: dice qué falta, y eso se resuelve acá. */
  accion: { href: string; label: string; icon: "arrowRight" | "eye"; externo?: boolean } | null;
}) {
  const estilo = TONOS[tono];

  return (
    <section
      aria-label="Lo que sigue"
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-5 gap-y-3 rounded-2xl border px-5 py-4",
        estilo.caja,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-white",
            estilo.punto,
          )}
          aria-hidden="true"
        >
          <Icon name={estilo.icono} size={13} />
        </span>

        <span className="min-w-0">
          <span className="block text-[14px] font-semibold text-ink-900">{titulo}</span>
          <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-500">{detalle}</span>
        </span>
      </div>

      {accion ? (
        <Link
          href={accion.href}
          target={accion.externo ? "_blank" : undefined}
          rel={accion.externo ? "noreferrer" : undefined}
          className={cn(
            "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-5 text-[13.5px] font-semibold text-white transition-colors",
            estilo.boton,
          )}
        >
          {accion.label}
          <Icon name={accion.icon} size={15} />
        </Link>
      ) : null}
    </section>
  );
}
