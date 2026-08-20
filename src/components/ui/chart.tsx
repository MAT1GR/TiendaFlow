"use client";

import { useMemo, useState } from "react";

import { cn, formatMoney, formatNumber } from "@/lib/utils";

/**
 * Gráficos en SVG propio.
 *
 * Se dibujan en el cliente sin librería externa: son pocos tipos, el control
 * del detalle visual importa y evitamos ~100kB de JS por pantalla.
 */

export interface ChartPoint {
  label: string;
  value: number;
}

type Format = "money" | "number" | "percent";

function formatValue(value: number, format: Format, currency = "ARS") {
  if (format === "money") return formatMoney(value, currency, true);
  if (format === "percent") return `${value.toFixed(1).replace(".", ",")}%`;
  return formatNumber(value, true);
}

export function AreaChart({
  data,
  format = "number",
  currency = "ARS",
  height = 260,
  color = "#6D5DFB",
  emptyLabel = "Todavía no hay datos en este período.",
}: {
  data: ChartPoint[];
  format?: Format;
  currency?: string;
  height?: number;
  color?: string;
  emptyLabel?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const { path, area, max, points, allZero } = useMemo(() => {
    const width = 100;
    const values = data.map((d) => d.value);
    const maxValue = Math.max(...values, 0);
    const safeMax = maxValue === 0 ? 1 : maxValue * 1.15;
    const step = data.length > 1 ? width / (data.length - 1) : 0;
    const pts = data.map((d, i) => ({
      x: data.length > 1 ? i * step : 50,
      y: 100 - (d.value / safeMax) * 100,
      ...d,
    }));

    const line = pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(" ");
    const filled = pts.length
      ? `${line} L${pts[pts.length - 1].x.toFixed(2)},100 L${pts[0].x.toFixed(2)},100 Z`
      : "";

    return {
      path: line,
      area: filled,
      max: maxValue,
      points: pts,
      allZero: values.every((v) => v === 0),
    };
  }, [data]);

  if (!data.length) {
    return (
      <div
        className="grid place-items-center rounded-xl border border-dashed border-ink-200 text-[13px] text-ink-500"
        style={{ height }}
      >
        {emptyLabel}
      </div>
    );
  }

  const gradientId = `tf-area-${color.replace("#", "")}`;
  const active = hover !== null ? points[hover] : null;

  return (
    <div className="relative" style={{ height }}>
      {allZero ? (
        <p className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-1.5 text-[12.5px] text-ink-500 ring-1 ring-ink-200">
          {emptyLabel}
        </p>
      ) : null}

      <div className="absolute inset-y-0 left-0 flex w-14 flex-col justify-between pb-6 text-[11px] tabular-nums text-ink-400">
        <span>{formatValue(max, format, currency)}</span>
        <span>{formatValue(max / 2, format, currency)}</span>
        <span>0</span>
      </div>

      <div className="absolute inset-y-0 left-14 right-0">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-[calc(100%-1.5rem)] w-full overflow-visible"
          role="img"
          aria-label="Gráfico de evolución"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              x2="100"
              y1={y}
              y2={y}
              stroke="#E2E8F0"
              strokeWidth="0.4"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <path d={area} fill={`url(#${gradientId})`} />
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {active ? (
            <>
              <line
                x1={active.x}
                x2={active.x}
                y1="0"
                y2="100"
                stroke={color}
                strokeWidth="1"
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
                opacity="0.5"
              />
              <circle
                cx={active.x}
                cy={active.y}
                r="4"
                fill="white"
                stroke={color}
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
            </>
          ) : null}
        </svg>

        <div className="absolute inset-x-0 bottom-0 flex h-6 justify-between text-[11px] text-ink-400">
          <span>{data[0]?.label}</span>
          {data.length > 2 ? <span>{data[Math.floor(data.length / 2)]?.label}</span> : null}
          <span>{data[data.length - 1]?.label}</span>
        </div>

        <div className="absolute inset-0 bottom-6 flex">
          {data.map((point, index) => (
            <button
              key={`${point.label}-${index}`}
              type="button"
              className="h-full flex-1 cursor-default focus:outline-none"
              onMouseEnter={() => setHover(index)}
              onFocus={() => setHover(index)}
              onMouseLeave={() => setHover(null)}
              onBlur={() => setHover(null)}
              aria-label={`${point.label}: ${formatValue(point.value, format, currency)}`}
            />
          ))}
        </div>

        {active ? (
          <div
            className="pointer-events-none absolute -translate-x-1/2 rounded-xl bg-ink-900 px-2.5 py-1.5 text-[11.5px] font-medium text-white shadow-lg"
            style={{ left: `${active.x}%`, top: `max(0px, calc(${active.y}% - 46px))` }}
          >
            <span className="block text-white/60">{active.label}</span>
            {formatValue(active.value, format, currency)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function BarList({
  data,
  format = "number",
  currency = "ARS",
  emptyLabel = "Sin datos todavía.",
  color = "#6D5DFB",
}: {
  data: ChartPoint[];
  format?: Format;
  currency?: string;
  emptyLabel?: string;
  color?: string;
}) {
  if (!data.length) {
    return <p className="py-8 text-center text-[13px] text-ink-500">{emptyLabel}</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="flex flex-col gap-2.5">
      {data.map((row) => (
        <li key={row.label} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-[13px] font-medium text-ink-700">{row.label}</span>
            <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink-900">
              {formatValue(row.value, format, currency)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(row.value / max) * 100}%`, backgroundColor: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function FunnelChart({
  steps,
  className,
}: {
  steps: Array<{ label: string; value: number; rate?: number | null }>;
  className?: string;
}) {
  const max = Math.max(...steps.map((s) => s.value), 1);
  return (
    <ol className={cn("flex flex-col gap-2", className)}>
      {steps.map((step, index) => {
        const width = Math.max(12, (step.value / max) * 100);
        return (
          <li key={`${step.label}-${index}`} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-[12.5px] font-medium text-ink-600">
              {step.label}
            </span>
            <div className="relative h-9 flex-1 overflow-hidden rounded-lg bg-ink-100">
              <div
                className="flex h-full items-center rounded-lg px-3 text-[12.5px] font-semibold text-white transition-all duration-500"
                style={{
                  width: `${width}%`,
                  background: `linear-gradient(90deg, #6D5DFB, ${
                    index % 2 === 0 ? "#5B4AE8" : "#7C6BFC"
                  })`,
                }}
              >
                {formatNumber(step.value, true)}
              </div>
            </div>
            <span className="w-14 shrink-0 text-right text-[12.5px] tabular-nums text-ink-500">
              {step.rate === null || step.rate === undefined
                ? "—"
                : `${step.rate.toFixed(1).replace(".", ",")}%`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function Sparkline({
  data,
  color = "#6D5DFB",
  className,
}: {
  data: number[];
  color?: string;
  className?: string;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const path = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={cn("h-8 w-full", className)}
      aria-hidden="true"
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
