import type { ReactNode } from "react";

import { LANDING_LAYOUT } from "@/components/landing/estructuras";
import {
  Bajada,
  Band,
  Caja,
  Cta,
  Figura,
  Hueco,
  Kicker,
  Multiline,
  Numero,
  Pastilla,
  Precio,
  Titulo,
  cards,
  lines,
  str,
  type LiveProofData,
} from "@/components/landing/piezas";
import {
  SECCIONES_CANONICAS,
  SeccionCanonica,
} from "@/components/landing/secciones";
import { FechaDeHoy, Reloj } from "@/components/landing/reloj";
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
  group: "La estructura" | "Bloques sueltos";
  icon: Parameters<typeof Icon>[0]["name"];
  defaults: Record<string, unknown>;
}> = [
  /* --- La estructura base, en orden --- */
  {
    type: "hero",
    label: "Encabezado",
    emoji: "🎯",
    group: "La estructura",
    icon: "star",
    defaults: {
      headline: "El resultado concreto que consigue quien compra esto",
      subheadline:
        "Una línea que diga qué es, para quién es y por qué le sirve, sin adjetivos de relleno.",
      image: "",
      image_alt: "Portada del producto",
      ebook_label: "EBOOK:",
      product_name: "Tu producto",
      rating_value: "",
      rating_note: "",
      urgency_text: "Acceso inmediato al confirmar el pago.",
      bonuses: [],
      savings: "",
      slots_note: "",
      deadline: "",
      timer_label: "Oferta termina en",
      expired: "La oferta cerró",
      cta: "Quiero mi acceso",
      trust: ["Entrega inmediata", "Pago seguro", "Garantía"],
      viewers_note: "viendo este producto ahora",
    },
  },
  {
    type: "stats",
    label: "Los números de tu oferta",
    emoji: "🔢",
    group: "Bloques sueltos",
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
    group: "La estructura",
    icon: "warning",
    defaults: {
      title: "¿Te sentís identificado?",
      subtitle: "Si alguno de estos problemas te suena familiar, esto es para vos",
      items: [
        {
          title: "La situación que vive hoy",
          description:
            "Una o dos frases donde se reconozca: qué hace, en qué termina y por qué le pasa.",
        },
      ],
      closing: 'Si respondiste "sí" a alguna de estas… tenemos la solución.',
    },
  },
  {
    type: "gallery",
    label: "Galería de imágenes",
    emoji: "📸",
    group: "Bloques sueltos",
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
    group: "Bloques sueltos",
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
    group: "Bloques sueltos",
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
    group: "La estructura",
    icon: "gift",
    defaults: {
      kicker: "BONOS GRATIS INCLUIDOS",
      title: "Además del producto, te llevás estos regalos",
      subtitle: "",
      items: [],
      total_label: "Estos bonos tienen un valor total de",
      total_value: "",
    },
  },
  {
    type: "pricing",
    label: "La cuenta completa",
    emoji: "💰",
    group: "La estructura",
    icon: "tag",
    defaults: {
      title: "Todo lo que incluye tu compra",
      subtitle: "Acceso inmediato a todo esto por un único pago",
      items: [],
      total_label: "Valor total regular",
      total_value: "",
      today_label: "Oferta de hoy",
      note: "Precio único · Acceso de por vida",
      cta: "Quiero mi copia ahora",
      savings: "",
      trust_note: "Compra 100% segura",
    },
  },
  {
    type: "social_proof",
    label: "Testimonios",
    emoji: "💬",
    group: "La estructura",
    icon: "users",
    defaults: {
      kicker: "TESTIMONIOS REALES",
      title: "Lo que dicen quienes ya lo tienen",
      question: "¡Hola! ¿Cómo te fue con el material?",
      closing_reply: "¡Qué bueno! Me alegra mucho 🔥",
      items: [],
      stats: [],
    },
  },
  {
    type: "guarantee",
    label: "Garantía",
    emoji: "🛡️",
    group: "La estructura",
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
    group: "La estructura",
    icon: "info",
    defaults: {
      title: "Preguntas frecuentes",
      subtitle: "Resolvemos todas tus dudas",
      items: [
        {
          question: "¿Cómo lo recibo y cuándo?",
          answer:
            "Dos frases. La primera contesta la pregunta y la segunda saca la duda que queda atrás.",
        },
      ],
    },
  },
  {
    type: "cta",
    label: "Último llamado",
    emoji: "🚀",
    group: "La estructura",
    icon: "arrowRight",
    defaults: {
      headline: "Empezá hoy y dejá de dar vueltas",
      subheadline: "",
      bonus_note: "",
      bonuses: [],
      savings: "",
      cta: "Quiero mi acceso",
      trust: ["Pago seguro", "Acceso inmediato"],
    },
  },
  {
    type: "footer",
    label: "Pie de página",
    emoji: "🦾",
    group: "La estructura",
    icon: "file",
    defaults: {
      brand: "TU MARCA",
      text: "© Tu marca. Todos los derechos reservados.",
      legal: [],
    },
  },

  /* --- Bloques sueltos que se pueden sumar --- */
  {
    type: "headline",
    label: "Titular suelto",
    emoji: "📝",
    group: "Bloques sueltos",
    icon: "edit",
    defaults: { text: "Un titular que rompa la objeción principal" },
  },
  {
    type: "subheadline",
    label: "Subtítulo suelto",
    emoji: "📄",
    group: "Bloques sueltos",
    icon: "edit",
    defaults: { text: "Una línea de apoyo que sume claridad." },
  },
  {
    type: "benefits",
    label: "Qué hay adentro",
    emoji: "⭐",
    group: "La estructura",
    icon: "check",
    defaults: {
      title: "¿Qué vas a encontrar adentro?",
      subtitle: "Todo lo que necesitás en un solo lugar",
      items: [
        {
          emoji: "🧾",
          title: "El primer beneficio",
          description:
            "Dos frases: qué se lleva y qué le permite hacer. La segunda cierra con el resultado concreto.",
        },
      ],
    },
  },
  {
    type: "features",
    label: "Cómo lo usás",
    emoji: "🗺️",
    group: "La estructura",
    icon: "layers",
    defaults: {
      title: "Cómo lo usás",
      subtitle: "En solo 3 pasos simples",
      items: [
        { title: "Paso 1", description: "Una frase con la primera acción concreta." },
        { title: "Paso 2", description: "Una frase con lo que hace después." },
        { title: "Paso 3", description: "Una frase con el resultado y cómo lo sostiene." },
      ],
    },
  },
  {
    type: "comparison",
    label: "Con esto vs. sin esto",
    emoji: "⚖️",
    group: "Bloques sueltos",
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
    group: "Bloques sueltos",
    icon: "box",
    defaults: { title: "Así se ve por dentro", caption: "Vista del material" },
  },
  {
    type: "countdown",
    label: "Contador",
    emoji: "⏱️",
    group: "Bloques sueltos",
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
    group: "Bloques sueltos",
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
    group: "Bloques sueltos",
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
    group: "Bloques sueltos",
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
    group: "Bloques sueltos",
    icon: "star",
    defaults: {
      title: "Últimas compras",
      empty_note: "Cuando tengas tu primera venta, va a aparecer acá sola.",
    },
  },
  {
    type: "video",
    label: "Video",
    emoji: "🎥",
    group: "Bloques sueltos",
    icon: "video",
    defaults: { title: "Mirá cómo funciona", url: "" },
  },
  {
    type: "image",
    label: "Imagen",
    emoji: "🖼️",
    group: "Bloques sueltos",
    icon: "image",
    defaults: { alt: "Descripción de la imagen", url: "" },
  },

  /* --- Los bloques de las plantillas maestras --- */

  /*
   * El pack: la tabla que suma el valor de todo y lo tacha.
   *
   * Es el bloque que hace la diferencia entre "cuesta $18.900" y "vale $46.500
   * y hoy pagás $18.900". No es una lista de bonos con otro formato: cada fila
   * lleva su precio, el total se ve arriba del precio de hoy y el ahorro se
   * dice en pesos y en porcentaje. Sin esa aritmética a la vista, el descuento
   * es una afirmación; con ella, es una cuenta que el que lee hace solo.
   *
   * Los precios de las filas los escribe el vendedor. La app no los inventa ni
   * los deduce del precio real: un valor tachado que nadie cobró nunca es
   * publicidad engañosa en casi todos lados donde se vende.
   */
  {
    type: "pack",
    label: "El pack completo",
    emoji: "📦",
    group: "Bloques sueltos",
    icon: "box",
    defaults: {
      kicker: "TODO INCLUIDO",
      title: "El pack completo",
      subtitle: "",
      head: "Esto es todo lo que te llevás hoy",
      items: [
        {
          emoji: "📘",
          name: "El producto principal",
          note: "Qué incluye, en una línea.",
          value: "",
          core: "si",
        },
      ],
      bonus_intro: "Y además, estos bonos:",
      total_label: "Valor de todo el pack",
      total_value: "",
      save_note: "",
      now_label: "Tu precio hoy",
      cta: "Lo quiero",
      trust: ["Pago único", "Acceso inmediato", "Compra segura"],
    },
  },

  /*
   * Los planes.
   *
   * Tres columnas donde el del medio es el que se quiere vender: no por ser el
   * más caro, sino porque tener uno más chico al lado y uno más grande del otro
   * le da un marco. Un solo plan es un precio; tres son una decisión, y la
   * decisión es más fácil de tomar que la de comprar o no comprar.
   */
  {
    type: "plans",
    label: "Planes",
    emoji: "🧾",
    group: "Bloques sueltos",
    icon: "layers",
    defaults: {
      kicker: "",
      title: "Elegí el plan que te sirve",
      subtitle: "",
      items: [
        {
          name: "Plan básico",
          tag: "",
          price: "",
          target: "Para empezar",
          features: "Lo esencial",
          cta: "Quiero el básico",
          featured: "",
        },
        {
          name: "Plan completo",
          tag: "El más elegido",
          price: "",
          target: "Todo el material y los bonos",
          features: "Todo lo del básico\nLos bonos\nAcceso de por vida",
          cta: "Quiero el completo",
          featured: "si",
        },
      ],
      note: "",
    },
  },

  /*
   * Quién está detrás.
   *
   * En un ebook de salud, crianza o dinero, la pregunta que frena la compra no
   * es "¿esto sirve?" sino "¿quién me lo está diciendo?". Este bloque existe
   * para contestarla con cara, nombre y credencial. Va vacío por defecto a
   * propósito: una credencial inventada es peor que ninguna.
   */
  {
    type: "author",
    label: "Sobre quién lo escribió",
    emoji: "✍️",
    group: "Bloques sueltos",
    icon: "users",
    defaults: {
      eyebrow: "QUIÉN ESTÁ DETRÁS",
      title: "Sobre la autora",
      name: "",
      credential: "",
      quote: "",
      image: "",
      image_alt: "Foto de quien escribió el material",
      badges: [],
    },
  },

  /*
   * Mirá por dentro.
   *
   * Páginas reales del material, no un mockup. Es la respuesta visual a "¿esto
   * es humo?": dos capturas del interior dicen más que tres párrafos jurando
   * que hay contenido concreto.
   */
  {
    type: "peek",
    label: "Mirá por dentro",
    emoji: "👀",
    group: "Bloques sueltos",
    icon: "image",
    defaults: {
      kicker: "MIRÁ POR DENTRO",
      title: "Así se ve el material por dentro",
      subtitle: "Páginas reales, para que veas que hay contenido concreto.",
      items: [
        { url: "", alt: "Una página por dentro", caption: "Una página por dentro" },
        { url: "", alt: "Otra página por dentro", caption: "Otra página por dentro" },
      ],
    },
  },

  /*
   * Las capturas de las reseñas.
   *
   * Un testimonio tipeado en una tarjeta lo escribe cualquiera. La captura del
   * mensaje —con su tipografía de WhatsApp, su hora y sus errores— no. Por eso
   * este bloque es de imágenes y no de texto: el formato ES la prueba.
   */
  {
    type: "proof_shots",
    label: "Capturas de reseñas",
    emoji: "📱",
    group: "Bloques sueltos",
    icon: "users",
    defaults: {
      kicker: "LO QUE NOS ESCRIBEN",
      title: "Mensajes de quienes ya lo tienen",
      rating_value: "",
      rating_count: "",
      rating_note: "valoraciones",
      items: [],
    },
  },

  /*
   * El botón que sigue al que lee.
   *
   * Se pega abajo de la pantalla desde que el encabezado sale de vista. En una
   * página larga leída en el teléfono, la distancia entre decidirse y encontrar
   * dónde comprar es la que se pierde.
   */
  {
    type: "sticky_cta",
    label: "Botón que te sigue",
    emoji: "📌",
    group: "La estructura",
    icon: "arrowRight",
    defaults: {
      timer_label: "Termina en",
      deadline: "",
      expired: "cerrada",
      pack_label: "",
      cta: "Descargar ahora",
    },
  },

  /*
   * La banda de aviso.
   *
   * Dice una cosa cierta —el precio de lanzamiento, la fecha de cierre— y
   * puede poner la fecha de hoy sola para que no haya que editarla a mano cada
   * mañana. Lo que NO hace es contar cupos: "quedan 3 lugares" en un producto
   * digital que se descarga infinitas veces es mentira, y el bloque no tiene
   * dónde escribirla.
   */
  {
    type: "announcement_bar",
    label: "Barra de arriba",
    emoji: "🔥",
    group: "La estructura",
    icon: "clock",
    defaults: {
      message: "Oferta por tiempo limitado",
      timer_label: "Termina en",
      deadline: "",
      expired: "La oferta cerró",
    },
  },
];

