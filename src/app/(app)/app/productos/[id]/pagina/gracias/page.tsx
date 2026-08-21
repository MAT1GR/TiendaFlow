import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ExperienceScreen, type Palanca } from "@/components/app/experience-screen";
import { Alert } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { requireSession } from "@/lib/auth";
import { productContext } from "@/lib/product-workspace";
import { listBonuses, listProductFiles, listUpsells } from "@/lib/repo";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Página de gracias" };

/**
 * La pantalla que ve el cliente cuando la compra terminó.
 *
 * Acá la vista previa sí es una reconstrucción y no el componente real: la
 * página pública necesita un pedido pagado para existir, y fabricar un pedido
 * falso para poder dibujar una vista previa sería peor que dibujarla. Lo que
 * se ve son los datos reales del producto —el mensaje de entrega, los archivos,
 * los bonos— dentro de la estructura de la página de verdad.
 */
export default async function GraciasTab({ params }: { params: Promise<{ id: string }> }) {
  const { workspace } = await requireSession();
  const { id } = await params;

  const context = productContext(workspace.id, id);
  if (!context) notFound();

  const { product, offer } = context;
  const base = `/app/productos/${id}`;

  const files = listProductFiles(workspace.id, id);
  const bonuses = offer ? listBonuses(workspace.id, offer.id) : [];
  const upsells = offer ? listUpsells(workspace.id, offer.id).filter((up) => up.active) : [];

  const mensaje =
    product.delivery_message?.trim() ||
    "Abajo tenés todo lo que compraste. También te lo mandamos por email.";

  const palancas: Palanca[] = [
    {
      emoji: "💬",
      label: "Mensaje de entrega",
      valor: product.delivery_message?.trim() || "Está el texto por defecto de TiendaFlow",
      href: `${base}/producto`,
      pendiente: !product.delivery_message?.trim(),
    },
    {
      emoji: "📎",
      label: "Lo que recibe al comprar",
      valor: files.length
        ? `${files.length} ${files.length === 1 ? "archivo" : "archivos"} registrados`
        : "Todavía no cargaste ningún archivo",
      href: `${base}/producto`,
      pendiente: files.length === 0,
    },
    {
      emoji: "🎁",
      label: "Oferta después de comprar",
      valor: upsells.length
        ? upsells.map((up) => up.name).join(" · ")
        : "Ninguna. Es la venta más barata que vas a hacer.",
      href: `${base}/despues`,
    },
    {
      emoji: "🎀",
      label: "Bonos incluidos",
      valor: bonuses.length ? `${bonuses.length} bonos` : "Ninguno cargado",
      href: `${base}/oferta`,
    },
  ];

  return (
    <ExperienceScreen
      productId={id}
      step="gracias"
      preview={
        <div className="px-5 py-8 sm:px-8">
          <div className="grid size-12 place-items-center rounded-2xl bg-accent-600 text-white">
            <Icon name="check" size={24} />
          </div>

          <h1 className="mt-4 text-[26px] font-semibold leading-tight tracking-tight text-ink-900">
            ¡Listo! Ya es tuyo
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{mensaje}</p>

          <div className="mt-6 rounded-3xl border border-ink-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12.5px] font-semibold uppercase tracking-wider text-ink-400">
                Pedido TF-0001
              </p>
              <span className="rounded-full bg-accent-50 px-2.5 py-1 text-[11.5px] font-semibold text-accent-700">
                Pagado
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-[14px]">
              <span className="min-w-0 truncate text-ink-700">{product.name}</span>
              <span className="shrink-0 font-medium text-ink-900">
                {offer ? formatMoney(offer.price, offer.currency) : "—"}
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between border-t border-ink-200 pt-4">
              <span className="text-[15px] font-semibold text-ink-900">Total</span>
              <span className="text-[19px] font-semibold tracking-tight text-ink-900">
                {offer ? formatMoney(offer.price, offer.currency) : "—"}
              </span>
            </div>
          </div>

          <section className="mt-6">
            <h2 className="text-[16px] font-semibold text-ink-900">Tu acceso</h2>
            {files.length ? (
              <ul className="mt-3 flex flex-col gap-2">
                {files.slice(0, 3).map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center gap-3 rounded-2xl border border-ink-200 px-4 py-3"
                  >
                    <Icon name="file" size={17} className="shrink-0 text-ink-400" />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink-800">
                      {file.file_name}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-2xl border border-dashed border-ink-300 px-4 py-5 text-center text-[13.5px] text-ink-500">
                Acá van los archivos que recibe tu cliente. Todavía no cargaste ninguno.
              </p>
            )}
          </section>

          {bonuses.length ? (
            <section className="mt-6">
              <h2 className="text-[16px] font-semibold text-ink-900">Tus bonos</h2>
              <ul className="mt-3 grid gap-2">
                {bonuses.slice(0, 3).map((bonus) => (
                  <li
                    key={bonus.id}
                    className="flex items-start gap-3 rounded-2xl border border-ink-200 p-3.5"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-accent-50 text-accent-700">
                      <Icon name="gift" size={16} />
                    </span>
                    <p className="text-[13.5px] font-semibold text-ink-900">{bonus.name}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {upsells.length ? (
            <section className="mt-6 rounded-3xl border border-brand-200 bg-brand-50/50 p-5">
              <p className="text-[12.5px] font-semibold uppercase tracking-wider text-brand-700">
                Antes de irte
              </p>
              <p className="mt-1.5 text-[15px] font-semibold text-ink-900">{upsells[0].name}</p>
              {upsells[0].headline ? (
                <p className="mt-1 text-[13.5px] text-ink-600">{upsells[0].headline}</p>
              ) : null}
            </section>
          ) : null}
        </div>
      }
      palancas={palancas}
      nota={
        files.length ? null : (
          <Alert tone="warning">
            Sin archivos cargados, tu cliente paga y no recibe nada. Cargalos en Mi producto antes
            de publicar.
          </Alert>
        )
      }
    />
  );
}
