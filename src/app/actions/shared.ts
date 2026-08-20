import "server-only";

/** Resultado uniforme de todas las server actions. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function fail(error: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/**
 * Envuelve una acción para que ningún error interno llegue crudo al cliente.
 * Los errores esperados se devuelven como `ActionResult`; los inesperados se
 * loguean en el servidor y devuelven un mensaje genérico en español.
 */
export async function guard<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return fail("Tu sesión expiró. Volvé a iniciar sesión.");
    }
    console.error("[tiendaflow] error en server action:", error);
    return fail(
      "Algo falló de nuestro lado y no pudimos completar la acción. Probá de nuevo en unos segundos.",
    );
  }
}

export function requiredText(value: FormDataEntryValue | null, label: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new ValidationError(`${label} es obligatorio.`);
  return text;
}

export function optionalText(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

export function numberField(value: FormDataEntryValue | null, fallback = 0): number {
  const parsed = Number(typeof value === "string" ? value.replace(",", ".") : NaN);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function listField(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export class ValidationError extends Error {
  fieldErrors?: Record<string, string>;
  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export async function guarded<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ValidationError) {
      return fail(error.message, error.fieldErrors);
    }
    return guard(async () => {
      throw error;
    });
  }
}
