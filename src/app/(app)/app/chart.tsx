"use client";

import { useState } from "react";

import { AreaChart } from "@/components/ui/chart";
import { CardHeader, Tabs } from "@/components/ui/primitives";
import { CHART_METRICS } from "@/lib/analytics.client";
import type { SeriesPoint } from "@/lib/analytics";

export function DashboardChart({
  series,
  currency,
}: {
  series: SeriesPoint[];
  currency: string;
}) {
  const [metric, setMetric] = useState("revenue");
  const config = CHART_METRICS.find((item) => item.key === metric) ?? CHART_METRICS[0];

  const data = series.map((point) => ({
    label: point.label,
    value:
      metric === "revenue"
        ? point.revenue
        : metric === "orders"
          ? point.orders
          : metric === "visitors"
            ? point.visitors
            : metric === "conversion"
              ? point.visitors > 0
                ? (point.orders / point.visitors) * 100
                : 0
              : 0,
  }));

  // Inversión y ROAS dependen de la integración de Meta: si no está conectada,
  // no hay dato que graficar y lo decimos en vez de dibujar una línea en cero.
  const needsAdsIntegration = metric === "spend" || metric === "roas";

  return (
    <div>
      <CardHeader
        title="Evolución"
        subtitle="Comparado día a día dentro del período elegido"
      />
      <div className="px-5 pt-4">
        <Tabs
          tabs={CHART_METRICS.map((item) => ({ value: item.key, label: item.label }))}
          value={metric}
          onChange={setMetric}
          className="max-w-full overflow-x-auto"
        />
      </div>
      <div className="px-5 pb-5 pt-5">
        {needsAdsIntegration ? (
          <div className="grid h-[260px] place-items-center rounded-xl border border-dashed border-ink-200 px-6 text-center">
            <div>
              <p className="text-[13.5px] font-medium text-ink-700">
                Necesitamos tu cuenta de Meta para mostrar esto
              </p>
              <p className="mt-1 text-[12.5px] text-ink-500">
                La inversión publicitaria y el ROAS salen de la integración con Meta Ads. Conectala
                para ver la curva real.
              </p>
              <a
                href="/app/integraciones/meta"
                className="mt-3 inline-block text-[13px] font-semibold text-brand-700 hover:text-brand-800"
              >
                Configurar Meta →
              </a>
            </div>
          </div>
        ) : (
          <AreaChart
            data={data}
            format={config.format}
            currency={currency}
            color={config.color}
            emptyLabel="Todavía no hay datos en este período."
          />
        )}
      </div>
    </div>
  );
}
