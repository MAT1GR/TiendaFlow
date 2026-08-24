import Link from "next/link";
import type { Metadata } from "next";

import { Calculadora } from "@/app/precios/calculadora";
import { SiteFooter, SiteHeader, type SiteLink } from "@/components/public/site-chrome";
import { Icon } from "@/components/ui/icon";
import { currentUser } from "@/lib/auth";
import {
  PLAN_IDS,
  PLANS,
  UNLIMITED,
  commissionLabel,
  planBenefits,
  planPriceLabel,
  usd,
  type Plan,
} from "@/lib/plans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Precios — TiendaFlow",
  description:
    "Empezá gratis y pagá solo cuando vendas. Tres planes, comisión que baja a medida que crecés, y tu dinero siempre va directo a tu cuenta.",
};

const NAV: SiteLink[] = [
  { label: "Cómo funciona", href: "/#como-funciona" },
  { label: "Funciones", href: "/#funciones" },
  { label: "Precios", href: "/precios" },
  { label: "Preguntas", href: "#faq" },
];

/**
 * El plan que lleva la cinta de "el más elegido".
 *
 * Es el del medio, y no es una decisión de diseño: es el que tiene la franja
 * de facturación más ancha donde es estrictamente el más barato. Destacar un
 * plan que a la mayoría no le conviene es la forma más rápida de que la tabla
 * deje de merecer confianza.
 */
const DESTACADO = PLAN_IDS[1];

/**
 * Página de precios.
 *
 * El orden contesta las preguntas en el orden en que aparecen: cuánto sale,
 * por qué la comisión baja, qué me llevo, cómo se compara, cuál me conviene a
 * mí, quién toca mi plata, y qué pasa si me arrepiento.
 *
 * Todo lo que dice un número lo saca de `plans.ts`. Ningún porcentaje ni
 * ningún tope está escrito a mano acá: si mañana cambia un precio, esta página
 * cambia sola. Una tabla de precios que se puede desincronizar del producto es
 * peor que no tener tabla de precios.
 */
export default async function PreciosPage() {
  const user = await currentUser();

  return (
    <div className="min-h-dvh bg-white">
      <SiteHeader user={user} nav={NAV} />

      <main>
        <Hero />
        <Tarjetas conSesion={Boolean(user)} />
        <Comisiones />
        <Recorrido />
        <Comparacion />
        <SeccionCalculadora />
        <Confianza />
        <Preguntas />
        <CierreFinal />
      </main>

      <SiteFooter nav={NAV} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-ink-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(109,93,251,.14),transparent)]"
      />
      <div className="relative mx-auto w-full max-w-6xl px-5 py-16 text-center sm:px-8 sm:py-20">
        <h1 className="mx-auto max-w-2xl text-[34px] font-semibold leading-[1.1] tracking-tight text-ink-900 sm:text-[44px]">
          Elegí cómo querés empezar 🚀
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-ink-600">
          Empezá gratis y pagá cuando vendas, o tomá un plan para que la comisión baje a medida que
          tu negocio crece.
        </p>
        <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink-100 px-4 py-1.5 text-[13px] font-medium text-ink-600">
          <Icon name="check" size={14} className="text-emerald-600" />
          Sin contratos. Cancelá cuando quieras.
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Tarjetas({ conSesion }: { conSesion: boolean }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-4 pt-12 sm:px-8">
      <div className="grid items-start gap-4 lg:grid-cols-3">
        {PLAN_IDS.map((id) => (
          <TarjetaPlan
            key={id}
            plan={PLANS[id]}
            destacado={id === DESTACADO}
            conSesion={conSesion}
          />
        ))}
      </div>

      <p className="mx-auto mt-6 max-w-2xl text-center text-[13px] leading-relaxed text-ink-500">
        Los precios son por mes y en dólares. Si pagás por Mercado Pago se convierte a tu moneda al
        cambio del día. La comisión se calcula sobre el total de cada venta cobrada.{" "}
        <a href="#comisiones" className="font-medium text-brand-700 underline underline-offset-2">
          ¿Cómo funcionan las comisiones?
        </a>
      </p>
    </section>
  );
}

