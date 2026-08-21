"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { publishFunnelAction } from "@/app/actions/funnels";
import { Icon } from "@/components/ui/icon";
import { Spinner, useToast } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type Phase = "idle" | "preparando" | "publicando" | "listo";

/**
 * El botón de publicar.
 *
 * Publicar es el momento más importante de toda la app, así que se lo trata
 * como tal: el botón cuenta lo que está pasando mientras pasa —Preparando,
 * Publicando, ¡Listo!— en vez de quedarse en un spinner mudo.
 *
 * Los dos primeros estados son reales: el pedido ya está en vuelo cuando dice
 * "Preparando". No hay demoras inventadas.
 */
export function PublishButton({ funnelId, blocked }: { funnelId: string; blocked: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [phase, setPhase] = useState<Phase>("idle");

  // Mientras el pedido está en vuelo, la etiqueta pasa de "Preparando" a
  // "Publicando" para que la espera tenga textura y no parezca colgada.
  useEffect(() => {
    if (phase !== "preparando") return;
    const timeout = setTimeout(() => setPhase("publicando"), 700);
    return () => clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== "listo") return;
    const timeout = setTimeout(() => router.refresh(), 900);
    return () => clearTimeout(timeout);
  }, [phase, router]);

  async function publish() {
    setPhase("preparando");
    const result = await publishFunnelAction(funnelId);

    if (result.ok) {
      setPhase("listo");
    } else {
      setPhase("idle");
      toast.error("No pudimos publicar", result.error);
    }
  }

  const working = phase === "preparando" || phase === "publicando";
  const done = phase === "listo";

  return (
    <button
      type="button"
      onClick={publish}
      disabled={blocked || working || done}
      className={cn(
        "inline-flex h-12 min-w-[15rem] items-center justify-center gap-2.5 rounded-2xl px-6 text-[15px] font-semibold text-white transition-colors",
        done ? "bg-accent-500" : "bg-brand-600 hover:bg-brand-700",
        blocked && "cursor-not-allowed opacity-40 hover:bg-brand-600",
      )}
    >
      {done ? (
        <>
          <span className="tf-pop inline-flex">
            <Icon name="check" size={19} />
          </span>
          ¡Listo!
        </>
      ) : working ? (
        <>
          <Spinner size={17} />
          {phase === "preparando" ? "Preparando…" : "Publicando…"}
        </>
      ) : (
        <>
          <span className="tf-emoji" aria-hidden="true">
            🚀
          </span>
          Publicar mi producto
        </>
      )}
    </button>
  );
}
