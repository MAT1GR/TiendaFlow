import Link from "next/link";
import type { ReactNode } from "react";

import { PantallaSelector, type ExperienceStep } from "@/components/app/experience-steps";
import { Icon } from "@/components/ui/icon";

/**
 * El armazón de las pantallas del recorrido que no se editan bloque a bloque.
 *
 * El checkout y la página de gracias no tienen un editor propio, y está bien
 * que no lo tengan: su contenido sale de decisiones que el vendedor ya tomó en
 * otro lado —el precio, la garantía, el mensaje de entrega, la oferta
 * posterior—. Inventarles un editor paralelo significaría tener dos lugares
 * para cambiar lo mismo y que uno de los dos quede desactualizado.
 *
 * Entonces estas pantallas hacen dos cosas: mostrar fielmente lo que va a ver
 * el cliente, y decir en criollo qué se puede cambiar y dónde. Nada más.
 */

export interface Palanca {
  emoji: string;
  label: string;
  /** Lo que realmente está configurado hoy, o por qué falta. */
  valor: string;
  href: string;
  /** `true` cuando falta algo y hay que ir a resolverlo. */
  pendiente?: boolean;
}

export function ExperienceScreen({
  productId,
  step,
  preview,
  palancas,
  nota,
}: {
  productId: string;
  step: ExperienceStep;
  preview: ReactNode;
  palancas: Palanca[];
  nota?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <PantallaSelector productId={productId} current={step} className="w-fit" />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border border-ink-200 bg-ink-100 p-4 sm:p-6">
          <p className="mb-3 text-center text-[11.5px] font-semibold uppercase tracking-wider text-ink-400">
            Vista previa · así lo ve tu cliente
          </p>
          {/*
            La vista previa no se toca. Es una foto de la pantalla real, no una
            copia: si fuera interactiva, alguien terminaría generando un pedido
            de prueba desde el panel sin darse cuenta.
          */}
          <div
            className="@container pointer-events-none mx-auto w-full select-none overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,.5)]"
            aria-hidden="true"
          >
            {preview}
          </div>
        </div>

        <aside className="flex flex-col gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-ink-900">Qué podés cambiar acá</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-500">
              Esta pantalla se arma sola con lo que ya cargaste. Tocá cualquiera para editarlo.
            </p>
          </div>

          <ul className="flex flex-col gap-2">
            {palancas.map((palanca) => (
              <li key={palanca.label}>
                <Link
                  href={palanca.href}
                  className="group flex items-start gap-3 rounded-2xl border border-ink-200 bg-white p-3.5 transition-all hover:border-ink-300 hover:shadow-soft"
                >
                  <span className="tf-emoji mt-0.5 shrink-0 text-[16px]" aria-hidden="true">
                    {palanca.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold text-ink-900">
                      {palanca.label}
                    </span>
                    <span
                      className={
                        palanca.pendiente
                          ? "mt-0.5 block text-[12.5px] text-amber-600"
                          : "mt-0.5 block text-[12.5px] text-ink-500"
                      }
                    >
                      {palanca.valor}
                    </span>
                  </span>
                  <Icon
                    name="chevronRight"
                    size={16}
                    className="mt-1 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ul>

          {nota}
        </aside>
      </div>
    </div>
  );
}
