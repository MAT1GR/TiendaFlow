import "server-only";

import { DEFAULT_LAYOUT, type LandingLayout } from "@/components/landing/estructuras";
import { landingTemplate } from "@/lib/landing-template";
import { runAiTask, type AiResult } from "@/lib/ai/provider";
import { formatMoney, formatPercent } from "@/lib/utils";

/**
 * Definición de las tareas de IA del producto. Cada tarea trae su prompt, el
 * esquema esperado y un borrador local (`fallback`) construido con los datos
 * reales que cargó el usuario — nunca con datos inventados sobre su negocio.
 */

const TONE_HINT: Record<string, string> = {
  cercano: "cercano y conversacional, tuteo rioplatense",
  profesional: "profesional pero simple, sin jerga corporativa",
  directo: "directo y enérgico, orientado a la acción",
  inspirador: "inspirador y motivacional, sin exagerar promesas",
};

const SYSTEM_BASE = `Sos el copiloto de TiendaFlow, una plataforma para vender productos digitales.
Escribís en español latinoamericano natural (voseo rioplatense), directo y sin jerga corporativa.
Nunca inventás datos, testimonios, cifras de ventas ni resultados de clientes.
Nunca prometés resultados garantizados.
Si te falta información, escribís copy que funcione sin ella en vez de inventarla.`;

/* -------------------------------------------------------------------------- */
/* 1. Creación de producto                                                     */
/* -------------------------------------------------------------------------- */

export interface ProductDraft {
  titles: string[];
  subtitle: string;
  positioning: string;
  description: string;
  short_description: string;
  /** El avatar: a quién le habla la carta de ventas, en una frase. */
  audience: string;
  /** El dolor concreto de ese avatar, en su propio idioma. */
  main_problem: string;
  /** El después: en qué queda la persona cuando termina. */
  transformation: string;
  benefits: string[];
  outline: Array<{ chapter: string; summary: string; bullets: string[] }>;
  faq: Array<{ question: string; answer: string }>;
  bonus_ideas: string[];
  offer_ideas: string[];
}

export interface ProductBriefInput {
  /** Lo que el vendedor escribió con sus palabras sobre el producto. */
  topic: string;
  /** El nombre que le puso, si ya tiene uno. */
  productName?: string;
  /** `true` cuando el material ya existe y no hay que proponerle un índice. */
  yaLoTiene?: boolean;
  audience?: string;
  level?: string;
  problem?: string;
  outcome?: string;
  tone?: string;
  length?: string;
}

/**
 * La carta de ventas completa a partir de dos datos.
 *
 * El vendedor pone el nombre y cuenta con sus palabras qué es lo que vende. De
 * ahí sale todo lo demás: a quién le habla, qué dolor resuelve, en qué queda la
 * persona, los beneficios, el índice y las preguntas. Pedirle que complete
 * "audiencia", "problema principal" y "transformación" en un formulario era
 * pedirle que hiciera el trabajo de marketing antes de tener el producto, y son
 * justo los tres campos que un modelo deduce bien de una descripción en
 * lenguaje natural.
 *
 * Los campos sueltos se siguen aceptando: si el vendedor ya los definió, mandan
 * sobre lo que deduzca la IA.
 */
