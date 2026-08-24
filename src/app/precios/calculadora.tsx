"use client";

import { useState } from "react";

import { PLAN_IDS, PLANS, bestPlanFor, commissionLabel, usd } from "@/lib/plans";
import { cn } from "@/lib/utils";

/**
 * Qué plan te conviene según lo que vendés.
 *
 * Es la única parte de la página de precios que hace una cuenta, y existe
 * porque la pregunta que frena a la gente no es "¿cuánto sale Creator?" sino
 * "¿cuál me conviene a mí?". La tabla de precios sola no la contesta: hay que
 * cruzar un abono fijo con un porcentaje variable, y nadie hace esa cuenta de
 * cabeza parado en una landing.
 *
 * No pide mail ni registro. Una calculadora que te hace dar el mail antes de
 * mostrarte el resultado no está resolviendo una duda, está cobrándola.
 */

const EJEMPLOS = [200, 500, 1500];

export function Calculadora() {
  const [facturacion, setFacturacion] = useState("500");

  const monto = Number(facturacion);
  const valido = facturacion.trim() !== "" && Number.isFinite(monto) && monto >= 0;
  const recomendado = valido ? bestPlanFor(monto) : null;

  /* El costo de cada plan con esa facturación, para poder ordenar y comparar. */
  const costos = PLAN_IDS.map((id) => {
    const plan = PLANS[id];
    return { plan, total: plan.priceUsd + monto * plan.commissionRate };
  });
  const masBarato = Math.min(...costos.map((c) => c.total));

  return (
    <div className="mx-auto w-full max-w-3xl rounded-3xl border border-ink-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,.4)] sm:p-8">
      <label
        htmlFor="facturacion"
        className="block text-center text-[15px] font-semibold text-ink-900"
      >
        ¿Cuánto vendés por mes, en dólares?
      </label>

      <div className="mx-auto mt-3 flex w-full max-w-xs items-center gap-1.5 rounded-2xl border border-ink-300 bg-white px-4 py-3 focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/10">
        <span className="text-[18px] font-semibold text-ink-400">US$</span>
        <input
          id="facturacion"
          type="number"
          min={0}
          step="any"
          inputMode="numeric"
          value={facturacion}
          onChange={(event) => setFacturacion(event.target.value)}
          className="w-full border-0 bg-transparent text-[22px] font-semibold tabular-nums text-ink-900 outline-none"
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
        {EJEMPLOS.map((valor) => (
          <button
            key={valor}
            type="button"
            onClick={() => setFacturacion(String(valor))}
            className={cn(
              "rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors",
              monto === valor
                ? "bg-brand-100 text-brand-700"
                : "bg-ink-100 text-ink-500 hover:bg-ink-200 hover:text-ink-800",
            )}
          >
            {usd(valor)}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {costos.map(({ plan, total }) => {
          const esElMejor = valido && total === masBarato;
          return (
            <div
              key={plan.id}
              className={cn(
                "flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-2xl border px-4 py-3 transition-colors",
                esElMejor ? "border-brand-300 bg-brand-50" : "border-ink-200 bg-white",
              )}
            >
              <span
                className={cn(
                  "text-[14px] font-semibold",
                  esElMejor ? "text-brand-900" : "text-ink-800",
                )}
              >
                {plan.name}
              </span>
              <span className="text-[12.5px] text-ink-500">
                {plan.priceUsd === 0 ? "sin abono" : `${usd(plan.priceUsd)} de abono`} +{" "}
                {commissionLabel(plan)} de comisión
              </span>
              <span
                className={cn(
                  "ml-auto text-[17px] font-semibold tabular-nums",
                  esElMejor ? "text-brand-700" : "text-ink-900",
                )}
              >
                {valido ? usd(Math.round(total)) : "—"}
                <span className="text-[12px] font-medium text-ink-400"> /mes</span>
              </span>
            </div>
          );
        })}
      </div>

      {recomendado ? (
        <p className="mt-4 text-center text-[14px] text-ink-700">
          ⭐ Con lo que vendés, <strong className="text-ink-900">{recomendado.name}</strong> es el
          que menos te cuesta.
        </p>
      ) : (
        <p className="mt-4 text-center text-[13px] text-ink-400">
          Escribí cuánto facturás por mes para ver cuál te conviene.
        </p>
      )}

      {/*
        La aclaración va pegada al número y no en una nota al pie.
        Es el único lugar de la página donde aparece una cifra de plata que se
        puede confundir con "lo que me van a descontar en total", y descubrir
        después que faltaba sumar la comisión del medio de pago es exactamente
        la sorpresa que arruina la confianza que la página vino a construir.
      */}
      <p className="mt-4 border-t border-ink-100 pt-3 text-center text-[12px] leading-relaxed text-ink-400">
        Es lo que te cobra TiendaFlow. Mercado Pago o Stripe cobran su propia comisión aparte, y esa
        va directo al medio de pago. Si pagás en tu moneda, el importe se convierte al cambio del
        día.
      </p>
    </div>
  );
}
