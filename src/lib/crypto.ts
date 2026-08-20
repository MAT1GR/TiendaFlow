import "server-only";

import crypto from "node:crypto";

/**
 * Cifrado de credenciales de terceros en reposo.
 *
 * Los access tokens de Mercado Pago, las secret keys de Stripe y los tokens de
 * Meta son plata y datos de otra persona: no pueden quedar en texto plano en la
 * base. Se guardan con AES-256-GCM, que además de cifrar autentica, así que un
 * valor manipulado falla al descifrar en vez de devolver basura.
 *
 * Formato: `v1.<iv>.<tag>.<ciphertext>`, todo en base64url.
 *
 * Compatibilidad: `decryptSecret` devuelve tal cual cualquier valor que no
 * empiece con `v1.`. Las filas que ya existían en texto plano siguen
 * funcionando y se cifran solas la próxima vez que se guardan.
 */

const PREFIX = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

let cachedKey: Buffer | null = null;

function encryptionKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.TIENDAFLOW_ENCRYPTION_KEY?.trim();

  if (raw) {
    // Aceptamos hex de 64 caracteres o base64; cualquier otra cosa se deriva.
    const key = /^[0-9a-f]{64}$/i.test(raw)
      ? Buffer.from(raw, "hex")
      : crypto.createHash("sha256").update(raw).digest();
    cachedKey = key;
    return key;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Falta TIENDAFLOW_ENCRYPTION_KEY. Sin esa clave no podemos guardar credenciales de pago de forma segura. " +
        'Generá una con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }

  // Solo desarrollo: clave estable derivada, para que la base local siga
  // abriéndose entre reinicios sin obligar a configurar nada.
  cachedKey = crypto
    .createHash("sha256")
    .update("tiendaflow-dev-encryption-key-no-usar-en-produccion")
    .digest();
  return cachedKey;
}

/** Cifra un texto. Devuelve `null` si entra `null`, para poder encadenarlo. */
export function encryptSecret(plain: string): string;
export function encryptSecret(plain: null | undefined): null;
export function encryptSecret(plain: string | null | undefined): string | null;
export function encryptSecret(plain: string | null | undefined): string | null {
  if (plain === null || plain === undefined || plain === "") return null;

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [PREFIX, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(
    ".",
  );
}

/**
 * Descifra un valor guardado. Los valores heredados en texto plano se devuelven
 * sin tocar; un valor cifrado que no se puede abrir devuelve `null` en vez de
 * lanzar, para que una credencial corrupta no tire abajo toda la pantalla.
 */
export function decryptSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!stored.startsWith(`${PREFIX}.`)) return stored;

  const [, ivPart, tagPart, dataPart] = stored.split(".");
  if (!ivPart || !tagPart || !dataPart) return null;

  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      encryptionKey(),
      Buffer.from(ivPart, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    console.error("[tiendaflow] no se pudo descifrar una credencial guardada.");
    return null;
  }
}

/** `true` si el valor ya está cifrado con el esquema actual. */
export function isEncrypted(stored: string | null | undefined): boolean {
  return Boolean(stored?.startsWith(`${PREFIX}.`));
}

/**
 * Comparación en tiempo constante para firmas de webhook. Devuelve `false` ante
 * longitudes distintas en vez de lanzar, que es lo que hace `timingSafeEqual`.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}