export function generateProductDraft(input: ProductBriefInput): Promise<AiResult<ProductDraft>> {
  /*
   * El tema, en pocas palabras.
   *
   * `input.topic` ahora es la descripción libre del vendedor y puede ser un
   * párrafo entero. Estos tres valores son el respaldo cuando no hay IA, y de
   * acá salen después el problema del producto, los beneficios de la oferta y
   * las pastillas del hero. Si les metemos el párrafo completo, la página
   * termina con una pastilla de tres renglones.
   */
  const tema = input.productName?.trim() || primeraFrase(input.topic) || "tu tema";
  const audience = input.audience?.trim() || "personas que quieren avanzar en este tema";
  const problem = input.problem?.trim() || `no saber por dónde empezar con ${tema}`;
  const outcome = input.outcome?.trim() || "un plan concreto para aplicar desde el primer día";

  const dato = (label: string, valor?: string) =>
    valor?.trim() ? `${label}: ${valor.trim()}` : `${label}: deducilo de la descripción`;

  return runAiTask<ProductDraft>({
    task: "product_draft",
    system: SYSTEM_BASE,
    schemaHint:
      '{ titles: string[5], subtitle, positioning, description, short_description, audience, main_problem, transformation, benefits: string[6], outline: [{chapter, summary, bullets: string[3]}], faq: [{question, answer}], bonus_ideas: string[4], offer_ideas: string[3] }',
    maxTokens: 4000,
    prompt: `A partir de lo que escribió el vendedor, armá la carta de ventas completa de su producto digital.

Nombre que le puso: ${input.productName?.trim() || "todavía no tiene"}
Lo que contó, con sus palabras:
"""
${input.topic}
"""

${dato("Audiencia", input.audience)}
${dato("Problema principal", input.problem)}
${dato("Resultado que busca", input.outcome)}
Tono: ${TONE_HINT[input.tone ?? "cercano"] ?? TONE_HINT.cercano}
${
  input.yaLoTiene
    ? "El material YA existe: el índice tiene que describir lo que razonablemente hay adentro, no inventarle capítulos nuevos."
    : `Todavía no está escrito: proponé el índice. Extensión aproximada: ${input.length ?? "corta (30-50 páginas)"}.`
}

Lo primero y más importante son estos tres campos, porque de ellos cuelga todo
lo que la app escribe después (la oferta, la página de venta y los anuncios):

· audience — el avatar, en una frase concreta. Quién es y en qué momento está.
  "Personas que arrancan mil veces con los hábitos y abandonan a la semana",
  no "personas interesadas en el bienestar".
· main_problem — el dolor, dicho como lo diría esa persona, no como categoría.
· transformation — en qué queda cuando termina. Un después, no una promesa vaga.

Después: 5 títulos posibles (el primero puede ser el que ya puso, si funciona),
un subtítulo, el posicionamiento en una frase, una descripción larga de 3
párrafos, una descripción corta (máx 160 caracteres), 6 beneficios escritos como
resultado y no como característica, un índice de 6 a 8 capítulos con resumen y 3
bullets cada uno, 5 preguntas frecuentes con respuesta, 4 ideas de bonos y 3
ideas de oferta.

No inventes cifras, testimonios ni resultados de clientes: no los tenés.`,
    fallback: (): ProductDraft => {
      /*
       * Sin proveedor de IA no hay carta de ventas: hay andamio.
       *
       * `topic` ahora es la descripción libre del vendedor, que puede tener
       * párrafos enteros. Meterla dentro de un título daría algo ilegible, así
       * que para los textos cortos usamos el nombre que puso y la descripción
       * queda para los campos largos. La UI lo marca como borrador local.
       */
      const descripcion = input.topic.trim();
      const topic = tema;
      const chapters = [
        "Por dónde empezar",
        "Los errores que te frenan",
        "El método paso a paso",
        "Tu primer resultado en 7 días",
        "Cómo sostenerlo en el tiempo",
        "Qué hacer cuando se complica",
      ];
      return {
        titles: [
          `${capitalize(topic)}: la guía práctica`,
          `El método ${capitalize(topic)}`,
          `${capitalize(topic)} sin vueltas`,
          `De cero a ${topic} en 30 días`,
          `${capitalize(topic)}: el sistema completo`,
        ],
        subtitle: `Todo lo que necesitás para ${outcome}`,
        positioning: `Para ${audience} que quieren dejar de ${problem} y conseguir ${outcome}.`,
        audience,
        main_problem: problem,
        transformation: outcome,
        description: `${descripcion || `Esta guía está pensada para ${audience}.`}\n\nAdentro vas a encontrar el paso a paso para resolver ${problem}, con ejercicios concretos y ejemplos aplicables desde el primer día.\n\nAl terminar vas a tener ${outcome}.`,
        short_description: `Guía práctica sobre ${topic} para ${audience}.`.slice(0, 160),
        benefits: [
          `Entendés exactamente por dónde empezar con ${topic}`,
          "Evitás los errores más comunes que hacen perder tiempo",
          "Tenés un método paso a paso, no teoría suelta",
          "Aplicás desde el primer día con ejercicios concretos",
          "Sabés qué hacer cuando algo no sale como esperabas",
          `Llegás a ${outcome}`,
        ],
        outline: chapters.map((chapter) => ({
          chapter,
          summary: `Qué cubre este capítulo sobre ${topic}. Editalo con tu enfoque.`,
          bullets: ["Idea principal", "Ejercicio práctico", "Error a evitar"],
        })),
        faq: [
          {
            question: "¿Para quién es esto?",
            answer: `Para ${audience}.`,
          },
          {
            question: "¿Necesito experiencia previa?",
            answer: `No. Está armado desde nivel ${input.level ?? "principiante"}.`,
          },
          {
            question: "¿Cómo lo recibo?",
            answer: "Es digital: lo descargás apenas confirmamos el pago.",
          },
          {
            question: "¿Cuánto tiempo me lleva?",
            answer: "Depende de tu ritmo. Está pensado para avanzar en poco tiempo por día.",
          },
          {
            question: "¿Tiene garantía?",
            answer: "Definí acá tu política de garantía antes de publicar.",
          },
        ],
        bonus_ideas: [
          "Checklist imprimible del método",
          "Plantilla editable para hacer el seguimiento",
          "Guía rápida de errores frecuentes",
          "Mini-serie de emails de acompañamiento",
        ],
        offer_ideas: [
          "Producto principal + checklist como bono",
          "Pack con plantillas y guía rápida",
          "Versión completa con acompañamiento por email",
        ],
      };
    },
  });
}

