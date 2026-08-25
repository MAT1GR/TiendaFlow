import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { SectionIntro } from "@/components/app/section-intro";
import { Icon } from "@/components/ui/icon";
import { PaymentLogo } from "@/components/ui/payment-logos";
import { LinkButton } from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { listProviderStatus } from "@/lib/integrations/payments";
import { productContext, sectionBlurb } from "@/lib/product-workspace";
import { cn, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Cómo cobro" };

const EXPLAIN: Record<string, { blurb: string; who: string }> = {
  mercadopago: {
    blurb: "Tarjetas, débito, efectivo y cuotas en Argentina y el resto de Latinoamérica.",
    who: "Si vendés en pesos, este es el que usa casi todo el mundo.",
  },
  stripe: {
    blurb: "Tarjetas internacionales, en dólares o en la moneda que elijas.",
    who: "Si le vendés a gente de afuera, necesitás este.",
  },
};

/**
 * Cómo cobra el vendedor.
 *
 * Es la misma información que la pantalla global de Pagos, pero contada desde
 * el producto y sin jerga: acá no se ven claves, ni webhooks, ni modos de
 * prueba. Solo si podés cobrar o no, y qué pasa si no.
 */
export default async function HowIGetPaidTab({ params }: { params: Promise<{ id: string }> }) {
  const { workspace } = await requireSession();
  const { id } = await params;

  const context = productContext(workspace.id, id);
  if (!context) notFound();

  const providers = listProviderStatus(workspace.id);
  const connected = providers.filter((provider) => provider.connected);
  const { offer } = context;

  return (
    <div className="flex flex-col gap-5">
      <SectionIntro emoji="💳" title="Cómo cobro" blurb={sectionBlurb("cobro")} />

      {/*
        Cuando ya puede cobrar se lo decimos con el número puesto: es la
        confirmación concreta de que la cadena quedó cerrada. Cuando todavía no
        conectó nada no va ningún cartel: las dos tarjetas de abajo ya dicen
        "Sin conectar" y traen el botón. Un aviso rojo arriba repitiendo lo que
        se ve abajo no agrega información, solo agrega alarma.
      */}
      {connected.length > 0 ? (
        <div className="rounded-2xl border border-accent-200 bg-accent-50/60 p-5">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
            <span className="tf-emoji" aria-hidden="true">
              ✅
            </span>
            Ya podés cobrar
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-700">
            {offer && offer.price > 0
              ? `Cuando alguien compre, vas a recibir ${formatMoney(offer.price, offer.currency)} en tu cuenta de ${connected.map((provider) => provider.name).join(" o ")}, menos la comisión del proveedor.`
              : `Tenés ${connected.map((provider) => provider.name).join(" y ")} conectado. Falta ponerle precio al producto.`}
          </p>
        </div>
      ) : null}

      {/* Tarjetas grandes, una por medio de pago. La decisión es "conectá tu
          cuenta y listo": las claves y la configuración técnica viven en Pagos
          y no tienen por qué aparecer acá. */}
      <ul className="grid gap-4 sm:grid-cols-2">
        {providers.map((provider) => {
          const detail = EXPLAIN[provider.id];
          return (
            <li
              key={provider.id}
              className={cn(
                "flex flex-col rounded-2xl border bg-white p-5 transition-all hover:shadow-soft",
                provider.connected ? "border-accent-200" : "border-ink-200",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <PaymentLogo provider={provider.id} size={44} />

                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ring-1 ring-inset",
                    provider.connected
                      ? "bg-accent-50 text-accent-700 ring-accent-200"
                      : "bg-ink-100 text-ink-500 ring-ink-200",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      provider.connected ? "bg-accent-500" : "bg-ink-400",
                    )}
                    aria-hidden="true"
                  />
                  {provider.connected ? "Conectado" : "Sin conectar"}
                </span>
              </div>

              <p className="mt-3.5 text-[16px] font-semibold text-ink-900">{provider.name}</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">{detail?.blurb}</p>
              <p className="mt-1.5 flex-1 text-[13px] text-ink-500">{detail?.who}</p>

              {provider.lastError ? (
                <p className="mt-3 text-[12.5px] text-red-600">{provider.lastError}</p>
              ) : null}

              <LinkButton
                href="/app/pagos"
                variant={provider.connected ? "secondary" : "primary"}
                size="sm"
                full
                className="mt-4"
                icon={provider.connected ? "settings" : "plug"}
              >
                {provider.connected ? "Administrar" : "Conectar mi cuenta"}
              </LinkButton>
            </li>
          );
        })}
      </ul>

      <RecorridoDelDinero />
    </div>
  );
}

/**
 * Adónde va la plata.
 *
 * Esta pantalla terminaba a media altura y dejaba media ventana en blanco, y
 * el hueco no era solo estético: es justo la pantalla donde alguien decide
 * entregar los datos de la cuenta donde va a entrar su dinero, y ahí el silencio
 * se lee como que falta información.
 *
 * Tres pasos alcanzan, porque el mensaje es uno solo y es el que importa: la
 * plata va de tu cliente a tu cuenta, y nosotros no estamos en el medio.
 */
function RecorridoDelDinero() {
  const pasos = [
    {
      emoji: "🛒",
      title: "Tu cliente paga",
      text: "Elige su medio de pago en el checkout y confirma la compra.",
    },
    {
      emoji: "🏦",
      title: "El dinero entra a tu cuenta",
      text: "Va directo a tu cuenta del proveedor, menos su comisión. No pasa por acá.",
    },
    {
      emoji: "📊",
      title: "TiendaFlow registra la venta",
      text: "Le entregamos el producto, guardamos el pedido y lo sumamos a tus resultados.",
    },
  ];

  return (
    <section className="rounded-2xl border border-ink-200 bg-white p-5">
      <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">
        ¿Cómo funciona el dinero?
      </h2>
      <p className="mt-1 text-[13px] text-ink-500">
        Desde que alguien aprieta comprar hasta que la venta aparece en tus resultados.
      </p>

      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        {pasos.map((paso, index) => (
          <li key={paso.title} className="relative flex flex-col rounded-xl bg-ink-50/70 p-4">
            {/*
              La flecha entre pasos solo existe cuando los tres están en fila.
              Apilados en un teléfono apuntaría hacia el costado, a la nada.
            */}
            {index < pasos.length - 1 ? (
              <Icon
                name="arrowRight"
                size={16}
                className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-ink-300 sm:block"
                aria-hidden="true"
              />
            ) : null}

            <span className="tf-emoji !text-[20px]" aria-hidden="true">
              {paso.emoji}
            </span>
            <span className="mt-2 text-[13.5px] font-semibold text-ink-900">{paso.title}</span>
            <span className="mt-1 text-[12.5px] leading-relaxed text-ink-500">{paso.text}</span>
          </li>
        ))}
      </ol>

      <p className="mt-4 border-t border-ink-100 pt-4 text-[12.5px] leading-relaxed text-ink-400">
        El dinero de tus ventas va directo a tu propia cuenta. TiendaFlow no lo toca en ningún
        momento: solo arma el cobro y registra la venta.
      </p>
    </section>
  );
}
