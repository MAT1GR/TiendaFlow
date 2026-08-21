import "server-only";

/**
 * Filtro de prueba social inventada.
 *
 * Los modelos escriben “más de 1.500 personas ya lo usan” sin que nadie se lo
 * pida, aunque el prompt lo prohíba explícitamente. Lo probamos: se lo pedís
 * dos veces y a la tercera lo vuelve a hacer.
 *
 * Por eso esto no vive en el prompt sino en el servidor, después de generar y
 * antes de guardar. Una cifra de clientes inventada no es un problema de estilo:
 * es publicidad engañosa, y en Meta te cuesta la cuenta publicitaria.
 *
 * La regla es conservadora a propósito: solo marcamos números pegados a
 * palabras que hablan de **gente o de resultados**. “54 recetas” o “+150
 * referencias” describen el producto y pasan sin problema; “54 clientes” no.
 */

const GENTE =
  "personas|clientes|alumnos|alumnas|compradores|compradoras|familias|usuarios|usuarias|suscriptores|seguidores|estudiantes|emprendedores|emprendedoras|profesionales|mamás|mamas|celíacos|celiacos|celíacas|celiacas|descargas|ventas|reseñas|resenas|opiniones|testimonios";

const PATRONES: RegExp[] = [
  // "+1.500 personas", "más de 1000 clientes", "3.000 ventas"
  new RegExp(String.raw`(\+\s*)?\d[\d.,]*\s*(${GENTE})\b`, "i"),
  // "miles de personas", "cientos de alumnos"
  new RegExp(String.raw`\b(miles|cientos|decenas)\s+de\s+(${GENTE})\b`, "i"),
  // "97% de éxito", "el 90% lo logra"
  /\d{1,3}\s?%\s*(de\s+)?(éxito|exito|satisfacción|satisfaccion|efectividad|aprobación|aprobacion|recomienda|lo\s+logran?)/i,
  // "4,9 estrellas", "5 ★"
  /\d(?:[.,]\d)?\s*(estrellas|★)/i,
  // "10 años de experiencia"
  /\d+\s*años?\s+de\s+experiencia/i,
];

/** `true` si el texto afirma algo sobre gente o resultados que nadie verificó. */
export function looksInvented(text: string): boolean {
  return PATRONES.some((patron) => patron.test(text));
}

/**
 * Limpia el contenido generado usando el de la plantilla como red.
 *
 * Recorre strings, listas de strings y listas de objetos. Cuando encuentra una
 * afirmación inventada, se queda con el valor equivalente de la plantilla —que
 * siempre es seguro— y si no hay equivalente, borra el campo.
 *
 * Devuelve también cuántos campos tocó, para poder decírselo al usuario en vez
 * de arreglarlo a escondidas.
 */
export function sanitizeContent(
  generated: Record<string, unknown>,
  fallback: Record<string, unknown>,
): { content: Record<string, unknown>; cleaned: number } {
  let cleaned = 0;

  function clean(value: unknown, safe: unknown): unknown {
    if (typeof value === "string") {
      if (!looksInvented(value)) return value;
      cleaned += 1;
      return typeof safe === "string" ? safe : "";
    }

    if (Array.isArray(value)) {
      const safeList = Array.isArray(safe) ? safe : [];
      return value.map((item, index) => clean(item, safeList[index]));
    }

    if (value && typeof value === "object") {
      const safeObject = (safe && typeof safe === "object" ? safe : {}) as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        result[key] = clean(item, safeObject[key]);
      }
      return result;
    }

    return value;
  }

  return {
    content: clean(generated, fallback) as Record<string, unknown>,
    cleaned,
  };
}

/* -------------------------------------------------------------------------- */
/* Normalización                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Convierte lo que devolvió el modelo a la forma que espera la plantilla.
 *
 * Los modelos improvisan la estructura todo el tiempo: pedís `links: ["Contacto"]`
 * y te devuelven `links: [{ text: "Contacto", url: "/contacto" }]`. Antes de
 * blindar el renderizador, eso alcanzaba para tirar abajo la página entera.
 *
 * La plantilla base hace de esquema: si ahí un campo es texto, acá se fuerza a
 * texto; si es una lista de textos, se fuerza a lista de textos; si es una lista
 * de tarjetas, cada tarjeta se recorta a los campos que la plantilla conoce.
 * Así el editor tampoco se encuentra con formas que sus controles no saben
 * mostrar.
 */
export function conformToShape(
  generated: Record<string, unknown>,
  shape: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(generated)) {
    const expected = shape[key];

    // Campo que la plantilla no conoce: lo dejamos pasar tal cual.
    if (expected === undefined) {
      result[key] = value;
      continue;
    }

    if (typeof expected === "string") {
      result[key] = asText(value);
      continue;
    }

    if (Array.isArray(expected)) {
      const items = Array.isArray(value) ? value : [];
      const sample = expected[0];

      if (sample && typeof sample === "object") {
        const fields = Object.keys(sample as Record<string, unknown>);
        result[key] = items.map((item) => asCard(item, fields));
      } else {
        result[key] = items.map(asText).filter(Boolean);
      }
      continue;
    }

    result[key] = value;
  }

  return result;
}

/** Cualquier valor, convertido al texto más razonable que se pueda. */
function asText(value: unknown): string {
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

/** Una tarjeta recortada a los campos que la plantilla espera. */
function asCard(item: unknown, fields: string[]): Record<string, string> {
  if (!item || typeof item !== "object") {
    const text = asText(item);
    // Vino un string suelto donde esperábamos una tarjeta: lo ponemos en el
    // primer campo, que en todas nuestras tarjetas es el que se lee primero.
    return Object.fromEntries(fields.map((field, index) => [field, index === 0 ? text : ""]));
  }

  const record = item as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const field of fields) {
    result[field] = asText(record[field]);
  }

  // Si la tarjeta quedó vacía pero el objeto traía algo, rescatamos lo que haya.
  if (Object.values(result).every((value) => !value)) {
    const rescued = asText(record);
    if (rescued && fields[0]) result[fields[0]] = rescued;
  }

  return result;
}
