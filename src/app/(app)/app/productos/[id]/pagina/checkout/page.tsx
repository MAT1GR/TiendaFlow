import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { CheckoutForm } from "@/app/f/[slug]/checkout/form";
import { ExperienceScreen, type Palanca } from "@/components/app/experience-screen";
import { Alert } from "@/components/ui/feedback";
import { requireSession } from "@/lib/auth";
import { listProviderStatus } from "@/lib/integrations/payments";
import { productContext } from "@/lib/product-workspace";
import { listBonuses, listOrderBumps } from "@/lib/repo";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Checkout" };

/**
 * El checkout, como lo ve el cliente.
 *
 * La vista previa es el componente real del checkout público, no una maqueta:
 * cualquier cambio que hagamos ahí se ve acá sin que nadie tenga que acordarse
 * de actualizar dos lugares. Va envuelto en una capa que anula los clicks, así
 * que no hay forma de disparar un pedido de prueba desde el panel.
 */
export default async function CheckoutTab({ params }: { params: Promise<{ id: string }> }) {
  const { workspace } = await requireSession();
  const { id } = await params;

  const context = productContext(workspace.id, id);
  if (!context) notFound();

  const { product, offer } = context;
  const base = `/app/productos/${id}`;

  if (!offer) {
    return (
      <ExperienceScreen
        productId={id}
        step="checkout"
        preview={
          <div className="px-6 py-16 text-center text-[14px] text-ink-500">
            Cuando le pongas precio a tu producto, acá vas a ver la pantalla de pago.
          </div>
        }
        palancas={[
          {
            emoji: "💰",
            label: "Ponerle precio a tu producto",
            valor: "Sin esto no hay nada que cobrar",
            href: `${base}/oferta`,
            pendiente: true,
          },
        ]}
      />
    );
  }

  const bumps = listOrderBumps(workspace.id, offer.id).filter((bump) => bump.active);
  const bonuses = listBonuses(workspace.id, offer.id);
  const providers = listProviderStatus(workspace.id);
  const conectado = providers.find((provider) => provider.connected) ?? null;

  const palancas: Palanca[] = [
    {
      emoji: "💰",
      label: "Precio",
      valor: offer.compare_at_price
        ? `${formatMoney(offer.price, offer.currency)} · antes ${formatMoney(offer.compare_at_price, offer.currency)}`
        : formatMoney(offer.price, offer.currency),
      href: `${base}/oferta`,
    },
    {
      emoji: "🔘",
      label: "Texto del botón",
      valor: offer.cta_text || "Sin definir",
      href: `${base}/oferta`,
    },
    {
      emoji: "🛡️",
      label: "Garantía",
      valor: offer.guarantee || "Todavía no escribiste ninguna",
      href: `${base}/oferta`,
      pendiente: !offer.guarantee,
    },
    {
      emoji: "➕",
      label: "Oferta extra al pagar",
      valor: bumps.length
        ? bumps.map((bump) => `${bump.name} · ${formatMoney(bump.price, offer.currency)}`).join(" · ")
        : "Ninguna. Es lo más fácil de sumar al ticket.",
      href: `${base}/oferta`,
    },
    {
      emoji: "🎁",
      label: "Bonos que se muestran",
      valor: bonuses.length ? `${bonuses.length} bonos incluidos` : "Ninguno cargado",
      href: `${base}/oferta`,
    },
    {
      emoji: "💳",
      label: "Medio de pago",
      valor: conectado
        ? `${conectado.name}${conectado.mode ? ` · ${conectado.mode}` : ""}`
        : "Sin conectar: nadie puede pagarte todavía",
      href: `${base}/cobro`,
      pendiente: !conectado,
    },
  ];

  return (
    <ExperienceScreen
      productId={id}
      step="checkout"
      preview={
        <CheckoutForm
          slug="preview"
          offer={{
            name: offer.name,
            headline: offer.headline,
            price: offer.price,
            compareAtPrice: offer.compare_at_price,
            currency: offer.currency,
            ctaText: offer.cta_text,
            guarantee: offer.guarantee,
          }}
          productName={product.name}
          bumps={bumps.map((bump) => ({
            id: bump.id,
            name: bump.name,
            description: bump.description,
            label: bump.checkbox_label,
            price: bump.price,
          }))}
          bonuses={bonuses.map((bonus) => ({ name: bonus.name, value: bonus.value }))}
          provider={conectado ? { name: conectado.name, mode: conectado.mode } : null}
          cancelled={false}
        />
      }
      palancas={palancas}
      nota={
        conectado ? null : (
          <Alert tone="warning">
            Sin un medio de pago conectado, esta pantalla se ve pero nadie puede completar la
            compra.
          </Alert>
        )
      }
    />
  );
}