function TarjetaPlan({
  plan,
  destacado,
  conSesion,
}: {
  plan: Plan;
  destacado: boolean;
  conSesion: boolean;
}) {
  const beneficios = planBenefits(plan.id);

  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-3xl border p-6",
        destacado
          ? "border-brand-300 bg-white shadow-[0_0_0_4px_rgba(109,93,251,.08),0_28px_70px_-40px_rgba(109,93,251,.7)] lg:-mt-3 lg:pb-8 lg:pt-9"
          : "border-ink-200 bg-white",
      )}
    >
      {destacado ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-white">
          ⭐ El más elegido
        </span>
      ) : null}

      <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand-600">{plan.name}</p>

      <p className="mt-3 text-[34px] font-semibold leading-none tracking-tight text-ink-900">
        {planPriceLabel(plan)}
        {plan.priceUsd > 0 ? (
          <span className="text-[14px] font-medium text-ink-400"> /mes</span>
        ) : null}
      </p>

      <p className="mt-2 inline-flex w-fit items-center rounded-lg bg-ink-100 px-2.5 py-1 text-[12.5px] font-semibold text-ink-700">
        {commissionLabel(plan)} de comisión por venta
      </p>

      <p className="mt-3 min-h-[40px] text-[13.5px] leading-relaxed text-ink-500">{plan.blurb}</p>

      <Link
        href={conSesion ? "/app/configuracion" : "/crear-cuenta"}
        className={cn(
          "mt-5 inline-flex h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-[14px] font-semibold transition-colors",
          destacado
            ? "bg-brand-600 text-white hover:bg-brand-700"
            : "border border-ink-300 text-ink-800 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700",
        )}
      >
        {plan.priceUsd === 0 ? "Empezar gratis" : `Elegir ${plan.name}`}
        <Icon name="arrowRight" size={15} />
      </Link>

      <ul className="mt-6 flex flex-col gap-2.5 border-t border-ink-100 pt-5">
        {beneficios.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-[13.5px] text-ink-700">
            <Icon name="check" size={15} className="mt-0.5 shrink-0 text-emerald-600" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Las barras de comisión.
 *
 * El modelo entero —cuanto más vendés, menos porcentaje pagás— se explica en
 * tres barras y no hace falta un párrafo. El ancho de cada una es el porcentaje
 * real multiplicado por doce, para que la diferencia entre 8% y 3% se vea sin
 * que la barra del 3% quede tan finita que no se lea.
 */
function Comisiones() {
  const maxRate = Math.max(...PLAN_IDS.map((id) => PLANS[id].commissionRate));

  return (
    <section id="comisiones" className="scroll-mt-20 border-y border-ink-100 bg-ink-50/60">
      <div className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-8">
        <h2 className="text-center text-[24px] font-semibold tracking-tight text-ink-900 sm:text-[28px]">
          💸 Cuanto más crece tu negocio, menos comisión pagás
        </h2>

        <div className="mt-8 flex flex-col gap-4">
          {PLAN_IDS.map((id) => {
            const plan = PLANS[id];
            return (
              <div key={id} className="flex items-center gap-4">
                <span className="w-20 shrink-0 text-[13.5px] font-semibold text-ink-700">
                  {plan.name}
                </span>
                <span className="h-8 flex-1 overflow-hidden rounded-lg bg-ink-200/70">
                  <span
                    className="flex h-full items-center justify-end rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-3 text-[12.5px] font-bold text-white"
                    style={{ width: `${(plan.commissionRate / maxRate) * 100}%` }}
                  >
                    {commissionLabel(plan)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-ink-200 bg-white p-5">
          <p className="text-[14px] font-semibold text-ink-900">Cómo se reparte una venta</p>
          <dl className="mt-3 flex flex-col gap-2 text-[13.5px]">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-500">Vendés</dt>
              <dd className="font-semibold tabular-nums text-ink-900">$10.000</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-500">Mercado Pago o Stripe</dt>
              <dd className="text-ink-500">su comisión, según el medio de pago</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-500">TiendaFlow</dt>
              <dd className="text-ink-500">
                {PLAN_IDS.map((id) => commissionLabel(PLANS[id])).join(" · ")}, según tu plan
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-ink-100 pt-2">
              <dt className="font-medium text-ink-800">El dinero</dt>
              <dd className="font-semibold text-emerald-700">va directo a tu cuenta</dd>
            </div>
          </dl>
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-400">
            Las comisiones de Mercado Pago o Stripe se cobran por separado y pertenecen al medio de
            pago. TiendaFlow nunca retiene tu dinero.
          </p>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

const RECORRIDO = [
  { emoji: "📕", label: "Creá", text: "Tu producto digital" },
  { emoji: "🎯", label: "Ofrecé", text: "Precio, bonos y garantía" },
  { emoji: "🌐", label: "Vendé", text: "Tu página de venta" },
  { emoji: "💳", label: "Cobrá", text: "En tu propia cuenta" },
  { emoji: "🎁", label: "Entregá", text: "Automático, al instante" },
  { emoji: "📈", label: "Escalá", text: "Con los números a la vista" },
];

function Recorrido() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
      <h2 className="text-center text-[24px] font-semibold tracking-tight text-ink-900 sm:text-[28px]">
        Todo el proceso de venta. En un solo lugar.
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-[15px] leading-relaxed text-ink-600">
        No es una herramienta para subir un archivo y cobrar. Es todo el camino que va de una idea a
        una venta cobrada.
      </p>

      <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {RECORRIDO.map((paso, index) => (
          <li key={paso.label} className="relative">
            <div className="flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-4">
              <span className="tf-emoji text-[22px]" aria-hidden="true">
                {paso.emoji}
              </span>
              <span className="mt-2 text-[14px] font-semibold text-ink-900">{paso.label}</span>
              <span className="mt-0.5 text-[12.5px] leading-snug text-ink-500">{paso.text}</span>
            </div>
            {/* La flecha entre pasos solo tiene sentido cuando están en fila. */}
            {index < RECORRIDO.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-ink-300 lg:block"
              >
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

/** Una fila de la tabla: qué se compara y cómo se lee en cada plan. */
const FILAS: Array<{ label: string; valor: (plan: Plan) => string }> = [
  {
    label: "Productos publicados",
    valor: (plan) =>
      plan.limits.publishedProducts.amount === UNLIMITED
        ? "Sin tope"
        : String(plan.limits.publishedProducts.amount),
  },
  { label: "Página de venta", valor: () => "✓" },
  { label: "Checkout y página de gracias", valor: () => "✓" },
  { label: "Entrega automática", valor: () => "✓" },
  { label: "Mercado Pago y Stripe", valor: () => "✓" },
  {
    label: "Usos de IA por mes",
    valor: (plan) =>
      plan.limits.aiGenerations.amount === UNLIMITED
        ? "Sin tope"
        : String(plan.limits.aiGenerations.amount),
  },
  {
    label: "Bonos por oferta",
    valor: (plan) =>
      plan.limits.bonusesPerOffer.amount === UNLIMITED
        ? "Sin tope"
        : String(plan.limits.bonusesPerOffer.amount),
  },
  {
    label: "Ofertas posteriores por oferta",
    valor: (plan) =>
      plan.limits.upsellsPerOffer.amount === UNLIMITED
        ? "Sin tope"
        : String(plan.limits.upsellsPerOffer.amount),
  },
  {
    label: "Archivos",
    valor: (plan) =>
      plan.limits.storageMb.amount === UNLIMITED
        ? "Sin tope"
        : plan.limits.storageMb.amount >= 1024
          ? `${Math.round(plan.limits.storageMb.amount / 1024)} GB`
          : `${plan.limits.storageMb.amount} MB`,
  },
  { label: "Recuperación de carrito", valor: (plan) => (plan.features.cartRecovery ? "✓" : "—") },
  { label: "Estadísticas avanzadas", valor: (plan) => (plan.features.advancedAnalytics ? "✓" : "—") },
  { label: "Dominio propio", valor: (plan) => (plan.features.customDomain ? "✓" : "—") },
  { label: "Programa de afiliados", valor: (plan) => (plan.features.affiliates ? "✓" : "—") },
];

function Comparacion() {
  return (
    <section className="border-y border-ink-100 bg-ink-50/60">
      <div className="mx-auto w-full max-w-4xl px-5 py-14 sm:px-8">
        <h2 className="text-center text-[24px] font-semibold tracking-tight text-ink-900 sm:text-[28px]">
          Qué incluye cada plan
        </h2>

        {/* La tabla scrollea sola en pantallas angostas: cuatro columnas de
            texto no entran en 390px sin achicar la letra hasta lo ilegible. */}
        <div className="tf-scroll mt-8 overflow-x-auto rounded-2xl border border-ink-200 bg-white">
          <table className="w-full min-w-[520px] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-ink-200">
                <th className="px-4 py-3 text-left font-semibold text-ink-500">&nbsp;</th>
                {PLAN_IDS.map((id) => (
                  <th
                    key={id}
                    className={cn(
                      "px-4 py-3 text-center font-semibold",
                      id === DESTACADO ? "text-brand-700" : "text-ink-800",
                    )}
                  >
                    {PLANS[id].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FILAS.map((fila) => (
                <tr key={fila.label} className="border-b border-ink-100 last:border-0">
                  <th className="px-4 py-2.5 text-left font-medium text-ink-600">{fila.label}</th>
                  {PLAN_IDS.map((id) => {
                    const valor = fila.valor(PLANS[id]);
                    return (
                      <td
                        key={id}
                        className={cn(
                          "px-4 py-2.5 text-center tabular-nums",
                          valor === "—" ? "text-ink-300" : "text-ink-800",
                          valor === "✓" && "text-emerald-600",
                        )}
                      >
                        {valor}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-ink-50">
                <th className="px-4 py-3 text-left font-semibold text-ink-800">Comisión</th>
                {PLAN_IDS.map((id) => (
                  <td
                    key={id}
                    className={cn(
                      "px-4 py-3 text-center font-bold",
                      id === DESTACADO ? "text-brand-700" : "text-ink-900",
                    )}
                  >
                    {commissionLabel(PLANS[id])}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function SeccionCalculadora() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
      <h2 className="text-center text-[24px] font-semibold tracking-tight text-ink-900 sm:text-[28px]">
        🔢 ¿Cuál me conviene?
      </h2>
      <p className="mx-auto mb-8 mt-3 max-w-lg text-center text-[15px] leading-relaxed text-ink-600">
        Poné cuánto vendés por mes y te decimos con cuál pagás menos. Sin registrarte.
      </p>
      <Calculadora />
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Confianza() {
  return (
    <section className="border-y border-ink-100 bg-ink-50/60">
      <div className="mx-auto w-full max-w-3xl px-5 py-14 text-center sm:px-8">
        <span className="tf-emoji !inline-flex text-[32px]" aria-hidden="true">
          🔒
        </span>
        <h2 className="mt-4 text-[24px] font-semibold tracking-tight text-ink-900 sm:text-[28px]">
          Tu dinero es tuyo
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-ink-600">
          El dinero de cada venta va directamente a tu cuenta de Mercado Pago o Stripe. TiendaFlow no
          guarda ni retiene tu dinero: registra la venta y te cobra su comisión aparte.
        </p>

        <div className="mx-auto mt-8 flex w-full max-w-lg flex-wrap items-center justify-center gap-3 rounded-2xl border border-ink-200 bg-white px-5 py-5 text-[13.5px] font-medium">
          <span className="flex items-center gap-2 text-ink-700">
            <span className="tf-emoji" aria-hidden="true">
              🧑
            </span>
            Tu cliente
          </span>
          <Icon name="arrowRight" size={16} className="text-ink-300" />
          <span className="flex items-center gap-2 text-ink-700">
            <span className="tf-emoji" aria-hidden="true">
              💳
            </span>
            Mercado Pago
          </span>
          <Icon name="arrowRight" size={16} className="text-ink-300" />
          <span className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-800">
            <span className="tf-emoji" aria-hidden="true">
              🏦
            </span>
            Tu cuenta
          </span>
        </div>
        <p className="mt-2.5 text-[12.5px] text-ink-400">
          TiendaFlow registra la venta. La plata no pasa por acá.
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

const PREGUNTAS: Array<{ q: string; a: string }> = [
  {
    q: "¿Puedo empezar gratis?",
    a: "Sí. El plan Free no tiene abono ni vencimiento y no te pide tarjeta. Pagás solo la comisión de las ventas que hagas.",
  },
  {
    q: "¿Qué comisión cobra TiendaFlow?",
    a: `Depende de tu plan: ${PLAN_IDS.map((id) => `${commissionLabel(PLANS[id])} en ${PLANS[id].name}`).join(", ")}. Se calcula sobre el total de cada venta cobrada.`,
  },
  {
    q: "¿Las comisiones de Mercado Pago están incluidas?",
    a: "No. El procesador de pago cobra su propia comisión, que es suya y no nuestra. Lo que ves acá es solo lo que cobra TiendaFlow.",
  },
  {
    q: "¿TiendaFlow se queda con mi dinero?",
    a: "No. Conectás tu propia cuenta de Mercado Pago o Stripe y el dinero de cada venta entra directo ahí. Nosotros registramos la venta.",
  },
  {
    q: "¿Puedo cambiar de plan?",
    a: "Sí, cuando quieras, desde Configuración. El cambio aplica a las ventas que vengan después.",
  },
  {
    q: "¿Puedo cancelar?",
    a: "Sí. No hay contratos ni permanencia. Si bajás a Free seguís vendiendo, con la comisión de Free.",
  },
  {
    q: "¿Qué pasa si supero el límite de mi plan?",
    a: "Te avisamos antes de que choques contra el tope y te decimos qué plan te conviene según lo que estás vendiendo. Nada se borra ni se apaga de golpe.",
  },
];

function Preguntas() {
  return (
    <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-20 px-5 py-16 sm:px-8">
      <h2 className="text-center text-[24px] font-semibold tracking-tight text-ink-900 sm:text-[28px]">
        Preguntas frecuentes
      </h2>

      {/*
        `<details>` y no un acordeón de JavaScript: abre y cierra sin cargar
        nada, funciona con el buscador del navegador (Ctrl+F encuentra el texto
        aunque esté cerrado) y no depende de que el cliente haya hidratado.
      */}
      <div className="mt-8 flex flex-col gap-2.5">
        {PREGUNTAS.map((item) => (
          <details
            key={item.q}
            className="group rounded-2xl border border-ink-200 bg-white px-5 py-4 open:border-ink-300"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 text-[15px] font-semibold text-ink-900 marker:content-none">
              {item.q}
              <Icon
                name="chevronDown"
                size={18}
                className="ml-auto shrink-0 text-ink-400 transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-600">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function CierreFinal() {
  return (
    <section className="border-t border-ink-100 bg-ink-900">
      <div className="mx-auto w-full max-w-3xl px-5 py-16 text-center sm:px-8">
        <h2 className="text-[28px] font-semibold leading-tight tracking-tight text-white sm:text-[34px]">
          🚀 Tu producto ya puede empezar a vender
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-white/70">
          Crealo. Publicalo. Cobrá. Todo desde un solo lugar.
        </p>
        <Link
          href="/crear-cuenta"
          className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-[15px] font-semibold text-ink-900 transition-colors hover:bg-white/90"
        >
          Empezar gratis
          <Icon name="arrowRight" size={17} />
        </Link>
        <p className="mt-3 text-[13px] text-white/50">No necesitás tarjeta de crédito.</p>
      </div>
    </section>
  );
}
