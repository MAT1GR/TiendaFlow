"use client";

import Link from "next/link";
import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { Card, EmptyState } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { Insight } from "@/lib/insights";

const TONE = {
  success: { ring: "ring-accent-300/60", bg: "bg-accent-50", icon: "trendUp" as const, color: "text-accent-700" },
  warning: { ring: "ring-amber-200", bg: "bg-amber-50", icon: "warning" as const, color: "text-amber-700" },
  info: { ring: "ring-brand-200", bg: "bg-brand-50", icon: "info" as const, color: "text-brand-700" },
};

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = insights.filter((insight) => !dismissed.includes(insight.id));

  return (
    <Card className="overflow-hidden">
      <div className="tf-gradient-ai flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-xl bg-white/20 text-white">
            <Icon name="sparkles" size={17} />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-white">Insights de TiendaFlow AI</h2>
            <p className="text-[12.5px] text-white/70">
              Calculados con los datos reales de tu workspace
            </p>
          </div>
        </div>
        <Link
          href="/app/ia"
          className="rounded-xl bg-white/15 px-3 py-1.5 text-[12.5px] font-semibold text-white ring-1 ring-inset ring-white/25 transition-colors hover:bg-white/25"
        >
          Abrir panel de IA
        </Link>
      </div>

      <div className="p-4">
        {visible.length === 0 ? (
          <EmptyState
            icon="sparkles"
            title="No hay nada urgente para revisar"
            description="Cuando detectemos una caída de conversión, un upsell flojo o una integración sin configurar, te lo vamos a decir acá."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {visible.map((insight) => {
              const tone = TONE[insight.severity];
              return (
                <li
                  key={insight.id}
                  className={cn(
                    "flex flex-col rounded-2xl p-4 ring-1 ring-inset",
                    tone.bg,
                    tone.ring,
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <Icon name={tone.icon} size={17} className={cn("mt-0.5 shrink-0", tone.color)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-ink-900">{insight.title}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{insight.body}</p>
                    </div>
                  </div>
                  <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    <Link
                      href={insight.analysisHref}
                      className="rounded-lg bg-white px-2.5 py-1.5 text-[12.5px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 transition-colors hover:bg-ink-50"
                    >
                      Ver análisis
                    </Link>
                    <Link
                      href={insight.actionHref}
                      className="rounded-lg bg-ink-900 px-2.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-ink-800"
                    >
                      {insight.actionLabel}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDismissed((current) => [...current, insight.id])}
                      className="ml-auto rounded-lg px-2 py-1.5 text-[12.5px] font-medium text-ink-500 transition-colors hover:bg-white/70 hover:text-ink-700"
                    >
                      Ignorar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
