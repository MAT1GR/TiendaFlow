import "server-only";

import type { IdealClientResearch } from "@/lib/ai/tasks";
import { listAiGenerations } from "@/lib/repo";
import { parseJson } from "@/lib/utils";

/**
 * La última investigación del cliente ideal de un producto.
 *
 * No hay tabla para esto: vive en `ai_generations`, que es donde ya quedaba
 * registrada cada generación con su producto asociado. Guardarla también en una
 * tabla propia habría dejado dos versiones del mismo dato que se desincronizan
 * en cuanto alguien regenere.
 *
 * Los borradores locales quedan afuera. La ficha que devuelve el generador sin
 * IA es un molde vacío —a propósito, para que se note que hay que completarlo—
 * y meterla adentro del prompt de un ángulo sería peor que no mandar nada:
 * ensucia el pedido con instrucciones dirigidas al vendedor.
 *
 * Vive suelto de `actions/ai.ts` porque ese archivo es `"use server"` y ahí todo
 * export tiene que ser una acción asíncrona; esto es una lectura común.
 */
export function readIdealClient(
  workspaceId: string,
  productId: string,
): IdealClientResearch | null {
  const found = listAiGenerations(workspaceId, 200).find(
    (generation) =>
      generation.task === "ideal_client" &&
      generation.entity_id === productId &&
      generation.provider !== "template",
  );

  return found?.output ? parseJson<IdealClientResearch | null>(found.output, null) : null;
}
