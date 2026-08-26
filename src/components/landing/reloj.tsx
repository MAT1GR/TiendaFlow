"use client";

import { useEffect, useState } from "react";

/**
 * El reloj del contador de la oferta.
 *
 * Es el único pedazo de una landing que necesita JavaScript en el navegador, y
 * está en su propio archivo por eso: `blocks.tsx` se renderiza en el servidor
 * para la página pública y marcarlo entero como cliente le sacaría el HTML de
 * entrada a una página que tiene que pintar en menos de un segundo.
 *
 * Dos decisiones que no son de implementación:
 *
 *  1. **La fecha la pone el vendedor, no el reloj.** La referencia de la que
 *     salió este bloque guardaba un plazo de 15 minutos en `localStorage` y lo
 *     reiniciaba solo cuando llegaba a cero: el visitante veía siempre una
 *     oferta a punto de vencer que no vencía nunca. Acá el contador cuenta
 *     hacia una fecha real; si no hay fecha, no hay reloj.
 *  2. **Cuando la fecha pasa, lo dice.** Un contador en 00:00:00 parpadeando
 *     es peor que ninguno. Vencido, el bloque muestra el texto de cierre y el
 *     vendedor ve en el editor que tiene que actualizar la fecha.
 */

interface Restante {
  dias: number;
  horas: number;
  minutos: number;
  segundos: number;
}

function restante(deadline: number): Restante | null {
  const diff = deadline - Date.now();
  if (diff <= 0) return null;

  const segundosTotales = Math.floor(diff / 1000);
  return {
    dias: Math.floor(segundosTotales / 86400),
    horas: Math.floor((segundosTotales % 86400) / 3600),
    minutos: Math.floor((segundosTotales % 3600) / 60),
    segundos: segundosTotales % 60,
  };
}

export function Reloj({
  deadline,
  expired,
  compacto,
}: {
  deadline: string;
  expired: string;
  /**
   * `MM:SS` en una sola línea, en vez de cuatro cajas con sus etiquetas.
   *
   * Es la forma que toma el contador cuando comparte renglón con otra cosa —la
   * barra de arriba, la caja del hero, el botón que sigue al que lee—. Las
   * cuatro cajas ahí adentro no entran, y recortarlas a un tamaño que entre las
   * vuelve ilegibles.
   */
  compacto?: boolean;
}) {
  const objetivo = Date.parse(deadline);

  /*
   * Arranca en `null` a propósito, incluso cuando falta un montón.
   *
   * El servidor y el navegador nunca van a coincidir en el segundo exacto, y
   * pintar un número distinto del que renderizó el servidor es un error de
   * hidratación. El primer `tick` llega en el mismo frame que el montaje, así
   * que en la práctica nadie ve el hueco.
   */
  const [tiempo, setTiempo] = useState<Restante | null>(null);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(objetivo)) return;

    setMontado(true);
    setTiempo(restante(objetivo));

    const id = setInterval(() => setTiempo(restante(objetivo)), 1000);
    return () => clearInterval(id);
  }, [objetivo]);

  if (!Number.isFinite(objetivo)) return null;

  if (montado && !tiempo) {
    return (
      <span className="text-[14px] font-bold opacity-90" role="status">
        {expired}
      </span>
    );
  }

  if (compacto) {
    /*
     * Los días van con su letra, no acumulados en las horas.
     *
     * Una oferta que cierra en algo más de un día se mostraba como "28:58:50",
     * que se lee como veintiocho minutos con la misma facilidad que como
     * veintiocho horas. Con "1d 04:58:50" no hay ambigüedad, y las horas
     * arrancan recién cuando faltan: un "00:" adelante de todo deja al número
     * que importa —los minutos— tercero en la lectura.
     */
    const dias = tiempo?.dias ?? 0;
    const partes = [
      ...(tiempo?.horas || dias ? [tiempo?.horas ?? 0] : []),
      tiempo?.minutos ?? 0,
      tiempo?.segundos ?? 0,
    ];

    return (
      <span className="font-mono font-black tabular-nums" role="timer" aria-live="off">
        {montado
          ? `${dias > 0 ? `${dias}d ` : ""}${partes
              .map((valor) => String(valor).padStart(2, "0"))
              .join(":")}`
          : "--:--"}
      </span>
    );
  }

  // Los días solo ocupan lugar cuando existen: una oferta que cierra hoy no
  // tiene por qué mostrar un "0" gigante adelante.
  const partes: Array<[number, string]> = [
    ...(tiempo && tiempo.dias > 0 ? ([[tiempo.dias, "días"]] as Array<[number, string]>) : []),
    [tiempo?.horas ?? 0, "horas"],
    [tiempo?.minutos ?? 0, "min"],
    [tiempo?.segundos ?? 0, "seg"],
  ];

  return (
    <div
      className="mt-4 flex items-start justify-center gap-2"
      role="timer"
      aria-live="off"
      // Un lector de pantalla no tiene por qué anunciar un número nuevo por
      // segundo. El texto de al lado ya dice qué está pasando.
      aria-label={`La oferta cierra el ${new Date(objetivo).toLocaleDateString("es-AR")}`}
    >
      {partes.map(([valor, etiqueta]) => (
        <div
          key={etiqueta}
          className="min-w-[4.25rem] rounded-xl px-2 py-2.5 text-center"
          style={{ backgroundColor: "rgb(255 255 255 / 0.18)" }}
        >
          <span
            className="block text-[26px] font-extrabold leading-none tabular-nums"
            style={{ letterSpacing: "-0.02em" }}
          >
            {montado ? String(valor).padStart(2, "0") : "--"}
          </span>
          <span className="mt-1 block text-[10.5px] font-bold uppercase tracking-wider opacity-80">
            {etiqueta}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * La fecha de hoy, escrita como la escribiría una persona.
 *
 * "Solo por hoy, martes 26 de agosto" es más creíble que "solo por hoy" a
 * secas, y no obliga al vendedor a entrar todas las mañanas a cambiar una
 * fecha. Va del lado del cliente porque el servidor puede haber renderizado
 * esta página ayer: una banda que dice una fecha vieja hace exactamente el
 * daño contrario al que busca.
 */
export function FechaDeHoy() {
  const [hoy, setHoy] = useState("");

  useEffect(() => {
    setHoy(
      new Date().toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    );
  }, []);

  if (!hoy) return null;
  return <>{hoy}</>;
}
