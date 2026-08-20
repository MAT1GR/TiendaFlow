import Link from "next/link";
import type { Metadata } from "next";

import { Icon, Wordmark, type IconName } from "@/components/ui/icon";
import { currentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "TiendaFlow — De una idea a una oferta lista para vender",
  description:
    "Creá tu producto digital, armá la oferta, el funnel, el checkout, los upsells y el tracking desde una sola plataforma.",
};

const WORKFLOW = [
  { step: "01", title: "Creás el producto", text: "Subís tu ebook o lo generás con IA." },
  { step: "02", title: "Armás la oferta", text: "Precio, promesa, bonos y garantía." },
  { step: "03", title: "Construís el funnel", text: "Landing, checkout, upsell y gracias." },
  { step: "04", title: "Conectás el cobro", text: "Stripe o Mercado Pago, en tu cuenta." },
  { step: "05", title: "Configurás el tracking", text: "Pixel y API de Conversiones de Meta." },
  { step: "06", title: "Lanzás y optimizás", text: "Mirás los números y ajustás con IA." },
];

const FEATURES: Array<{
  eyebrow: string;
  title: string;
  text: string;
  icon: IconName;
  bullets: string[];
}> = [
  {
    eyebrow: "Producto",
    title: "De la idea al ebook terminado",
    text: "Subís lo que ya tenés o partís de un tema y la IA te arma título, índice, capítulos, beneficios y FAQ. Todo editable.",
    icon: "box",
    bullets: ["Ebooks, PDFs, plantillas y guías", "Índice y capítulos generados", "Entrega digital configurable"],
  },
  {
    eyebrow: "Oferta",
    title: "Lo que realmente compra la gente",
    text: "El producto es una parte. La oferta es precio, promesa, bonos, order bump y upsells trabajando juntos.",
    icon: "tag",
    bullets: ["Bonos con valor percibido", "Order bump dentro del checkout", "Upsells y downsells encadenados"],
  },
  {
    eyebrow: "Funnel",
    title: "El recorrido completo, visual",
    text: "Agregás, ordenás y editás cada paso. Cada uno muestra sus visitantes y su tasa de avance.",
    icon: "funnel",
    bullets: ["Landing → checkout → upsell → gracias", "Métricas por paso", "Publicación con validaciones"],
  },
  {
    eyebrow: "Landing",
    title: "Editor visual con generación por IA",
    text: "Hero, beneficios, bonos, garantía, FAQ y precio. Generás todo de una y después ajustás sección por sección.",
    icon: "layers",
    bullets: ["18 bloques listos", "Vista desktop, tablet y mobile", "Regeneración por sección"],
  },
  {
    eyebrow: "Meta Ads",
    title: "Tracking que no pierde ventas",
    text: "Pixel en el navegador y API de Conversiones desde el servidor, con deduplicación por event_id.",
    icon: "megaphone",
    bullets: ["PageView, InitiateCheckout, Purchase", "Links con UTM listos para pegar", "Atribución guardada con cada orden"],
  },
  {
    eyebrow: "Analytics",
    title: "Los números que deciden",
    text: "Facturación, conversión, ticket promedio, take rate de bump y upsell, CPA y ROAS cuando hay datos de inversión.",
    icon: "chart",
    bullets: ["Comparación contra el período anterior", "Rendimiento por funnel y campaña", "Fuentes de tráfico por UTM"],
  },
];

const FAQ = [
  {
    q: "¿Necesito saber de tecnología?",
    a: "No. TiendaFlow te lleva paso a paso desde el producto hasta el lanzamiento. Si algo falta para poder vender, te decimos exactamente qué es.",
  },
  {
    q: "¿TiendaFlow cobra por mí?",
    a: "No. Conectás tu propia cuenta de Stripe o Mercado Pago y el dinero va directo ahí. TiendaFlow arma el checkout y registra la venta.",
  },
  {
    q: "¿Qué pasa si no conecto un proveedor de pago?",
    a: "El funnel funciona igual para probarlo, pero los pedidos quedan en estado pendiente. Nunca marcamos una venta como pagada sin la confirmación del proveedor.",
  },
  {
    q: "¿La IA escribe por mí?",
    a: "Genera borradores a partir de los datos de tu producto y tu oferta: títulos, descripciones, landing, copy de anuncios y análisis del funnel. Vos revisás y editás antes de publicar.",
  },
  {
    q: "¿Puedo usar mi propio dominio?",
    a: "Sí. Cargás el dominio y te mostramos los registros DNS. Queda activo cuando se verifica la configuración.",
  },
  {
    q: "¿Sirve si vendo por fuera de Meta Ads?",
    a: "Sí. El funnel, el checkout y la entrega funcionan con cualquier fuente de tráfico. La integración con Meta suma medición si comprás anuncios ahí.",
  },
];

