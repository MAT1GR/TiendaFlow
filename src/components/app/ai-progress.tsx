"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * La barra de progreso de la IA.
 *
 * Generar con IA tarda entre cinco y cuarenta segundos, y hasta ahora lo único
 * que veía el vendedor era un botón con un spinner. Un spinner no dice nada:
 * no distingue "está trabajando" de "se colgó", y a los quince segundos la
 * mitad de la gente recarga la página y pierde la generación.
 *
 * La barra resuelve eso diciendo dos cosas: **cuánto falta** y **qué está
 * haciendo ahora**. Lo segundo importa más que lo primero — "Investigando a tu
 * cliente" y después "Buscando tus ángulos" convierte una espera muda en algo
 * que se entiende.
 *
 * ── Sobre la honestidad de la barra ──────────────────────────────────────────
 * Los tramos son reales: con cuatro pasos, cada uno vale un cuarto de la barra
 * y solo avanza de tramo cuando el paso terminó de verdad. Lo que no es real es
 * el movimiento DENTRO de un tramo: no tenemos forma de saber por dónde va el
 * modelo, así que la barra se arrastra hacia el final del tramo sin llegar
 * nunca. Es un indicador de que está vivo, no una medición, y por eso se
 * desacelera en vez de avanzar parejo: nadie cree que un progreso que frena
 * está a punto de terminar.
 */

export interface AiStep {
  /** Qué está haciendo, en gerundio y en criollo. Se muestra tal cual. */
  label: string;
  /**
   * El paso. Maneja su propio resultado —guardarlo, mostrar el error— y
   * devuelve `false` para cortar la cadena. Devolver `void` sigue adelante.
   */
  run: () => Promise<boolean | void>;
}

/** Cada cuánto se arrastra la barra dentro de un tramo. */
const TICK_MS = 400;

export function useAiProgress() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState("");

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const detener = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  /**
   * El arrastre dentro de un tramo.
   *
   * Cada tick cubre un 12% de lo que falta hasta el techo, así que se acerca
   * rápido al principio y casi se detiene cerca del final. Nunca lo toca: el
   * salto al techo lo da el paso cuando termina de verdad.
   */
  const arrastrar = useCallback(
    (techo: number) => {
      detener();
      timer.current = setInterval(() => {
        if (!montado.current) return;
        setProgress((actual) => (actual >= techo ? actual : actual + (techo - actual) * 0.12));
      }, TICK_MS);
    },
    [detener],
  );

  /**
   * Corre los pasos en orden, repartiendo la barra entre ellos.
   *
   * En orden y no en paralelo a propósito: los pasos de investigación se leen
   * entre sí —los ángulos salen mucho mejor con el cliente ideal ya guardado—
   * y además una barra que avanza de a saltos desordenados se lee peor que una
   * que va de a una cosa por vez.
   */
  const runAll = useCallback(
    async (steps: AiStep[]) => {
      if (!steps.length) return true;

      setRunning(true);
      setProgress(0);
      const tramo = 100 / steps.length;

      try {
        for (let i = 0; i < steps.length; i += 1) {
          if (!montado.current) return false;

          setLabel(steps[i].label);
          setProgress(i * tramo);
          // El techo del arrastre es el final del tramo, que solo se alcanza
          // cuando el paso termina.
          arrastrar((i + 1) * tramo);

          const seguir = await steps[i].run();
          detener();

          if (!montado.current) return false;
          if (seguir === false) {
            setRunning(false);
            setProgress(0);
            setLabel("");
            return false;
          }

          setProgress((i + 1) * tramo);
        }

        setLabel("Listo");
        setProgress(100);

        // Un instante en 100 antes de desaparecer: si la barra se esfuma en el
        // mismo frame en que termina, no se llega a ver que terminó bien.
        await new Promise((resolve) => setTimeout(resolve, 600));
        if (!montado.current) return true;

        setRunning(false);
        setProgress(0);
        setLabel("");
        return true;
      } finally {
        detener();
      }
    },
    [arrastrar, detener],
  );

  /** Una sola tarea. Es `runAll` con un paso, escrito para que se lea mejor. */
  const run = useCallback(
    (label: string, fn: () => Promise<boolean | void>) => runAll([{ label, run: fn }]),
    [runAll],
  );

  return { running, progress, label, run, runAll };
}

/**
 * La barra, dibujada.
 *
 * No ocupa lugar cuando no hay nada corriendo: entra y sale con el pedido, así
 * que se puede dejar puesta en cualquier formulario sin que estorbe.
 */
export function AiProgress({
  running,
  progress,
  label,
  className,
}: {
  running: boolean;
  progress: number;
  label: string;
  className?: string;
}) {
  if (!running) return null;

  const listo = progress >= 100;

  return (
    <div
      className={cn(
        "tf-enter rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-3.5",
        className,
      )}
      aria-live="polite"
    >
      <p className="flex items-center gap-2 text-[13px] font-semibold text-brand-800">
        <Icon
          name={listo ? "check" : "sparkles"}
          size={14}
          className={cn("shrink-0", !listo && "tf-latido")}
        />
        {label}
        {listo ? null : <span className="tf-puntos" aria-hidden="true" />}
      </p>

      <ProgressBar value={progress} tone={listo ? "success" : "brand"} className="mt-2.5" />
    </div>
  );
}
