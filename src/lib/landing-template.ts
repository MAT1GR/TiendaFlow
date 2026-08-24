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

  const content: Record<string, Record<string, unknown>> = {
    hero: {
      eyebrow: etiqueta(audience),
      image: cover,
      image_alt: coverAlt,
      headline: pick(offer?.headline, transformation, productName),
      subheadline: pick(offer?.promise, product?.subtitle, product?.description),
      cta,
      pills: cortos.slice(0, 3).length
        ? cortos.slice(0, 3)
        : ["Acceso inmediato", "Pago único", "Desde cero"],
      social: "Material digital para consultar y volver a usar siempre",
      trust: offer?.guarantee
        ? `${offer.guarantee} · Pago único · Acceso inmediato`
        : "Pago único · Acceso digital inmediato",
    },

    stats: {
      items: [
        { value: String(benefits.length || 6), label: "beneficios" },
        { value: String(bonuses.length || 0), label: "bonos" },
        { value: "100%", label: "digital" },
        { value: "24/7", label: "acceso" },
      ],
      highlights: [
        {
          title: "Todo en un solo lugar",
          subtitle: "Ordenado y fácil de seguir",
          text: "No tenés que buscar nada por fuera: está todo adentro y organizado.",
        },
        {
          title: "Para empezar hoy",
          subtitle: "Sin experiencia previa",
          text: "Está pensado para que puedas dar el primer paso el mismo día que lo comprás.",
        },
        {
          title: "Tuyo para siempre",
          subtitle: "Sin suscripciones",
          text: "Lo pagás una vez y volvés a consultarlo cuando quieras.",
        },
      ],
    },

    problems: {
      title: transformation ? `Querés ${lower(transformation)}.` : "Querés lograrlo.",
      subtitle: problem ? `Pero ${lower(problem)}` : "Pero no sabés por dónde empezar.",
      // El problema ya se dijo en el subtítulo: repetirlo textual en el primer
      // ítem se lee como un error, no como énfasis.
      items: problem
        ? [
            "Empezás, lo dejás a la mitad y volvés a arrancar de cero cada vez.",
            "Juntás información suelta pero nunca terminás de armar algo que funcione.",
            "Probás lo que ves por ahí y no sabés si te sirve a vos.",
          ]
        : [
            "Guardás ideas por todos lados y cuando llega el momento no sabés cuál usar.",
            "Improvisás sobre la marcha y el resultado nunca se parece a lo que imaginabas.",
            "Creés que necesitás experiencia o herramientas caras para lograr algo bueno.",
          ],
      closing: "El problema no es tu capacidad.\nEs empezar sin una referencia clara.",
    },

    gallery: {
      kicker: "IMAGINÁ TODO LO QUE PODÉS LOGRAR",
      title: transformation || "Esto es lo que vas a poder hacer",
      subtitle: "Una imagen principal, un video opcional y algunos ejemplos de lo que se puede lograr.",
      featured_alt: `Imagen principal de ${productName}`,
      featured_url: cover,
      video_url: "",
      images: Array.from({ length: 6 }, (_, index) => ({ alt: `Ejemplo ${index + 1}`, url: "" })),
      note: "",
    },

    solution: {
      badge: "LA SOLUCIÓN",
      image: cover,
      image_alt: coverAlt,
      title: productName,
      subtitle: pick(product?.subtitle, offer?.promise),
      text: pick(
        product?.description,
        "Todo lo que necesitás para pasar de “no sé por dónde empezar” a tener algo claro adelante.",
      ),
      tags: cortos.slice(0, 4),
      highlight: "No necesitás experiencia previa.",
      stats: [
        { value: String(benefits.length || 6), label: "beneficios" },
        { value: String(bonuses.length || 0), label: "bonos" },
        { value: "100%", label: "digital" },
      ],
      features: ["Paso a paso", "Descargable", "Para principiantes", "Acceso inmediato"],
    },

    modules: {
      kicker: "TODO INCLUIDO EN UN SOLO ACCESO",
      title: `Esto es lo que recibís dentro de ${productName}`,
      box_title: "QUÉ INCLUYE",
      items: benefits.length
        ? benefits.slice(0, 6).map((benefit, index) => ({
            title: benefit,
            description: `Detalle del punto ${index + 1}. Contá acá qué se lleva la persona y para qué le sirve.`,
          }))
        : [
            {
              title: "El contenido principal",
              description: "El corazón del producto, organizado y listo para usar.",
            },
            {
              title: "Cómo aplicarlo",
              description: "Qué hacer con lo que recibís, paso a paso.",
            },
          ],
      metrics: [
        { value: String(benefits.length || 6), label: "beneficios" },
        { value: String(bonuses.length || 0), label: "bonos" },
      ],
    },

    bonuses: {
      kicker: "RECURSOS COMPLEMENTARIOS",
      title: bonuses.length ? `Además te llevás ${bonuses.length} bonos` : "Además te llevás estos bonos",
      items: bonuses.length
        ? bonuses.map((bonus) => ({
            name: bonus.name,
            description: bonus.description ?? "",
            badge: "INCLUIDO",
          }))
        : [
            {
              name: "Todavía no cargaste bonos",
              description: "Sumalos desde Mi oferta y aparecen acá automáticamente.",
              badge: "INCLUIDO",
            },
          ],
      footer_note: "Todos incluidos con tu acceso, sin pagos mensuales.",
    },

    pricing: {
      title: transformation ? `Empezá hoy a ${lower(transformation)}` : "Empezá hoy",
      badge: "ACCESO COMPLETO",
      image: cover,
      image_alt: coverAlt,
      product_name: productName,
      subtitle: pick(product?.subtitle, offer?.promise),
      price_label: priceLabel,
      compare_label: compareLabel,
      note: "Pago único, sin suscripciones",
      includes: benefits.length
        ? benefits.slice(0, 6)
        : ["Lo principal que te llevás", "El segundo entregable", "Acceso inmediato"],
      cta,
      trust: [
        "Pago único",
        "Acceso inmediato",
        offer?.guarantee ? offer.guarantee : "Garantía de 7 días",
      ],
    },

    testimonials: {
      kicker: "",
      title: "Lo que dicen quienes ya lo tienen",
      subtitle: "Reemplazá estos textos por testimonios reales antes de publicar.",
      items: [
        { name: "Nombre real de tu cliente", location: "", text: "Su comentario, tal cual te lo escribió." },
        { name: "Nombre real de tu cliente", location: "", text: "Su comentario, tal cual te lo escribió." },
      ],
      placeholder: true,
    },

    guarantee: {
      title: "Probalo con tranquilidad",
      text: pick(
        offer?.guarantee,
        "Si dentro de los primeros 7 días considerás que no es para vos, podés pedir la devolución según las condiciones informadas al momento de la compra.",
      ),
      seal: "GARANTÍA DE 7 DÍAS",
      note: "El acceso es digital e inmediato. No se envía ningún producto físico.",
    },

    faq: {
      kicker: "PREGUNTAS FRECUENTES",
      title: "Todo lo que necesitás saber\nantes de empezar",
      items: [
        {
          question: "¿Cómo lo recibo?",
          answer: "Es digital: apenas se confirma el pago te llega por mail el acceso a todo el material.",
        },
        {
          question: "¿Necesito experiencia previa?",
          answer: "No. Está organizado para que puedas empezar desde cero y avanzar a tu ritmo.",
        },
        {
          question: "¿Puedo verlo cuando quiera?",
          answer: "Sí. No hay horarios ni clases en vivo: entrás y consultás las veces que necesites.",
        },
        {
          question: "¿Qué pasa si no era lo que esperaba?",
          answer: pick(
            offer?.guarantee,
            "Tenés una garantía de 7 días, sujeta a las condiciones informadas al momento de la compra.",
          ),
        },
      ],
    },

    cta: {
      kicker: "PODÉS EMPEZAR HOY",
      image: cover,
      image_alt: coverAlt,
      headline: "No necesitás esperar a estar listo.",
      subheadline: "Solo necesitás dar el primer paso.",
      cta,
      micro: `Acceso digital inmediato · ${priceLabel} · Pago único`,
      trust: [
        "Pago único",
        "Acceso inmediato",
        offer?.guarantee ? offer.guarantee : "Garantía de 7 días",
      ],
    },

    /* --- Bloques que usan los estilos "Lanzamiento" y "Express" --- */

    countdown: {
      title: transformation ? `Empezá hoy a ${lower(transformation)}` : "Precio de lanzamiento",
      text: "Poné acá la fecha real de cierre de tu promo. Si no tenés una, sacá este bloque: un contador que nunca termina se nota.",
    },

    benefits: {
      title: "Con esto vas a poder",
      items: benefits.length
        ? benefits.slice(0, 6)
        : [
            "El primer resultado concreto que se lleva",
            "El segundo, con el mismo nivel de detalle",
            "El tercero, para cerrar",
          ],
    },

    features: {
      title: "Cómo funciona",
      items: [
        {
          title: "1. Pagás y accedés al toque",
          description:
            "Apenas se confirma el pago te llega el acceso por mail. Sin esperas ni envíos.",
        },
        {
          title: "2. Entrás al material",
          description: pick(
            product?.subtitle,
            "Está todo ordenado adentro, para que sepas por dónde empezar.",
          ),
        },
        {
          title: "3. Lo aplícás",
          description: transformation
            ? `Vas siguiendo el paso a paso hasta ${lower(transformation)}.`
            : "Vas siguiendo el paso a paso a tu ritmo.",
        },
      ],
    },

    comparison: {
      title: "La diferencia entre seguir probando y tenerlo resuelto",
      without_title: "Por tu cuenta",
      with_title: `Con ${productName}`,
      without_items: problem
        ? [
            problem,
            "Juntás información suelta y nunca terminás de armar algo que funcione.",
            "Empezás, lo dejás a la mitad y volvés a arrancar de cero.",
          ]
        : [
            "Probás cosas sueltas sin saber si van a funcionar.",
            "Improvisás sobre la marcha.",
            "Seguís “probando” en vez de tener algo armado.",
          ],
      with_items: benefits.length
        ? benefits.slice(0, 4)
        : [
            "Tenés un paso a paso probado.",
            "Sabés exactamente qué hacer primero.",
            "Aplicás desde el primer día.",
          ],
    },

    footer: {
      brand: workspaceName.toUpperCase(),
      text: `© ${new Date().getFullYear()} ${workspaceName}. Todos los derechos reservados.`,
      links: ["Términos y condiciones", "Política de privacidad", "Contacto"],
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
