/**
 * Vocabulario y navegación del producto, compartido entre servidor y cliente.
 *
 * Vive separado de `product-workspace.ts` a propósito: ese módulo está marcado
 * `server-only` porque toca la base de datos, y el sidebar —que es un Client
 * Component— necesita estas constantes. Acá no puede entrar nada que lea datos.
 */

export type ProductStage =
  | "sin_oferta"
  | "sin_funnel"
  | "sin_publicar"
  | "sin_cobros"
  | "vendiendo";

export interface ProductNavEntry {
  id: string;
  name: string;
  stage: ProductStage;
}

export const STAGE_LABEL: Record<ProductStage, string> = {
  sin_oferta: "Sin precio",
  sin_funnel: "Sin página",
  sin_publicar: "Sin publicar",
  sin_cobros: "No puede cobrar",
  vendiendo: "Vendiendo",
};

export const STAGE_TONE: Record<ProductStage, "neutral" | "warning" | "success" | "danger"> = {
  sin_oferta: "neutral",
  sin_funnel: "neutral",
  sin_publicar: "warning",
  sin_cobros: "danger",
  vendiendo: "success",
};

/**
 * Secciones de un producto. Es la navegación real del espacio de trabajo.
 *
 * Cada sección responde **una sola pregunta**, y esa pregunta está escrita en el
 * `blurb`: es la frase que aparece arriba de la pantalla explicando qué está
 * haciendo la persona. No es decoración — es lo que reemplaza al tutorial.
 */
export const PRODUCT_SECTIONS = [
  {
    segment: "",
    label: "Resumen",
    emoji: "🏠",
    blurb: "Acá ves qué falta para que tu producto pueda venderse, y qué hacer ahora.",
  },
  {
    segment: "producto",
    label: "Mi producto",
    emoji: "📕",
    blurb: "Acá definís qué estás vendiendo y qué recibe tu cliente cuando compra.",
  },
  {
    segment: "cliente",
    label: "Mi cliente",
    emoji: "🎯",
    blurb:
      "Acá averiguás a quién le vendés: qué le duele, qué lo frena y con qué palabras hablarle.",
  },
  {
    segment: "oferta",
    label: "Mi oferta",
    emoji: "💰",
    blurb: "Acá definís cuánto sale y por qué alguien debería comprártelo.",
  },
  {
    segment: "pagina",
    label: "Página de venta",
    emoji: "🛍️",
    blurb: "Esta es la página que ve tu cliente antes de comprar.",
  },
  {
    segment: "cobro",
    label: "Cómo cobro",
    emoji: "💳",
    blurb: "Conectá una cuenta para poder recibir el dinero de tus ventas.",
  },
  {
    segment: "despues",
    label: "Después de comprar",
    emoji: "🎁",
    blurb: "Podés ofrecerle algo más a tu cliente justo después de que compre.",
  },
  {
    segment: "resultados",
    label: "Resultados",
    emoji: "📊",
    blurb: "Mirá qué está funcionando y dónde podés vender más.",
  },
] as const;

export type ProductSection = (typeof PRODUCT_SECTIONS)[number];

/** El `blurb` de una sección, buscado por segmento. */
export function sectionBlurb(segment: string): string {
  return PRODUCT_SECTIONS.find((section) => section.segment === segment)?.blurb ?? "";
}
