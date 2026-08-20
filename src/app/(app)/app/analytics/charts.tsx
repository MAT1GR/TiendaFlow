"use client";

import { useState } from "react";

import { AreaChart } from "@/components/ui/chart";
import { CardHeader, Tabs } from "@/components/ui/primitives";
import type { SeriesPoint } from "@/lib/analytics";

const METRICS = [
  { key: "revenue", label: "Facturación", format: "money" as const, color: "#6D5DFB" },
  { key: "orders", label: "Ventas", format: "number" as const, color: "#22C55E" },
  { key: "visitors", label: "Visitantes", format: "number" as const, color: "#22D3EE" },
  { key: "conversion", label: "Conversión", format: "percent" as const, color: "#F59E0B" },
];

export function AnalyticsCharts({
  series,
  currency,
}: {
  series: SeriesPoint[];
  currency: string;
}) {
  const [metric, setMetric] = useState("revenue");
  const config = METRICS.find((item) => item.key === metric) ?? METRICS[0];

  const data = series.map((point) => ({
    label: point.label,
    value:
      metric === "revenue"
        ? point.revenue
        : metric === "orders"
          ? point.orders
          : metric === "visitors"
            ? point.visitors
            : point.visitors > 0
              ? (point.orders / point.visitors) * 100
              : 0,
  }));

  return (
    <div>
      <CardHeader title="Evolución" subtitle="Día a día dentro del período elegido" />
      <div className="px-5 pt-4">
        <Tabs
          tabs={METRICS.map((item) => ({ value: item.key, label: item.label }))}
          value={metric}
          onChange={setMetric}
          className="max-w-full overflow-x-auto"
        />
      </div>
      <div className="px-5 pb-5 pt-5">
        <AreaChart
          data={data}
          format={config.format}
          currency={currency}
          color={config.color}
          height={280}
        />
      </div>
    </div>
  );
}
