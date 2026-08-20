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
import { formatDate, formatMoney, formatNumber, STATUS_LABEL, statusTone } from "@/lib/utils";
import type { Customer } from "@/lib/types";

export function CustomersTable({
  customers,
  currency,
}: {
  customers: Customer[];
  currency: string;
}) {
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      all: customers.length,
      new: customers.filter((c) => c.status === "new").length,
      active: customers.filter((c) => c.status === "active").length,
      returning: customers.filter((c) => c.status === "returning").length,
      high_value: customers.filter((c) => c.status === "high_value").length,
    }),
    [customers],
  );

  const filtered = customers.filter((customer) => {
    if (tab !== "all" && customer.status !== tab) return false;
    if (!query) return true;
    const term = query.toLowerCase();
    return (
      customer.full_name.toLowerCase().includes(term) ||
      customer.email.toLowerCase().includes(term)
    );
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 p-4">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "all", label: "Todos", count: counts.all },
            { value: "new", label: "Nuevos", count: counts.new },
            { value: "active", label: "Activos", count: counts.active },
            { value: "returning", label: "Recurrentes", count: counts.returning },
            { value: "high_value", label: "Alto valor", count: counts.high_value },
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
            placeholder="Buscar cliente…"
            className="pl-9"
            aria-label="Buscar cliente"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-5 py-10 text-center text-[13.5px] text-ink-500">
          No hay clientes que coincidan con este filtro.
        </p>
      ) : (
        <Table
          columns={[
            { key: "name", label: "Cliente" },
            { key: "status", label: "Estado" },
            { key: "orders", label: "Compras", align: "right" },
            { key: "spent", label: "Total gastado", align: "right" },
            { key: "last", label: "Última compra", align: "right" },
          ]}
        >
          {filtered.map((customer) => (
            <Tr key={customer.id}>
              <Td>
                <span className="flex items-center gap-2.5">
                  <Avatar name={customer.full_name} size={30} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <CellLink href={`/app/clientes/${customer.id}`}>{customer.full_name}</CellLink>
                      {customer.is_demo ? <DemoTag /> : null}
                    </span>
                    <span className="block truncate text-[11.5px] text-ink-400">
                      {customer.email}
                    </span>
                  </span>
                </span>
              </Td>
              <Td>
                <Badge tone={statusTone(customer.status)}>
                  {STATUS_LABEL[customer.status] ?? customer.status}
                </Badge>
              </Td>
              <Td align="right">{formatNumber(customer.orders_count)}</Td>
              <Td align="right" className="font-semibold text-ink-900">
                {formatMoney(customer.total_spent, currency)}
              </Td>
              <Td align="right" className="text-ink-500">
                {customer.last_purchase_at ? formatDate(customer.last_purchase_at) : "—"}
              </Td>
            </Tr>
          ))}
        </Table>
      )}
    </>
  );
}
