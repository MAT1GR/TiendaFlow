/** Utilidades compartidas (seguras para cliente y servidor). */

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

const CURRENCY_LOCALE: Record<string, string> = {
  ARS: "es-AR",
  USD: "en-US",
  MXN: "es-MX",
  COP: "es-CO",
  CLP: "es-CL",
  PEN: "es-PE",
  EUR: "es-ES",
  BRL: "pt-BR",
};

/**
 * A partir de acá se abrevia: 10.000 pasa a "10 k".
 *
 * El sufijo lo ponemos nosotros y no `Intl` con `notation: "compact"`. Esa
 * opción devuelve "k" o "K" según qué datos de ICU tenga el motor, y Node y el
 * navegador no siempre traen los mismos: el servidor renderizaba "$456,3 k",
 * el cliente "$456,3 K", y React tiraba el árbol entero para rehidratarlo por
 * una letra. Una abreviatura escrita a mano es aburrida y da siempre igual en
 * los dos lados, que es exactamente lo que necesita algo que se renderiza dos
 * veces.
 */
const DESDE_COMPACTO = 10_000;
const ESCALAS: Array<[number, string]> = [
  [1_000_000_000, "MM"],
  [1_000_000, "M"],
  [1_000, "k"],
];

/** El número abreviado y su sufijo, o `null` si no llega al piso. */
function abreviar(value: number): { valor: number; sufijo: string } | null {
  if (Math.abs(value) < DESDE_COMPACTO) return null;
  for (const [escala, sufijo] of ESCALAS) {
    if (Math.abs(value) >= escala) return { valor: value / escala, sufijo };
  }
  return null;
}

export function formatMoney(amount: number, currency = "ARS", compact = false) {
  const locale = CURRENCY_LOCALE[currency] ?? "es-AR";
  const abreviado = compact ? abreviar(amount) : null;

  try {
    const texto = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: abreviado ? 1 : compact || Number.isInteger(amount) ? 0 : 2,
    }).format(abreviado ? abreviado.valor : amount);

    return abreviado ? `${texto} ${abreviado.sufijo}` : texto;
  } catch {
    return `$${amount.toFixed(0)}`;
  }
}

export function formatNumber(value: number, compact = false) {
  const abreviado = compact ? abreviar(value) : null;
  const texto = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 1,
  }).format(abreviado ? abreviado.valor : value);

  return abreviado ? `${texto} ${abreviado.sufijo}` : texto;
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits).replace(".", ",")}%`;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function relativeTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return formatDate(value);
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Parsea un campo JSON almacenado como texto, devolviendo `fallback` si falla. */
export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export function toLines(value: string | null | undefined): string[] {
  return parseJson<string[]>(value, []).filter(Boolean);
}

export function delta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export const GREETINGS = ["Buenos días", "Buenas tardes", "Buenas noches"];

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return GREETINGS[0];
  if (hour < 20) return GREETINGS[1];
  return GREETINGS[2];
}

export const PRODUCT_TYPE_LABEL: Record<string, string> = {
  ebook: "Ebook",
  pdf: "PDF",
  template: "Plantilla",
  guide: "Guía",
  file: "Archivo digital",
  other: "Otro producto digital",
};

export const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  active: "Activo",
  archived: "Archivado",
  published: "Publicado",
  paused: "En pausa",
  paid: "Pagada",
  pending: "Pendiente",
  failed: "Fallida",
  refunded: "Reembolsada",
  new: "Nuevo",
  returning: "Recurrente",
  high_value: "Alto valor",
  connected: "Conectado",
  disconnected: "Sin conectar",
  error: "Con error",
};

export const STEP_TYPE_LABEL: Record<string, string> = {
  landing: "Landing page",
  checkout: "Checkout",
  upsell: "Upsell",
  downsell: "Downsell",
  thankyou: "Gracias",
  custom: "Paso personalizado",
};

/** Tonos del design system. Vive acá para que lo usen server y client components. */
export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

/** Mapea el estado de una entidad al tono visual que le corresponde. */
export function statusTone(status: string): Tone {
  switch (status) {
    case "active":
    case "published":
    case "paid":
    case "connected":
    case "high_value":
      return "success";
    case "draft":
    case "pending":
    case "new":
      return "neutral";
    case "paused":
    case "warning":
      return "warning";
    case "failed":
    case "error":
      return "danger";
    case "returning":
      return "brand";
    default:
      return "neutral";
  }
}