/* -------------------------------------------------------------------------- */
/* 2. Oferta                                                                   */
/* -------------------------------------------------------------------------- */

export interface OfferDraft {
  headline: string;
  positioning: string;
  promise: string;
  /**
   * El precio sugerido para el producto principal.
   *
   * El producto ya no nace con precio: ponerle un número antes de saber qué
   * lleva adentro la oferta era adivinar. Acá sí hay con qué — promesa, bonos,
   * garantía— así que la IA propone y el vendedor decide.
   */
  suggested_price: number;
  benefits: string[];
  cta_text: string;
  guarantee: string;
  bonuses: Array<{ name: string; description: string; value: number }>;
  order_bump: { name: string; description: string; price: number; checkbox_label: string };
  upsell: { name: string; headline: string; description: string; price: number };
  downsell: { name: string; headline: string; description: string; price: number };
}

export interface OfferBriefInput {
  productName: string;
  audience?: string;
  problem?: string;
  transformation?: string;
  price: number;
  currency: string;
  tone?: string;
}

export function generateOfferDraft(input: OfferBriefInput): Promise<AiResult<OfferDraft>> {
  const audience = input.audience?.trim() || "tu audiencia";
  const problem = input.problem?.trim() || "el problema que resolvés";
  const transformation = input.transformation?.trim() || "el resultado que prometés";

  return runAiTask<OfferDraft>({
    task: "offer_draft",
    system: SYSTEM_BASE,
    schemaHint:
      '{ headline, positioning, promise, suggested_price: number, benefits: string[6], cta_text, guarantee, bonuses: [{name, description, value}], order_bump: {name, description, price, checkbox_label}, upsell: {name, headline, description, price}, downsell: {name, headline, description, price} }',
    maxTokens: 3000,
    prompt: `Armá una oferta irresistible para este producto digital.

Producto: ${input.productName}
Audiencia: ${audience}
Problema: ${problem}
Transformación: ${transformation}
Precio principal: ${formatMoney(input.price, input.currency)}
Tono: ${TONE_HINT[input.tone ?? "directo"] ?? TONE_HINT.directo}

Devolvé headline, posicionamiento, promesa principal, un precio sugerido, 6
beneficios en formato resultado (no características), texto del CTA, texto de
garantía, 3 bonos con valor percibido, un order bump de bajo precio, un upsell
y un downsell.

Sobre "suggested_price": es una propuesta, no un dato. Tené en cuenta que es un
producto digital, que la moneda es ${input.currency} y que el precio de arriba
es el punto de partida. Devolvé un número redondo y verosimíl para ese mercado.
El resto de los precios va relativo a ese: el order bump entre el 15% y el 30%
del principal, el upsell entre 1,5x y 3x, el downsell alrededor del 50% del
upsell.

No inventes cifras de resultados de clientes.`,
    fallback: (): OfferDraft => ({
      headline: `${input.productName}: ${transformation}`,
      positioning: `Para ${audience} que quieren dejar atrás ${problem}.`,
      promise: `Un camino claro para llegar a ${transformation}, sin dar vueltas.`,
      suggested_price: input.price,
      benefits: [
        `Salís de ${problem} con un plan concreto`,
        "Sabés exactamente qué hacer primero",
        "Aplicás desde el día uno",
        "Tenés plantillas listas para usar",
        "Evitás los errores más comunes",
        `Llegás a ${transformation}`,
      ],
      cta_text: "Quiero mi acceso ahora",
      guarantee:
        "Garantía de 7 días: si no es para vos, escribinos y te devolvemos el 100%. (Revisá que puedas cumplirla antes de publicar.)",
      bonuses: [
        {
          name: "Checklist de implementación",
          description: "El paso a paso resumido en una hoja para tener a mano.",
          value: Math.round(input.price * 0.5),
        },
        {
          name: "Plantillas editables",
          description: "Los formatos ya armados para que no arranques de cero.",
          value: Math.round(input.price * 0.6),
        },
        {
          name: "Guía de errores frecuentes",
          description: "Qué evitar en las primeras semanas.",
          value: Math.round(input.price * 0.4),
        },
      ],
      order_bump: {
        name: "Pack de plantillas extra",
        description: "Sumá las plantillas complementarias por un precio simbólico.",
        price: Math.max(1, Math.round(input.price * 0.22)),
        checkbox_label: `Sí, quiero agregar este complemento por ${formatMoney(
          Math.max(1, Math.round(input.price * 0.22)),
          input.currency,
        )}`,
      },
      upsell: {
        name: "Versión completa",
        headline: "Llevate el sistema completo con acompañamiento",
        description:
          "Sumás los módulos avanzados y el material de seguimiento para sostener el resultado.",
        price: Math.round(input.price * 2),
      },
      downsell: {
        name: "Versión esencial",
        headline: "Quedate con lo esencial a mitad de precio",
        description: "Los módulos avanzados sin el material de seguimiento.",
        price: Math.round(input.price),
      },
    }),
  });
}

