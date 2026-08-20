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

/** Secciones de un producto. Es la navegación real del espacio de trabajo. */
export const PRODUCT_SECTIONS = [
  { segment: "", label: "Resumen", emoji: "🏠" },
  { segment: "producto", label: "Mi producto", emoji: "📕" },
  { segment: "oferta", label: "Mi oferta", emoji: "💰" },
  { segment: "pagina", label: "Página de venta", emoji: "🛍️" },
  { segment: "cobro", label: "Cómo cobro", emoji: "💳" },
  { segment: "despues", label: "Después de comprar", emoji: "🎁" },
  { segment: "resultados", label: "Resultados", emoji: "📊" },
] as const;
