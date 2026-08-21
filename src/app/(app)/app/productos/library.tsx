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
import { Icon } from "@/components/ui/icon";
import { Button, Dropdown, MenuItem, Modal, useToast } from "@/components/ui/primitives";
import type { LibraryStatus, ProductCard } from "@/lib/product-workspace";
import { cn, formatMoney, formatNumber } from "@/lib/utils";

/**
 * La biblioteca de productos.
 *
 * No es una tabla. Una tabla te hace leer siete columnas para responder la
 * única pregunta que traés: *¿este producto ya se puede vender, y si no, qué le
 * falta?*. La tarjeta responde eso en la primera línea de color y te da el
 * botón para seguir justo abajo.
 */

const FILTERS: Array<{ value: "todos" | LibraryStatus; label: string; dot: string }> = [
  { value: "todos", label: "Todos", dot: "" },
  { value: "listo", label: "Activos", dot: "🟢" },
  { value: "preparacion", label: "En preparación", dot: "🟡" },
  { value: "borrador", label: "Borradores", dot: "⚪" },
];

export function ProductLibrary({ products }: { products: ProductCard[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"todos" | LibraryStatus>("todos");
  const [toDelete, setToDelete] = useState<ProductCard | null>(null);

  const counts = useMemo(
    () => ({
      todos: products.length,
      listo: products.filter((product) => product.status === "listo").length,
      preparacion: products.filter((product) => product.status === "preparacion").length,
      borrador: products.filter((product) => product.status === "borrador").length,
    }),
    [products],
  );

  const visible = filter === "todos" ? products : products.filter((p) => p.status === filter);

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
      <div className="tf-scroll -mx-1 overflow-x-auto px-1">
        <div className="inline-flex min-w-full gap-1.5">
          {FILTERS.map((item) => {
            const active = filter === item.value;
            const count = counts[item.value];
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-1.5 text-[13px] font-medium transition-colors",
                  active
                    ? "border-brand-200 bg-brand-50 text-brand-700"
                    : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50",
                )}
              >
                {item.dot ? (
                  <span className="tf-emoji !text-[11px]" aria-hidden="true">
                    {item.dot}
                  </span>
                ) : null}
                {item.label}
                <span className={cn("tabular-nums", active ? "text-brand-500" : "text-ink-400")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink-200 px-5 py-12 text-center text-[13.5px] text-ink-500">
          No tenés productos en este estado.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((product, index) => (
            <li
              key={product.id}
              className="tf-enter"
              style={{ "--tf-delay": `${Math.min(index, 8) * 40}ms` } as React.CSSProperties}
            >
              <Card
                product={product}
                onDelete={() => setToDelete(product)}
                onDuplicate={() => runAction(() => duplicateProductAction(product.id))}
                onArchive={() => runAction(() => productStatusAction(product.id, "archived"))}
              />
            </li>
          ))}
        </ul>
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
          Vas a eliminar <strong className="text-ink-900">{toDelete?.name}</strong>, con su precio y
          su página de venta.
        </p>
        <p className="mt-3 text-[13.5px] text-ink-500">
          Si solo querés sacarlo de la lista, cerrá este diálogo y elegí “Archivar”: así lo podés
          recuperar más adelante.
        </p>
      </Modal>
    </>
  );
}

/* -------------------------------------------------------------------------- */

const STATUS_STYLE: Record<LibraryStatus, { dot: string; text: string }> = {
  listo: { dot: "bg-accent-500", text: "text-accent-700" },
  preparacion: { dot: "bg-amber-400", text: "text-amber-700" },
  borrador: { dot: "bg-ink-300", text: "text-ink-500" },
};

function Card({
  product,
  onDelete,
  onDuplicate,
  onArchive,
}: {
  product: ProductCard;
  onDelete: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
}) {
  const style = STATUS_STYLE[product.status];
  const sold = product.orders > 0;

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-5 transition-all duration-200 hover:border-ink-300 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <span
          className="tf-emoji !inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-ink-100 !text-[24px]"
          aria-hidden="true"
        >
          {product.emoji}
        </span>

        <Dropdown
          trigger={() => (
            <span className="grid size-8 place-items-center rounded-lg text-ink-300 transition-colors hover:bg-ink-100 hover:text-ink-700">
              <Icon name="grip" size={16} />
            </span>
          )}
        >
          {(close) => (
            <>
              <MenuItem icon="eye" href={product.href}>
                Abrir
              </MenuItem>
              <MenuItem
                icon="copy"
                onClick={() => {
                  close();
                  onDuplicate();
                }}
              >
                Duplicar
              </MenuItem>
              <MenuItem
                icon="archive"
                onClick={() => {
                  close();
                  onArchive();
                }}
              >
                Archivar
              </MenuItem>
              <MenuItem
                icon="trash"
                tone="danger"
                onClick={() => {
                  close();
                  onDelete();
                }}
              >
                Eliminar
              </MenuItem>
            </>
          )}
        </Dropdown>
      </div>

      <h3 className="mt-3.5 flex items-center gap-2 text-[16px] font-semibold leading-snug tracking-tight text-ink-900">
        <Link href={product.href} className="min-w-0 hover:text-brand-700">
          {product.name}
        </Link>
        {product.isDemo ? <DemoTag /> : null}
      </h3>

      <p className="mt-1 text-[13px] text-ink-500">
        {product.typeLabel}
        {product.price > 0 ? ` · ${formatMoney(product.price, product.currency)}` : ""}
      </p>

      <p className={cn("mt-3 flex items-center gap-2 text-[13px] font-medium", style.text)}>
        <span className={cn("size-2 shrink-0 rounded-full", style.dot)} aria-hidden="true" />
        {product.statusLabel}
      </p>

      {sold ? (
        <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-ink-100 pt-3.5 text-[13px]">
          <div className="flex items-center gap-1.5">
            <dt className="tf-emoji" aria-hidden="true">
              🛒
            </dt>
            <dd className="text-ink-600">
              {formatNumber(product.orders)} {product.orders === 1 ? "venta" : "ventas"}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="tf-emoji" aria-hidden="true">
              💰
            </dt>
            <dd className="font-medium text-ink-900 tabular-nums">
              {formatMoney(product.revenue, product.currency, true)}
            </dd>
          </div>
        </dl>
      ) : null}

      <Link
        href={product.href}
        className={cn(
          "mt-auto flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-colors",
          sold ? "mt-4" : "mt-5",
          product.status === "listo"
            ? "border border-ink-200 text-ink-700 hover:bg-ink-100"
            : "bg-brand-600 text-white hover:bg-brand-700",
        )}
      >
        {product.ctaLabel}
        <Icon name="arrowRight" size={15} />
      </Link>
    </article>
  );
}