/* -------------------------------------------------------------------------- */
/* 3. Landing page                                                             */
/* -------------------------------------------------------------------------- */

export interface LandingDraft {
  sections: Array<{ type: string; content: Record<string, unknown> }>;
}

export interface LandingBriefInput {
  productName: string;
  audience?: string;
  problem?: string;
  transformation?: string;
  offerName?: string;
  price: number;
  currency: string;
  tone?: string;
  benefits?: string[];
  guarantee?: string | null;
  bonuses?: Array<{ name: string; description: string | null }>;
  /** El estilo de página elegido. Define qué bloques se le piden al modelo. */
  layout?: LandingLayout;
}

/**
 * Qué campos lleva cada bloque.
 *
 * Antes esta lista estaba escrita a mano dentro del prompt, con los 13 bloques
 * del estilo clásico numerados. Ahora que el vendedor puede elegir el estilo de
 * su página, el prompt se arma con los bloques de SU estilo: pedirle al modelo
 * bloques que la página no tiene es gastar tokens y arriesgar que devuelva
 * secciones que después hay que tirar.
 */
const BLOCK_SPECS: Record<string, string> = {
  hero: "eyebrow, headline, subheadline, cta, pills[] (3 frases cortas), social, trust",
  stats: "items[{value, label}] (4), highlights[{title, subtitle, text}] (3)",
  problems: "title, subtitle, items[] (5 dolores concretos, en segunda persona), closing",
  gallery: "kicker, title, subtitle, featured_alt, images[{alt}] (6), note",
  solution:
    "badge, title, subtitle, text, tags[] (4), highlight, stats[{value, label}] (3), features[] (4)",
  modules: "kicker, title, box_title, items[{title, description}] (6), metrics[{value, label}] (2)",
  bonuses: "kicker, title, items[{name, description, badge}], footer_note",
  pricing:
    "title, badge, product_name, subtitle, price_label, compare_label, note, includes[] (6), cta, trust[] (3)",
  testimonials: "kicker, title, subtitle, items[] vacío y placeholder true",
  guarantee: "title, text, seal, note",
  faq: "kicker, title, items[{question, answer}] (8 preguntas reales de objeción)",
  cta: "kicker, headline, subheadline, cta, micro, trust[] (3)",
  footer: "brand, text, links[] (3)",
  benefits: "title, items[] (6 resultados concretos, en segunda persona)",
  features:
    "title, items[{title, description}] (3 pasos, del pago al primer resultado, numerados en el title)",
  comparison:
    "title, without_title, with_title, without_items[] (5), with_items[] (5) — en espejo, punto por punto",
  countdown: "title, text (sin inventar una fecha: decile al vendedor que ponga la suya)",
  headline: "text",
  subheadline: "text",
  mockup: "title, caption",
  social_proof: "text, placeholder true",
  video: "title, url vacío",
  image: "alt, url vacío",
};