/** Los bloques que trae una página nueva. Es la estructura, no una copia. */
export const BASE_STRUCTURE = LANDING_LAYOUT.structure;

/* -------------------------------------------------------------------------- */

export type { LiveProofData } from "@/components/landing/piezas";

export function LandingSectionView({
  section,
  ctaHref,
  priceLabel,
  compareLabel,
  live,
  editor,
}: {
  section: SectionData;
  ctaHref?: string;
  priceLabel?: string;
  compareLabel?: string;
  /** Visitantes y compras reales del funnel. Sin esto los bloques en vivo no afirman nada. */
  live?: LiveProofData;
  /**
   * `true` cuando esto es la vista previa del editor y no la página publicada.
   *
   * Varios bloques —quién está detrás, las capturas de reseñas, mirá por
   * dentro, las compras en vivo— no tienen nada que mostrar hasta que el
   * vendedor carga sus datos, y lo que corresponde hacer es distinto de cada
   * lado: en su página no se dibujan (dos huecos punteados que dicen "una
   * página por dentro" son la confesión de que no hay nada por dentro), y en el
   * editor sí, con la nota de qué falta, porque si no el vendedor agrega el
   * bloque, no ve nada y cree que está roto.
   *
   * Es una bandera explícita y no "¿vino `live`?" a propósito: `live` solo se
   * consulta cuando la página tiene bloques que lo usan, así que deducir el
   * modo de ahí hacía que una página sin barra de urgencia se comportara como
   * el editor.
   */
  editor?: boolean;
  /** @deprecated El color ahora sale del tema de la página. */
  accent?: string;
}) {
  const c = section.content ?? {};

  /*
   * La estructura canónica se dibuja en `secciones.tsx`.
   *
   * Lo que queda en el switch de abajo son los bloques de páginas armadas con
   * versiones anteriores de la app. No se borran porque una página publicada no
   * puede perder una sección porque cambió el orden canónico, pero tampoco se
   * mezclan: las trece secciones que definen cómo se ve una landing de
   * TiendaFlow viven juntas y se leen de corrido.
   */
  if (SECCIONES_CANONICAS.has(section.type)) {
    return (
      <SeccionCanonica
        section={{ type: section.type, content: c }}
        ctx={{ ctaHref, priceLabel, compareLabel, live, editor }}
      />
    );
  }

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
      const deslizable = str(c, "display") === "slider";
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

          {/*
            Dos formatos para el mismo contenido: grilla o deslizable.
            Con tres testimonios largos la grilla obliga a scrollear media
            pantalla; el deslizable los pone en una fila y deja que el que lee
            elija cuántos mira. Es scroll nativo con `scroll-snap`, así que
            anda con el dedo, con la rueda y con el teclado.
          */}
          <div
            className={
              deslizable
                ? "tf-carrusel -mx-5 mt-9 px-5 pb-2"
                : "mt-9 grid gap-4 @2xl:grid-cols-2"
            }
          >
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

    /*
     * El contador.
     *
     * Cuenta hacia la fecha que puso el vendedor. Sin fecha se dibuja igual
     * —con su título y su texto— pero sin reloj: un contador que arranca en
     * quince minutos cada vez que alguien entra es una mentira que la página
     * repite todo el día, y no está para eso.
     */
    case "countdown": {
      const deadline = str(c, "deadline");

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
            {str(c, "text") ? (
              <p className="mt-2 text-[14px] opacity-80">{str(c, "text")}</p>
            ) : null}

            {deadline ? (
              <Reloj
                deadline={deadline}
                expired={str(c, "expired", "La oferta cerró.")}
              />
            ) : null}
          </div>
        </Band>
      );
    }

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
        if (!editor) return null;
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

    /* ------------------------------------ los bloques de plantilla maestra */

    /*
     * El pack.
     *
     * La aritmética a la vista: cada cosa con su valor, el total de todo, el
     * ahorro y recién ahí el precio de hoy. Ese orden importa — leer $46.500
     * antes de leer $18.900 es lo que convierte al segundo número en una
     * oferta en vez de en un costo.
     *
     * Las filas marcadas como principales van arriba, después la línea de
     * "y además" y después los bonos. Es la única jerarquía del bloque y hace
     * todo el trabajo: separa lo que se compra de lo que se regala.
     */
    case "pack": {
      const items = cards(c, "items").filter((item) => item.name);
      const principales = items.filter((item) => item.core);
      const bonos = items.filter((item) => !item.core);

      const fila = (item: Record<string, string>, index: number, destacada: boolean) => (
        <div
          key={`${destacada ? "core" : "bono"}-${index}`}
          className="flex items-start justify-between gap-4 border-b px-5 py-4"
          style={{
            borderColor: "var(--tf-line)",
            backgroundColor: destacada ? "var(--tf-surface)" : undefined,
          }}
        >
          <div className="flex min-w-0 items-start gap-3">
            {item.emoji ? (
              <span className="text-[20px] leading-none" aria-hidden="true">
                {item.emoji}
              </span>
            ) : null}
            <div className="min-w-0">
              <p className="text-[15px] font-bold" style={{ color: "var(--tf-text)" }}>
                {item.name}
              </p>
              {item.note ? (
                <p className="mt-1 text-[13px] leading-snug" style={{ color: "var(--tf-muted)" }}>
                  {item.note}
                </p>
              ) : null}
            </div>
          </div>

          {item.value || item.value_before ? (
            <div className="shrink-0 text-right">
              {item.value_before ? (
                <span
                  className="block text-[12px] font-semibold line-through"
                  style={{ color: "var(--tf-muted)" }}
                >
                  {item.value_before}
                </span>
              ) : null}
              {item.value ? (
                <span
                  className="block text-[14px] font-extrabold"
                  style={{ color: destacada ? "var(--tf-accent)" : "var(--tf-accent-2)" }}
                >
                  {item.value}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      );

      return (
        <Band tono="surface">
          <Kicker>{str(c, "kicker")}</Kicker>
          <Titulo>{str(c, "title", "El pack completo")}</Titulo>
          <Bajada>{str(c, "subtitle")}</Bajada>

          <div
            className="mx-auto mt-9 max-w-lg overflow-hidden border-2"
            style={{
              borderColor: "var(--tf-accent)",
              backgroundColor: "var(--tf-bg)",
              borderRadius: "var(--tf-radius-lg)",
            }}
          >
            {str(c, "head") ? (
              <p
                className="px-5 py-3.5 text-center text-[13.5px] font-extrabold uppercase"
                style={{
                  backgroundColor: "var(--tf-accent)",
                  color: "var(--tf-on-accent)",
                  letterSpacing: "0.06em",
                }}
              >
                {str(c, "head")}
              </p>
            ) : null}

            {principales.map((item, index) => fila(item, index, true))}

            {bonos.length > 0 && str(c, "bonus_intro") ? (
              <p
                className="border-b px-5 py-3 text-center text-[13.5px] font-bold"
                style={{
                  borderColor: "var(--tf-line)",
                  backgroundColor: "var(--tf-surface)",
                  color: "var(--tf-text)",
                }}
              >
                {str(c, "bonus_intro")}
              </p>
            ) : null}

            {bonos.map((item, index) => fila(item, index, false))}

            <div className="p-5">
              {str(c, "total_value") ? (
                <div
                  className="flex items-center justify-between gap-3 pb-3 text-[14px] font-semibold"
                  style={{ color: "var(--tf-muted)" }}
                >
                  <span>{str(c, "total_label", "Valor de todo el pack")}</span>
                  <s>{str(c, "total_value")}</s>
                </div>
              ) : null}

              {str(c, "save_note") ? (
                <p
                  className="mb-4 border border-dashed px-4 py-2.5 text-center text-[13.5px] font-bold"
                  style={{
                    borderColor: "var(--tf-accent-2)",
                    color: "var(--tf-accent-2)",
                    borderRadius: "var(--tf-radius)",
                  }}
                >
                  {str(c, "save_note")}
                </p>
              ) : null}

              <div
                className="flex flex-wrap items-center justify-between gap-3 border-2 px-5 py-4"
                style={{
                  borderColor: "var(--tf-accent)",
                  backgroundColor: "var(--tf-surface)",
                  borderRadius: "var(--tf-radius)",
                }}
              >
                <span
                  className="text-[15px] font-extrabold uppercase"
                  style={{ color: "var(--tf-text)", letterSpacing: "0.04em" }}
                >
                  {str(c, "now_label", "Tu precio hoy")}
                </span>
                <Precio
                  valor={priceLabel ?? str(c, "price_label", "$0")}
                  tachado={compareLabel ?? str(c, "compare_label")}
                />
              </div>

              <Cta
                label={str(c, "cta", "Lo quiero")}
                href={ctaHref}
                sub={str(c, "cta_sub")}
                grande
              />

              {lines(c, "trust").length > 0 ? (
                <ul className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2">
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
          </div>
        </Band>
      );
    }

    /*
     * Los planes.
     *
     * Cada columna toma un color distinto del tema —acento, segundo acento y
     * acento oscuro— en vez de repetir el mismo tres veces. Es lo que hace que
     * se lean como tres opciones y no como la misma tarjeta clonada, y sale
     * del tema, así que sigue cambiando con la paleta.
     */
    case "plans": {
      const items = cards(c, "items").filter((item) => item.name);
      const colores = ["var(--tf-accent)", "var(--tf-accent-2)", "var(--tf-accent-deep)"];

      return (
        <Band ancho>
          <Kicker>{str(c, "kicker")}</Kicker>
          <Titulo>{str(c, "title", "Elegí tu plan")}</Titulo>
          <Bajada>{str(c, "subtitle")}</Bajada>

          <div
            className={cn(
              "mt-9 grid gap-5",
              items.length === 2 ? "@2xl:grid-cols-2" : "@2xl:grid-cols-2 @4xl:grid-cols-3",
            )}
          >
            {items.map((item, index) => {
              const color = colores[index % colores.length];
              const destacado = Boolean(item.featured);

              return (
                <div
                  key={index}
                  className={cn("flex flex-col border p-5", destacado && "border-2")}
                  style={{
                    borderColor: destacado ? color : "var(--tf-line)",
                    backgroundColor: "var(--tf-surface)",
                    borderRadius: "var(--tf-radius-lg)",
                  }}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[17px] font-extrabold" style={{ color: "var(--tf-text)" }}>
                        {item.name}
                      </p>
                      {item.tag ? (
                        <span
                          className="mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase"
                          style={{
                            backgroundColor: color,
                            color: "var(--tf-on-accent)",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {item.tag}
                        </span>
                      ) : null}
                    </div>
                    {item.price ? (
                      <span
                        className="text-[26px] font-extrabold leading-none"
                        style={{ color, letterSpacing: "-0.03em" }}
                      >
                        {item.price}
                      </span>
                    ) : null}
                  </div>

                  {item.target ? (
                    <p className="mt-3 text-[13.5px]" style={{ color: "var(--tf-muted)" }}>
                      {item.target}
                    </p>
                  ) : null}

                  <ul
                    className="mt-4 flex flex-1 flex-col gap-2.5 border-t pt-4"
                    style={{ borderColor: "var(--tf-line)" }}
                  >
                    {(item.features ?? "")
                      .split("\n")
                      .map((linea) => linea.trim())
                      .filter(Boolean)
                      .map((linea, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="mt-0.5 shrink-0" style={{ color }} aria-hidden="true">
                            <Icon name="check" size={15} />
                          </span>
                          <span
                            className="text-[14px] leading-snug"
                            style={{ color: "var(--tf-text)" }}
                          >
                            {linea}
                          </span>
                        </li>
                      ))}
                  </ul>

                  <div className="mt-5">
                    <Cta label={item.cta || "Lo quiero"} href={ctaHref} suelto />
                  </div>
                </div>
              );
            })}
          </div>

          {str(c, "note") ? (
            <p className="mt-6 text-center text-[13px]" style={{ color: "var(--tf-muted)" }}>
              {str(c, "note")}
            </p>
          ) : null}
        </Band>
      );
    }

    /*
     * Quién está detrás.
     *
     * Sin nombre ni frase no se dibuja la tarjeta: un bloque de autoría vacío
     * con una silueta gris resta más de lo que suma, porque dice que hay
     * alguien detrás y no lo muestra. En el editor sí aparece —con la nota de
     * qué falta— para que el vendedor sepa por qué no lo ve en su página.
     */
    case "author": {
      const nombre = str(c, "name");
      const badges = lines(c, "badges");

      if (!nombre && !str(c, "quote")) {
        if (!editor) return null;
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
              Contá quién escribió el material: nombre, formación y una frase suya. Mientras esté
              vacío, este bloque no sale en tu página.
            </p>
          </Band>
        );
      }

      return (
        <Band ancho tono="surface">
          <div className="grid items-center gap-7 @2xl:grid-cols-[minmax(0,17rem)_1fr]">
            <Figura
              url={str(c, "image")}
              alt={str(c, "image_alt", "Foto de quien escribió el material")}
              className="mx-auto aspect-square max-w-[17rem] object-cover"
            />

            <div>
              <Kicker className="!text-left">{str(c, "eyebrow")}</Kicker>
              <Titulo centrado={false} className="!mt-2">
                {str(c, "title", "Quién está detrás")}
              </Titulo>

              {nombre ? (
                <p className="mt-3 text-[15.5px]" style={{ color: "var(--tf-muted)" }}>
                  <strong style={{ color: "var(--tf-text)" }}>{nombre}</strong>
                  {str(c, "credential") ? ` — ${str(c, "credential")}` : ""}
                </p>
              ) : null}

              {str(c, "quote") ? (
                <blockquote
                  className="mt-4 border-l-4 pl-4 text-[16px] font-semibold italic leading-relaxed"
                  style={{ borderColor: "var(--tf-accent)", color: "var(--tf-text)" }}
                >
                  <Multiline text={str(c, "quote")} />
                </blockquote>
              ) : null}

              {badges.length > 0 ? (
                <ul className="mt-5 flex flex-wrap gap-2">
                  {badges.map((badge, index) => (
                    <li key={index}>
                      <Pastilla>{badge}</Pastilla>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </Band>
      );
    }

    /*
     * Mirá por dentro.
     *
     * `object-cover` y no `contain`, al revés que el resto de las imágenes de
     * la página: acá no se muestra una portada entera sino un pedazo del
     * interior, y que se corte es parte de que se lea como un vistazo.
     */
    case "peek": {
      const items = cards(c, "items").filter((item) => editor || item.url);

      // Dos huecos punteados con la leyenda "una página por dentro" son, en una
      // página publicada, la confesión de que no hay nada por dentro.
      if (items.length === 0) return null;

      return (
        <Band ancho>
          <Kicker>{str(c, "kicker")}</Kicker>
          <Titulo>{str(c, "title", "Mirá por dentro")}</Titulo>
          <Bajada>{str(c, "subtitle")}</Bajada>

          <div className="mt-9 grid gap-4 @2xl:grid-cols-2">
            {items.map((item, index) => (
              <div key={index} className="relative">
                <Figura
                  url={item.url}
                  alt={item.alt || "Una página del material"}
                  className="aspect-[4/3] object-cover"
                />
                {item.caption && item.url ? (
                  <span
                    className="absolute bottom-3 left-3 rounded-full px-3 py-1.5 text-[12px] font-bold"
                    style={{ backgroundColor: "var(--tf-text)", color: "var(--tf-bg)" }}
                  >
                    {item.caption}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </Band>
      );
    }

    /*
     * Las capturas de reseñas.
     *
     * La imagen va con su alto natural, sin recorte: una captura de WhatsApp
     * cortada arriba pierde el nombre y abajo pierde la hora, que son las dos
     * cosas que la hacen creíble.
     *
     * La franja de puntaje solo aparece si el vendedor cargó el número. No hay
     * valor por defecto: un "4,9/5" que la app pone sola es una calificación
     * inventada.
     */
    case "proof_shots": {
      const items = cards(c, "items").filter((item) => item.url);
      const puntaje = str(c, "rating_value");

      // Sin una sola captura no hay prueba: en la página publicada el bloque no
      // existe. En el editor sí, con la nota de qué hay que subir.
      if (!editor && items.length === 0) return null;

      return (
        <Band ancho tono="surface">
          <Kicker>{str(c, "kicker")}</Kicker>
          <Titulo>{str(c, "title", "Lo que nos escriben")}</Titulo>

          {puntaje ? (
            <div
              className="mx-auto mt-6 flex w-fit flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-full border px-6 py-3"
              style={{ borderColor: "var(--tf-line)", backgroundColor: "var(--tf-bg)" }}
            >
              <span className="text-center leading-tight">
                <span
                  className="block text-[20px] font-extrabold"
                  style={{ color: "var(--tf-text)" }}
                >
                  {puntaje}
                </span>
                <span
                  className="block text-[13px] tracking-[0.2em]"
                  style={{ color: "var(--tf-accent)" }}
                >
                  ★★★★★
                </span>
              </span>
              {str(c, "rating_count") ? (
                <span className="text-[12.5px] font-bold" style={{ color: "var(--tf-muted)" }}>
                  {str(c, "rating_count")} {str(c, "rating_note", "valoraciones")}
                </span>
              ) : null}
            </div>
          ) : null}

          {items.length === 0 ? (
            <p
              className="mx-auto mt-8 max-w-xl border border-dashed px-4 py-3 text-center text-[13px]"
              style={{
                borderColor: "var(--tf-accent)",
                color: "var(--tf-accent)",
                borderRadius: "var(--tf-radius)",
              }}
            >
              Subí capturas reales de los mensajes que recibiste. Mientras no haya ninguna, este
              bloque no sale en tu página.
            </p>
          ) : (
            <div className="mt-8 grid gap-4 @xl:grid-cols-2 @3xl:grid-cols-3">
              {items.map((item, index) => (
                // eslint-disable-next-line @next/next/no-img-element -- la URL la pega el vendedor.
                <img
                  key={index}
                  src={item.url}
                  alt={item.alt || "Mensaje de un cliente"}
                  loading="lazy"
                  className="w-full border"
                  style={{ borderColor: "var(--tf-line)", borderRadius: "var(--tf-radius-lg)" }}
                />
              ))}
            </div>
          )}
        </Band>
      );
    }

    /*
     * El botón que sigue al que lee.
     *
     * `sticky` y no `fixed`: pegado a la ventana taparía el editor entero y
     * habría que dibujarlo distinto en la vista previa y en la página real.
     * Pegado al final de su contenedor hace lo mismo en los dos lados —queda
     * abajo mientras se scrollea— con un solo renderizador.
     */
    case "sticky_cta":
      return (
        <div
          className="sticky bottom-0 z-30 flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3"
          style={{
            borderColor: "var(--tf-line)",
            backgroundColor: "var(--tf-surface)",
            boxShadow: "0 -8px 24px -12px rgb(0 0 0 / 0.25)",
          }}
        >
          <div className="min-w-0 leading-tight">
            <Precio valor={priceLabel ?? str(c, "price_label")} chico />
            {str(c, "note") ? (
              <span
                className="block text-[11.5px] font-semibold"
                style={{ color: "var(--tf-muted)" }}
              >
                {str(c, "note")}
              </span>
            ) : null}
          </div>

          <div className="min-w-[9rem] flex-1 @sm:max-w-[15rem]">
            <Cta
              label={str(c, "cta", "Lo quiero")}
              href={ctaHref}
              suelto
              className="!py-3 !text-[14px]"
            />
          </div>
        </div>
      );

    /*
     * La banda de aviso.
     *
     * Con la fecha de hoy puesta sola, para que "solo por hoy" diga qué día es
     * hoy sin que nadie tenga que entrar a cambiarla todas las mañanas.
     */
    case "promo_banner":
      return (
        <div
          className="px-5 py-3.5 text-center"
          style={{ backgroundColor: "var(--tf-accent-deep)", color: "var(--tf-on-accent)" }}
        >
          <p className="text-[14px] font-extrabold">
            {str(c, "message", "Precio de lanzamiento")}
            {str(c, "show_date") ? (
              <span className="font-semibold opacity-90">
                {" · "}
                <FechaDeHoy />
              </span>
            ) : null}
          </p>
          {str(c, "note") ? <p className="mt-1 text-[12px] opacity-80">{str(c, "note")}</p> : null}
        </div>
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
