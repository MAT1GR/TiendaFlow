import "server-only";

import crypto from "node:crypto";

import { getIntegration, readIntegrationSecret } from "@/lib/repo";
import { parseJson } from "@/lib/utils";

/**
 * Integración con Meta: Pixel (navegador) + API de Conversiones (servidor).
 *
 * El Pixel ID es público por definición (va en el HTML). El access token vive
 * solo en `secret_config` y NUNCA sale de este módulo: las funciones públicas
 * devuelven exclusivamente la configuración segura para el cliente.
 */

export const META_EVENTS = [
  "PageView",
  "ViewContent",
  "InitiateCheckout",
  "AddPaymentInfo",
  "Purchase",
  "Lead",
] as const;

export type MetaEvent = (typeof META_EVENTS)[number];

export interface MetaPublicConfig {
  pixelId: string;
  events: string[];
}

/** Configuración que puede viajar al navegador. Nunca incluye el token. */
export function getMetaPublicConfig(workspaceId: string): MetaPublicConfig | null {
  const integration = getIntegration(workspaceId, "meta");
  if (!integration || integration.status === "disconnected") return null;

  const config = parseJson<{ pixel_id?: string; events?: string[] }>(
    integration.public_config,
    {},
  );
  if (!config.pixel_id) return null;

  return {
    pixelId: config.pixel_id,
    events: config.events?.length ? config.events : [...META_EVENTS],
  };
}

interface CapiUserData {
  email?: string | null;
  phone?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  fbc?: string | null;
  fbp?: string | null;
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export interface CapiResult {
  sent: boolean;
  reason?: string;
}

/**
 * Envía un evento por la API de Conversiones.
 *
 * Si la integración no está configurada devuelve `{ sent: false, reason }` en
 * vez de fallar en silencio o simular un envío exitoso.
 */
export async function sendConversionEvent(
  workspaceId: string,
  input: {
    event: MetaEvent;
    eventId: string;
    eventSourceUrl?: string;
    value?: number;
    currency?: string;
    contents?: Array<{ id: string; quantity: number; item_price: number }>;
    user: CapiUserData;
  },
): Promise<CapiResult> {
  const integration = getIntegration(workspaceId, "meta");
  if (!integration || integration.status !== "connected") {
    return { sent: false, reason: "La integración de Meta no está conectada." };
  }

  const publicConfig = parseJson<{ pixel_id?: string; dataset_id?: string; events?: string[] }>(
    integration.public_config,
    {},
  );
  const secret = readIntegrationSecret<{ access_token: string; test_event_code: string }>(
    workspaceId,
    "meta",
  );

  const datasetId = publicConfig.dataset_id || publicConfig.pixel_id;
  if (!datasetId || !secret.access_token) {
    return {
      sent: false,
      reason: "Falta el dataset o el token de la API de Conversiones.",
    };
  }

  if (publicConfig.events?.length && !publicConfig.events.includes(input.event)) {
    return { sent: false, reason: `El evento ${input.event} está desactivado en la configuración.` };
  }

  const payload = {
    data: [
      {
        event_name: input.event,
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        event_source_url: input.eventSourceUrl,
        action_source: "website",
        user_data: {
          ...(input.user.email ? { em: [sha256(input.user.email)] } : {}),
          ...(input.user.phone ? { ph: [sha256(input.user.phone)] } : {}),
          ...(input.user.clientIp ? { client_ip_address: input.user.clientIp } : {}),
          ...(input.user.userAgent ? { client_user_agent: input.user.userAgent } : {}),
          ...(input.user.fbc ? { fbc: input.user.fbc } : {}),
          ...(input.user.fbp ? { fbp: input.user.fbp } : {}),
        },
        ...(input.value !== undefined
          ? {
              custom_data: {
                value: input.value,
                currency: input.currency ?? "ARS",
                ...(input.contents ? { contents: input.contents } : {}),
              },
            }
          : {}),
      },
    ],
    ...(secret.test_event_code ? { test_event_code: secret.test_event_code } : {}),
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${datasetId}/events?access_token=${encodeURIComponent(
        secret.access_token,
      )}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { sent: false, reason: `Meta respondió ${response.status}: ${detail.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "Error de red al llamar a Meta.",
    };
  }
}