export function generateLandingDraft(input: LandingBriefInput): Promise<AiResult<LandingDraft>> {
  const audience = input.audience?.trim() || "tu audiencia";
  const problem = input.problem?.trim() || "el problema que resolvés";
  const transformation = input.transformation?.trim() || "el resultado que prometés";

  // Los bloques del estilo que eligió el vendedor, no una lista fija.
  const layout = input.layout ?? DEFAULT_LAYOUT;
  const bloques = layout.structure;

  /**
   * El borrador local y el pedido a la IA comparten la misma estructura: la
   * plantilla base. Así, haya o no proveedor conectado, la página siempre sale
   * con los mismos bloques en el mismo orden, y lo único que cambia es qué tan
   * buenos son los textos.
   */
  const base = () =>
    landingTemplate({
      product: {
        name: input.productName,
        subtitle: null,
        description: null,
        audience: input.audience ?? null,
        main_problem: input.problem ?? null,
        transformation: input.transformation ?? null,
        benefits: JSON.stringify(input.benefits ?? []),
      },
      offer: {
        headline: null,
        promise: null,
        benefits: JSON.stringify(input.benefits ?? []),
        cta_text: "Quiero mi acceso",
        guarantee: input.guarantee ?? null,
        price: input.price,
        compare_at_price: null,
        currency: input.currency,
      },
      bonuses: input.bonuses ?? [],
      workspaceName: input.productName,
      layout,
    });

  return runAiTask<LandingDraft>({
    task: "landing_draft",
    system: SYSTEM_BASE,
    schemaHint: `{ sections: [{ type: ${bloques
      .map((tipo) => `"${tipo}"`)
      .join("|")}, content: object }] }`,
    maxTokens: 4000,
    prompt: `Escribí el copy completo de una landing page de venta directa para tráfico frío de Meta Ads.

Producto: ${input.productName}
Oferta: ${input.offerName ?? input.productName}
Audiencia: ${audience}
Problema: ${problem}
Transformación: ${transformation}
Precio: ${formatMoney(input.price, input.currency)}
Tono: ${TONE_HINT[input.tone ?? "directo"] ?? TONE_HINT.directo}
${input.benefits?.length ? `Beneficios ya definidos: ${input.benefits.join(" | ")}` : ""}
${input.bonuses?.length ? `Bonos ya definidos: ${input.bonuses.map((b) => b.name).join(" | ")}` : ""}

Devolvé EXACTAMENTE estos ${bloques.length} bloques, en este orden y con estos campos:

${bloques.map((tipo, i) => `${i + 1}. ${tipo} — ${BLOCK_SPECS[tipo] ?? "los campos que corresponda"}`).join("\n")}

LONGITUD — la regla que más se incumple, leela dos veces:
· Escribí CORTO. Una landing se escanea, no se lee. Si una frase dice lo mismo
  con la mitad de las palabras, va con la mitad. Preferí punto antes que coma.
· Una idea por campo. Nada de encadenar con "y además", "también", "por si fuera poco".
· Contá los caracteres antes de devolver. Máximos por campo:
  - headline / title / box_title: 60 caracteres.
  - subheadline / subtitle / promise: 100 caracteres.
  - eyebrow / kicker / badge / seal / price_label / compare_label: 30 caracteres.
  - cta: 25 caracteres.
  - pills, tags, features, includes, trust, links: 35 caracteres cada uno.
  - items de "problems": 90 caracteres cada uno, una sola frase.
  - closing de "problems", micro de "cta", note, footer_note, social: 90 caracteres.
  - description de "modules" y "bonuses", title de "highlights": 110 caracteres.
  - text de "solution", "guarantee" y "highlights": 200 caracteres.
  - question de "faq": 60 caracteres. answer de "faq": 160 caracteres, dos frases máximo.
  - label de "stats" y "metrics": una o dos palabras. value: 4 caracteres.
· Sin adjetivos de relleno: "increíble", "revolucionario", "único en su tipo",
  "la mejor herramienta del mercado". Si se puede borrar sin perder sentido, se borra.
· Si te falta contenido para llenar un campo, dejalo corto. Nunca lo estires.

Reglas:
· Cada headline tiene que ser específico y hablarle a esa audiencia, no genérico.
· En "problems" escribí dolores que la persona reconozca como propios, no categorías.
· PROHIBIDO inventar cantidades de personas, alumnos, ventas, descargas, años de
  experiencia o porcentajes de resultados. Nada de "+1.500 personas ya lo usan",
  "el 97% lo logra" ni "miles de clientes". Si el dato no está más arriba, NO EXISTE
  y no se escribe. Esto vale para TODOS los campos, incluido "social".
· El campo "social" describe qué es el material (por ejemplo "Material digital para
  consultar siempre"), nunca cuánta gente lo compró.
· Los números de "stats" y "metrics" tienen que salir de los datos de arriba. Si no
  tenés un número real, usá algo verificable como "100%" digital, "24/7" de acceso o
  la cantidad de beneficios y bonos que te pasé.
· NUNCA inventes testimonios: "testimonials" va con items vacío y placeholder en true.
· No nombres medios de pago concretos: no sabés cuál tiene configurado.
· Escribí en voseo rioplatense.`,
    fallback: (): LandingDraft => ({ sections: base() }),
  });
}

