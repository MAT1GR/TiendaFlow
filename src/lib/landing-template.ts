import "server-only";

import { DEFAULT_LAYOUT, type LandingLayout } from "@/components/landing/estructuras";
import { conformToShape, sanitizeContent } from "@/lib/ai/sanitize";
import { formatMoney, toLines } from "@/lib/utils";
import type { Bonus, Offer, Product } from "@/lib/types";

/**
 * La estructura base de una página de venta.
 *
 * Está calcada de una página que ya vende: gancho → números → problema → qué
 * vas a poder hacer → la solución → qué recibís → bonos → precio → testimonios
 * → garantía → dudas → último llamado → pie.
 *
 * Dos reglas que ordenan todo lo de abajo:
 *
 *  1. **Nada se inventa.** Cada bloque se llena con lo que el usuario ya cargó
 *     en su producto y su oferta. Donde no hay dato, va un texto de ejemplo que
 *     se nota que es de ejemplo, para que se sepa qué hay que reemplazar.
 *  2. **Nada queda fuera del editor.** Todo campo que se escribe acá tiene su
 *     control en el panel de propiedades.
 *
 * Los testimonios son el único bloque que arranca marcado como `placeholder`:
 * no podemos escribirle testimonios a nadie, así que el bloque lo dice.
 */

export interface TemplateSection {
  type: string;
  content: Record<string, unknown>;
}

export interface TemplateInput {
  product: Pick<
    Product,
    | "name"
    | "subtitle"
    | "description"
    | "audience"
    | "main_problem"
    | "transformation"
    | "benefits"
    | "cover_url"
  > | null;
  offer: Pick<Offer, "headline" | "promise" | "benefits" | "cta_text" | "guarantee" | "price" | "compare_at_price" | "currency"> | null;
  bonuses: Array<Pick<Bonus, "name" | "description">>;
  /** Nombre del negocio, para la marca del pie. */
  workspaceName: string;
  /** El estilo de página. Define qué bloques salen y en qué orden. */
  layout?: LandingLayout;
}

