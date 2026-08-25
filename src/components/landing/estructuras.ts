/**
 * Los estilos de página.
 *
 * Una página de venta no es una sola cosa. La misma oferta necesita un orden
 * distinto según a quién le llega: alguien que viene de un anuncio frío no
 * arranca leyendo el precio, y alguien que ya te conoce no necesita que le
 * expliques el problema durante tres pantallas.
 *
 * Cada estilo es un orden de bloques, no un diseño aparte. Los bloques son los
 * mismos de siempre y los colores los pone el tema: acá lo único que cambia es
 * qué se muestra y en qué secuencia. Por eso cambiar de estilo no rompe nada de
 * lo que el vendedor ya escribió — los bloques que tenía se reordenan, los que
 * faltan se agregan y los que sobran quedan al final.
 */

export interface LandingLayout {
  id: string;
  label: string;
  /** Una línea que diga para qué caso sirve. Sin jerga. */
  blurb: string;
  structure: readonly string[];
}

/**
 * Ningún estilo arranca con bloques de relleno.
 *
 * "Los números de tu oferta" y la galería de seis huecos salían en la página
 * clásica aunque el vendedor no tuviera ni un número real ni una sola imagen
 * cargada, y una página con seis rectángulos grises y un "100% digital" se lee
 * como plantilla, no como oferta. Siguen en la biblioteca de bloques para el
 * que los quiera: lo que cambia es que ya no vienen puestos por defecto.
 *
 * Cada bloque de esta lista responde una pregunta del que está leyendo:
 * qué es y qué consigo (hero) · por qué lo necesito (problems) · cómo me ayuda
 * (solution) · qué voy a recibir (modules) · qué más obtengo (bonuses) · por
 * qué conviene ahora (pricing) · por qué te creo (testimonials, guarantee) ·
 * qué dudas me quedan (faq) · y el último empujón (cta).
 */
export const LANDING_LAYOUTS: LandingLayout[] = [
  {
    id: "clasica",
    label: "Clásica",
    blurb: "El recorrido completo: problema, solución, prueba y precio.",
    structure: [
      "hero",
      "problems",
      "solution",
      "modules",
      "bonuses",
      "pricing",
      "testimonials",
      "guarantee",
      "faq",
      "cta",
      "footer",
    ],
  },
  {
    id: "lanzamiento",
    label: "Lanzamiento",
    blurb: "Con contador y precio arriba. Para una promo con fecha de cierre.",
    structure: [
      "countdown",
      "hero",
      "problems",
      "benefits",
      "pricing",
      "bonuses",
      "comparison",
      "testimonials",
      "guarantee",
      "faq",
      "cta",
      "footer",
    ],
  },
  /*
   * El orden de una página de infoproducto que ya vende.
   *
   * No es una variante estética de la clásica: cambia lo que hace la página. En
   * la clásica el vendedor explica el problema y después su solución; acá la
   * persona primero se reconoce ("esto es para vos si…") y después se ve del
   * otro lado ("en 30 días vas a lograr…"), y recién ahí aparece el producto.
   * Es el orden que usan las páginas de ebooks y cursos de precio bajo, donde
   * el que llega viene de un anuncio y decide en veinte segundos.
   *
   * La barra de urgencia va arriba de todo y las compras en vivo justo antes
   * del precio, que es donde la duda pesa más. Las dos se alimentan de datos
   * reales del funnel: si no hay gente mirando ni ventas hechas, no dicen nada.
   */
  {
    id: "infoproducto",
    label: "Infoproducto",
    blurb: "Para ebooks y cursos de precio bajo. La persona se reconoce, se ve del otro lado y compra.",
    structure: [
      "urgency_bar",
      "hero",
      "para_vos_si",
      "vas_a_lograr",
      "bonuses",
      "solution",
      "modules",
      "live_purchases",
      "pricing",
      "guarantee",
      "testimonials",
      "faq",
      "cta",
      "footer",
    ],
  },
  {
    id: "express",
    label: "Express",
    blurb: "Corta y al grano. Para gente que ya te conoce.",
    structure: [
      "hero",
      "problems",
      "solution",
      "benefits",
      "pricing",
      "guarantee",
      "faq",
      "cta",
      "footer",
    ],
  },
];

export const DEFAULT_LAYOUT = LANDING_LAYOUTS[0];

/** El estilo con ese id, o el clásico si el id no existe (o es de otra versión). */
export function findLayout(id: unknown): LandingLayout {
  return LANDING_LAYOUTS.find((layout) => layout.id === id) ?? DEFAULT_LAYOUT;
}

/**
 * Reordena las secciones existentes según un estilo, sin perder ninguna.
 *
 * Tres reglas, en este orden:
 *
 *  1. Los bloques que el estilo pide y el vendedor ya tiene se reubican con su
 *     contenido intacto. Si tenía dos del mismo tipo, van los dos.
 *  2. Los que el estilo pide y no existen se crean con su contenido de ejemplo,
 *     igual que si los hubiera agregado a mano.
 *  3. Los que tenía y el estilo no incluye NO se borran: quedan al final. Un
 *     cambio de estilo no puede hacer desaparecer texto que alguien escribió.
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

  // Lo que el estilo no contempla va al final, en el orden original.
  for (const section of sections) {
    if (porTipo.has(section.type)) resultado.push(section);
  }

  return resultado;
}
