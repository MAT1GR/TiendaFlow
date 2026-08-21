"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Icon, Logo } from "@/components/ui/icon";
import { NAV_GROUPS } from "@/components/shell/nav";
import { PRODUCT_SECTIONS, STAGE_LABEL, type ProductNavEntry } from "@/lib/product-nav";
import { cn } from "@/lib/utils";

export function Sidebar({
  workspaceName,
  plan,
  products,
  open,
  onClose,
}: {
  workspaceName: string;
  plan: string;
  products: ProductNavEntry[];
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Producto sobre el que se está trabajando, sacado de la URL.
  const activeId = pathname.startsWith("/app/productos/")
    ? (pathname.split("/")[3] ?? null)
    : null;
  const activeProduct =
    activeId && activeId !== "nuevo"
      ? (products.find((product) => product.id === activeId) ?? null)
      : null;

  useEffect(() => {
    const stored = window.localStorage.getItem("tf-sidebar-collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    onClose();
    setSwitcherOpen(false);
    // Cerramos el panel móvil y el selector al navegar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((value) => {
      window.localStorage.setItem("tf-sidebar-collapsed", value ? "0" : "1");
      return !value;
    });
  }

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r border-ink-200 bg-white transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0",
          collapsed ? "w-[72px]" : "w-[248px]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Navegación principal"
      >
        <div className="flex h-14 items-center justify-between gap-2 px-4">
          <Link
            href="/app"
            className="flex min-w-0 items-center gap-2.5"
            aria-label="TiendaFlow — ir al panel"
          >
            <Logo size={30} />
            {!collapsed ? (
              <span className="truncate text-[15px] font-semibold tracking-tight text-ink-900">
                TiendaFlow
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 lg:hidden"
            aria-label="Cerrar menú"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Selector de producto: mientras estás adentro de uno, el sidebar
            entero pasa a hablar de ese producto y no perdés el contexto.
            Es también la única puerta a la biblioteca —"Mis productos" ya no
            está en el menú—, así que se muestra aunque no haya ninguno: sin
            productos, lleva derecho a crear el primero. */}
        {!collapsed && products.length === 0 ? (
          <Link
            href="/app/productos/nuevo"
            className="mx-3 mb-3 flex items-center gap-2.5 rounded-xl border border-dashed border-brand-300 bg-brand-50/60 px-3 py-2.5 text-left transition-colors hover:bg-brand-50"
          >
            <span className="tf-emoji" aria-hidden="true">
              📦
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-brand-700">
                Crear mi primer producto
              </span>
              <span className="block truncate text-[11.5px] text-ink-500">
                Es por donde empieza todo
              </span>
            </span>
            <Icon name="plus" size={15} className="shrink-0 text-brand-600" />
          </Link>
        ) : null}

        {/* Plegado no entra el selector, pero la puerta a los productos no
            puede desaparecer: queda el ícono. */}
        {collapsed ? (
          <Link
            href="/app/productos"
            title="Mis productos"
            className="mx-3 mb-3 grid h-10 place-items-center rounded-xl border border-ink-200 bg-ink-50/70 transition-colors hover:bg-ink-100"
          >
            <span className="tf-emoji" aria-hidden="true">
              📦
            </span>
          </Link>
        ) : null}

        {!collapsed && products.length > 0 ? (
          <div className="relative mx-3 mb-3">
            <button
              type="button"
              onClick={() => setSwitcherOpen((value) => !value)}
              aria-expanded={switcherOpen}
              className="flex w-full items-center gap-2.5 rounded-xl border border-ink-200 bg-ink-50/70 px-3 py-2.5 text-left transition-colors hover:bg-ink-100"
            >
              <span className="tf-emoji" aria-hidden="true">
                📦
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink-900">
                  {activeProduct ? activeProduct.name : "Elegí un producto"}
                </span>
                <span className="block truncate text-[11.5px] text-ink-500">
                  {activeProduct
                    ? STAGE_LABEL[activeProduct.stage]
                    : `${products.length} ${products.length === 1 ? "producto" : "productos"}`}
                </span>
              </span>
              <Icon name="chevronDown" size={15} className="shrink-0 text-ink-400" />
            </button>

            {switcherOpen ? (
              <div className="tf-rise absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-72 overflow-y-auto rounded-xl border border-ink-200 bg-white p-1.5 shadow-[0_20px_40px_-18px_rgba(15,23,42,.35)]">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/app/productos/${product.id}`}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-ink-100",
                      product.id === activeId && "bg-brand-50",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink-900">
                        {product.name}
                      </span>
                      <span className="block truncate text-[11.5px] text-ink-500">
                        {STAGE_LABEL[product.stage]}
                      </span>
                    </span>
                    {product.id === activeId ? (
                      <Icon name="check" size={14} className="shrink-0 text-brand-600" />
                    ) : null}
                  </Link>
                ))}
                <div className="mt-1 flex flex-col border-t border-ink-100 pt-1">
                  <Link
                    href="/app/productos/nuevo"
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    <Icon name="plus" size={14} className="text-brand-600" />
                    Crear producto
                  </Link>
                  <Link
                    href="/app/productos"
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] font-medium text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                  >
                    <Icon name="grip" size={14} className="text-ink-400" />
                    Ver todos
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <nav className="tf-scroll flex-1 overflow-y-auto px-3 pb-4">
          {/* Secciones del producto activo, arriba de todo. */}
          {activeProduct ? (
            <div className="mb-5">
              {!collapsed ? (
                <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  Este producto
                </p>
              ) : (
                <div className="mx-2 mb-2 border-t border-ink-100" />
              )}
              <ul className="flex flex-col gap-0.5">
                {PRODUCT_SECTIONS.map((section) => {
                  const href = section.segment
                    ? `/app/productos/${activeProduct.id}/${section.segment}`
                    : `/app/productos/${activeProduct.id}`;
                  const active = section.segment
                    ? pathname.startsWith(href)
                    : pathname === href;
                  return (
                    <li key={section.segment || "resumen"}>
                      <Link
                        href={href}
                        title={collapsed ? section.label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] font-medium transition-colors",
                          active
                            ? "bg-brand-50 text-brand-700"
                            : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
                          collapsed && "justify-center px-0",
                        )}
                      >
                        {active ? (
                          <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-600" />
                        ) : null}
                        <span className="tf-emoji" aria-hidden="true">
                          {section.emoji}
                        </span>
                        {!collapsed ? section.label : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {NAV_GROUPS.map((group, index) => (
            <div key={group.label || index} className="mb-5">
              {/* El primer grupo no lleva título: son los seis destinos
                  principales y no necesitan que nadie los presente. */}
              {group.label && !collapsed ? (
                <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  {group.label}
                </p>
              ) : index > 0 ? (
                <div className="mx-2 mb-2 border-t border-ink-100" />
              ) : null}
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = item.exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] font-medium transition-colors",
                          active
                            ? "bg-brand-50 text-brand-700"
                            : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
                          collapsed && "justify-center px-0",
                        )}
                      >
                        {active ? (
                          <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-600" />
                        ) : null}
                        <span className="tf-emoji" aria-hidden="true">
                          {item.emoji}
                        </span>
                        {!collapsed ? item.label : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* El camino a la primera venta vive adentro de cada producto, no acá:
            un porcentaje de "lanzamiento" del workspace entero no le dice a
            nadie qué tiene que hacer ahora. */}
        {!collapsed ? (
          <div className="mx-3 mb-3 flex items-center justify-between gap-2 rounded-2xl border border-ink-200 bg-ink-50/70 px-3.5 py-3">
            <p className="truncate text-[12.5px] font-semibold text-ink-800">{workspaceName}</p>
            <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-brand-700">
              {plan}
            </span>
          </div>
        ) : null}

        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden items-center justify-center gap-2 border-t border-ink-100 py-2.5 text-[12px] font-medium text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-700 lg:flex"
          aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
        >
          <Icon name={collapsed ? "chevronRight" : "chevronLeft"} size={15} />
          {!collapsed ? "Contraer" : null}
        </button>
      </aside>
    </>
  );
}
