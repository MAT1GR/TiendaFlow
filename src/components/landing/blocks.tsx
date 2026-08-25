import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { cn, relativeTime } from "@/lib/utils";

/**
 * Renderizador de secciones de landing.
 *
 * Se usa igual en el editor (preview) y en la página pública, así que lo que
 * ves editando es exactamente lo que ve el visitante.
 *
 * La estructura sigue la de una página de venta que ya funciona: gancho →
 * datos → problema → qué vas a poder hacer → la solución → qué recibís →
 * bonos → precio → testimonios → garantía → dudas → último llamado. Cada
 * bloque es editable campo por campo: no hay texto que solo se pueda cambiar
 * tocando el código.
 */

export interface SectionData {
  id: string;
  type: string;
  content: Record<string, unknown>;
}

export const SECTION_LIBRARY: Array<{
  type: string;
  label: string;
  /** El emoji con el que se lo reconoce en la lista de secciones. */
  emoji: string;
  group: "Recomendadas" | "Para sumar confianza" | "Imágenes y video" | "Texto suelto";
  icon: Parameters<typeof Icon>[0]["name"];
  defaults: Record<string, unknown>;
}> = [
  /* --- La estructura base, en orden --- */
  {
    type: "hero",
    label: "Encabezado",
    emoji: "🎯",
    group: "Recomendadas",
    icon: "star",
    defaults: {
      eyebrow: "PARA QUIENES…",
      headline: "El resultado que promete tu producto",
      subheadline: "Una línea que explique cómo lo consigue, y para quién es.",
      cta: "Quiero empezar",
      image: "",
      image_alt: "Portada del producto",
      pills: ["Acceso inmediato", "Pago único", "Desde cero"],
      social: "Material descargable para consultar siempre",
      trust: "Garantía de 7 días · Pago único · Acceso digital inmediato",
    },
  },
  {
    type: "stats",
    label: "Los números de tu oferta",
    emoji: "🔢",
    group: "Para sumar confianza",
    icon: "chart",
    defaults: {
      items: [
        { value: "50", label: "recursos" },
        { value: "6", label: "módulos" },
        { value: "5", label: "bonos" },
        { value: "+150", label: "referencias" },
      ],
      highlights: [
        {
          title: "Todo organizado",
          subtitle: "Por tema y dificultad",
          text: "Encontrás rápido lo que necesitás, sin tener que leerlo todo.",
        },
      ],
    },
  },
  {
    type: "problems",
    label: "El problema",
    emoji: "😕",
    group: "Recomendadas",
    icon: "warning",
    defaults: {
      title: "Querés lograrlo.",
      subtitle: "Pero no sabés por dónde empezar.",
      items: [
        "Guardás ideas por todos lados y cuando llega el momento no sabés cuál usar.",
        "Improvisás sobre la marcha y el resultado nunca se parece a lo que imaginabas.",
        "Creés que necesitás experiencia o herramientas caras para lograr algo bueno.",
      ],
      closing: "El problema no es tu capacidad.\nEs empezar sin una referencia clara.",
    },
  },
  {
    type: "gallery",
    label: "Galería de imágenes",
    emoji: "📸",
    group: "Imágenes y video",
    icon: "image",
    defaults: {
      kicker: "IMAGINÁ TODO LO QUE PODÉS LOGRAR",
      title: "Lo que vas a poder hacer con esto",
      subtitle: "Una imagen principal, un video opcional y una selección de ejemplos.",
      featured_alt: "Imagen principal del producto",
      featured_url: "",
      video_url: "",
      images: [
        { alt: "Ejemplo 1", url: "" },
        { alt: "Ejemplo 2", url: "" },
        { alt: "Ejemplo 3", url: "" },
        { alt: "Ejemplo 4", url: "" },
        { alt: "Ejemplo 5", url: "" },
        { alt: "Ejemplo 6", url: "" },
      ],
      note: "",
    },
  },
  {
    type: "solution",
    label: "La solución",
    emoji: "💡",
    group: "Recomendadas",
    icon: "sparkles",
    defaults: {
      badge: "UNA BIBLIOTECA PARA USAR UNA Y OTRA VEZ",
      image: "",
      image_alt: "Portada del producto",
      title: "El nombre de tu producto",
      subtitle: "La promesa en una línea",
      text: "Todo lo que necesitás para pasar de “no sé qué hacer” a tener algo claro adelante.",
      tags: ["Paso a paso", "Desde cero", "Ideas de proyectos"],
      highlight: "No necesitás experiencia previa.",
      stats: [
        { value: "50", label: "recursos" },
        { value: "10", label: "estilos" },
        { value: "25+", label: "proyectos" },
      ],
      features: ["Paso a paso", "Descargable", "Para principiantes", "Acceso inmediato"],
    },
  },
  {
    type: "modules",
    label: "Qué recibís",
    emoji: "📕",
    group: "Recomendadas",
    icon: "layers",
    defaults: {
      kicker: "TODO INCLUIDO EN UN SOLO ACCESO",
      title: "Esto es lo que recibís",
      box_title: "LOS MÓDULOS",
      items: [
        { title: "Introducción", description: "Por dónde empezar y cómo aprovecharlo desde el día uno." },
        { title: "Lo que necesitás", description: "Materiales, herramientas y alternativas accesibles." },
        { title: "El contenido principal", description: "El corazón del producto, organizado y listo para usar." },
      ],
      metrics: [
        { value: "50", label: "recursos" },
        { value: "25+", label: "proyectos" },
      ],
    },
  },
  {
    type: "bonuses",
    label: "Bonos",
    emoji: "🎁",
    group: "Recomendadas",
    icon: "gift",
    defaults: {
      kicker: "RECURSOS COMPLEMENTARIOS",
      title: "Además te llevás estos bonos",
      items: [{ name: "Bono 1", description: "Qué incluye.", badge: "INCLUIDO" }],
      footer_note: "Todos incluidos con tu acceso, sin pagos mensuales.",
    },
  },
  {
    type: "pricing",
    label: "Precio",
    emoji: "💰",
    group: "Recomendadas",
    icon: "tag",
    defaults: {
      title: "Empezá hoy",
      badge: "ACCESO COMPLETO",
      image: "",
      image_alt: "Portada del producto",
      product_name: "Tu producto",
      subtitle: "Todo lo que incluye, en una línea",
      price_label: "$0",
      compare_label: "",
      note: "Pago único, sin suscripciones",
      includes: ["Lo principal que te llevás", "El segundo entregable", "Acceso inmediato"],
      cta: "Quiero mi acceso",
      trust: ["Pago único", "Acceso inmediato", "Garantía de 7 días"],
    },
  },
  {
    type: "testimonials",
    label: "Testimonios",
    emoji: "💬",
    group: "Recomendadas",
    icon: "users",
    defaults: {
      kicker: "",
      title: "Lo que dicen quienes ya lo tienen",
      subtitle: "",
      items: [{ name: "Nombre del cliente", location: "", text: "Reemplazá con un testimonio real." }],
      placeholder: true,
    },
  },
  {
    type: "guarantee",
    label: "Garantía",
    emoji: "🛡️",
    group: "Recomendadas",
    icon: "shield",
    defaults: {
      title: "Probalo con tranquilidad durante 7 días",
      text: "Si dentro de los primeros 7 días considerás que no es para vos, podés pedir la devolución según las condiciones informadas al momento de la compra.",
      seal: "GARANTÍA DE 7 DÍAS",
      note: "El acceso es digital e inmediato. No se envía ningún producto físico.",
    },
  },
  {
    type: "faq",
    label: "Preguntas frecuentes",
    emoji: "❓",
    group: "Recomendadas",
    icon: "info",
    defaults: {
      kicker: "PREGUNTAS FRECUENTES",
      title: "Todo lo que necesitás saber antes de empezar",
      items: [{ question: "¿Cómo lo recibo?", answer: "Es digital, te llega por mail al confirmar el pago." }],
    },
  },
  {
    type: "cta",
    label: "Último llamado",
    emoji: "🚀",
    group: "Recomendadas",
    icon: "arrowRight",
    defaults: {
      kicker: "PODÉS EMPEZAR HOY",
      headline: "No necesitás esperar a estar listo.",
      subheadline: "Solo necesitás dar el primer paso.",
      image: "",
      image_alt: "Portada del producto",
      cta: "Quiero mi acceso",
      micro: "Acceso digital inmediato · Garantía de 7 días",
      trust: ["Pago único", "Acceso inmediato", "Garantía de 7 días"],
    },
  },
  {
    type: "footer",
    label: "Pie de página",
    emoji: "🦾",
    group: "Texto suelto",
    icon: "file",
    defaults: {
      brand: "TU MARCA",
      text: "© Tu marca. Todos los derechos reservados.",
      links: ["Términos y condiciones", "Política de privacidad", "Contacto"],
    },
  },

  /* --- Bloques sueltos que se pueden sumar --- */
  {
    type: "headline",
    label: "Titular suelto",
    emoji: "📝",
    group: "Texto suelto",
    icon: "edit",
    defaults: { text: "Un titular que rompa la objeción principal" },
  },
  {
    type: "subheadline",
    label: "Subtítulo suelto",
    emoji: "📄",
    group: "Texto suelto",
    icon: "edit",
    defaults: { text: "Una línea de apoyo que sume claridad." },
  },
  {
    type: "benefits",
    label: "Beneficios",
    emoji: "⭐",
    group: "Recomendadas",
    icon: "check",
    defaults: { title: "Lo que te llevás", items: ["Primer beneficio", "Segundo beneficio"] },
  },
  {
    type: "features",
    label: "Cómo funciona",
    emoji: "🗺️",
    group: "Para sumar confianza",
    icon: "layers",
    defaults: {
      title: "Cómo funciona",
      items: [
        { title: "1. Comprás", description: "Pago simple y seguro." },
        { title: "2. Recibís", description: "Acceso inmediato." },
      ],
    },
  },
  {
    type: "comparison",
    label: "Con esto vs. sin esto",
    emoji: "⚖️",
    group: "Para sumar confianza",
    icon: "chart",
    defaults: {
      title: "Con esto vs. sin esto",
      with_title: "Con la guía",
      without_title: "Por tu cuenta",
      with_items: ["Método paso a paso"],
      without_items: ["Prueba y error"],
    },
  },
  {
    type: "mockup",
    label: "Mockup del producto",
    emoji: "📦",
    group: "Imágenes y video",
    icon: "box",
    defaults: { title: "Así se ve por dentro", caption: "Vista del material" },
  },
  {
    type: "countdown",
    label: "Contador",
    emoji: "⏱️",
    group: "Para sumar confianza",
    icon: "clock",
    defaults: { title: "La oferta cierra pronto", text: "Definí la fecha real de cierre." },
  },
  /*
   * Los dos bloques espejo.
   *
   * Son los que más trabajan en una página de infoproducto y van casi siempre
   * juntos: primero la persona se reconoce en el problema, después se ve del
   * otro lado. Cada ítem son dos líneas —la situación y su consecuencia— y esa
   * segunda línea es la diferencia entre un bullet de cuatro palabras que nadie
   * lee y una frase donde alguien dice "soy yo".
   */
  {
    type: "para_vos_si",
    label: "Esto es para vos si…",
    emoji: "🙋",
    group: "Recomendadas",
    icon: "check",
    defaults: {
      title: "Esto es para vos si…",
      items: [
        {
          line1: "Ya intentaste arrancar por tu cuenta, pero nunca pasás del primer día",
          line2: "porque no tenés un orden claro y terminás dejándolo para la semana que viene.",
        },
        {
          line1: "Juntás tutoriales y capturas, pero cuando llega el momento no sabés cuál usar",
          line2: "porque cada uno dice algo distinto y terminás más confundido que al principio.",
        },
      ],
    },
  },
  {
    type: "vas_a_lograr",
    label: "Vas a lograr…",
    emoji: "🎯",
    group: "Recomendadas",
    icon: "star",
    defaults: {
      title: "En 30 días vas a lograr…",
      items: [
        {
          line1: "Tener tu primer resultado terminado y listo para mostrar",
          line2: "sin improvisar sobre la marcha y con un paso a paso que podés repetir.",
        },
        {
          line1: "Saber exactamente qué hacer cada vez que te sentás a trabajar en esto",
          line2: "sin perder la mañana buscando por dónde empezar y con tiempo de sobra.",
        },
      ],
    },
  },
  {
    type: "urgency_bar",
    label: "Barra de urgencia",
    emoji: "🔥",
    group: "Para sumar confianza",
    icon: "clock",
    defaults: {
      message: "El precio de lanzamiento está por subir",
      note: "Escribí el motivo real por el que conviene comprar hoy.",
    },
  },
  {
    type: "live_purchases",
    label: "Compras en vivo",
    emoji: "🔔",
    group: "Para sumar confianza",
    icon: "star",
    defaults: {
      title: "Últimas compras",
      empty_note: "Cuando tengas tu primera venta, va a aparecer acá sola.",
    },
  },
  {
    type: "social_proof",
    label: "Prueba social",
    emoji: "👍",
    group: "Para sumar confianza",
    icon: "star",
    defaults: { text: "Espacio para prueba social real cuando la tengas.", placeholder: true },
  },
  {
    type: "video",
    label: "Video",
    emoji: "🎥",
    group: "Imágenes y video",
    icon: "video",
    defaults: { title: "Mirá cómo funciona", url: "" },
  },
  {
    type: "image",
    label: "Imagen",
    emoji: "🖼️",
    group: "Imágenes y video",
    icon: "image",
    defaults: { alt: "Descripción de la imagen", url: "" },
  },
];