/* -------------------------------------------------------------------------- */
/* 4. Análisis / optimización de funnel                                        */
/* -------------------------------------------------------------------------- */

export interface FunnelDiagnosis {
  summary: string;
  findings: Array<{
    problem: string;
    evidence: string;
    recommendation: string;
    impact_area: string;
    suggested_test: string;
    confidence: "baja" | "media" | "alta";
  }>;
  data_warning?: string;
}

export interface FunnelAnalysisInput {
  funnelName: string;
  steps: Array<{ name: string; type: string; visitors: number; conversionRate: number }>;
  orders: number;
  revenue: number;
  currency: string;
  bumpTakeRate: number | null;
  upsellTakeRate: number | null;
}

export function analyzeFunnel(input: FunnelAnalysisInput): Promise<AiResult<FunnelDiagnosis>> {
  const totalVisitors = input.steps[0]?.visitors ?? 0;
  const lowData = totalVisitors < 200 || input.orders < 10;

  return runAiTask<FunnelDiagnosis>({
    task: "funnel_analysis",
    system: `${SYSTEM_BASE}
Sos analista de conversión. Trabajás SOLO con los números que te pasan.
Si el volumen de datos es bajo, lo decís explícitamente y bajás la confianza.
NUNCA afirmes significancia estadística: no tenés forma de calcularla.`,
    schemaHint:
      '{ summary, findings: [{problem, evidence, recommendation, impact_area, suggested_test, confidence}], data_warning }',
    maxTokens: 2000,
    prompt: `Analizá este funnel y devolvé hallazgos accionables.

Funnel: ${input.funnelName}
Pasos:
${input.steps
  .map(
    (step) =>
      `- ${step.name} (${step.type}): ${step.visitors} visitantes, pasa al siguiente ${formatPercent(
        step.conversionRate,
      )}`,
  )
  .join("\n")}
Ventas pagadas: ${input.orders}
Facturación: ${formatMoney(input.revenue, input.currency)}
Take rate order bump: ${input.bumpTakeRate === null ? "sin datos" : formatPercent(input.bumpTakeRate)}
Take rate upsell: ${input.upsellTakeRate === null ? "sin datos" : formatPercent(input.upsellTakeRate)}

Para cada hallazgo: problema, evidencia (citá los números reales), recomendación
concreta, área de impacto esperada y un test sugerido. Máximo 4 hallazgos.`,
    fallback: (): FunnelDiagnosis => {
      const findings: FunnelDiagnosis["findings"] = [];
      const weakest = [...input.steps]
        .filter((s) => s.visitors > 0)
        .sort((a, b) => a.conversionRate - b.conversionRate)[0];

      if (weakest) {
        findings.push({
          problem: `El paso "${weakest.name}" es donde más gente se cae.`,
          evidence: `Recibe ${weakest.visitors} visitantes y solo ${formatPercent(
            weakest.conversionRate,
          )} avanza al paso siguiente.`,
          recommendation:
            weakest.type === "checkout"
              ? "Sacá campos que no uses, mostrá la garantía cerca del botón y reforzá el resumen de lo que recibe."
              : "Alineá el mensaje de este paso con el anuncio que trae el tráfico y dejá un solo CTA visible.",
          impact_area: weakest.type === "checkout" ? "Tasa de compra" : "Avance entre pasos",
          suggested_test: "A/B de headline + ubicación de la garantía.",
          confidence: lowData ? "baja" : "media",
        });
      }

      if (input.bumpTakeRate !== null && input.bumpTakeRate < 15) {
        findings.push({
          problem: "El order bump se toma poco.",
          evidence: `Take rate actual: ${formatPercent(input.bumpTakeRate)}.`,
          recommendation:
            "Reescribí el bump como complemento directo del producto principal y bajá el precio al 15-25% del ticket.",
          impact_area: "Ticket promedio",
          suggested_test: "A/B del texto del checkbox y del precio del bump.",
          confidence: lowData ? "baja" : "media",
        });
      }

      if (input.upsellTakeRate !== null && input.upsellTakeRate < 10) {
        findings.push({
          problem: "El upsell convierte por debajo de lo esperable.",
          evidence: `Take rate actual: ${formatPercent(input.upsellTakeRate)}.`,
          recommendation:
            "Conectá el upsell con el resultado del producto que acaban de comprar y mostrá el precio comparado.",
          impact_area: "Ticket promedio",
          suggested_test: "A/B del headline del upsell.",
          confidence: lowData ? "baja" : "media",
        });
      }

      if (!findings.length) {
        findings.push({
          problem: "Todavía no hay señal suficiente para diagnosticar.",
          evidence: `El funnel registró ${totalVisitors} visitantes y ${input.orders} ventas en el período.`,
          recommendation:
            "Mandá tráfico al funnel y volvé cuando tengas al menos unos cientos de visitantes.",
          impact_area: "Datos",
          suggested_test: "Todavía no conviene testear: no vas a poder leer el resultado.",
          confidence: "baja",
        });
      }

      return {
        summary: lowData
          ? "El volumen de datos todavía es bajo. Tomá esto como hipótesis, no como conclusión."
          : "Estos son los puntos donde el funnel pierde más gente.",
        findings,
        data_warning: lowData
          ? `Con ${totalVisitors} visitantes y ${input.orders} ventas no se puede afirmar nada con certeza. Son hipótesis para testear.`
          : undefined,
      };
    },
  });
}

