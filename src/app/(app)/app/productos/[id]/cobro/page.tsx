import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { LinkButton } from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { listProviderStatus } from "@/lib/integrations/payments";
import { productContext } from "@/lib/product-workspace";
import { formatMoney } from "@/lib/utils";

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
      <header>
        <h2 className="text-[18px] font-semibold tracking-tight text-ink-900">
          Cómo recibís el dinero
        </h2>
        <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-ink-600">
          El dinero de tus ventas va directo a tu propia cuenta. TiendaFlow no lo toca en ningún
          momento: solo arma el cobro y registra la venta.
        </p>
      </header>

      {connected.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
          <p className="text-[15px] font-semibold text-ink-900">
            Todavía no podés cobrar este producto
          </p>
          <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-ink-700">
            Sin un medio de pago conectado, la persona llega hasta el final pero no puede completar
            la compra. El pedido queda anotado como pendiente y nadie recibe lo que compró.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-accent-200 bg-accent-50/60 p-5">
          <p className="text-[15px] font-semibold text-ink-900">Ya podés cobrar</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-700">
            {offer
              ? `Cuando alguien compre, vas a recibir ${formatMoney(offer.price, offer.currency)} en tu cuenta de ${connected.map((provider) => provider.name).join(" o ")}, menos la comisión del proveedor.`
              : `Tenés ${connected.map((provider) => provider.name).join(" y ")} conectado. Falta ponerle precio al producto.`}
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {providers.map((provider) => {
          const detail = EXPLAIN[provider.id];
          return (
            <li
              key={provider.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-ink-200 bg-white p-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <p className="text-[15px] font-semibold text-ink-900">{provider.name}</p>
                  <span
                    className={
                      provider.connected
                        ? "inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-2.5 py-1 text-[11.5px] font-medium text-accent-700 ring-1 ring-inset ring-accent-200"
                        : "inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-[11.5px] font-medium text-ink-500 ring-1 ring-inset ring-ink-200"
                    }
                  >
                    <span
                      className={
                        provider.connected
                          ? "size-1.5 rounded-full bg-accent-500"
                          : "size-1.5 rounded-full bg-ink-400"
                      }
                      aria-hidden="true"
                    />
                    {provider.connected ? "Conectado" : "Sin conectar"}
                  </span>
                </div>

                <p className="mt-2 max-w-lg text-[13.5px] leading-relaxed text-ink-600">
                  {detail?.blurb}
                </p>
                <p className="mt-1 max-w-lg text-[13px] text-ink-500">{detail?.who}</p>
              </div>

              <LinkButton
                href="/app/pagos"
                variant={provider.connected ? "secondary" : "primary"}
                size="sm"
                icon={provider.connected ? "settings" : "plug"}
                className="shrink-0"
              >
                {provider.connected ? "Ajustes" : "Conectar"}
              </LinkButton>
            </li>
          );
        })}
      </ul>

      <p className="text-[12.5px] leading-relaxed text-ink-400">
        Las claves y la configuración técnica de cada proveedor viven en Pagos, dentro de
        Configuración. Se guardan cifradas y nunca salen del servidor.
      </p>
    </div>
  );
}
