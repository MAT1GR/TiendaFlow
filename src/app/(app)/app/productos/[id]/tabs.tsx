"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Pestañas del espacio de trabajo del producto.
 *
 * Son links, no estado de cliente: cada pestaña es una URL propia para que se
 * pueda compartir, marcar como favorita y volver con el botón de atrás.
 */
export interface WorkspaceTab {
  segment: string;
  label: string;
  emoji: string;
  /** Se muestra un punto de aviso cuando algo de esa pestaña está incompleto. */
  attention?: boolean;
}

export function ProductTabs({
  productId,
  tabs,
  className,
}: {
  productId: string;
  tabs: WorkspaceTab[];
  className?: string;
}) {
  const pathname = usePathname();
  const base = `/app/productos/${productId}`;

  return (
    <div className={cn("tf-scroll -mx-1 overflow-x-auto px-1", className)}>
      <div role="tablist" className="inline-flex min-w-full gap-1 border-b border-ink-200">
        {tabs.map((tab) => {
          const href = tab.segment ? `${base}/${tab.segment}` : base;
          const active = tab.segment
            ? pathname.startsWith(href)
            : pathname === base || pathname === `${base}/`;

          return (
            <Link
              key={tab.segment || "resumen"}
              href={href}
              role="tab"
              aria-selected={active}
              className={cn(
                "relative -mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13.5px] font-medium transition-colors",
                active
                  ? "border-brand-600 text-ink-900"
                  : "border-transparent text-ink-500 hover:text-ink-800",
              )}
            >
              <span className="tf-emoji" aria-hidden="true">
                {tab.emoji}
              </span>
              {tab.label}
              {tab.attention ? (
                <span
                  className="size-1.5 rounded-full bg-amber-500"
                  aria-label="Tiene algo pendiente"
                />
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