/* -------------------------------------------------------------------------- */
/* 5. Copy de anuncios                                                         */
/* -------------------------------------------------------------------------- */

export interface AdCopyDraft {
  primary_texts: string[];
  headlines: string[];
  descriptions: string[];
  hooks: string[];
  angles: Array<{ name: string; idea: string }>;
  ctas: string[];
  review_note: string;
}

export function generateAdCopy(input: {
  productName: string;
  audience?: string;
  problem?: string;
  transformation?: string;
  price: number;
  currency: string;
  tone?: string;
}): Promise<AiResult<AdCopyDraft>> {
  const audience = input.audience?.trim() || "tu audiencia";
  const problem = input.problem?.trim() || "el problema que resolvés";
  const transformation = input.transformation?.trim() || "el resultado que prometés";
  const reviewNote =
    "Revisá cada variante contra las políticas de publicidad de Meta antes de publicarla. TiendaFlow no valida el cumplimiento de políticas.";

  return runAiTask<AdCopyDraft>({
    task: "ad_copy",
    system: `${SYSTEM_BASE}
No prometas resultados garantizados ni uses afirmaciones sobre atributos personales
(salud, situación económica, edad) que Meta rechaza.`,
    schemaHint:
      '{ primary_texts: string[5], headlines: string[5], descriptions: string[3], hooks: string[6], angles: [{name, idea}], ctas: string[4], review_note }',
    maxTokens: 2500,
    prompt: `Escribí variantes de anuncio para Meta Ads.

Producto: ${input.productName}
Audiencia: ${audience}
Problema: ${problem}
Transformación: ${transformation}
Precio: ${formatMoney(input.price, input.currency)}
Tono: ${TONE_HINT[input.tone ?? "directo"] ?? TONE_HINT.directo}

Devolvé 5 textos principales (máx 125 palabras), 5 títulos (máx 40 caracteres),
3 descripciones (máx 30 caracteres), 6 hooks de primeros 3 segundos,
4 ángulos con su idea y 4 variantes de CTA.
En review_note recordá que hay que revisar políticas de Meta.`,
    fallback: (): AdCopyDraft => ({
      primary_texts: [
        `Si estás en ${problem}, esto es para vos.\n\n${input.productName} te da el paso a paso para llegar a ${transformation}.\n\nAcceso inmediato.`,
        `La mayoría empieza con ${problem} y abandona en la primera semana.\n\nNo es falta de ganas: es falta de método.\n\n${input.productName} te da uno.`,
        `${capitalize(transformation)} no depende de motivación. Depende de tener un plan.\n\nAdentro de ${input.productName} está ese plan.`,
        `Para ${audience}: dejá de improvisar.\n\n${input.productName}, ${formatMoney(input.price, input.currency)}, acceso inmediato.`,
        `¿Cuántas veces arrancaste y lo dejaste?\n\n${input.productName} está armado para que esta vez llegues a ${transformation}.`,
      ],
      headlines: [
        capitalize(transformation).slice(0, 40),
        `El método para ${transformation}`.slice(0, 40),
        `${input.productName}`.slice(0, 40),
        "Acceso inmediato",
        `Empezá hoy`,
      ],
      descriptions: ["Descarga inmediata", "Paso a paso", "Sin vueltas"],
      hooks: [
        `Si ${problem}, mirá esto.`,
        "Nadie te cuenta esta parte.",
        `El error #1 al buscar ${transformation}.`,
        "Probá esto durante 7 días.",
        "Esto me hubiera ahorrado meses.",
        `Para ${audience} que ya probaron de todo.`,
      ],
      angles: [
        { name: "Dolor", idea: `Arrancar por ${problem} y mostrar el costo de seguir así.` },
        { name: "Método", idea: "Presentar el sistema paso a paso como diferencial." },
        { name: "Error común", idea: "Desarmar la creencia que hace fracasar al público." },
        { name: "Velocidad", idea: "Mostrar el primer resultado concreto y cuándo llega." },
      ],
      ctas: ["Quiero mi acceso", "Empezar ahora", "Ver la guía", "Descargar ahora"],
      review_note: reviewNote,
    }),
  });
}

