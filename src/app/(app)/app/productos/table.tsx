"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  deleteProductAction,
  duplicateProductAction,
  productStatusAction,
} from "@/app/actions/catalog";
import { DemoTag } from "@/components/ui/feedback";
import { CellLink, Table, Td, Tr } from "@/components/ui/data";
import { Icon } from "@/components/ui/icon";
import {
  Badge,
  Button,
  Dropdown,
  Input,
  MenuItem,
  Modal,
  Tabs,
  useToast,
} from "@/components/ui/primitives";
import { formatDate, formatMoney, formatNumber, PRODUCT_TYPE_LABEL, STATUS_LABEL, statusTone } from "@/lib/utils";
import type { Product } from "@/lib/types";

export function ProductsTable({
  products,
  stats,
  currency,
}: {
  products: Product[];
  stats: Record<string, { orders: number; revenue: number }>;
  currency: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const counts = useMemo(
    () => ({
      all: products.length,
      active: products.filter((p) => p.status === "active").length,
      draft: products.filter((p) => p.status === "draft").length,
      archived: products.filter((p) => p.status === "archived").length,
    }),
    [products],
  );

  const filtered = products.filter((product) => {
    if (tab !== "all" && product.status !== tab) return false;
    if (query && !product.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  function runAction(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast.success(result.message ?? "Listo.");
        router.refresh();
      } else {
        toast.error("No pudimos completar la acción", result.error);
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 p-4">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "all", label: "Todos", count: counts.all },
            { value: "active", label: "Activos", count: counts.active },
            { value: "draft", label: "Borradores", count: counts.draft },
            { value: "archived", label: "Archivados", count: counts.archived },
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
            placeholder="Buscar producto…"
            className="pl-9"
            aria-label="Buscar producto"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-5 py-10 text-center text-[13.5px] text-ink-500">
          No hay productos que coincidan con este filtro.
        </p>
      ) : (
        <Table
          columns={[
            { key: "name", label: "Producto" },
            { key: "type", label: "Tipo" },
            { key: "status", label: "Estado" },
            { key: "price", label: "Precio", align: "right" },
            { key: "sales", label: "Ventas", align: "right" },
            { key: "revenue", label: "Facturación", align: "right" },
            { key: "created", label: "Creado", align: "right" },
            { key: "actions", label: "" },
          ]}
        >
          {filtered.map((product) => {
            const stat = stats[product.id];
            return (
              <Tr key={product.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-lg text-white"
                      style={{ background: "linear-gradient(135deg,#6D5DFB,#22D3EE)" }}
                      aria-hidden="true"
                    >
                      <Icon name="file" size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <CellLink href={`/app/productos/${product.id}`}>{product.name}</CellLink>
                        {product.is_demo ? <DemoTag /> : null}
                      </span>
                      {product.subtitle ? (
                        <span className="block max-w-xs truncate text-[12px] text-ink-500">
                          {product.subtitle}
                        </span>
                      ) : null}
                    </span>
                  </div>
                </Td>
                <Td>{PRODUCT_TYPE_LABEL[product.type] ?? product.type}</Td>
                <Td>
                  <Badge tone={statusTone(product.status)}>
                    {STATUS_LABEL[product.status] ?? product.status}
                  </Badge>
                </Td>
                <Td align="right">{formatMoney(product.base_price, product.currency)}</Td>
                <Td align="right">{formatNumber(stat?.orders ?? 0)}</Td>
                <Td align="right" className="font-medium text-ink-900">
                  {formatMoney(stat?.revenue ?? 0, currency, true)}
                </Td>
                <Td align="right" className="text-ink-500">
                  {formatDate(product.created_at)}
                </Td>
                <Td>
                  <div className="flex justify-end">
                    <Dropdown
                      trigger={() => (
                        <span className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700">
                          <Icon name="grip" size={16} />
                        </span>
                      )}
                    >
                      {(close) => (
                        <>
                          <MenuItem icon="edit" href={`/app/productos/${product.id}`}>
                            Editar
                          </MenuItem>
                          <MenuItem
                            icon="copy"
                            onClick={() => {
                              close();
                              runAction(() => duplicateProductAction(product.id));
                            }}
                          >
                            Duplicar
                          </MenuItem>
                          <MenuItem icon="eye" href={`/app/productos/${product.id}?vista=preview`}>
                            Previsualizar
                          </MenuItem>
                          <MenuItem
                            icon="archive"
                            onClick={() => {
                              close();
                              runAction(() =>
                                productStatusAction(
                                  product.id,
                                  product.status === "archived" ? "draft" : "archived",
                                ),
                              );
                            }}
                          >
                            {product.status === "archived" ? "Desarchivar" : "Archivar"}
                          </MenuItem>
                          <MenuItem
                            icon="trash"
                            tone="danger"
                            onClick={() => {
                              close();
                              setToDelete(product);
                            }}
                          >
                            Eliminar
                          </MenuItem>
                        </>
                      )}
                    </Dropdown>
                  </div>
                </Td>
              </Tr>
            );
          })}
        </Table>
      )}

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Eliminar producto"
        description="Esta acción no se puede deshacer."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => {
                const target = toDelete;
                setToDelete(null);
                if (target) runAction(() => deleteProductAction(target.id));
              }}
            >
              Sí, eliminar
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-ink-600">
          Vas a eliminar <strong className="text-ink-900">{toDelete?.name}</strong>. Las ofertas y
          funnels que lo usen van a quedar sin producto asociado.
        </p>
        <p className="mt-3 text-[13.5px] text-ink-500">
          Si solo querés sacarlo de la vista, mejor archivalo:{" "}
          <Link href="#" className="font-medium text-brand-700">
            cerrá este diálogo
          </Link>{" "}
          y elegí “Archivar”.
        </p>
      </Modal>
    </>
  );
}
