import "server-only";

import crypto from "node:crypto";

import { safeEqual } from "@/lib/crypto";

/**
 * Verificación de firma de los webhooks.
 *
 * Es defensa en profundidad, no la única defensa: aunque la firma sea válida,
 * el estado del pago siempre se vuelve a consultar contra la API del proveedor
 * antes de acreditar nada (ver `payments.ts`). Verificar acá sirve para
 * descartar ruido antes de gastar una llamada a la API.
 */

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: string }
  /** No hay clave cargada: no podemos verificar, pero tampoco es un ataque. */
  | { ok: "skipped"; reason: string };

/** Tolerancia de reloj para el timestamp firmado. */
const MAX_SKEW_SECONDS = 5 * 60;

function parseCommaSignature(header: string): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const chunk of header.split(",")) {
    const index = chunk.indexOf("=");
    if (index === -1) continue;
    parts[chunk.slice(0, index).trim()] = chunk.slice(index + 1).trim();
  }
  return parts;
}

function withinTolerance(timestamp: string): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  // Mercado Pago firma en milisegundos y Stripe en segundos.
  const seconds = ts > 1e12 ? Math.floor(ts / 1000) : ts;
  return Math.abs(Date.now() / 1000 - seconds) <= MAX_SKEW_SECONDS;
}

/**
 * Mercado Pago firma el manifest `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 * con HMAC-SHA256. El id va en minúsculas.
 */
export function verifyMercadoPago(input: {
  secret: string | null;
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
}): VerifyResult {
  if (!input.secret) {
    return { ok: "skipped", reason: "No hay clave secreta de webhook cargada para Mercado Pago." };
  }
  if (!input.signatureHeader) return { ok: false, reason: "Falta el header x-signature." };
  if (!input.dataId) return { ok: false, reason: "El webhook no trae el id del pago." };

  const parts = parseCommaSignature(input.signatureHeader);
  const ts = parts.ts;
  const received = parts.v1;
  if (!ts || !received) return { ok: false, reason: "El header x-signature está incompleto." };
  if (!withinTolerance(ts)) return { ok: false, reason: "La firma del webhook está vencida." };

  const manifest = `id:${input.dataId.toLowerCase()};request-id:${input.requestId ?? ""};ts:${ts};`;
  const expected = crypto.createHmac("sha256", input.secret).update(manifest).digest("hex");

  return safeEqual(expected, received)
    ? { ok: true }
    : { ok: false, reason: "La firma del webhook no coincide." };
}

/**
 * Stripe firma `<timestamp>.<cuerpo crudo>` con HMAC-SHA256. Puede mandar varias
 * firmas `v1` durante una rotación de clave, así que alcanza con que una valide.
 */
export function verifyStripe(input: {
  secret: string | null;
  signatureHeader: string | null;
  rawBody: string;
}): VerifyResult {
  if (!input.secret) {
    return { ok: "skipped", reason: "No hay clave de firma de webhook cargada para Stripe." };
  }
  if (!input.signatureHeader) return { ok: false, reason: "Falta el header stripe-signature." };

  const parts = input.signatureHeader.split(",").map((chunk) => chunk.split("="));
  const ts = parts.find(([key]) => key.trim() === "t")?.[1]?.trim();
  const signatures = parts
    .filter(([key]) => key.trim() === "v1")
    .map(([, value]) => value?.trim())
    .filter((value): value is string => Boolean(value));

  if (!ts || signatures.length === 0) {
    return { ok: false, reason: "El header stripe-signature está incompleto." };
  }
  if (!withinTolerance(ts)) return { ok: false, reason: "La firma del webhook está vencida." };

  const expected = crypto
    .createHmac("sha256", input.secret)
    .update(`${ts}.${input.rawBody}`)
    .digest("hex");

  return signatures.some((signature) => safeEqual(expected, signature))
    ? { ok: true }
    : { ok: false, reason: "La firma del webhook no coincide." };
}
