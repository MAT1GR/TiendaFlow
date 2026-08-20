import Link from "next/link";
import type { ReactNode } from "react";

import { Explain } from "@/components/ui/explain";
import { Icon, type IconName } from "@/components/ui/icon";
import { Sparkline } from "@/components/ui/chart";
import type { GlossaryKey } from "@/lib/glossary";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Metric card                                                                 */
/* -------------------------------------------------------------------------- */

export function MetricCard({
  label,
  value,
  deltaPercent,
  hint,
  icon,
  trend,
  invertDelta,
  emptyReason,
  explain,
}: {
  label: string;
  value: string;
  deltaPercent?: number | null;
  hint?: string;
  icon?: IconName;
  trend?: number[];
  /** Para métricas donde bajar es bueno (CPA, tasa de reembolso). */
  invertDelta?: boolean;
  /** Si la métrica no se puede calcular, se explica por qué en vez de mostrar 0. */
  emptyReason?: string;
  /** Término del glosario: agrega un "?" que lo explica en criollo. */
  explain?: GlossaryKey;
}) {
  const hasDelta = typeof deltaPercent === "number" && Number.isFinite(deltaPercent);
  const positive = hasDelta ? (invertDelta ? deltaPercent! < 0 : deltaPercent! > 0) : false;
  const neutral = hasDelta && Math.abs(deltaPercent!) < 0.1;

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-ink-200 bg-white p-4 transition-all duration-200 hover:border-ink-300 hover:shadow-[0_2px_4px_rgba(15,23,42,.04),0_16px_36px_-20px_rgba(15,23,42,.28)]">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-500">
          {label}
          {explain ? <Explain term={explain} /> : null}
        </p>
        {icon ? (
          <span className="grid size-7 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <Icon name={icon} size={15} />
          </span>
        ) : null}
      </div>

      <div className="mt-2.5">
        <p className="text-[26px] font-semibold leading-none tracking-tight text-ink-900 tabular-nums">
          {emptyReason ? <span className="text-ink-300">—</span> : value}
        </p>
        <div className="mt-2 flex min-h-5 items-center gap-2">
          {emptyReason ? (
            <span className="text-[11.5px] leading-tight text-ink-400">{emptyReason}</span>
          ) : hasDelta ? (
            <>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums",
                  neutral
                    ? "bg-ink-100 text-ink-500"
                    : positive
                      ? "bg-accent-50 text-accent-700"
                      : "bg-red-50 text-red-600",
                )}
              >
                {!neutral ? (
                  <Icon name={deltaPercent! > 0 ? "trendUp" : "trendDown"} size={12} />
                ) : null}
                {deltaPercent! > 0 ? "+" : ""}
                {deltaPercent!.toFixed(1).replace(".", ",")}%
              </span>
              {hint ? <span className="text-[11.5px] text-ink-400">{hint}</span> : null}
            </>
          ) : hint ? (
            <span className="text-[11.5px] text-ink-400">{hint}</span>
          ) : null}
        </div>
      </div>

      {trend && trend.length > 1 && !emptyReason ? (
        <div className="pointer-events-none mt-3 opacity-70">
          <Sparkline data={trend} color={positive ? "#22C55E" : "#6D5DFB"} />
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Table                                                                       */
/* -------------------------------------------------------------------------- */

export function Table({
  columns,
  children,
  className,
}: {
  columns: Array<{ key: string; label: string; align?: "left" | "right" | "center"; className?: string }>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("tf-scroll w-full overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink-200">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "whitespace-nowrap px-4 py-2.5 text-[12px] font-medium uppercase tracking-wide text-ink-500",
                  column.align === "right" && "text-right",
                  column.align === "center" && "text-center",
                  (!column.align || column.align === "left") && "text-left",
                  column.className,
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  align = "left",
  className,
  colSpan,
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "px-4 py-3 text-[13.5px] text-ink-700",
        align === "right" && "text-right tabular-nums",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  href,
  className,
}: {
  children: ReactNode;
  href?: string;
  className?: string;
}) {
  return (
    <tr
      className={cn(
        "transition-colors",
        href ? "cursor-pointer hover:bg-ink-50" : "hover:bg-ink-50/60",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function CellLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium text-ink-900 hover:text-brand-700">
      {children}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Avatar                                                                      */
/* -------------------------------------------------------------------------- */

export function Avatar({
  name,
  size = 36,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  // Color determinístico a partir del nombre, para que sea estable entre renders.
  const hue = [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(${hue} 70% 58%), hsl(${(hue + 40) % 360} 72% 48%))`,
      }}
      aria-hidden="true"
    >
      {letters || "?"}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Page header                                                                 */
/* -------------------------------------------------------------------------- */

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumb?: Array<{ label: string; href?: string }>;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {breadcrumb?.length ? (
          <nav aria-label="Ruta" className="mb-1.5 flex flex-wrap items-center gap-1 text-[12.5px] text-ink-500">
            {breadcrumb.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 ? <Icon name="chevronRight" size={13} className="text-ink-300" /> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-brand-700">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-ink-700">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-ink-900">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-[14px] text-ink-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
