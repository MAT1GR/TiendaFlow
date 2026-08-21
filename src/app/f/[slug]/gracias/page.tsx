import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ThankYouActions } from "@/app/f/[slug]/gracias/actions";
import { MetaPixel } from "@/components/public/meta-pixel";
import { VisitTracker } from "@/components/public/visit-tracker";
import { Icon } from "@/components/ui/icon";
import { getMetaPublicConfig } from "@/lib/integrations/meta";
import { activeProvider } from "@/lib/integrations/payments";
import { tiendaActual } from "@/lib/public-url";
import {
  resolvePublicFunnel,
  getOffer,
  getOrder,
  getProduct,
  listBonuses,
  listOrderItems,
  listProductFiles,
} from "@/lib/repo";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = {
  title: "¡Gracias por tu compra!",
  robots: { index: false, follow: false },
};

export default async function ThankYouPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pedido?: string; t?: string }>;
}) {
  const { slug } = await params;
  const { pedido, t } = await searchParams;

  const funnel = resolvePublicFunnel(slug, await tiendaActual());
  if (!funnel) notFound();

  const order = pedido ? getOrder(funnel.workspace_id, pedido) : null;
  if (!order || order.access_token !== t) notFound();

  const items = listOrderItems(funnel.workspace_id, order.id);
  const offer = order.offer_id ? getOffer(funnel.workspace_id, order.offer_id) : null;
  const bonuses = offer ? listBonuses(funnel.workspace_id, offer.id) : [];
  const mainProduct = items.find((item) => item.kind === "main")?.product_id
    ? getProduct(funnel.workspace_id, items.find((item) => item.kind === "main")!.product_id!)
    : null;

  const files = items
    .filter((item) => item.product_id)
    .flatMap((item) => listProductFiles(funnel.workspace_id, item.product_id!));

  const paid = order.status === "paid";
  const hasProvider = Boolean(activeProvider(funnel.workspace_id));
  const pixel = getMetaPublicConfig(funnel.workspace_id);

  return (
    <>
      {pixel && paid ? (
        <MetaPixel
          pixelId={pixel.pixelId}
          events={["Purchase"]}
          value={order.total}
          currency={order.currency}
          eventId={order.id}
        />
      ) : pixel ? (
        <MetaPixel pixelId={pixel.pixelId} events={["PageView"]} />
      ) : null}
      <VisitTracker slug={slug} stepType="thankyou" />

      <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:py-16">
        <div
          className={
            paid
              ? "grid size-14 place-items-center rounded-2xl bg-accent-600 text-white"
              : "grid size-14 place-items-center rounded-2xl bg-amber-500 text-white"
          }
        >
          <Icon name={paid ? "check" : "clock"} size={26} />
        </div>

        <h1 className="mt-5 text-[30px] font-semibold leading-tight tracking-tight text-ink-900 sm:text-[38px]">
          {paid ? "¡Listo! Ya es tuyo" : "Tu pedido quedó registrado"}
        </h1>

        <p className="mt-3 text-[16px] leading-relaxed text-ink-600">
          {paid
            ? mainProduct?.delivery_message ??
              "Abajo tenés todo lo que compraste. También te lo mandamos por email."
            : "Todavía no confirmamos el pago, así que no podemos darte el acceso. Apenas se acredite te avisamos."}
        </p>

        <div className="mt-8 rounded-3xl border border-ink-200 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-semibold uppercase tracking-wider text-ink-400">
              Pedido {order.reference}
            </p>
            <span
              className={
                paid
                  ? "rounded-full bg-accent-50 px-2.5 py-1 text-[11.5px] font-semibold text-accent-700"
                  : "rounded-full bg-amber-50 px-2.5 py-1 text-[11.5px] font-semibold text-amber-700"
              }
            >
              {paid ? "Pagado" : "Pendiente de pago"}
            </span>
          </div>

          <ul className="mt-4 flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-[14px]">
                <span className="min-w-0 truncate text-ink-700">
                  {item.name}
                  {item.kind !== "main" ? (
                    <span className="ml-1.5 text-[11.5px] uppercase text-ink-400">{item.kind}</span>
                  ) : null}
                </span>
                <span className="shrink-0 font-medium text-ink-900">
                  {formatMoney(item.unit_price, order.currency)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-baseline justify-between border-t border-ink-200 pt-4">
            <span className="text-[15px] font-semibold text-ink-900">Total</span>
            <span className="text-[20px] font-semibold tracking-tight text-ink-900">
              {formatMoney(order.total, order.currency)}
            </span>
          </div>
        </div>

        {paid ? (
          <section className="mt-6">
            <h2 className="text-[17px] font-semibold text-ink-900">Tu acceso</h2>
            {files.length ? (
              <ul className="mt-3 flex flex-col gap-2">
                {files.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white px-4 py-3"
                  >
                    <Icon name="file" size={18} className="shrink-0 text-ink-400" />
                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink-800">
                      {file.file_name}
                    </span>
                    <span className="shrink-0 rounded-lg bg-ink-100 px-2.5 py-1 text-[11.5px] font-medium text-ink-500">
                      Pendiente de storage
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[14px] text-ink-500">
                El vendedor todavía no cargó archivos para este producto.
              </p>
            )}

            <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
              El almacenamiento de archivos todavía no está conectado en esta tienda, así que la
              descarga directa no está disponible. El vendedor va a contactarte por email.
            </p>

            <a
              href={`/acceso/${order.access_token}`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ink-900 px-4 py-2.5 text-[14px] font-semibold text-white"
            >
              Ir a mi página de acceso
              <Icon name="arrowRight" size={16} />
            </a>
          </section>
        ) : (
          <ThankYouActions
            slug={slug}
            orderId={order.id}
            token={order.access_token ?? ""}
            hasProvider={hasProvider}
          />
        )}

        {bonuses.length && paid ? (
          <section className="mt-8">
            <h2 className="text-[17px] font-semibold text-ink-900">Tus bonos</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {bonuses.map((bonus) => (
                <li
                  key={bonus.id}
                  className="flex items-start gap-3 rounded-2xl border border-ink-200 bg-white p-4"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-50 text-accent-700">
                    <Icon name="gift" size={17} />
                  </span>
                  <div>
                    <p className="text-[14px] font-semibold text-ink-900">{bonus.name}</p>
                    {bonus.description ? (
                      <p className="mt-0.5 text-[12.5px] text-ink-600">{bonus.description}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </>
  );
}