/* -------------------------------------------------------------------------- */
/* 6. Reescritura de texto (copiloto contextual)                               */
/* -------------------------------------------------------------------------- */

export type RewriteAction = "improve" | "expand" | "shorten" | "tone";

export function rewriteText(input: {
  text: string;
  action: RewriteAction;
  tone?: string;
  context?: string;
}): Promise<AiResult<{ text: string }>> {
  const actionLabel: Record<RewriteAction, string> = {
    improve: "Mejoralo: más claro, más específico, más orientado a la acción.",
    expand: "Ampliá el texto agregando detalle concreto, sin inventar datos.",
    shorten: "Acortalo a la mitad conservando el mensaje central.",
    tone: `Reescribilo con tono ${TONE_HINT[input.tone ?? "cercano"] ?? TONE_HINT.cercano}.`,
  };

  return runAiTask<{ text: string }>({
    task: `rewrite_${input.action}`,
    system: SYSTEM_BASE,
    schemaHint: "{ text: string }",
    maxTokens: 1500,
    prompt: `${actionLabel[input.action]}

${input.context ? `Contexto: ${input.context}\n` : ""}
Texto original:
"""
${input.text}
"""`,
    fallback: () => {
      if (input.action === "shorten") {
        const sentences = input.text.split(/(?<=[.!?])\s+/);
        return { text: sentences.slice(0, Math.max(1, Math.ceil(sentences.length / 2))).join(" ") };
      }
      return { text: input.text };
    },
  });
}

/* -------------------------------------------------------------------------- */
/* 7. Insights del dashboard                                                   */
/* -------------------------------------------------------------------------- */

export interface DashboardInsight {
  title: string;
  body: string;
  severity: "info" | "warning" | "success";
  action_label: string;
  action_href: string;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** La primera oración de un texto largo, recortada para que entre en un título. */
function primeraFrase(texto: string): string {
  const frase = texto.split(/(?<=[.!?\n])/)[0]?.trim().replace(/[.!?]$/, "") ?? "";
  return frase.length > 60 ? `${frase.slice(0, 57).trimEnd()}…` : frase;
}
