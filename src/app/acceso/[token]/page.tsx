import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Icon, Logo } from "@/components/ui/icon";
import { get } from "@/lib/db";
import { getCustomer, listOrderItems, listProductFiles } from "@/lib/repo";
import { formatDate, formatMoney } from "@/lib/utils";
import type { Order } from "@/lib/types";

export const metadata: Metadata = {
  title: "Tu acceso",
  robots: { index: false, follow: false },
};

/**
 * Página de acceso del cliente.
 *
 * Se autentica con el token de la orden (no hay cuenta de cliente todavía).
 * Solo muestra contenido si la orden está pagada.
 */
export default async function AccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const order = get<Order>(`SELECT * FROM orders WHERE access_token = ?`, token);
  if (!order) notFound();

  const items = listOrderItems(order.workspace_id, order.id);
  const customer = order.customer_id ? getCustomer(order.workspace_id, order.customer_id) : null;
  const files = items
    .filter((item) => item.product_id)
    .flatMap((item) => listProductFiles(order.workspace_id, item.product_id!));

  const paid = order.status === "paid";

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12">
      <div className="flex items-center gap-2.5">
        <Logo size={28} />
        <span className="text-[15px] font-semibold tracking-tight text-ink-900">TiendaFlow</span>
      </div>

      <h1 className="mt-8 text-[28px] font-semibold leading-tight tracking-tight text-ink-900">
        {paid ? `Hola${customer ? `, ${customer.full_name.split(" ")[0]}` : ""}` : "Pedido pendiente"}
      </h1>
      <p className="mt-2 text-[15px] text-ink-600">
        {paid
          ? "Acá tenés todo lo que compraste."
          : "Todavía no confirmamos el pago de este pedido, así que no podemos darte el acceso."}
      </p>

      <div className="mt-8 rounded-3xl border border-ink-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-ink-400">
            Pedido {order.reference}
          </p>
          <span className="text-[12.5px] text-ink-500">{formatDate(order.created_at)}</span>
        </div>

        <ul className="mt-4 flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 text-[14px]">
              <span className="min-w-0 truncate text-ink-700">{item.name}</span>
              <span className="shrink-0 font-medium text-ink-900">
                {formatMoney(item.unit_price, order.currency)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-baseline justify-between border-t border-ink-200 pt-4">
          <span className="text-[15px] font-semibold text-ink-900">Total</span>
          <span className="text-[19px] font-semibold text-ink-900">
            {formatMoney(order.total, order.currency)}
          </span>
        </div>
      </div>

      {paid ? (
        <section className="mt-6">
          <h2 className="text-[17px] font-semibold text-ink-900">Descargas</h2>
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
                    No disponible
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[14px] text-ink-500">
              Todavía no hay archivos cargados para este pedido.
            </p>
          )}

          <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-800">
            El almacenamiento de archivos de esta tienda todavía no está conectado, así que la
            descarga directa no está habilitada. Escribile al vendedor y te lo envía por email.
          </p>
        </section>
      ) : null}
    </main>
  );
}
