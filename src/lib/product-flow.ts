/**
 * El paso a paso de crear un producto.
 *
 * Crear un producto que se pueda vender son cinco cosas: cargar el producto,
 * ponerle precio, armar la página, poder cobrar y publicar. Cada una vive en su
 * propia pantalla porque cada una se puede volver a editar sola, pero la
 * primera vez tienen que encadenarse: el vendedor confirma y sigue, sin volver
 * al menú del producto a buscar cuál era el paso que seguía.
 *
 * Esa cadena es lo que arma este módulo. Un solo parámetro en la URL —`guia=1`—
 * viaja de pantalla en pantalla y significa "esta persona está en el medio del
 * paso a paso": las pantallas que lo ven muestran en qué paso va y adónde
 * sigue, y los formularios que lo ven mandan al paso siguiente en vez de volver
 * al producto.
 *
 * Vive suelto de `product-workspace.ts` —que es `server-only`— porque la barra
 * de progreso es un Client Component. Acá no puede entrar nada que lea datos.
 */

/** La marca en la URL. Vale `1` y nada más. */
export const FLOW_PARAM = "guia";

export type FlowStepCode = "producto" | "oferta" | "pagina" | "cobro" | "publicar";

export interface FlowStep {
  code: FlowStepCode;
  emoji: string;
  /** Cómo se llama el paso en la barra. */
  label: string;
  /** Qué se logra al terminarlo, para el "ahora sigue…". */
  goal: string;
}

export const FLOW_STEPS: FlowStep[] = [
  { code: "producto", emoji: "📕", label: "Tu producto", goal: "contar qué vendés" },
  { code: "oferta", emoji: "💰", label: "Precio y promesa", goal: "ponerle precio" },
  { code: "pagina", emoji: "🛍️", label: "Página de venta", goal: "armar la página" },
  { code: "cobro", emoji: "💳", label: "Cómo cobrás", goal: "poder cobrar" },
  { code: "publicar", emoji: "🚀", label: "Publicar", goal: "ponerlo a la venta" },
];

export function flowIndex(code: FlowStepCode) {
  return FLOW_STEPS.findIndex((step) => step.code === code);
}

export function flowStep(code: FlowStepCode) {
  return FLOW_STEPS[flowIndex(code)];
}

/** El paso que sigue, o `null` si es el último. */
export function nextFlowStep(code: FlowStepCode): FlowStep | null {
  return FLOW_STEPS[flowIndex(code) + 1] ?? null;
}

/**
 * Marca una ruta como parte del paso a paso, sin pisar lo que ya traiga.
 *
 * `active` existe para poder escribir `withFlow(href, enFlujo)` en un link y no
 * tener que repetir el condicional en cada llamada.
 */
export function withFlow(href: string, active = true) {
  if (!active) return href;
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set(FLOW_PARAM, "1");
  return `${path}?${params.toString()}`;
}

/** Saca la marca: es lo que hace el "salir del paso a paso". */
export function withoutFlow(href: string) {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.delete(FLOW_PARAM);
  const rest = params.toString();
  return rest ? `${path}?${rest}` : path;
}

/** `true` si el valor que vino en la URL prende el paso a paso. */
export function isFlowActive(value: string | string[] | null | undefined) {
  return (Array.isArray(value) ? value[0] : value) === "1";
}