/** Los bloques que trae una página nueva, en este orden. */
export const BASE_STRUCTURE = [
  "hero",
  "stats",
  "problems",
  "gallery",
  "solution",
  "modules",
  "bonuses",
  "pricing",
  "testimonials",
  "guarantee",
  "faq",
  "cta",
  "footer",
] as const;

/**
 * El contenido de un bloque es JSON libre: lo escribe el usuario, lo genera un
 * modelo o viene de una versión anterior de la app. Por eso los tres lectores
 * de abajo son totales — devuelven algo razonable para CUALQUIER entrada.
 *
 * No es paranoia: un modelo que devuelve `links: [{text, url}]` donde
 * esperábamos `links: ["Contacto"]` alcanza para tirar abajo la página entera
 * del vendedor. La página tiene que aguantar eso y mostrar lo que se pueda.
 */

/** Cualquier valor, convertido al texto más razonable que se pueda. */
function toText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["text", "label", "title", "name", "value", "alt"]) {
      if (typeof record[key] === "string") return record[key];
    }
  }
  return "";
}

function str(content: Record<string, unknown>, key: string, fallback = ""): string {
  const value = content[key];
  return typeof value === "string" && value ? value : fallback;
}

/** Una lista de textos, venga como venga. */
function lines(content: Record<string, unknown>, key: string): string[] {
  const value = content[key];
  if (!Array.isArray(value)) return [];
  return value.map(toText).filter(Boolean);
}

