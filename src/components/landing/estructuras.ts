/**
 * La estructura de una página de venta.
 *
 * Es una sola y es siempre la misma. No hay estilos alternativos ni plantillas
 * a elegir: toda página que sale de TiendaFlow tiene estos trece bloques, en
 * este orden, con la misma densidad de texto en cada campo. Lo único que cambia
 * de una página a otra es el contenido — el producto, el precio, los bonos, los
 * dolores de esa audiencia.
 *
 * La decisión de fondo es que elegir la estructura no es trabajo del vendedor.
 * Un selector con ocho órdenes distintos le pide que adivine cuál convierte, y
 * la respuesta correcta ya se sabe: es esta. Está calcada de una página de
 * infoproducto que vende, y su orden responde una objeción por sección, en el
 * orden en que aparecen cuando alguien llega desde un anuncio:
 *
 *   1. announcement_bar — hay una razón para leer esto ahora.
 *   2. hero            — qué es, cuánto sale y qué me llevo. Todo junto, arriba.
 *   3. bonuses         — además del producto, esto otro.
 *   4. benefits        — qué hay adentro.
 *   5. problems        — por qué me hace falta (me reconozco).
 *   6. social_proof    — a otros como yo les sirvió.
 *   7. pricing         — la cuenta completa, sobre fondo oscuro.
 *   8. features        — cómo lo uso, en tres pasos.
 *   9. guarantee       — qué pasa si no me sirve.
 *  10. faq             — las cinco dudas que frenan la compra.
 *  11. cta             — el último empujón, con el precio de nuevo.
 *  12. footer          — legales.
 *  13. sticky_cta      — el botón que sigue al que lee.
 *
 * El precio aparece cuatro veces (hero, pricing, cta, sticky) y los bonos tres.
 * No es repetición por descuido: en una página que se lee en diagonal, la
 * oferta tiene que estar visible en cualquier punto donde alguien decida.
 */

export interface LandingLayout {
  id: string;
  label: string;
  /** Una línea que diga qué hace la página. Sin jerga. */
  blurb: string;
  structure: readonly string[];
  /** El preset de `theme.ts` con el que se dibuja. */
  preset: string;
}

export const LANDING_LAYOUT: LandingLayout = {
  id: "venta_directa",
  label: "Venta directa",
  blurb: "La estructura completa: oferta arriba, prueba en el medio y la cuenta al final.",
  preset: "venta",
  structure: [
    "announcement_bar",
    "hero",
    "bonuses",
    "benefits",
    "problems",
    "social_proof",
    "pricing",
    "features",
    "guarantee",
    "faq",
    "cta",
    "footer",
    "sticky_cta",
  ],
};

/**
 * Sigue exportándose como lista porque el editor la recorre para dibujar el
 * panel, y porque tener el tipo en plural deja la puerta abierta sin obligar a
 * nadie a elegir hoy.
 */
export const LANDING_LAYOUTS: LandingLayout[] = [LANDING_LAYOUT];

export const DEFAULT_LAYOUT = LANDING_LAYOUT;

/** Siempre la misma. El id se acepta por compatibilidad con páginas viejas. */
export function findLayout(_id?: unknown): LandingLayout {
  return LANDING_LAYOUT;
}

/**
 * Reordena las secciones existentes según la estructura, sin perder ninguna.
 *
 * Tres reglas, en este orden:
 *
 *  1. Los bloques que la estructura pide y el vendedor ya tiene se reubican con
 *     su contenido intacto. Si tenía dos del mismo tipo, van los dos.
 *  2. Los que la estructura pide y no existen se crean con su contenido de
 *     ejemplo, igual que si los hubiera agregado a mano.
 *  3. Los que tenía y la estructura no incluye NO se borran: quedan al final.
 *     Una página armada con una versión anterior de la app no puede perder
 *     texto que alguien escribió solo porque cambió el orden canónico.
 */
export function applyLayout<T extends { type: string }>(
  sections: T[],
  layout: LandingLayout,
  create: (type: string) => T,
): T[] {
  const porTipo = new Map<string, T[]>();
  for (const section of sections) {
    const lista = porTipo.get(section.type) ?? [];
    lista.push(section);
    porTipo.set(section.type, lista);
  }

  const resultado: T[] = [];
  for (const type of layout.structure) {
    const existentes = porTipo.get(type);
    if (existentes?.length) {
      resultado.push(...existentes);
      porTipo.delete(type);
    } else {
      resultado.push(create(type));
    }
  }

  // Lo que la estructura no contempla va al final, en el orden original.
  for (const section of sections) {
    if (porTipo.has(section.type)) resultado.push(section);
  }

  return resultado;
}
