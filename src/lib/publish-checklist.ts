import "server-only";

import { funnelPublishBlockers } from "@/lib/launch";

/**
 * Lo que falta para publicar, dicho como se lo dirías a una persona.
 *
 * `funnelPublishBlockers` es la puerta dura del servidor y devuelve frases
 * sueltas. Sirve para no publicar algo roto, pero no sirve para mostrar: quien
 * lee "No hay un medio de pago conectado" necesita, además, el link para ir a
 * conectarlo. Eso es lo que agrega esta capa.
 *
 * Deliberadamente no inventa bloqueos nuevos: si el servidor deja publicar,
 * acá no aparece nada. Una pantalla que avisa de problemas que el backend no
 * considera problemas entrena al usuario a ignorar los avisos.
 */

export interface ChecklistItem {
  label: string;
  href?: string;
  cta?: string;
}

export function publishChecklist(
  workspaceId: string,
  funnelId: string,
  productId: string,
): ChecklistItem[] {
  const base = `/app/productos/${productId}`;

  return funnelPublishBlockers(workspaceId, funnelId).map((blocker): ChecklistItem => {
    if (blocker.includes("medio de pago")) {
      return {
        label: "Falta conectar un medio de pago",
        href: `${base}/cobro`,
        cta: "Conectar",
      };
    }
    if (blocker.includes("precio")) {
      return {
        label: blocker.includes("cero") ? "El precio está en cero" : "Todavía no tiene precio",
        href: `${base}/oferta`,
        cta: "Ponerle precio",
      };
    }
    // Los bloqueos estructurales (falta un paso del recorrido) no tienen una
    // pantalla donde arreglarlos a mano: los arma la app. Se muestran igual,
    // porque callarlos dejaría un botón de publicar que falla sin explicación.
    return { label: blocker };
  });
}