/** Una lista de tarjetas, con todos sus campos ya convertidos a texto. */
function cards(content: Record<string, unknown>, key: string): Array<Record<string, string>> {
  const value = content[key];
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    if (!item || typeof item !== "object") {
      const text = toText(item);
      return { title: text, name: text, text, label: text, question: text, alt: text };
    }
    const result: Record<string, string> = {};
    for (const [field, raw] of Object.entries(item as Record<string, unknown>)) {
      result[field] = toText(raw);
    }
    return result;
  });
}

/** Los saltos de línea que escribe el usuario se respetan tal cual. */
function Multiline({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, index) => (
        <span key={index} className="block">
          {line}
        </span>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Piezas del sistema de diseño                                                */
/* -------------------------------------------------------------------------- */

/**
 * Nada de acá abajo escribe un color a mano.
 *
 * Todo sale de las variables del tema, así que cambiar el preset reskinea la
 * página entera sin tocar un solo renderizador.
 */

function Band({
  children,
  className,
  tono,
  ancho,
}: {
  children: ReactNode;
  className?: string;
  /** `surface` pinta la banda con el color de tarjeta, para alternar el ritmo. */
  tono?: "surface";
  /** Más aire a los costados: lo usa el encabezado cuando va a dos columnas. */
  ancho?: boolean;
}) {
  return (
    <section
      className={cn("px-5 py-12 @2xl:px-8 @2xl:py-16", className)}
      style={tono === "surface" ? { backgroundColor: "var(--tf-surface)" } : undefined}
    >
      <div className={cn("mx-auto w-full", ancho ? "max-w-5xl" : "max-w-3xl")}>{children}</div>
    </section>
  );
}

/**
 * La etiqueta de arriba de cada sección.
 *
 * Mayúsculas, muy espaciada y chica. Es el contrapunto del titular —que va
 * apretado y grande— y buena parte del carácter de estas páginas sale de ese
 * contraste.
 */
function Kicker({ children, className }: { children: string; className?: string }) {
  if (!children) return null;
  return (
    <p
      className={cn("text-center text-[12px] font-extrabold uppercase", className)}
      style={{ color: "var(--tf-accent)", letterSpacing: "0.18em" }}
    >
      {children}
    </p>
  );
}

function Titulo({
  children,
  as = "h2",
  centrado = true,
  className,
}: {
  children: string;
  as?: "h1" | "h2";
  centrado?: boolean;
  className?: string;
}) {
  const Tag = as;
  return (
    <Tag
      className={cn(
        "mt-3 font-extrabold",
        as === "h1"
          ? "text-[clamp(2.1rem,8cqw,3.6rem)] leading-[1.04]"
          : "text-[clamp(1.5rem,4.6cqw,2.15rem)] leading-[1.18]",
        centrado && "text-center",
        className,
      )}
      style={{ color: "var(--tf-text)", letterSpacing: as === "h1" ? "-0.045em" : "-0.03em" }}
    >
      <Multiline text={children} />
    </Tag>
  );
}

function Bajada({
  children,
  centrado = true,
  className,
}: {
  children: string;
  centrado?: boolean;
  className?: string;
}) {
  if (!children) return null;
  return (
    <p
      className={cn(
        "mx-auto mt-4 max-w-2xl text-[16px] leading-relaxed @2xl:text-[17px]",
        centrado && "text-center",
        className,
      )}
      style={{ color: "var(--tf-muted)" }}
    >
      <Multiline text={children} />
    </p>
  );
}

function Caja({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("border p-5", className)}
      style={{
        backgroundColor: "var(--tf-surface)",
        borderColor: "var(--tf-line)",
        borderRadius: "var(--tf-radius-lg)",
      }}
    >
      {children}
    </div>
  );
}

function Pastilla({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1.5 text-[12.5px] font-semibold"
      style={{ borderColor: "var(--tf-line)", color: "var(--tf-muted)" }}
    >
      {children}
    </span>
  );
}

function Numero({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="text-center">
      <p
        className="text-[clamp(1.75rem,6cqw,2.5rem)] font-extrabold leading-none"
        style={{ color: "var(--tf-accent)", letterSpacing: "-0.03em" }}
      >
        {valor}
      </p>
      <p
        className="mt-2 text-[12px] font-bold uppercase"
        style={{ color: "var(--tf-muted)", letterSpacing: "0.06em" }}
      >
        {etiqueta}
      </p>
    </div>
  );
}

function Cta({
  label,
  href,
  grande,
  className: extra,
}: {
  label: string;
  href?: string;
  grande?: boolean;
  className?: string;
}) {
  const className = cn(
    "mx-auto mt-8 flex w-full max-w-md items-center justify-center gap-2 text-center font-extrabold transition-transform active:scale-[.985]",
    grande ? "px-7 py-4.5 text-[16px]" : "px-6 py-3.5 text-[15px]",
    extra,
  );
  const style = {
    backgroundColor: "var(--tf-accent)",
    color: "var(--tf-on-accent)",
    borderRadius: "var(--tf-radius)",
    letterSpacing: "0.01em",
  };

  if (!href) {
    return (
      <span className={className} style={style} aria-hidden="true">
        {label}
      </span>
    );
  }

  return (
    <a href={href} className={className} style={style}>
      {label}
      <Icon name="arrowRight" size={18} />
    </a>
  );
}

/**
 * Hueco de imagen.
 *
 * Mientras no haya almacenamiento de archivos conectado, mostramos el texto
 * alternativo: así se entiende qué va en ese lugar en vez de ver un rectángulo
 * gris sin explicación.
 */
function Hueco({
  label,
  className,
  chico,
}: {
  label: string;
  className?: string;
  chico?: boolean;
}) {
  return (
    <div
      className={cn("grid place-items-center border border-dashed p-4 text-center", className)}
      style={{
        borderColor: "var(--tf-line)",
        backgroundColor: "var(--tf-surface)",
        borderRadius: "var(--tf-radius-lg)",
        color: "var(--tf-muted)",
      }}
    >
      <div>
        <Icon name="image" size={chico ? 20 : 30} className="mx-auto opacity-60" />
        <p className={cn("mt-1.5", chico ? "text-[11.5px]" : "text-[13px]")}>{label}</p>
      </div>
    </div>
  );
}

/**
 * La imagen de un bloque, esté cargada o no.
 *
 * Con URL dibuja la imagen; sin URL, el mismo hueco de siempre con el texto de
 * qué va ahí. Es un solo componente para los dos casos a propósito: la
 * composición del bloque —el lugar, la proporción, el aire alrededor— no
 * cambia según el vendedor haya subido o no su portada, así que la página no
 * se reacomoda entera el día que la sube.
 *
 * `object-contain` y no `cover`: una portada de ebook es vertical y una foto de
 * producto es horizontal. Recortar la portada para llenar un rectángulo le come
 * el título, que es justo lo que hay que ver.
 */
function Figura({
  url,
  alt,
  className,
  chico,
}: {
  url: string;
  alt: string;
  className?: string;
  chico?: boolean;
}) {
  if (!url) return <Hueco label={alt} className={className} chico={chico} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- la URL la pega el vendedor: puede ser de cualquier dominio.
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={cn("w-full object-contain", className)}
      style={{ borderRadius: "var(--tf-radius-lg)" }}
    />
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Lo que está pasando en la página ahora mismo, con datos reales.
 *
 * Es el único dato que un bloque no puede sacar de su propio contenido: la
 * gente que está mirando y las compras que ya se hicieron los sabe el servidor,
 * no el vendedor. Viaja aparte del `content` justamente por eso — nadie lo
 * puede editar a mano, que es lo que lo hace valer.
 *
 * Cuando no viene (el editor, una vista previa), los bloques que dependen de él
 * se dibujan explicando qué van a mostrar en vez de inventar un número.
 */
export interface LiveProofData {
  viewers: number;
  purchases: Array<{ name: string; place: string | null; at: string }>;
}

export function LandingSectionView({
  section,
  ctaHref,
  priceLabel,
  compareLabel,
  live,
}: {
  section: SectionData;
  ctaHref?: string;
  priceLabel?: string;
  compareLabel?: string;
  /** Visitantes y compras reales del funnel. Sin esto los bloques en vivo no afirman nada. */
  live?: LiveProofData;
  /** @deprecated El color ahora sale del tema de la página. */
  accent?: string;
}) {
  const c = section.content ?? {};

  switch (section.type) {
    /* ---------------------------------------------------------------- 1 */
    case "hero": {
      const portada = str(c, "image");
      const portadaAlt = str(c, "image_alt", "Portada del producto");

      const pastillas =
        lines(c, "pills").length > 0 ? (
          <ul className="mt-7 flex flex-wrap items-center justify-center gap-2 @xl:justify-start">
            {lines(c, "pills").map((pill, index) => (
              <li key={index}>
                <Pastilla>{pill}</Pastilla>
              </li>
            ))}
          </ul>
        ) : null;

      const respaldo = (
        <>
          {str(c, "social") ? (
            <p className="mt-5 text-[14.5px] font-semibold" style={{ color: "var(--tf-text)" }}>
              {str(c, "social")}
            </p>
          ) : null}
          {str(c, "trust") ? (
            <p className="mt-2 text-[12.5px]" style={{ color: "var(--tf-muted)" }}>
              {str(c, "trust")}
            </p>
          ) : null}
        </>
      );

      /*
       * Con portada cargada, el encabezado se parte en dos: el texto a la
       * izquierda y la imagen a la derecha. Es la diferencia entre una página
       * que se lee y una que se ve.
       *
       * En el teléfono se apila en el orden en que se decide una compra:
       * titular, subtítulo, portada, botón. La imagen queda justo antes del
       * botón —no después— porque es lo último que mira alguien antes de
       * apretar. Eso es lo que hacen los tres hijos del grid: en pantalla
       * grande la imagen se corre a la columna derecha y ocupa las dos filas.
       */
      if (portada) {
        return (
          <Band ancho className="pt-12 @xl:pt-16">
            <div className="grid items-center gap-8 @xl:grid-cols-[1.05fr_.95fr] @xl:gap-10 @3xl:gap-12">
              <div className="text-center @xl:order-1 @xl:text-left">
                <Kicker className="@xl:text-left">{str(c, "eyebrow")}</Kicker>
                {/* A media columna el titular no puede pedir el mismo cuerpo
                    que a pantalla completa: con `8cqw` una promesa de siete
                    palabras se convierte en cuatro renglones. */}
                <Titulo as="h1" centrado={false} className="@xl:text-[clamp(1.7rem,4.4cqw,2.8rem)]">
                  {str(c, "headline", "Tu titular principal")}
                </Titulo>
                <Bajada centrado={false} className="@xl:mx-0">
                  {str(c, "subheadline")}
                </Bajada>
              </div>

              <div className="@xl:order-2 @xl:row-span-2">
                <Figura
                  url={portada}
                  alt={portadaAlt}
                  className="mx-auto aspect-[4/5] max-w-[19rem] @xl:max-w-[24rem]"
                />
              </div>

              <div className="text-center @xl:order-3 @xl:text-left">
                {pastillas}
                <Cta
                  label={str(c, "cta", "Quiero mi acceso")}
                  href={ctaHref}
                  grande
                  className="@xl:mx-0"
                />
                {respaldo}
              </div>
            </div>
          </Band>
        );
      }

      return (
        <Band className="pt-14 text-center @2xl:pt-20">
          <Kicker>{str(c, "eyebrow")}</Kicker>
          <Titulo as="h1">{str(c, "headline", "Tu titular principal")}</Titulo>
          <Bajada>{str(c, "subheadline")}</Bajada>

          {lines(c, "pills").length > 0 ? (
            <ul className="mt-7 flex flex-wrap items-center justify-center gap-2">
              {lines(c, "pills").map((pill, index) => (
                <li key={index}>
                  <Pastilla>{pill}</Pastilla>
                </li>
              ))}
            </ul>
          ) : null}

          <Cta label={str(c, "cta", "Quiero mi acceso")} href={ctaHref} grande />

          {respaldo}
        </Band>
      );
    }

    /* ---------------------------------------------------------------- 2 */
    case "stats":
      return (
        <Band tono="surface" className="py-10 @2xl:py-12">
          <div className="grid grid-cols-2 gap-6 @2xl:grid-cols-4">
            {cards(c, "items").map((item, index) => (
              <Numero key={index} valor={item.value} etiqueta={item.label} />
            ))}
          </div>

          {cards(c, "highlights").length > 0 ? (
            <div className="mt-10 grid gap-4 @2xl:grid-cols-3">
              {cards(c, "highlights").map((item, index) => (
                <Caja key={index}>
                  <p className="text-[14.5px] font-bold" style={{ color: "var(--tf-text)" }}>
                    {item.title}
                  </p>
                  {item.subtitle ? (
                    <p
                      className="mt-0.5 text-[11.5px] font-bold uppercase"
                      style={{ color: "var(--tf-accent)", letterSpacing: "0.06em" }}
                    >
                      {item.subtitle}
                    </p>
                  ) : null}
                  <p className="mt-2.5 text-[13.5px] leading-relaxed" style={{ color: "var(--tf-muted)" }}>
                    {item.text}
                  </p>
                </Caja>
              ))}
            </div>
          ) : null}
        </Band>
      );

    /* ---------------------------------------------------------------- 3 */
    case "problems":
      return (
        <Band>
          <h2
            className="text-center text-[clamp(1.5rem,4.6cqw,2.15rem)] font-extrabold leading-[1.18]"
            style={{ color: "var(--tf-text)", letterSpacing: "-0.03em" }}
          >
            {str(c, "title")}
            {str(c, "subtitle") ? (
              <span className="mt-1 block" style={{ color: "var(--tf-accent)" }}>
                {str(c, "subtitle")}
              </span>
            ) : null}
          </h2>

          <ul className="mx-auto mt-9 flex max-w-2xl flex-col gap-3">
            {lines(c, "items").map((item, index) => (
              <li key={index}>
                <Caja className="flex items-start gap-3.5 !py-4">
                  <span
                    className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[13px] font-bold"
                    style={{ backgroundColor: "var(--tf-line)", color: "var(--tf-accent)" }}
                  >
                    ×
                  </span>
                  <span className="text-[15px] leading-relaxed" style={{ color: "var(--tf-text)" }}>
                    {item}
                  </span>
                </Caja>
              </li>
            ))}
          </ul>

          {str(c, "closing") ? (
            <p
              className="mt-10 text-center text-[clamp(1.05rem,3cqw,1.35rem)] font-extrabold leading-snug"
              style={{ color: "var(--tf-text)" }}
            >
              <Multiline text={str(c, "closing")} />
            </p>
          ) : null}
        </Band>
      );

    /* ---------------------------------------------------------------- 4 */
    case "gallery":
      return (
        <Band tono="surface">
          <Kicker>{str(c, "kicker")}</Kicker>
          <Titulo>{str(c, "title")}</Titulo>
          <Bajada>{str(c, "subtitle")}</Bajada>

          <Figura
            url={str(c, "featured_url")}
            alt={str(c, "featured_alt", "Imagen principal")}
            className="mt-8 aspect-[16/10]"
          />

          {str(c, "video_url") ? (
            <div
              className="mt-3 grid aspect-video place-items-center"
              style={{ backgroundColor: "var(--tf-text)", borderRadius: "var(--tf-radius-lg)" }}
            >
              <a
                href={str(c, "video_url")}
                className="text-[14px] font-semibold underline underline-offset-4"
                style={{ color: "var(--tf-bg)" }}
              >
                Ver el video
              </a>
            </div>
          ) : null}

          {cards(c, "images").length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-3 @2xl:grid-cols-3">
              {cards(c, "images").map((image, index) => (
                <Figura
                  key={index}
                  url={image.url ?? ""}
                  alt={image.alt}
                  className="aspect-square"
                  chico
                />
              ))}
            </div>
          ) : null}

          {str(c, "note") ? (
            <p className="mt-5 text-center text-[13px]" style={{ color: "var(--tf-muted)" }}>
              {str(c, "note")}
            </p>
          ) : null}
        </Band>
      );

    /* ---------------------------------------------------------------- 5 */
    case "solution":
      return (
        <Band className="text-center">
          {str(c, "badge") ? (
            <span
              className="inline-flex items-center rounded-full border px-4 py-2 text-[12px] font-extrabold uppercase"
              style={{
                borderColor: "var(--tf-line)",
                color: "var(--tf-accent)",
                letterSpacing: "0.08em",
              }}
            >
              {str(c, "badge")}
            </span>
          ) : null}

          {/* El nombre del producto es lo único con tipografía display: es la
              marca, y merece verse distinto del resto de la página. */}
          <h2
            className="mt-6 text-[clamp(2rem,7cqw,3.4rem)] font-extrabold leading-[1.05]"
            style={{ color: "var(--tf-text)", fontFamily: "var(--tf-display)" }}
          >
            {str(c, "title")}
          </h2>

          {str(c, "subtitle") ? (
            <p
              className="mt-3 text-[clamp(1rem,3cqw,1.35rem)] font-extrabold uppercase"
              style={{ color: "var(--tf-accent)", letterSpacing: "0.05em" }}
            >
              {str(c, "subtitle")}
            </p>
          ) : null}

          {str(c, "image") ? (
            <Figura
              url={str(c, "image")}
              alt={str(c, "image_alt", "Portada del producto")}
              className="mx-auto mt-8 aspect-[4/5] max-w-[15rem]"
            />
          ) : null}

          {str(c, "text") ? (
            <Caja className="mx-auto mt-8 max-w-2xl">
              <p className="text-[15.5px] leading-relaxed" style={{ color: "var(--tf-text)" }}>
                {str(c, "text")}
              </p>
              {lines(c, "tags").length > 0 ? (
                <ul className="mt-5 flex flex-wrap justify-center gap-2">
                  {lines(c, "tags").map((tag, index) => (
                    <li key={index}>
                      <Pastilla>{tag}</Pastilla>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Caja>
          ) : null}

          {str(c, "highlight") ? (
            <p
              className="mt-7 text-[16px] font-extrabold uppercase"
              style={{ color: "var(--tf-accent)", letterSpacing: "0.05em" }}
            >
              {str(c, "highlight")}
            </p>
          ) : null}

          {cards(c, "stats").length > 0 ? (
            <div className="mt-8 grid grid-cols-3 gap-6">
              {cards(c, "stats").map((item, index) => (
                <Numero key={index} valor={item.value} etiqueta={item.label} />
              ))}
            </div>
          ) : null}

          {lines(c, "features").length > 0 ? (
            <ul className="mt-8 flex flex-wrap justify-center gap-2">
              {lines(c, "features").map((feature, index) => (
                <li key={index}>
                  <Pastilla>{feature}</Pastilla>
                </li>
              ))}
            </ul>
          ) : null}
        </Band>
      );

    /* ---------------------------------------------------------------- 6 */
    case "modules":
      return (
        <Band tono="surface">
          <Kicker>{str(c, "kicker")}</Kicker>
          <Titulo>{str(c, "title", "Esto es lo que recibís")}</Titulo>

          <div
            className="mt-9 overflow-hidden border"
            style={{ borderColor: "var(--tf-line)", borderRadius: "var(--tf-radius-lg)" }}
          >
            {str(c, "box_title") ? (
              <p
                className="border-b px-5 py-4 text-center text-[12.5px] font-extrabold uppercase"
                style={{
                  borderColor: "var(--tf-line)",
                  color: "var(--tf-accent)",
                  letterSpacing: "0.14em",
                }}
              >
                {str(c, "box_title")}
              </p>
            ) : null}

            <ol className="flex flex-col">
              {cards(c, "items").map((item, index) => (
                <li
                  key={index}
                  className="flex gap-4 border-b p-5 last:border-b-0"
                  style={{ borderColor: "var(--tf-line)" }}
                >
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-full text-[14px] font-extrabold"
                    style={{ backgroundColor: "var(--tf-accent)", color: "var(--tf-on-accent)" }}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[16px] font-bold" style={{ color: "var(--tf-text)" }}>
                      {item.title}
                    </p>
                    <p
                      className="mt-1.5 text-[14px] leading-relaxed"
                      style={{ color: "var(--tf-muted)" }}
                    >
                      {item.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {cards(c, "metrics").length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-6 @2xl:grid-cols-3">
              {cards(c, "metrics").map((item, index) => (
                <Numero key={index} valor={item.value} etiqueta={item.label} />
              ))}
            </div>
          ) : null}
        </Band>
      );

    /* ---------------------------------------------------------------- 7 */
    case "bonuses":
      return (
        <Band>
          <Kicker>{str(c, "kicker")}</Kicker>
          <Titulo>{str(c, "title", "Además te llevás")}</Titulo>

          <div className="mt-9 flex flex-col gap-3">
            {cards(c, "items").map((item, index) => (
              <Caja key={index} className="flex items-start gap-4">
                <span
                  className="grid size-11 shrink-0 place-items-center text-[14px] font-extrabold"
                  style={{
                    backgroundColor: "var(--tf-accent)",
                    color: "var(--tf-on-accent)",
                    borderRadius: "var(--tf-radius)",
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15.5px] font-bold" style={{ color: "var(--tf-text)" }}>
                      {item.name}
                    </p>
                    {item.badge ? (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase"
                        style={{
                          backgroundColor: "var(--tf-line)",
                          color: "var(--tf-accent)",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                  {item.description ? (
                    <p
                      className="mt-1.5 text-[13.5px] leading-relaxed"
                      style={{ color: "var(--tf-muted)" }}
                    >
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </Caja>
            ))}
          </div>

          {str(c, "footer_note") ? (
            <p
              className="mt-6 text-center text-[14px] font-bold uppercase"
              style={{ color: "var(--tf-accent)", letterSpacing: "0.05em" }}
            >
              {str(c, "footer_note")}
            </p>
          ) : null}
        </Band>
      );

    /* ---------------------------------------------------------------- 8 */
    case "pricing":
      return (
        <Band tono="surface">
          {str(c, "title") ? <Titulo>{str(c, "title")}</Titulo> : null}

          <div
            className="mx-auto mt-9 max-w-lg border-2 p-7 text-center"
            style={{
              borderColor: "var(--tf-accent)",
              backgroundColor: "var(--tf-bg)",
              borderRadius: "var(--tf-radius-lg)",
            }}
          >
            {str(c, "badge") ? (
              <span
                className="inline-flex rounded-full px-4 py-1.5 text-[11px] font-extrabold uppercase"
                style={{
                  backgroundColor: "var(--tf-accent)",
                  color: "var(--tf-on-accent)",
                  letterSpacing: "0.1em",
                }}
              >
                {str(c, "badge")}
              </span>
            ) : null}

            {str(c, "image") ? (
              <Figura
                url={str(c, "image")}
                alt={str(c, "image_alt", "Portada del producto")}
                className="mx-auto mt-6 aspect-[4/5] max-w-[11rem]"
              />
            ) : null}

            {str(c, "product_name") ? (
              <p
                className="mt-5 text-[22px] font-extrabold"
                style={{ color: "var(--tf-text)", fontFamily: "var(--tf-display)" }}
              >
                {str(c, "product_name")}
              </p>
            ) : null}
            {str(c, "subtitle") ? (
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--tf-muted)" }}>
                {str(c, "subtitle")}
              </p>
            ) : null}

            <div className="mt-6 flex items-baseline justify-center gap-3">
              <span
                className="text-[clamp(2.25rem,8cqw,3rem)] font-extrabold leading-none"
                style={{ color: "var(--tf-accent)", letterSpacing: "-0.03em" }}
              >
                {priceLabel ?? str(c, "price_label", "$0")}
              </span>
              {(compareLabel ?? str(c, "compare_label")) ? (
                <span className="text-[18px] line-through" style={{ color: "var(--tf-muted)" }}>
                  {compareLabel ?? str(c, "compare_label")}
                </span>
              ) : null}
            </div>
            {str(c, "note") ? (
              <p className="mt-2 text-[12.5px]" style={{ color: "var(--tf-muted)" }}>
                {str(c, "note")}
              </p>
            ) : null}

            {lines(c, "includes").length > 0 ? (
              <ul
                className="mt-7 flex flex-col gap-3 border-t pt-6 text-left"
                style={{ borderColor: "var(--tf-line)" }}
              >
                {lines(c, "includes").map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full"
                      style={{ backgroundColor: "var(--tf-accent)", color: "var(--tf-on-accent)" }}
                    >
                      <Icon name="check" size={12} />
                    </span>
                    <span className="text-[14.5px] leading-relaxed" style={{ color: "var(--tf-text)" }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            <Cta label={str(c, "cta", "Quiero mi acceso")} href={ctaHref} grande />

            {lines(c, "trust").length > 0 ? (
              <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2">
                {lines(c, "trust").map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-1.5 text-[12.5px] font-semibold"
                    style={{ color: "var(--tf-muted)" }}
                  >
                    <Icon name="check" size={13} />
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Band>
      );

    /* ---------------------------------------------------------------- 9 */
    case "testimonials": {
      const items = cards(c, "items");
      return (
        <Band>
          <Kicker>{str(c, "kicker")}</Kicker>
          <Titulo>{str(c, "title", "Lo que dicen")}</Titulo>
          <Bajada>{str(c, "subtitle")}</Bajada>

          {c.placeholder ? (
            <p
              className="mx-auto mt-6 max-w-xl border border-dashed px-4 py-3 text-center text-[13px]"
              style={{
                borderColor: "var(--tf-accent)",
                color: "var(--tf-accent)",
                borderRadius: "var(--tf-radius)",
              }}
            >
              Espacio reservado para testimonios. Cargá solo testimonios reales de tus clientes.
            </p>
          ) : null}

          <div className="mt-9 grid gap-4 @2xl:grid-cols-2">
            {items.map((item, index) => (
              <Caja key={index}>
                <p className="text-[13px] tracking-[0.2em]" style={{ color: "var(--tf-accent)" }}>
                  ★★★★★
                </p>
                <p
                  className="mt-3 text-[14.5px] leading-relaxed"
                  style={{ color: "var(--tf-text)" }}
                >
                  “{item.text}”
                </p>
                <p className="mt-4 text-[13px] font-bold" style={{ color: "var(--tf-text)" }}>
                  {item.name}
                  {item.location ? (
                    <span className="ml-1.5 font-normal" style={{ color: "var(--tf-muted)" }}>
                      {item.location}
                    </span>
                  ) : null}
                </p>
              </Caja>
            ))}
          </div>
        </Band>
      );
    }

    /* --------------------------------------------------------------- 10 */
    case "guarantee":
      return (
        <Band tono="surface">
          <div
            className="mx-auto max-w-2xl border p-8 text-center"
            style={{
              borderColor: "var(--tf-line)",
              backgroundColor: "var(--tf-bg)",
              borderRadius: "var(--tf-radius-lg)",
            }}
          >
            <span
              className="mx-auto grid size-16 place-items-center rounded-full text-[28px]"
              style={{ backgroundColor: "var(--tf-accent)", color: "var(--tf-on-accent)" }}
            >
              ↺
            </span>
            <h2
              className="mt-5 text-[clamp(1.35rem,4cqw,1.9rem)] font-extrabold leading-tight"
              style={{ color: "var(--tf-text)", letterSpacing: "-0.02em" }}
            >
              <Multiline text={str(c, "title", "Garantía")} />
            </h2>
            <p
              className="mx-auto mt-4 max-w-xl text-[14.5px] leading-relaxed"
              style={{ color: "var(--tf-muted)" }}
            >
              {str(c, "text")}
            </p>
            {str(c, "seal") ? (
              <p
                className="mt-6 inline-flex rounded-full px-5 py-2.5 text-[12.5px] font-extrabold uppercase"
                style={{
                  backgroundColor: "var(--tf-accent)",
                  color: "var(--tf-on-accent)",
                  letterSpacing: "0.1em",
                }}
              >
                {str(c, "seal")}
              </p>
            ) : null}
          </div>
          {str(c, "note") ? (
            <p className="mt-4 text-center text-[12.5px]" style={{ color: "var(--tf-muted)" }}>
              {str(c, "note")}
            </p>
          ) : null}
        </Band>
      );

    /* --------------------------------------------------------------- 11 */
    case "faq":
      return (
        <Band>
          <Kicker>{str(c, "kicker")}</Kicker>
          <Titulo>{str(c, "title", "Preguntas frecuentes")}</Titulo>

          <div className="mx-auto mt-9 flex max-w-2xl flex-col gap-2.5">
            {cards(c, "items").map((item, index) => (
              <details
                key={index}
                className="group border px-5 py-4"
                style={{
                  borderColor: "var(--tf-line)",
                  backgroundColor: "var(--tf-surface)",
                  borderRadius: "var(--tf-radius)",
                }}
              >
                <summary
                  className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-bold"
                  style={{ color: "var(--tf-text)" }}
                >
                  {item.question}
                  <span
                    className="shrink-0 text-[20px] leading-none transition-transform group-open:rotate-45"
                    style={{ color: "var(--tf-accent)" }}
                  >
                    +
                  </span>
                </summary>
                <p
                  className="mt-3 text-[14.5px] leading-relaxed"
                  style={{ color: "var(--tf-muted)" }}
                >
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </Band>
      );

    /* --------------------------------------------------------------- 12 */
    case "cta":
      return (
        <Band className="text-center">
          <Kicker>{str(c, "kicker")}</Kicker>
          <Titulo>{str(c, "headline", "Empezá hoy")}</Titulo>
          <Bajada>{str(c, "subheadline")}</Bajada>

          {/* La portada va antes del botón, no después: es lo último que mira
              alguien antes de decidir. */}
          {str(c, "image") ? (
            <Figura
              url={str(c, "image")}
              alt={str(c, "image_alt", "Portada del producto")}
              className="mx-auto mt-8 aspect-[4/5] max-w-[13rem]"
            />
          ) : null}

          <Cta label={str(c, "cta", "Quiero mi acceso")} href={ctaHref} grande />

          {str(c, "micro") ? (
            <p className="mt-4 text-[12.5px]" style={{ color: "var(--tf-muted)" }}>
              {str(c, "micro")}
            </p>
          ) : null}

          {lines(c, "trust").length > 0 ? (
            <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2">
              {lines(c, "trust").map((item, index) => (
                <li
                  key={index}
                  className="flex items-center gap-1.5 text-[12.5px] font-semibold"
                  style={{ color: "var(--tf-muted)" }}
                >
                  <Icon name="check" size={13} />
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </Band>
      );

    /* --------------------------------------------------------------- 13 */
    case "footer":
      return (
        <Band className="py-10">
          <div className="border-t pt-8 text-center" style={{ borderColor: "var(--tf-line)" }}>
            {str(c, "brand") ? (
              <p
                className="text-[14px] font-extrabold uppercase"
                style={{ color: "var(--tf-text)", letterSpacing: "0.12em" }}
              >
                {str(c, "brand")}
              </p>
            ) : null}
            {lines(c, "links").length > 0 ? (
              <ul className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2">
                {lines(c, "links").map((link, index) => (
                  <li key={index} className="text-[12.5px]" style={{ color: "var(--tf-muted)" }}>
                    {link}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-4 text-[12.5px]" style={{ color: "var(--tf-muted)" }}>
              {str(c, "text")}
            </p>
          </div>
        </Band>
      );

    /* --------------------------------------------------- bloques sueltos */
    case "headline":
      return (
        <Band>
          <Titulo>{str(c, "text")}</Titulo>
        </Band>
      );

    case "subheadline":
      return (
        <Band className="py-6">
          <Bajada>{str(c, "text")}</Bajada>
        </Band>
      );

    case "benefits":
      return (
        <Band>
          <Titulo>{str(c, "title", "Lo que te llevás")}</Titulo>
          <ul className="mt-9 grid gap-3 @2xl:grid-cols-2">
            {lines(c, "items").map((item, index) => (
              <li key={index}>
                <Caja className="flex items-start gap-3 !py-4">
                  <span
                    className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full"
                    style={{ backgroundColor: "var(--tf-accent)", color: "var(--tf-on-accent)" }}
                  >
                    <Icon name="check" size={14} />
                  </span>
                  <span className="text-[15px] leading-relaxed" style={{ color: "var(--tf-text)" }}>
                    {item}
                  </span>
                </Caja>
              </li>
            ))}
          </ul>
        </Band>
      );

    case "features":
      return (
        <Band>
          <Titulo>{str(c, "title", "Cómo funciona")}</Titulo>
          <div className="mt-9 grid gap-4 @2xl:grid-cols-3">
            {cards(c, "items").map((item, index) => (
              <Caja key={index}>
                <p className="text-[16px] font-bold" style={{ color: "var(--tf-text)" }}>
                  {item.title}
                </p>
                <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--tf-muted)" }}>
                  {item.description}
                </p>
              </Caja>
            ))}
          </div>
        </Band>
      );

    case "mockup":
      return (
        <Band>
          <Titulo>{str(c, "title", "Así se ve por dentro")}</Titulo>
          <Hueco label={str(c, "caption", "Vista del material")} className="mt-8 aspect-[16/9]" />
        </Band>
      );

    case "comparison":
      return (
        <Band tono="surface">
          <Titulo>{str(c, "title")}</Titulo>
          <div className="mt-9 grid gap-4 @2xl:grid-cols-2">
            <Caja>
              <p className="text-[15px] font-bold" style={{ color: "var(--tf-muted)" }}>
                {str(c, "without_title")}
              </p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {lines(c, "without_items").map((item, index) => (
                  <li
                    key={index}
                    className="flex gap-2.5 text-[14px]"
                    style={{ color: "var(--tf-muted)" }}
                  >
                    <span>×</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Caja>
            <div
              className="border-2 p-5"
              style={{ borderColor: "var(--tf-accent)", borderRadius: "var(--tf-radius-lg)" }}
            >
              <p className="text-[15px] font-bold" style={{ color: "var(--tf-text)" }}>
                {str(c, "with_title")}
              </p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {lines(c, "with_items").map((item, index) => (
                  <li
                    key={index}
                    className="flex gap-2.5 text-[14px]"
                    style={{ color: "var(--tf-text)" }}
                  >
                    <span style={{ color: "var(--tf-accent)" }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Band>
      );

    case "countdown":
      return (
        <Band className="py-8">
          <div
            className="p-6 text-center"
            style={{
              backgroundColor: "var(--tf-accent)",
              color: "var(--tf-on-accent)",
              borderRadius: "var(--tf-radius-lg)",
            }}
          >
            <p className="text-[19px] font-extrabold">{str(c, "title")}</p>
            <p className="mt-2 text-[14px] opacity-80">{str(c, "text")}</p>
          </div>
        </Band>
      );

    case "social_proof":
      return (
        <Band className="py-8">
          <p
            className="border border-dashed px-5 py-4 text-center text-[13.5px]"
            style={{
              borderColor: "var(--tf-line)",
              color: "var(--tf-muted)",
              borderRadius: "var(--tf-radius)",
            }}
          >
            {str(c, "text", "Espacio para prueba social real cuando la tengas.")}
          </p>
        </Band>
      );

    /* ------------------------------------------------ los dos bloques espejo */

    /*
     * "Esto es para vos si…" y "Vas a lograr…" son el mismo bloque dado vuelta,
     * así que comparten el renderizador. Lo único que cambia es el color de la
     * marca de cada ítem: el problema va en gris, el resultado en el color de
     * la marca. Puestos uno debajo del otro, ese cambio de color es lo que hace
     * legible el antes y el después sin escribir la palabra "antes".
     */
    case "para_vos_si":
    case "vas_a_lograr": {
      const esResultado = section.type === "vas_a_lograr";
      const items = cards(c, "items").filter((item) => item.line1 || item.line2);

      return (
        <Band tono={esResultado ? undefined : "surface"}>
          <Titulo>
            {str(c, "title", esResultado ? "Vas a lograr…" : "Esto es para vos si…")}
          </Titulo>
          {str(c, "subtitle") ? <Bajada>{str(c, "subtitle")}</Bajada> : null}

          <ul className="mt-8 flex flex-col gap-3">
            {items.map((item, index) => (
              <li key={index}>
                <Caja className="flex items-start gap-3.5">
                  <span
                    className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full"
                    style={{
                      backgroundColor: esResultado ? "var(--tf-accent)" : "var(--tf-line)",
                      color: esResultado ? "var(--tf-on-accent)" : "var(--tf-muted)",
                    }}
                    aria-hidden="true"
                  >
                    <Icon name="check" size={14} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className="block text-[15.5px] font-bold leading-snug"
                      style={{ color: "var(--tf-text)" }}
                    >
                      {item.line1}
                    </span>
                    {item.line2 ? (
                      <span
                        className="mt-1 block text-[14px] leading-relaxed"
                        style={{ color: "var(--tf-muted)" }}
                      >
                        {item.line2}
                      </span>
                    ) : null}
                  </span>
                </Caja>
              </li>
            ))}
          </ul>
        </Band>
      );
    }

    /* --------------------------------------------- urgencia y prueba en vivo */

    /*
     * La barra de urgencia dice por qué conviene hoy, y al lado —solo si
     * realmente hay gente— cuántas personas están mirando la página en este
     * momento. El número sale de las sesiones del funnel en la última media
     * hora: si hay una sola, no se muestra nada. Un "1 persona está viendo"
     * dice la verdad y resta.
     */
    case "urgency_bar": {
      const mensaje = str(c, "message", "El precio de lanzamiento está por subir");
      const viendo = live?.viewers ?? 0;

      return (
        <section className="px-5 py-4">
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-2.5">
            <span
              className="inline-flex items-center gap-2 px-4 py-2 text-[13.5px] font-extrabold"
              style={{
                backgroundColor: "var(--tf-accent)",
                color: "var(--tf-on-accent)",
                borderRadius: "var(--tf-radius)",
              }}
            >
              <Icon name="clock" size={15} />
              {mensaje}
            </span>

            {viendo > 1 ? (
              <span
                className="inline-flex items-center gap-2 px-4 py-2 text-[13.5px] font-semibold"
                style={{
                  backgroundColor: "var(--tf-surface)",
                  color: "var(--tf-muted)",
                  borderRadius: "var(--tf-radius)",
                }}
              >
                <span
                  className="tf-latido size-2 rounded-full"
                  style={{ backgroundColor: "var(--tf-accent)" }}
                  aria-hidden="true"
                />
                {viendo} personas están viendo esta página
              </span>
            ) : null}
          </div>

          {str(c, "note") ? (
            <p
              className="mx-auto mt-2 max-w-3xl text-center text-[12.5px]"
              style={{ color: "var(--tf-muted)" }}
            >
              {str(c, "note")}
            </p>
          ) : null}
        </section>
      );
    }

    /*
     * Las compras en vivo, con las ventas que realmente ocurrieron.
     *
     * Sin ventas el bloque no se dibuja en la página pública: una página que
     * nunca vendió no puede mostrar compradores. En el editor sí se dibuja, con
     * la nota de qué va a aparecer ahí, porque si no el vendedor agrega el
     * bloque, no ve nada y cree que está roto.
     */
    case "live_purchases": {
      const compras = live?.purchases ?? [];

      if (compras.length === 0) {
        if (live) return null;
        return (
          <Band className="py-8">
            <p
              className="border border-dashed px-5 py-4 text-center text-[13.5px]"
              style={{
                borderColor: "var(--tf-line)",
                color: "var(--tf-muted)",
                borderRadius: "var(--tf-radius)",
              }}
            >
              {str(c, "empty_note", "Cuando tengas tu primera venta, va a aparecer acá sola.")}
            </p>
          </Band>
        );
      }

      return (
        <Band className="py-9">
          <Titulo>{str(c, "title", "Últimas compras")}</Titulo>

          <ul className="mt-7 flex flex-col gap-2">
            {compras.map((compra, index) => (
              <li key={index}>
                <Caja className="flex items-center gap-3 !py-3">
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-full"
                    style={{
                      backgroundColor: "var(--tf-accent)",
                      color: "var(--tf-on-accent)",
                    }}
                    aria-hidden="true"
                  >
                    <Icon name="check" size={16} />
                  </span>

                  <span className="min-w-0 flex-1 text-[14px]" style={{ color: "var(--tf-text)" }}>
                    <strong className="font-bold">{compra.name}</strong>
                    {compra.place ? (
                      <span style={{ color: "var(--tf-muted)" }}> · {compra.place}</span>
                    ) : null}
                    <span style={{ color: "var(--tf-muted)" }}> compró este producto</span>
                  </span>

                  <span
                    className="shrink-0 text-[12px] font-semibold"
                    style={{ color: "var(--tf-muted)" }}
                  >
                    {relativeTime(compra.at)}
                  </span>
                </Caja>
              </li>
            ))}
          </ul>
        </Band>
      );
    }

    case "video":
      return (
        <Band>
          <Titulo>{str(c, "title")}</Titulo>
          {str(c, "url") ? (
            <div
              className="mt-8 grid aspect-video place-items-center"
              style={{ backgroundColor: "var(--tf-text)", borderRadius: "var(--tf-radius-lg)" }}
            >
              <a
                href={str(c, "url")}
                className="text-[14px] font-semibold underline underline-offset-4"
                style={{ color: "var(--tf-bg)" }}
              >
                Ver el video
              </a>
            </div>
          ) : (
            <Hueco label="Pegá la URL del video en el panel de la derecha" className="mt-8 aspect-video" />
          )}
        </Band>
      );

    case "image":
      return (
        <Band>
          <Figura url={str(c, "url")} alt={str(c, "alt", "Imagen")} className="aspect-[16/9]" />
        </Band>
      );

    default:
      return (
        <Band className="py-6">
          <p
            className="border border-dashed px-4 py-3 text-[13px]"
            style={{
              borderColor: "var(--tf-line)",
              color: "var(--tf-muted)",
              borderRadius: "var(--tf-radius)",
            }}
          >
            Bloque “{section.type}” sin vista previa.
          </p>
        </Band>
      );
  }
}
