"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Icon, Logo } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/primitives";
import { NAV_GROUPS } from "@/components/shell/nav";
import { cn } from "@/lib/utils";

export function Sidebar({
  workspaceName,
  plan,
  launchCompletion,
  open,
  onClose,
}: {
  workspaceName: string;
  plan: string;
  launchCompletion: number;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("tf-sidebar-collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    onClose();
    // Cerramos el panel móvil al navegar.
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
          <Link href="/app" className="flex min-w-0 items-center gap-2.5">
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

        <nav className="tf-scroll flex-1 overflow-y-auto px-3 pb-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-5">
              {!collapsed ? (
                <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  {group.label}
                </p>
              ) : (
                <div className="mx-2 mb-2 border-t border-ink-100" />
              )}
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
                        <Icon
                          name={item.icon}
                          size={18}
                          className={active ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600"}
                        />
                        {!collapsed ? item.label : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {!collapsed ? (
          <div className="mx-3 mb-3 rounded-2xl border border-ink-200 bg-ink-50/70 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[12.5px] font-semibold text-ink-800">{workspaceName}</p>
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-brand-700">
                {plan}
              </span>
            </div>
            <p className="mt-2 text-[11.5px] text-ink-500">Lanzamiento</p>
            <ProgressBar value={launchCompletion} className="mt-1.5" showLabel />
            <Link
              href="/app/lanzamiento"
              className="mt-2.5 flex items-center gap-1 text-[12px] font-semibold text-brand-700 hover:text-brand-800"
            >
              Continuar lanzamiento
              <Icon name="arrowRight" size={13} />
            </Link>
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
