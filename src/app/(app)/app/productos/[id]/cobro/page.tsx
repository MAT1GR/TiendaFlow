import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { SectionIntro } from "@/components/app/section-intro";
import { LinkButton } from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { listProviderStatus } from "@/lib/integrations/payments";
import { productContext, sectionBlurb } from "@/lib/product-workspace";
import { cn, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Cómo cobro" };

const EXPLAIN: Record<string, { flag: string; blurb: string; who: string }> = {
  mercadopago: {
    flag: "🇦🇷",
    blurb: "Tarjetas, débito, efectivo y cuotas en Argentina y el resto de Latinoamérica.",
    who: "Si vendés en pesos, este es el que usa casi todo el mundo.",
  },
  stripe: {
    flag: "💳",
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

      {connected.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
          <p className="text-[15px] font-semibold text-ink-900">
            Todavía no podés cobrar este producto
          </p>
          <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-ink-700">
            Sin un medio de pago conectado, la persona llega hasta el final pero no puede completar
            la compra: el pedido queda pendiente y nadie recibe lo que compró.
          </p>
        </div>
      ) : (
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
      )}

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
                <span
                  className="tf-emoji !inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-ink-100 !text-[22px]"
                  aria-hidden="true"
                >
                  {detail?.flag ?? "💳"}
                </span>

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

      <p className="text-[12.5px] leading-relaxed text-ink-400">
        El dinero de tus ventas va directo a tu propia cuenta. TiendaFlow no lo toca en ningún
        momento: solo arma el cobro y registra la venta.
      </p>
    </div>
  );
}