export default async function MarketingPage() {
  const user = await currentUser();

  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-5 sm:px-8">
          <Link href="/" className="flex items-center">
            <Wordmark />
          </Link>

          <nav className="ml-6 hidden items-center gap-6 md:flex">
            {[
              ["Cómo funciona", "#como-funciona"],
              ["Funciones", "#funciones"],
              ["IA", "#ia"],
              ["Preguntas", "#faq"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="text-[13.5px] font-medium text-ink-600 transition-colors hover:text-ink-900"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <Link
                href="/app"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-[13.5px] font-medium text-white transition-colors hover:bg-brand-700"
              >
                Ir a mi panel
                <Icon name="arrowRight" size={15} />
              </Link>
            ) : (
              <>
                <Link
                  href="/ingresar"
                  className="hidden h-9 items-center rounded-xl px-3 text-[13.5px] font-medium text-ink-700 transition-colors hover:bg-ink-100 sm:inline-flex"
                >
                  Ingresar
                </Link>
                <Link
                  href="/crear-cuenta"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-[13.5px] font-medium text-white transition-colors hover:bg-brand-700"
                >
                  Empezar gratis
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
            style={{
              backgroundImage:
                "radial-gradient(55% 80% at 20% 0%, rgba(109,93,251,.16) 0%, transparent 65%), radial-gradient(45% 70% at 85% 5%, rgba(34,211,238,.14) 0%, transparent 65%)",
            }}
            aria-hidden="true"
          />
          <div className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24">
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-[12.5px] font-semibold text-brand-700">
              <Icon name="sparkles" size={14} />
              Create. Launch. Sell. Optimize.
            </p>

            <h1 className="mt-6 max-w-3xl text-[40px] font-semibold leading-[1.06] tracking-tight text-ink-900 sm:text-[60px]">
              De una idea a una oferta{" "}
              <span className="tf-gradient-text">lista para vender</span>.
            </h1>

            <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-ink-600 sm:text-[19px]">
              Creá tu producto, tu oferta, tu funnel, tu checkout, tus upsells y tu tracking desde
              una sola plataforma. Tu producto, tu funnel y tus ventas, todo en un solo lugar.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/crear-cuenta"
                className="inline-flex h-13 items-center gap-2 rounded-2xl bg-brand-600 px-7 py-3.5 text-[16px] font-semibold text-white shadow-[0_12px_32px_-12px_rgba(109,93,251,.7)] transition-all hover:bg-brand-700 active:scale-[.98]"
              >
                Empezar gratis
                <Icon name="arrowRight" size={19} />
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center gap-2 rounded-2xl border border-ink-200 px-6 py-3.5 text-[16px] font-semibold text-ink-800 transition-colors hover:bg-ink-50"
              >
                Ver cómo funciona
              </a>
            </div>

            <p className="mt-4 text-[13px] text-ink-500">
              Sin tarjeta para empezar. Conectás tu propio proveedor de pago cuando quieras cobrar.
            </p>

            <div className="mt-14 rounded-3xl border border-ink-200 bg-white p-2 shadow-[0_40px_80px_-40px_rgba(15,23,42,.4)]">
              <div className="tf-grid-bg overflow-hidden rounded-2xl bg-ink-50/70 p-5 sm:p-8">
                <div className="tf-scroll flex items-center gap-3 overflow-x-auto pb-2">
                  {["Producto", "Oferta", "Funnel", "Checkout", "Upsell", "Gracias", "Analytics"].map(
                    (node, index, list) => (
                      <div key={node} className="flex shrink-0 items-center gap-3">
                        <span className="rounded-2xl border border-ink-200 bg-white px-4 py-3 text-[13.5px] font-semibold text-ink-800 shadow-[0_1px_2px_rgba(15,23,42,.06)]">
                          {node}
                        </span>
                        {index < list.length - 1 ? (
                          <Icon name="arrowRight" size={17} className="text-ink-300" />
                        ) : null}
                      </div>
                    ),
                  )}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Facturación", "Datos reales de tus ventas"],
                    ["Conversión", "Por paso del funnel"],
                    ["ROAS", "Cuando conectás Meta"],
                  ].map(([label, hint]) => (
                    <div key={label} className="rounded-2xl border border-ink-200 bg-white p-4">
                      <p className="text-[12.5px] font-medium text-ink-500">{label}</p>
                      <p className="mt-2 text-[22px] font-semibold tracking-tight text-ink-300">—</p>
                      <p className="mt-1 text-[11.5px] text-ink-400">{hint}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-center text-[12px] text-ink-400">
                  Vista ilustrativa del panel. Los números salen de tus ventas reales.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Problema */}
        <section className="border-y border-ink-200 bg-ink-50/60">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <h2 className="max-w-2xl text-[28px] font-semibold leading-tight tracking-tight text-ink-900 sm:text-[38px]">
              Vender un digital no falla por el producto. Falla por todo lo de al lado.
            </h2>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: "layers" as IconName,
                  title: "Seis herramientas sueltas",
                  text: "Una para la landing, otra para el checkout, otra para el email, otra para el tracking. Y nada conversa entre sí.",
                },
                {
                  icon: "target" as IconName,
                  title: "No sabés dónde perdés",
                  text: "Entra tráfico, sale poco. Sin métricas por paso es imposible saber si el problema es el anuncio, la landing o el checkout.",
                },
                {
                  icon: "clock" as IconName,
                  title: "Tres semanas para lanzar",
                  text: "Entre armar la página, conectar el cobro y configurar el pixel se va el mes. Y todavía no vendiste nada.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-ink-200 bg-white p-6">
                  <span className="grid size-10 place-items-center rounded-xl bg-red-50 text-red-500">
                    <Icon name={item.icon} size={19} />
                  </span>
                  <h3 className="mt-4 text-[16px] font-semibold text-ink-900">{item.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section id="como-funciona" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
            <p className="text-[13px] font-semibold uppercase tracking-widest text-brand-600">
              Cómo funciona
            </p>
            <h2 className="mt-3 max-w-2xl text-[30px] font-semibold leading-tight tracking-tight text-ink-900 sm:text-[42px]">
              Un solo recorrido, de principio a fin
            </h2>
            <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-600">
              TiendaFlow no es una colección de herramientas: es un camino. Cuando terminás un paso,
              te lleva al siguiente.
            </p>

            <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {WORKFLOW.map((item) => (
                <li
                  key={item.step}
                  className="rounded-2xl border border-ink-200 p-6 transition-colors hover:border-brand-300 hover:bg-brand-50/30"
                >
                  <span className="text-[13px] font-bold tracking-widest text-brand-500">
                    {item.step}
                  </span>
                  <h3 className="mt-2.5 text-[17px] font-semibold text-ink-900">{item.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink-600">{item.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Funciones */}
        <section id="funciones" className="scroll-mt-20 border-y border-ink-200 bg-ink-50/60">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
            <p className="text-[13px] font-semibold uppercase tracking-widest text-brand-600">
              Funciones
            </p>
            <h2 className="mt-3 max-w-2xl text-[30px] font-semibold leading-tight tracking-tight text-ink-900 sm:text-[42px]">
              Todo lo que hace falta para vender un digital
            </h2>

            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-3xl border border-ink-200 bg-white p-6 sm:p-7"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                      <Icon name={feature.icon} size={20} />
                    </span>
                    <span className="text-[12px] font-semibold uppercase tracking-widest text-brand-600">
                      {feature.eyebrow}
                    </span>
                  </div>

                  <h3 className="mt-4 text-[20px] font-semibold tracking-tight text-ink-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-ink-600">{feature.text}</p>

                  <ul className="mt-4 flex flex-col gap-1.5">
                    {feature.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2 text-[13.5px] text-ink-700">
                        <Icon name="check" size={15} className="mt-0.5 shrink-0 text-accent-600" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* IA */}
        <section id="ia" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
            <div className="tf-gradient-ai overflow-hidden rounded-3xl px-6 py-12 sm:px-12 sm:py-16">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-[12.5px] font-semibold text-white ring-1 ring-inset ring-white/25">
                <Icon name="sparkles" size={14} />
                TiendaFlow AI
              </p>
              <h2 className="mt-5 max-w-2xl text-[30px] font-semibold leading-tight tracking-tight text-white sm:text-[42px]">
                La IA no reemplaza tu criterio. Te saca la página en blanco.
              </h2>
              <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-white/75">
                Genera el borrador con los datos reales de tu producto y tu oferta. Vos revisás,
                editás y publicás. Cuando no hay datos suficientes para afirmar algo, te lo dice en
                vez de inventarlo.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Producto", "Título, índice, capítulos, beneficios y FAQ."],
                  ["Oferta", "Headline, promesa, bonos, bump y upsell."],
                  ["Landing", "La página completa, sección por sección."],
                  ["Optimización", "Dónde se cae la gente y qué testear."],
                ].map(([title, text]) => (
                  <div
                    key={title}
                    className="rounded-2xl bg-white/10 p-5 ring-1 ring-inset ring-white/15"
                  >
                    <p className="text-[15px] font-semibold text-white">{title}</p>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/70">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Modo Lanzamiento */}
        <section className="border-y border-ink-200 bg-ink-50/60">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-widest text-brand-600">
                Modo Lanzamiento
              </p>
              <h2 className="mt-3 text-[30px] font-semibold leading-tight tracking-tight text-ink-900 sm:text-[40px]">
                Saber exactamente qué te falta para vender
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-ink-600">
                Ocho pasos con su estado real. No “configurá tu tienda”: te decimos que falta el
                precio de la oferta, o que el checkout no tiene proveedor de pago, y te llevamos
                directo a resolverlo.
              </p>
              <Link
                href="/crear-cuenta"
                className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Empezar gratis
                <Icon name="arrowRight" size={17} />
              </Link>
            </div>

            <ol className="flex flex-col gap-2">
              {[
                ["01", "Producto", "done"],
                ["02", "Oferta", "done"],
                ["03", "Bonos", "done"],
                ["04", "Funnel", "done"],
                ["05", "Checkout", "warning"],
                ["06", "Tracking", "warning"],
                ["07", "Meta Ads", "todo"],
                ["08", "Lanzamiento", "todo"],
              ].map(([index, label, state]) => (
                <li
                  key={index}
                  className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white px-4 py-3"
                >
                  <span
                    className={
                      state === "done"
                        ? "grid size-8 place-items-center rounded-xl bg-accent-600 text-[12px] font-bold text-white"
                        : state === "warning"
                          ? "grid size-8 place-items-center rounded-xl bg-amber-100 text-[12px] font-bold text-amber-700"
                          : "grid size-8 place-items-center rounded-xl bg-ink-100 text-[12px] font-bold text-ink-400"
                    }
                  >
                    {state === "done" ? <Icon name="check" size={15} /> : index}
                  </span>
                  <span className="flex-1 text-[14px] font-medium text-ink-800">{label}</span>
                  <span
                    className={
                      state === "done"
                        ? "text-[12px] font-semibold text-accent-700"
                        : state === "warning"
                          ? "text-[12px] font-semibold text-amber-700"
                          : "text-[12px] font-medium text-ink-400"
                    }
                  >
                    {state === "done" ? "Listo" : state === "warning" ? "Falta algo" : "Pendiente"}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Testimonios (placeholder honesto) */}
        <section>
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <h2 className="text-[26px] font-semibold tracking-tight text-ink-900 sm:text-[34px]">
              Testimonios
            </h2>
            <div className="mt-6 rounded-3xl border-2 border-dashed border-ink-300 bg-ink-50 p-8 text-center">
              <Icon name="users" size={28} className="mx-auto text-ink-400" />
              <p className="mt-3 text-[15px] font-medium text-ink-700">
                Espacio reservado para testimonios reales
              </p>
              <p className="mx-auto mt-2 max-w-xl text-[13.5px] leading-relaxed text-ink-500">
                TiendaFlow es un producto nuevo y todavía no tenemos casos para mostrar. Preferimos
                dejar este espacio vacío antes que inventar testimonios, cifras de facturación o
                cantidad de usuarios.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-y border-ink-200 bg-ink-50/60">
          <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
            <h2 className="text-[30px] font-semibold leading-tight tracking-tight text-ink-900 sm:text-[40px]">
              Preguntas frecuentes
            </h2>

            <div className="mt-10 flex flex-col gap-2">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-ink-200 bg-white px-5 py-4"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15.5px] font-semibold text-ink-900">
                    {item.q}
                    <Icon
                      name="chevronDown"
                      size={18}
                      className="shrink-0 text-ink-400 transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-600">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section>
          <div className="mx-auto w-full max-w-4xl px-5 py-20 text-center sm:px-8 sm:py-28">
            <h2 className="text-[32px] font-semibold leading-tight tracking-tight text-ink-900 sm:text-[46px]">
              Prepará tu oferta para vender
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-ink-600">
              Creá tu cuenta y en el mismo día tenés el producto, la oferta y el funnel armados.
            </p>
            <Link
              href="/crear-cuenta"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-8 py-4 text-[17px] font-semibold text-white shadow-[0_14px_36px_-14px_rgba(109,93,251,.75)] transition-all hover:bg-brand-700 active:scale-[.98]"
            >
              Empezar gratis
              <Icon name="arrowRight" size={20} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-200">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/" className="flex w-fit items-center">
              <Wordmark size="sm" />
            </Link>
            <p className="mt-2 text-[13px] text-ink-500">
              De una idea a una oferta lista para vender.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-ink-600">
            <a href="#como-funciona" className="hover:text-ink-900">
              Cómo funciona
            </a>
            <a href="#funciones" className="hover:text-ink-900">
              Funciones
            </a>
            <a href="#faq" className="hover:text-ink-900">
              Preguntas
            </a>
            <Link href="/ingresar" className="hover:text-ink-900">
              Ingresar
            </Link>
          </nav>
        </div>
        <div className="border-t border-ink-100 py-5">
          <p className="text-center text-[12.5px] text-ink-400">
            © {new Date().getFullYear()} TiendaFlow
          </p>
        </div>
      </footer>
    </div>
  );
}
