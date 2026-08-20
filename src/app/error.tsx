"use client";

import { useEffect } from "react";

import { Icon, Wordmark } from "@/components/ui/icon";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[tiendaflow] error no controlado:", error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-md text-center">
        <Wordmark className="mb-10 justify-center" />

        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-50 text-red-600">
          <Icon name="warning" size={22} />
        </span>

        <h1 className="mt-6 text-[26px] font-semibold tracking-tight text-ink-900">
          Algo se rompió de nuestro lado
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-500">
          No pudimos cargar esta pantalla. Probá de nuevo; si sigue pasando, avisanos con el código
          de abajo.
        </p>

        {error.digest ? (
          <p className="mt-3 rounded-lg bg-ink-100 px-3 py-2 font-mono text-[12px] text-ink-600">
            {error.digest}
          </p>
        ) : null}

        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-700"
        >
          <Icon name="refresh" size={16} />
          Reintentar
        </button>
      </div>
    </main>
  );
}
