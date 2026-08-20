import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Avatar, PageHeader } from "@/components/ui/data";
import { DemoTag } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import {
  Badge,
  Card,
  CardHeader,
} from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import {
  getCustomer,
  getFunnel,
  getOffer,
  getOrder,
  listOrderItems,
  listPayments,
} from "@/lib/repo";
import { formatDateTime, formatMoney, STATUS_LABEL, statusTone } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { workspace } = await requireSession();
  const { id } = await params;
  const order = getOrder(workspace.id, id);
  return { title: order ? `Pedido ${order.reference}` : "Pedido" };
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { workspace } = await requireSession();
  const { id } = await params;

  const order = getOrder(workspace.id, id);
  if (!order) notFound();

  const items = listOrderItems(workspace.id, order.id);
  const payments = listPayments(workspace.id, order.id);
  const customer = order.customer_id ? getCustomer(workspace.id, order.customer_id) : null;
  const offer = order.offer_id ? getOffer(workspace.id, order.offer_id) : null;
  const funnel = order.funnel_id ? getFunnel(workspace.id, order.funnel_id) : null;

  const utm = [
    ["utm_source", order.utm_source],
    ["utm_medium", order.utm_medium],
    ["utm_campaign", order.utm_campaign],
    ["utm_content", order.utm_content],
    ["utm_term", order.utm_term],
  ].filter(([, value]) => Boolean(value)) as Array<[string, string]>;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Pedido ${order.reference}`}
        subtitle={formatDateTime(order.created_at)}
        breadcrumb={[{ label: "Ventas", href: "/app/ventas" }, { label: order.reference }]}
        actions={
          <span className="flex items-center gap-2">
            {order.is_demo ? <DemoTag /> : null}
            <Badge tone={statusTone(order.status)} dot>
              {STATUS_LABEL[order.status] ?? order.status}
            </Badge>
          </span>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Detalle del pedido" />
            <div className="p-5 pt-4">
              <ul className="flex flex-col gap-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 px-4 py-3"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-ink-900">
                        {item.name}
                      </span>
                      <span className="text-[11.5px] uppercase tracking-wide text-ink-400">
                        {item.kind === "main"
                          ? "Producto principal"
                          : item.kind === "bump"
                            ? "Order bump"
                            : item.kind === "upsell"
                              ? "Upsell"
                              : item.kind === "downsell"
                                ? "Downsell"
                                : "Bono"}
                      </span>
                    </span>
                    <span className="shrink-0 text-[14px] font-semibold text-ink-900">
                      {formatMoney(item.unit_price * item.quantity, order.currency)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-4 flex flex-col gap-2 border-t border-ink-100 pt-4 text-[13.5px]">
                <Row label="Subtotal" value={formatMoney(order.subtotal, order.currency)} />
                {order.bump_total > 0 ? (
                  <Row label="Order bump" value={formatMoney(order.bump_total, order.currency)} />
                ) : null}
                {order.upsell_total > 0 ? (
                  <Row label="Upsells" value={formatMoney(order.upsell_total, order.currency)} />
                ) : null}
                <div className="flex items-baseline justify-between border-t border-ink-200 pt-2">
                  <dt className="text-[15px] font-semibold text-ink-900">Total</dt>
                  <dd className="text-[19px] font-semibold text-ink-900">
                    {formatMoney(order.total, order.currency)}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card>
            <CardHeader title="Pagos" subtitle="Movimientos registrados para este pedido" />
            <div className="p-5 pt-4">
              {payments.length === 0 ? (
                <p className="text-[13.5px] text-ink-500">
                  Todavía no hay movimientos de pago registrados. Si el pedido está pendiente, no se
                  cobró nada.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {payments.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 px-4 py-3"
                    >
                      <span>
                        <span className="block text-[13.5px] font-medium text-ink-900">
                          {payment.provider}
                        </span>
                        <span className="text-[11.5px] text-ink-400">
                          {formatDateTime(payment.created_at)}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <Badge tone={payment.status === "approved" ? "success" : "neutral"}>
                          {payment.status}
                        </Badge>
                        <span className="text-[13.5px] font-semibold text-ink-900">
                          {formatMoney(payment.amount, payment.currency)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Datos de campaña" subtitle="Atribución guardada con la orden" />
            <div className="p-5 pt-4">
              {utm.length === 0 ? (
                <p className="text-[13.5px] text-ink-500">
                  Esta venta no trae parámetros UTM: llegó de tráfico directo o el link no los tenía.
                </p>
              ) : (
                <dl className="grid gap-2 sm:grid-cols-2">
                  {utm.map(([key, value]) => (
                    <div key={key} className="rounded-xl bg-ink-50 px-3.5 py-2.5">
                      <dt className="text-[11px] uppercase tracking-wide text-ink-400">{key}</dt>
                      <dd className="mt-0.5 truncate text-[13.5px] font-medium text-ink-900">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </Card>
        </div>

        <aside className="flex flex-col gap-5">
          <Card className="p-5">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">Cliente</p>
            {customer ? (
              <Link
                href={`/app/clientes/${customer.id}`}
                className="mt-3 flex items-center gap-3 rounded-xl p-2 -m-2 transition-colors hover:bg-ink-50"
              >
                <Avatar name={customer.full_name} size={40} />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-ink-900">
                    {customer.full_name}
                  </span>
                  <span className="block truncate text-[12.5px] text-ink-500">{customer.email}</span>
                </span>
                <Icon name="chevronRight" size={16} className="ml-auto shrink-0 text-ink-300" />
              </Link>
            ) : (
              <p className="mt-3 text-[13.5px] text-ink-500">Sin cliente asociado.</p>
            )}
          </Card>

          <Card className="p-5">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">
              Origen de la venta
            </p>
            <dl className="mt-3 flex flex-col gap-2.5 text-[13px]">
              <Row
                label="Oferta"
                value={
                  offer ? (
                    <Link href={`/app/ofertas/${offer.id}`} className="text-brand-700 hover:underline">
                      {offer.name}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <Row
                label="Funnel"
                value={
                  funnel ? (
                    <Link href={`/app/funnels/${funnel.id}`} className="text-brand-700 hover:underline">
                      {funnel.name}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <Row label="Moneda" value={order.currency} />
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-right font-medium text-ink-900">{value}</dd>
    </div>
  );
}