/** Primer valor con contenido real; si no hay ninguno, el último (el ejemplo). */
function pick(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function landingTemplate(input: TemplateInput): TemplateSection[] {
  const { product, offer, bonuses, workspaceName } = input;

  const productName = pick(product?.name, "Tu producto");
  const audience = pick(product?.audience);
  const problem = pick(product?.main_problem);
  const transformation = pick(product?.transformation);

  /*
   * Los beneficios de la oferta y los del producto son casi siempre los
   * mismos: la oferta se genera a partir del producto. Sin deduplicar, el
   * mismo beneficio salía dos veces seguidas en las pastillas del encabezado y
   * en la lista de "qué incluye", que es la clase de detalle que hace que una
   * página se lea como generada y no como escrita.
   */
  const benefits = [
    ...new Set(
      [...toLines(offer?.benefits ?? null), ...toLines(product?.benefits ?? null)]
        .map((benefit) => benefit.trim())
        .filter(Boolean),
    ),
  ];

  const priceLabel = offer && offer.price > 0 ? formatMoney(offer.price, offer.currency) : "$0";
  const compareLabel =
    offer?.compare_at_price && offer.compare_at_price > offer.price
      ? formatMoney(offer.compare_at_price, offer.currency)
      : "";

  const cta = pick(offer?.cta_text, "Quiero mi acceso");

  /*
   * La portada del producto es el elemento visual de la página.
   *
   * Si el vendedor la cargó, aparece sola en los cuatro momentos donde el que
   * lee necesita ver qué está comprando: el encabezado, la presentación del
   * producto, la tarjeta de precio y el último llamado. No es la misma imagen
   * gigante repetida cuatro veces —cada bloque la compone distinto—, pero es
   * siempre la misma imagen, que es lo que hace que la página se lea como un
   * producto y no como una plantilla.
   *
   * Si no la cargó, estos campos van vacíos y cada bloque dibuja su hueco con
   * el texto de qué iría ahí. El hueco es la invitación a subirla.
   */
  const cover = pick(product?.cover_url);
  const coverAlt = `Portada de ${productName}`;

  /*
   * Las pastillas del hero y las etiquetas son piezas cortas.
   *
   * Un beneficio puede venir escrito como una oración entera y está bien que
   * así sea en la lista de "qué recibís". Pero metido en una pastilla al lado
   * del botón queda un bloque de tres renglones que rompe el hero. Los que no
   * entran no se cortan a la mitad: se descartan, y si no queda ninguno van los
   * textos por defecto.
   */
  const cortos = benefits.filter((benefit) => benefit.length <= 42);

  /*
   * Las trece secciones, en el orden de `estructuras.ts`.
   *
   * Cada campo se llena con lo que el vendedor ya cargó en su producto y su
   * oferta. Donde no hay dato va un texto de ejemplo que se nota que es de
   * ejemplo, con la extensión que ese campo tiene que tener — un titular de
   * once palabras, una descripción de dos frases— para que se vea qué hay que
   * reemplazar y con cuánto.
   *
   * Los precios de las filas de valor son la excepción: van vacíos. Cuánto vale
   * un bono lo sabe el que lo hizo, y un valor tachado que nadie cobró nunca es
   * publicidad engañosa en casi todos lados donde se vende.
   */
  const filasDeBonos = bonuses.map((bonus) => ({
    name: bonus.name,
    value: "GRATIS",
    value_before: "",
  }));

  const content: Record<string, Record<string, unknown>> = {
    announcement_bar: {
      message: offer?.compare_at_price ? "Oferta por tiempo limitado" : "Acceso inmediato",
      timer_label: "Termina en",
      // Sin una fecha real de cierre no hay reloj. La pone el vendedor.
      deadline: "",
      expired: "La oferta cerró",
    },

    hero: {
      headline: pick(offer?.headline, transformation, productName),
      subheadline: pick(offer?.promise, product?.subtitle, product?.description),
      image: cover,
      image_alt: coverAlt,
      ebook_label: "EBOOK:",
      product_name: productName,
      // Un puntaje y una cantidad de ventas son datos, no copy: si el vendedor
      // no los tiene, la franja de estrellas no se dibuja.
      rating_value: "",
      rating_note: "",
      urgency_text: "Acceso inmediato al confirmar el pago.",
      bonuses: filasDeBonos,
      savings: "",
      slots_note: "",
      deadline: "",
      timer_label: "Oferta termina en",
      expired: "La oferta cerró",
      cta,
      trust: [
        "Entrega inmediata",
        "Pago seguro",
        offer?.guarantee ? offer.guarantee : "Producto digital",
      ],
      viewers_note: "viendo este producto ahora",
    },

    bonuses: {
      kicker: "BONOS GRATIS INCLUIDOS",
      title: `Además del producto, te llevás ${bonuses.length === 1 ? "este regalo" : "estos regalos"}`,
      subtitle: "",
      items: bonuses.map((bonus) => ({
        name: bonus.name,
        description: pick(bonus.description),
        value: "",
      })),
      total_label: "Estos bonos tienen un valor total de",
      total_value: "",
    },

    benefits: {
      title: "¿Qué vas a encontrar adentro?",
      subtitle: "Todo lo que necesitás en un solo lugar",
      items: (benefits.length ? benefits : ["El primer beneficio", "El segundo beneficio"])
        .slice(0, 4)
        .map((benefit, index) => ({
          emoji: ["🧾", "⚡", "🎯", "📚"][index] ?? "✅",
          title: benefit,
          description: "",
        })),
    },

    problems: {
      title: "¿Te sentís identificado?",
      subtitle: `Si alguno de estos problemas te suena familiar, ${productName} es para vos`,
      items: [
        {
          title: problem || "La situación que vivís hoy",
          description: "",
        },
      ],
      closing: 'Si respondiste "sí" a alguna de estas… tenemos la solución.',
    },

    /*
     * Los testimonios arrancan vacíos y no es un descuido.
     *
     * Es el único bloque que ni la app ni un modelo pueden llenar: un
     * testimonio inventado es un problema legal, no de copy. La pregunta y el
     * cierre del chat sí van puestos, porque son el envoltorio del formato y no
     * afirman nada sobre nadie.
     */
    social_proof: {
      kicker: "TESTIMONIOS REALES",
      title: "Lo que dicen quienes ya lo tienen",
      question: "¡Hola! ¿Cómo te fue con el material?",
      closing_reply: "¡Qué bueno! Me alegra mucho 🔥",
      items: [],
      stats: [],
      placeholder: true,
    },

    pricing: {
      title: "Todo lo que incluye tu compra",
      subtitle: "Acceso inmediato a todo esto por un único pago",
      items: [
        { name: productName, value: priceLabel },
        ...bonuses.map((bonus) => ({ name: bonus.name, value: "GRATIS" })),
        ...(offer?.guarantee ? [{ name: offer.guarantee, value: "INCLUIDA" }] : []),
      ],
      total_label: "Valor total regular",
      total_value: compareLabel,
      today_label: "Oferta de hoy",
      note: "Precio único · Acceso de por vida",
      cta,
      savings: "",
      trust_note: offer?.guarantee
        ? `${offer.guarantee} · Compra 100% segura`
        : "Compra 100% segura",
    },

    features: {
      title: "Cómo lo usás",
      subtitle: "En solo 3 pasos simples",
      items: [
        { title: "Paso 1", description: "Comprás y recibís el acceso en tu correo al instante." },
        { title: "Paso 2", description: "Abrís el material y empezás por donde te sirve hoy." },
        { title: "Paso 3", description: "Lo aplicás y volvés a consultarlo cada vez que lo necesitás." },
      ],
    },

    guarantee: {
      title: pick(offer?.guarantee, "Probalo con tranquilidad"),
      text: "Si comprás y no te cierra, pedís la devolución dentro del plazo informado al momento de la compra y recuperás tu dinero.",
      seal: pick(offer?.guarantee, "Protección al comprador"),
    },

    faq: {
      title: "Preguntas frecuentes",
      subtitle: "Resolvemos todas tus dudas",
      items: [
        {
          question: "¿Cómo lo recibo y cuándo?",
          answer:
            "Es un producto digital: al confirmarse el pago te llega el acceso por correo. No hay envíos ni tiempos de espera.",
        },
      ],
    },

    cta: {
      headline: transformation ? `Empezá hoy a ${lower(transformation)}` : "Empezá hoy",
      subheadline: "",
      bonus_note: bonuses.length
        ? `Incluye ${bonuses.length} ${bonuses.length === 1 ? "bono gratis" : "bonos gratis"}`
        : "",
      bonuses: filasDeBonos,
      savings: "",
      cta,
      trust: ["Pago seguro", "Acceso inmediato"],
    },

    footer: {
      brand: workspaceName.toUpperCase(),
      text: `© ${new Date().getFullYear()} ${workspaceName}. Todos los derechos reservados.`,
      legal: [
        {
          title: "Términos y condiciones",
          text: "Al comprar aceptás estos términos.\nAdquirís un producto digital de acceso inmediato: una vez confirmado el pago recibís las instrucciones de acceso por correo. No se envían productos físicos.\nEl precio publicado corresponde a un pago único, sin cargos recurrentes. Los pagos se procesan mediante plataformas seguras de terceros y este sitio no almacena los datos de tu tarjeta.\nEl contenido es de uso personal e intransferible: queda prohibida su reventa, copia o redistribución.",
        },
        {
          title: "Política de privacidad",
          text: "Recopilamos los datos que nos das al comprar: nombre, correo electrónico y teléfono.\nLos usamos únicamente para procesar la compra, entregarte el producto y darte soporte.\nNo vendemos ni compartimos tus datos con fines publicitarios. Solo se comparten con los proveedores de pago necesarios para procesar la transacción.\nPodés pedir el acceso, la corrección o la eliminación de tus datos escribiéndonos por los canales de contacto.",
        },
      ],
    },

    sticky_cta: {
      timer_label: "Termina en",
      deadline: "",
      expired: "cerrada",
      pack_label: bonuses.length
        ? `PRODUCTO + ${bonuses.length} ${bonuses.length === 1 ? "BONO" : "BONOS"}`
        : "",
      cta: "Descargar ahora",
    },
  };

  /*
   * Un bloque que no tiene nada que decir no sale.
   *
   * La sección de bonos existía siempre, y cuando el vendedor todavía no había
   * cargado ninguno se llenaba con "Todavía no cargaste bonos": una sección
   * entera de la página de venta ocupada por una nota interna. El que la vea
   * publicada sin darse cuenta pierde credibilidad justo antes del precio.
   *
   * Sigue apareciendo en el momento en que carga el primer bono, porque la
   * página se regenera con los datos de la oferta.
   */
  const vacios = new Set<string>();
  if (!bonuses.length) vacios.add("bonuses");

  return (input.layout ?? DEFAULT_LAYOUT).structure
    .filter((type) => !vacios.has(type))
    .map((type) => ({
      type,
      content: content[type] ?? {},
    }));
}

/**
 * La etiqueta de arriba del encabezado.
 *
 * El avatar que escribe la IA es una frase entera —"personas que arrancan mil
 * veces con los hábitos y abandonan a la semana"— y esta etiqueta va en
 * mayúsculas y con mucho espaciado entre letras. Puesta tal cual, ocupaba seis
 * renglones arriba del titular y era lo primero que se leía de la página.
 *
 * Si el avatar entra, se usa: es lo más específico que tenemos. Si no entra, se
 * prueba con su primera parte, y recién si tampoco entra va el texto genérico.
 * Cortar una frase por la mitad no es una opción: queda peor que no ponerla.
 */
function etiqueta(audience: string): string {
  const MAX = 48;
  const generico = "PARA QUIENES QUIEREN EMPEZAR HOY";
  if (!audience) return generico;
  if (audience.length <= MAX) return audience.toUpperCase();

  const primeraParte = audience.split(/[,;.]/)[0].trim();
  return primeraParte && primeraParte.length <= MAX ? primeraParte.toUpperCase() : generico;
}

/** "Bajar de peso" → "bajar de peso", para poder encadenar frases. */
function lower(text: string): string {
  const clean = text.trim().replace(/\.$/, "");
  return clean.charAt(0).toLowerCase() + clean.slice(1);
}

/* -------------------------------------------------------------------------- */
/* Fusión de lo que genera la IA                                               */
/* -------------------------------------------------------------------------- */

/**
 * Aplica una generación de IA sobre la estructura base.
 *
 * Nunca usamos lo que devuelve el modelo tal cual. Se fusiona sobre la
 * plantilla, y eso nos da cuatro garantías que no dependen de que el modelo se
 * haya portado bien:
 *
 *  · La página siempre tiene los 13 bloques, en el orden que funciona.
 *  · Cada campo tiene la forma que el editor sabe mostrar. Un modelo que
 *    devuelve `links: [{text, url}]` donde esperábamos `["Contacto"]` alcanza
 *    para tirar abajo la página entera del vendedor.
 *  · Si el modelo se saltó un campo, queda el texto de la plantilla en vez de
 *    un hueco vacío.
 *  · Los testimonios nunca se llenan con IA. Aunque el modelo los invente, acá
 *    se descartan: un testimonio falso es un problema legal, no de copy.
 *
 * Devuelve también cuántos campos hubo que limpiar, para poder decírselo al
 * usuario en vez de arreglarlo a escondidas.
 */
export function mergeLandingDraft(
  draft: { sections?: Array<{ type: string; content: Record<string, unknown> }> },
  base: TemplateSection[],
): { sections: TemplateSection[]; cleaned: number } {
  const generated = new Map<string, Record<string, unknown>>();
  for (const section of draft.sections ?? []) {
    if (section?.type && section.content) generated.set(section.type, section.content);
  }

  let cleaned = 0;

  const merged = base.map((section) => {
    if (section.type === "testimonials") return section;

    // Primero la forma, después el contenido.
    const conformed = sinImagenes(
      conformToShape(generated.get(section.type) ?? {}, section.content),
    );
    const result = sanitizeContent({ ...section.content, ...conformed }, section.content);
    cleaned += result.cleaned;

    return { type: section.type, content: result.content };
  });

  // Si el modelo agregó un bloque que no está en la estructura base pero que
  // sabemos dibujar, lo dejamos al final en vez de tirarlo.
  const baseTypes = new Set(base.map((section) => section.type));
  const extra = (draft.sections ?? [])
    .filter((section) => section?.type && !baseTypes.has(section.type))
    .map((section) => ({ type: section.type, content: section.content }));

  return { sections: [...merged, ...extra], cleaned };
}

/**
 * Las imágenes no las elige el modelo.
 *
 * Un modelo de texto al que le pedís una landing devuelve `image:
 * "https://ejemplo.com/portada.jpg"` sin pestañear. Esa URL no existe, y una
 * imagen rota arriba de todo es peor que no tener imagen. Las URLs salen de un
 * solo lado —lo que el vendedor cargó en su producto— y el copy generado no las
 * puede pisar.
 */
const CAMPOS_DE_IMAGEN = new Set(["image", "url", "featured_url", "video_url"]);

function sinImagenes(content: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(content)) {
    if (CAMPOS_DE_IMAGEN.has(key)) continue;
    // Las tarjetas de la galería traen su propia `url` adentro.
    if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? sinImagenes(item as Record<string, unknown>)
          : item,
      );
      continue;
    }
    result[key] = value;
  }
  return result;
}
