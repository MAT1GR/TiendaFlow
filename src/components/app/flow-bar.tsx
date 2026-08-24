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
  withFlow,
  withoutFlow,
  type FlowStepCode,
} from "@/lib/product-flow";
import { cn } from "@/lib/utils";

/**
 * La barra del paso a paso.
 *
 * Aparece solo cuando la persona está en el medio de la creación de un producto
 * y contesta las tres preguntas de cualquier proceso largo: en qué paso voy,
 * qué viene después y cómo me bajo.
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

/**
 * La barra, para las pantallas que viven adentro de un producto.
 *
 * El paso sale de la URL en vez de pasarse a mano en cada pantalla: son seis
 * rutas y todas terminan pasando por el mismo layout, así que hacerlo una sola
 * vez acá evita que una pantalla nueva se olvide de sumarse al paso a paso.
 */
export function ProductFlowBar({
  productId,
  cobroListo,
}: {
  productId: string;
  /** Si ya hay un medio de pago conectado, el botón de cobros cambia de texto. */
  cobroListo: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <ProductFlowBarInner productId={productId} cobroListo={cobroListo} />
    </Suspense>
  );
}

function ProductFlowBarInner({
  productId,
  cobroListo,
}: {
  productId: string;
  cobroListo: boolean;
}) {
  const pathname = usePathname();
  const base = `/app/productos/${productId}`;
  const segment = pathname.startsWith(`${base}/`) ? pathname.slice(base.length + 1) : "";

  /*
   * La página de venta queda afuera a propósito.
   *
   * Ahí la barra del editor es el encabezado de toda la pantalla —trae el
   * selector de las cuatro pantallas del recorrido, el estado y las acciones—
   * y esta barra encima deja dos progresos distintos compitiendo ("estás en la
   * 1 de 4" y "vas por el paso 3 de 5") sin que ninguno se termine de leer. La
   * cadena no se corta: el link para seguir con el cobro entra en esa misma
   * barra, en `FlowContinue`.
   */
  const step: FlowStepCode | null = segment.startsWith("producto")
    ? "producto"
    : segment.startsWith("oferta")
      ? "oferta"
      : segment.startsWith("cobro")
        ? "cobro"
        : segment.startsWith("publicar")
          ? "publicar"
          : null;

  if (!step) return null;

  const next: Record<FlowStepCode, { href: string; label: string } | null> = {
    producto: { href: withFlow(`${base}/oferta`), label: "Continuar" },
    oferta: { href: withFlow(`${base}/pagina`), label: "Continuar" },
    // La página de venta no muestra esta barra, pero el paso sigue existiendo
    // en la cadena: el link vive en el selector de pantallas.
    pagina: { href: withFlow(`${base}/cobro`), label: "Continuar" },
    cobro: {
      href: withFlow(`${base}/publicar`),
      label: cobroListo ? "Continuar" : "Seguir sin conectar",
    },
    // Publicar termina con el botón de publicar, no con un link.
    publicar: null,
  };

  return <FlowBar step={step} next={next[step]} />;
}
