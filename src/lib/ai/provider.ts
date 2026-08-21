import "server-only";

/**
 * Capa de abstracción de IA.
 *
 * El resto de la aplicación nunca habla con un proveedor concreto: pide una
 * tarea (`runAiTask`) y recibe JSON tipado. Hoy hay tres backends:
 *
 *  - `anthropic`: se usa si existe ANTHROPIC_API_KEY.
 *  - `gemini`: se usa si existe GEMINI_API_KEY (o GOOGLE_API_KEY).
 *  - `template`: generador local determinístico que arma borradores a partir
 *    de los datos que cargó el usuario. Es el modo por defecto cuando no hay
 *    credenciales, y la UI lo indica explícitamente ("modo borrador local")
 *    para no hacer pasar una plantilla por una generación de IA.
 *
 * Las claves viven solo en el servidor y nunca se envían al cliente.
 *
 * Orden de preferencia: Anthropic, Gemini, borrador local. Si más adelante se
 * suma OpenAI, entra en esta misma lista y no hay que tocar nada más.
 */

export type AiProviderName = "anthropic" | "gemini" | "template";

export interface AiRequest {
  /** Nombre de la tarea, se usa para trazabilidad y para elegir la plantilla. */
  task: string;
  /** Instrucción de sistema para el modelo. */
  system: string;
  /** Prompt del usuario ya renderizado. */
  prompt: string;
  /** Esquema esperado, descrito en lenguaje natural para el modelo. */
  schemaHint: string;
  /** Borrador local usado cuando no hay proveedor configurado. */
  fallback: () => unknown;
  maxTokens?: number;
}

export interface AiResult<T = unknown> {
  data: T;
  provider: AiProviderName;
  model: string | null;
  /** true = el contenido lo armó el generador local, no un modelo. */
  isTemplate: boolean;
  warning?: string;
}

export interface AiStatus {
  configured: boolean;
  provider: AiProviderName;
  model: string | null;
  reason?: string;
}

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

function envKey(name: string): string | null {
  const value = process.env[name];
  return value && value.trim().length > 10 ? value.trim() : null;
}

/** La clave de Gemini, con el alias de Google Cloud como respaldo. */
export function geminiKey(): string | null {
  return envKey("GEMINI_API_KEY") ?? envKey("GOOGLE_API_KEY");
}

export function aiStatus(): AiStatus {
  if (envKey("ANTHROPIC_API_KEY")) {
    return {
      configured: true,
      provider: "anthropic",
      model: process.env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL,
    };
  }

  if (geminiKey()) {
    return {
      configured: true,
      provider: "gemini",
      model: process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL,
    };
  }

  return {
    configured: false,
    provider: "template",
    model: null,
    reason:
      "No hay un proveedor de IA conectado. TiendaFlow arma borradores locales con los datos que cargaste.",
  };
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.search(/[[{]/);
  if (start === -1) throw new Error("La respuesta del modelo no contenía JSON.");
  const candidate = raw.slice(start);
  return JSON.parse(candidate);
}

async function callAnthropic(request: AiRequest, model: string): Promise<unknown> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: request.maxTokens ?? 2048,
      system: `${request.system}\n\nRespondé SIEMPRE con un único objeto JSON válido, sin texto alrededor.\nEstructura esperada: ${request.schemaHint}`,
      messages: [{ role: "user", content: request.prompt }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `El proveedor de IA respondió ${response.status}. ${detail.slice(0, 300)}`,
    );
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = (payload.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("\n");
  return extractJson(text);
}

/**
 * Gemini (Generative Language API).
 *
 * Le pedimos JSON con `responseMimeType`, que es la forma soportada de forzar
 * una respuesta estructurada. Igual pasamos el texto por `extractJson`: si el
 * modelo devuelve el JSON entre backticks, no queremos que reviente.
 */
async function callGemini(request: AiRequest, model: string): Promise<unknown> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": geminiKey() as string,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: `${request.system}

Respondé SIEMPRE con un único objeto JSON válido, sin texto alrededor.
Estructura esperada: ${request.schemaHint}`,
            },
          ],
        },
        contents: [{ role: "user", parts: [{ text: request.prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: request.maxTokens ?? 2048,
          /**
           * Los modelos 2.5 razonan antes de responder y ese razonamiento se
           * descuenta del presupuesto de salida: con el budget en automático
           * se gastan los tokens pensando y devuelven una respuesta vacía.
           * Para extracción estructurada no aporta nada, así que va en cero.
           */
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`El proveedor de IA respondió ${response.status}. ${detail.slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = (payload.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("\n");

  if (!text.trim()) throw new Error("El modelo devolvió una respuesta vacía.");
  return extractJson(text);
}

/**
 * Ejecuta una tarea de IA. Nunca lanza por fallo del proveedor: degrada al
 * borrador local y devuelve `warning` para que la UI lo muestre tal cual.
 */
export async function runAiTask<T>(request: AiRequest): Promise<AiResult<T>> {
  const status = aiStatus();

  if (!status.configured) {
    return {
      data: request.fallback() as T,
      provider: "template",
      model: null,
      isTemplate: true,
      warning: status.reason,
    };
  }

  try {
    const model = status.model ?? DEFAULT_ANTHROPIC_MODEL;
    const data =
      status.provider === "gemini"
        ? await callGemini(request, model)
        : await callAnthropic(request, model);

    return {
      data: data as T,
      provider: status.provider,
      model: status.model,
      isTemplate: false,
    };
  } catch (error) {
    return {
      data: request.fallback() as T,
      provider: "template",
      model: null,
      isTemplate: true,
      warning: `No se pudo generar con IA (${
        error instanceof Error ? error.message : "error desconocido"
      }). Te dejamos un borrador local para editar.`,
    };
  }
}
