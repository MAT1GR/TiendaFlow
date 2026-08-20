import "server-only";

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
  benefits: string[];
  outline: Array<{ chapter: string; summary: string; bullets: string[] }>;
  faq: Array<{ question: string; answer: string }>;
  bonus_ideas: string[];
  offer_ideas: string[];
}

export interface ProductBriefInput {
  topic: string;
  audience?: string;
  level?: string;
  problem?: string;
  outcome?: string;
  tone?: string;
  length?: string;
}

export function generateProductDraft(input: ProductBriefInput): Promise<AiResult<ProductDraft>> {
  const audience = input.audience?.trim() || "personas que quieren avanzar en este tema";
  const problem = input.problem?.trim() || `no saber por dónde empezar con ${input.topic}`;
  const outcome = input.outcome?.trim() || "un plan concreto para aplicar desde el primer día";

  return runAiTask<ProductDraft>({
    task: "product_draft",
    system: SYSTEM_BASE,
    schemaHint:
      '{ titles: string[5], subtitle, positioning, description, short_description, benefits: string[6], outline: [{chapter, summary, bullets: string[3]}], faq: [{question, answer}], bonus_ideas: string[4], offer_ideas: string[3] }',
    maxTokens: 4000,
    prompt: `Creá el borrador completo de un producto digital.

Tema: ${input.topic}
Audiencia: ${audience}
Nivel de experiencia de la audiencia: ${input.level ?? "principiante"}
Problema principal que resuelve: ${problem}
Resultado que busca el lector: ${outcome}
Tono: ${TONE_HINT[input.tone ?? "cercano"] ?? TONE_HINT.cercano}
Extensión aproximada: ${input.length ?? "corta (30-50 páginas)"}

Generá: 5 títulos posibles, un subtítulo, el posicionamiento en una frase,
una descripción larga (3 párrafos), una descripción corta (máx 160 caracteres),
6 beneficios, un índice de 6 a 8 capítulos con resumen y 3 bullets cada uno,
5 preguntas frecuentes con respuesta, 4 ideas de bonos y 3 ideas de oferta.`,
    fallback: (): ProductDraft => {
      const topic = input.topic.trim() || "tu tema";
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
        description: `Esta guía está pensada para ${audience}.\n\nAdentro vas a encontrar el paso a paso para resolver ${problem}, con ejercicios concretos y ejemplos aplicables desde el primer día.\n\nAl terminar vas a tener ${outcome}.`,
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
      '{ headline, positioning, promise, benefits: string[6], cta_text, guarantee, bonuses: [{name, description, value}], order_bump: {name, description, price, checkbox_label}, upsell: {name, headline, description, price}, downsell: {name, headline, description, price} }',
    maxTokens: 3000,
    prompt: `Armá una oferta irresistible para este producto digital.

Producto: ${input.productName}
Audiencia: ${audience}
Problema: ${problem}
Transformación: ${transformation}
Precio principal: ${formatMoney(input.price, input.currency)}
Tono: ${TONE_HINT[input.tone ?? "directo"] ?? TONE_HINT.directo}

Devolvé headline, posicionamiento, promesa principal, 6 beneficios en formato
resultado (no características), texto del CTA, texto de garantía, 3 bonos con
valor percibido, un order bump de bajo precio, un upsell y un downsell.
El order bump debe costar entre el 15% y el 30% del precio principal.
El upsell entre 1,5x y 3x. El downsell alrededor del 50% del upsell.
No inventes cifras de resultados de clientes.`,
    fallback: (): OfferDraft => ({
      headline: `${input.productName}: ${transformation}`,
      positioning: `Para ${audience} que quieren dejar atrás ${problem}.`,
      promise: `Un camino claro para llegar a ${transformation}, sin dar vueltas.`,
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
}

export function generateLandingDraft(input: LandingBriefInput): Promise<AiResult<LandingDraft>> {
  const audience = input.audience?.trim() || "tu audiencia";
  const problem = input.problem?.trim() || "el problema que resolvés";
  const transformation = input.transformation?.trim() || "el resultado que prometés";

  return runAiTask<LandingDraft>({
    task: "landing_draft",
    system: SYSTEM_BASE,
    schemaHint:
      '{ sections: [{ type: "hero"|"benefits"|"features"|"bonuses"|"guarantee"|"faq"|"pricing"|"cta", content: object }] }',
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

Devolvé estas secciones en orden: hero (headline, subheadline, cta), benefits
(title + items[]), features (title + items[{title, description}]), bonuses
(title + items[{name, description}]), guarantee (title, text), faq (title +
items[{question, answer}]), pricing (title, price_label, cta), cta (headline, cta).
Cada headline debe ser específico y hablarle a la audiencia. Nada de testimonios inventados.`,
    fallback: (): LandingDraft => ({
      sections: [
        {
          type: "hero",
          content: {
            eyebrow: `Para ${audience}`,
            headline: `${transformation}, sin dar mil vueltas`,
            subheadline: `${input.productName} es la guía práctica para dejar atrás ${problem} y avanzar con un método claro.`,
            cta: "Quiero mi acceso",
          },
        },
        {
          type: "benefits",
          content: {
            title: "Lo que te llevás",
            items:
              input.benefits?.length
                ? input.benefits
                : [
                    "Un método paso a paso, no teoría suelta",
                    "Ejercicios para aplicar desde el día uno",
                    "Los errores más comunes, identificados",
                    "Acceso inmediato después de la compra",
                  ],
          },
        },
        {
          type: "features",
          content: {
            title: "Cómo funciona",
            items: [
              { title: "1. Comprás", description: "Checkout simple, sin pasos de más." },
              { title: "2. Recibís el acceso", description: "Te llega al mail apenas se confirma el pago." },
              { title: "3. Aplicás", description: "Empezás por el primer capítulo y avanzás a tu ritmo." },
            ],
          },
        },
        {
          type: "bonuses",
          content: {
            title: "Además te llevás estos bonos",
            items:
              input.bonuses?.map((bonus) => ({
                name: bonus.name,
                description: bonus.description ?? "",
              })) ?? [
                { name: "Checklist de implementación", description: "El paso a paso en una hoja." },
                { name: "Plantillas editables", description: "Para no arrancar de cero." },
              ],
          },
        },
        {
          type: "guarantee",
          content: {
            title: "Garantía",
            text:
              input.guarantee ??
              "Definí acá tu política de garantía. Escribí solo lo que puedas cumplir.",
          },
        },
        {
          type: "faq",
          content: {
            title: "Preguntas frecuentes",
            items: [
              { question: "¿Cómo lo recibo?", answer: "Es digital. Te llega por mail al confirmar el pago." },
              { question: "¿Necesito experiencia previa?", answer: "No, está pensado desde cero." },
              { question: "¿Puedo pagar en cuotas?", answer: "Depende del medio de pago que tengas configurado." },
            ],
          },
        },
        {
          type: "pricing",
          content: {
            title: "Tu acceso hoy",
            price_label: formatMoney(input.price, input.currency),
            cta: "Quiero mi acceso",
          },
        },
        {
          type: "cta",
          content: {
            headline: `Empezá hoy con ${input.productName}`,
            cta: "Quiero mi acceso",
          },
        },
      ],
    }),
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
