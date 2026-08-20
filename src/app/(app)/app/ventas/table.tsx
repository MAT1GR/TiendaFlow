"use client";

import { useMemo, useState } from "react";

import { Avatar, CellLink, Table, Td, Tr } from "@/components/ui/data";
import { DemoTag } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import {
  Badge,
  Input,
  Tabs,
} from "@/components/ui/primitives";
import { formatDateTime, formatMoney, STATUS_LABEL, statusTone } from "@/lib/utils";

interface Row {
  id: string;
  reference: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  is_demo: number;
  customer_name: string | null;
  customer_email: string | null;
  offer_name: string | null;
  product_name: string | null;
}

export function OrdersTable({ orders }: { orders: Row[] }) {
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      all: orders.length,
      paid: orders.filter((o) => o.status === "paid").length,
      pending: orders.filter((o) => o.status === "pending").length,
      refunded: orders.filter((o) => o.status === "refunded").length,
      failed: orders.filter((o) => o.status === "failed").length,
    }),
    [orders],
  );

  const filtered = orders.filter((order) => {
    if (tab !== "all" && order.status !== tab) return false;
    if (!query) return true;
    const term = query.toLowerCase();
    return (
      order.reference.toLowerCase().includes(term) ||
      (order.customer_name ?? "").toLowerCase().includes(term) ||
      (order.customer_email ?? "").toLowerCase().includes(term)
    );
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 p-4">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "all", label: "Todas", count: counts.all },
            { value: "paid", label: "Pagadas", count: counts.paid },
            { value: "pending", label: "Pendientes", count: counts.pending },
            { value: "refunded", label: "Reembolsadas", count: counts.refunded },
            { value: "failed", label: "Fallidas", count: counts.failed },
          ]}
        />
        <div className="relative w-full sm:w-64">
          <Icon
            name="search"
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por cliente o pedido…"
            className="pl-9"
            aria-label="Buscar venta"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-5 py-10 text-center text-[13.5px] text-ink-500">
          No hay ventas que coincidan con este filtro.
        </p>
      ) : (
        <Table
          columns={[
            { key: "ref", label: "Pedido" },
            { key: "customer", label: "Cliente" },
            { key: "product", label: "Producto" },
            { key: "offer", label: "Oferta" },
            { key: "amount", label: "Importe", align: "right" },
            { key: "status", label: "Estado" },
            { key: "date", label: "Fecha", align: "right" },
          ]}
        >
          {filtered.map((order) => (
            <Tr key={order.id}>
              <Td>
                <span className="flex items-center gap-1.5">
                  <CellLink href={`/app/ventas/${order.id}`}>{order.reference}</CellLink>
                  {order.is_demo ? <DemoTag /> : null}
                </span>
              </Td>
              <Td>
                <span className="flex items-center gap-2.5">
                  <Avatar name={order.customer_name ?? "Anónimo"} size={26} />
                  <span className="min-w-0">
                    <span className="block truncate text-ink-800">
                      {order.customer_name ?? "Sin nombre"}
                    </span>
                    <span className="block truncate text-[11.5px] text-ink-400">
                      {order.customer_email ?? "—"}
                    </span>
                  </span>
                </span>
              </Td>
              <Td>{order.product_name ?? "—"}</Td>
              <Td>{order.offer_name ?? "—"}</Td>
              <Td align="right" className="font-semibold text-ink-900">
                {formatMoney(order.total, order.currency)}
              </Td>
              <Td>
                <Badge tone={statusTone(order.status)}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </Badge>
              </Td>
              <Td align="right" className="text-ink-500">
                {formatDateTime(order.created_at)}
              </Td>
            </Tr>
          ))}
        </Table>
      )}
    </>
  );
}
