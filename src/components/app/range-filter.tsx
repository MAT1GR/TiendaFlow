"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { Button, Input, Modal } from "@/components/ui/primitives";
import { RANGE_OPTIONS } from "@/lib/analytics.client";
import { cn } from "@/lib/utils";

export function RangeFilter({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [customOpen, setCustomOpen] = useState(false);
  const [from, setFrom] = useState(searchParams.get("desde") ?? "");
  const [to, setTo] = useState(searchParams.get("hasta") ?? "");

  function apply(key: string, extra?: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("rango", key);
    params.delete("desde");
    params.delete("hasta");
    for (const [name, value] of Object.entries(extra ?? {})) params.set(name, value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <>
      <div className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-ink-100 p-1">
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => apply(option.key)}
            aria-pressed={current === option.key}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all",
              current === option.key
                ? "bg-white text-ink-900 shadow-[0_1px_2px_rgba(15,23,42,.08)]"
                : "text-ink-500 hover:text-ink-800",
            )}
          >
            {option.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          aria-pressed={current === "custom"}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all",
            current === "custom"
              ? "bg-white text-ink-900 shadow-[0_1px_2px_rgba(15,23,42,.08)]"
              : "text-ink-500 hover:text-ink-800",
          )}
        >
          <Icon name="clock" size={13} />
          Personalizado
        </button>
      </div>

      <Modal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        title="Rango personalizado"
        description="Elegí las fechas que querés analizar."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCustomOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!from || !to || from > to}
              onClick={() => {
                apply("custom", { desde: from, hasta: to });
                setCustomOpen(false);
              }}
            >
              Aplicar
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-700">Desde</span>
            <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-700">Hasta</span>
            <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>
        {from && to && from > to ? (
          <p className="mt-3 text-[13px] text-red-600">La fecha de inicio tiene que ser anterior.</p>
        ) : null}
      </Modal>
    </>
  );
}
