import "server-only";

import crypto from "node:crypto";

import { saveIntegration, readIntegrationSecret, getIntegration } from "@/lib/repo";
import { parseJson } from "@/lib/utils";

/**
 * Conexión de cuentas de Mercado Pago por OAuth.
 *
 * Antes, para poder cobrar, el vendedor tenía que entrar al panel de Mercado
 * Pago, encontrar "Tus integraciones", crear una aplicación y copiar un access
 * token a mano. Es el paso donde más gente se cae, y además deja al vendedor
 * pegando una credencial de por vida en un formulario.
 *
 * Con OAuth aprieta un botón, autoriza en Mercado Pago y vuelve conectado.
 * Nosotros recibimos un token de su cuenta, con vencimiento y renovable, y el
 * dinero de cada venta sigue yendo directo a la cuenta del vendedor: TiendaFlow
 * nunca es la titular del cobro.
 *
 * Decisiones de seguridad, todas deliberadas:
 *
 *  · El `state` va firmado con HMAC y vence a los 10 minutos, así nadie puede
 *    fabricar una vuelta de callback.
 *  · Además del `state` guardamos un nonce en una cookie httpOnly. El state
 *    prueba que el pedido salió de nosotros; la cookie prueba que vuelve al
 *    MISMO navegador que lo inició. Sin las dos cosas, un atacante que consiga
 *    un state podría enganchar su cuenta de Mercado Pago a otro workspace.
 *  · El `client_secret` de la plataforma y los tokens de cada vendedor solo
 *    viven en el servidor, y los tokens se guardan cifrados.
 */

const TOKEN_URL = "https://api.mercadopago.com/oauth/token";

/**
 * El dominio de autorización cambia por país. Si mandamos a alguien de México
 * al dominio argentino, la pantalla de login le aparece en el sitio equivocado.
 */
const AUTH_DOMAIN: Record<string, string> = {
  AR: "https://auth.mercadopago.com.ar",
  BR: "https://auth.mercadopago.com.br",
  MX: "https://auth.mercadopago.com.mx",
  CL: "https://auth.mercadopago.cl",
  CO: "https://auth.mercadopago.com.co",
  PE: "https://auth.mercadopago.com.pe",
  UY: "https://auth.mercadopago.com.uy",
};

const DEFAULT_AUTH_DOMAIN = "https://auth.mercadopago.com.ar";

export const OAUTH_STATE_COOKIE = "tf_mp_oauth";
const STATE_TTL_MS = 10 * 60 * 1000;

/* -------------------------------------------------------------------------- */
/* Configuración de la plataforma                                              */
/* -------------------------------------------------------------------------- */

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
}

/**
 * Credenciales de la aplicación de TiendaFlow en Mercado Pago.
 *
 * Son de la plataforma, no del vendedor: una sola vez, en el servidor. Si no
 * están, la conexión por OAuth no se ofrece y queda el camino manual.
 */
export function oauthConfig(): OAuthConfig | null {
  const clientId = process.env.MERCADOPAGO_CLIENT_ID?.trim();
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function isOAuthAvailable(): boolean {
  return oauthConfig() !== null;
}

/**
 * La URL a la que Mercado Pago devuelve al vendedor.
 *
 * Tiene que coincidir EXACTAMENTE con la que está cargada en el panel de la
 * aplicación, incluido el esquema y sin barra final. Por eso se puede fijar por
 * variable de entorno: detrás de un proxy, el host que ve la app no siempre es
 * el que ve el navegador.
 */
export function redirectUri(origin: string): string {
  const configured = process.env.MERCADOPAGO_REDIRECT_URI?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return `${origin.replace(/\/$/, "")}/api/oauth/mercadopago/callback`;
}

/* -------------------------------------------------------------------------- */
/* El parámetro `state`                                                        */
/* -------------------------------------------------------------------------- */

function stateSecret(): string {
  const secret = process.env.TIENDAFLOW_SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Falta TIENDAFLOW_SESSION_SECRET: sin ese secreto no podemos firmar el state de OAuth.",
    );
  }
  return "tiendaflow-dev-secret-no-usar-en-produccion";
}

function sign(value: string): string {
  return crypto.createHmac("sha256", stateSecret()).update(value).digest("base64url");
}

interface StatePayload {
  /** Workspace que inició la conexión. */
  w: string;
  /** Nonce que también viaja en la cookie. */
  n: string;
  /** Vencimiento en milisegundos. */
  e: number;
}

/** Arma el `state` firmado y el nonce que hay que guardar en la cookie. */
export function createState(workspaceId: string): { state: string; nonce: string } {
  const nonce = crypto.randomBytes(16).toString("base64url");
  const payload: StatePayload = { w: workspaceId, n: nonce, e: Date.now() + STATE_TTL_MS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { state: `${encoded}.${sign(encoded)}`, nonce };
}

export type StateCheck =
  | { ok: true; workspaceId: string }
  | { ok: false; reason: string };

/**
 * Verifica el `state` contra su firma, su vencimiento y el nonce de la cookie.
 *
 * Las tres comprobaciones son necesarias y ninguna alcanza sola: la firma
 * prueba que lo emitimos nosotros, el vencimiento acota la ventana de reuso, y
 * el nonce ata la vuelta al mismo navegador que arrancó.
 */
export function verifyState(state: string | null, cookieNonce: string | undefined): StateCheck {
  if (!state) return { ok: false, reason: "Falta el parámetro de seguridad de la conexión." };
  if (!cookieNonce) {
    return {
      ok: false,
      reason: "Se perdió la cookie que inicia la conexión. Probá de nuevo desde el mismo navegador.",
    };
  }

  const separator = state.lastIndexOf(".");
  if (separator <= 0) return { ok: false, reason: "El parámetro de seguridad es inválido." };

  const encoded = state.slice(0, separator);
  const signature = state.slice(separator + 1);

  const expected = sign(encoded);
  if (
    expected.length !== signature.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    return { ok: false, reason: "El parámetro de seguridad no coincide." };
  }

  const payload = parseJson<StatePayload | null>(
    Buffer.from(encoded, "base64url").toString("utf8"),
    null,
  );
  if (!payload?.w || !payload.n || !payload.e) {
    return { ok: false, reason: "El parámetro de seguridad es inválido." };
  }

  if (Date.now() > payload.e) {
    return { ok: false, reason: "La conexión tardó demasiado. Volvé a intentarlo." };
  }

  if (
    payload.n.length !== cookieNonce.length ||
    !crypto.timingSafeEqual(Buffer.from(payload.n), Buffer.from(cookieNonce))
  ) {
    return { ok: false, reason: "La conexión no coincide con este navegador." };
  }

  return { ok: true, workspaceId: payload.w };
}

/** La pantalla de autorización de Mercado Pago para ese país. */
export function authorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  country: string;
}): string {
  const domain = AUTH_DOMAIN[input.country?.toUpperCase()] ?? DEFAULT_AUTH_DOMAIN;
  const params = new URLSearchParams({
    client_id: input.clientId,
    response_type: "code",
    platform_id: "mp",
    state: input.state,
    redirect_uri: input.redirectUri,
  });
  return `${domain}/authorization?${params}`;
}

/* -------------------------------------------------------------------------- */
/* Intercambio y renovación de tokens                                          */
/* -------------------------------------------------------------------------- */

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user_id?: number | string;
  public_key?: string;
  live_mode?: boolean;
  scope?: string;
  message?: string;
  error?: string;
}

export type TokenResult =
  | { ok: true; token: MercadoPagoToken }
  | { ok: false; reason: string };

export interface MercadoPagoToken {
  accessToken: string;
  refreshToken: string | null;
  /** Milisegundos desde epoch. */
  expiresAt: number | null;
  userId: string | null;
  publicKey: string | null;
  liveMode: boolean;
}

async function requestToken(body: Record<string, string>): Promise<TokenResult> {
  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as TokenResponse;

    if (!response.ok || !payload.access_token) {
      // El cuerpo puede traer el client_secret de vuelta en algunos errores:
      // nunca lo propagamos ni lo logueamos.
      return {
        ok: false,
        reason: payload.message ?? payload.error ?? `Mercado Pago respondió ${response.status}.`,
      };
    }

    return {
      ok: true,
      token: {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token ?? null,
        expiresAt:
          typeof payload.expires_in === "number" ? Date.now() + payload.expires_in * 1000 : null,
        userId: payload.user_id != null ? String(payload.user_id) : null,
        publicKey: payload.public_key ?? null,
        liveMode: payload.live_mode !== false,
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "No pudimos contactar a Mercado Pago.",
    };
  }
}

/** Cambia el `code` del callback por los tokens del vendedor. */
export function exchangeCode(input: {
  config: OAuthConfig;
  code: string;
  redirectUri: string;
}): Promise<TokenResult> {
  return requestToken({
    client_id: input.config.clientId,
    client_secret: input.config.clientSecret,
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
  });
}

/** Renueva un access token vencido o por vencer. */
export function refreshToken(input: {
  config: OAuthConfig;
  refreshToken: string;
}): Promise<TokenResult> {
  return requestToken({
    client_id: input.config.clientId,
    client_secret: input.config.clientSecret,
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
  });
}

/* -------------------------------------------------------------------------- */
/* Persistencia                                                                */
/* -------------------------------------------------------------------------- */

export interface MercadoPagoSecret extends Record<string, unknown> {
  secret_key?: string;
  refresh_token?: string;
  webhook_secret?: string;
}

export interface MercadoPagoPublicConfig {
  public_key?: string;
  mode?: "test" | "live";
  /** `oauth` o `manual`: cambia lo que le mostramos al vendedor. */
  connection?: "oauth" | "manual";
  user_id?: string;
  expires_at?: number;
  nickname?: string;
}

/** Guarda los tokens del vendedor, cifrados, conservando lo que ya hubiera. */
export function storeToken(workspaceId: string, token: MercadoPagoToken, nickname?: string) {
  const previous = readIntegrationSecret<MercadoPagoSecret>(workspaceId, "mercadopago");
  const previousConfig = publicConfig(workspaceId);

  saveIntegration(workspaceId, "mercadopago", {
    status: "connected",
    public_config: {
      public_key: token.publicKey ?? previousConfig.public_key ?? null,
      mode: token.liveMode ? "live" : "test",
      connection: "oauth",
      user_id: token.userId ?? previousConfig.user_id ?? null,
      expires_at: token.expiresAt,
      nickname: nickname ?? previousConfig.nickname ?? null,
    },
    secret_config: {
      ...previous,
      secret_key: token.accessToken,
      // Mercado Pago rota el refresh token en cada renovación: si viene uno
      // nuevo hay que pisarlo, porque el anterior deja de servir.
      refresh_token: token.refreshToken ?? previous.refresh_token ?? null,
    },
    last_error: null,
  });
}

export function publicConfig(workspaceId: string): MercadoPagoPublicConfig {
  const integration = getIntegration(workspaceId, "mercadopago");
  return parseJson<MercadoPagoPublicConfig>(integration?.public_config ?? null, {});
}

/**
 * Devuelve un access token vigente, renovándolo si hace falta.
 *
 * Se renueva con margen: si esperáramos al vencimiento exacto, la primera
 * persona que quisiera comprar justo en ese momento se encontraría con un
 * checkout roto. El margen hace que el que se coma el reintento seamos
 * nosotros y no un comprador.
 */
const REFRESH_MARGIN_MS = 7 * 24 * 60 * 60 * 1000;

export async function freshAccessToken(workspaceId: string): Promise<string | null> {
  const secret = readIntegrationSecret<MercadoPagoSecret>(workspaceId, "mercadopago");
  if (!secret.secret_key) return null;

  const config = publicConfig(workspaceId);

  // Conexión manual o sin vencimiento conocido: no hay nada que renovar.
  if (config.connection !== "oauth" || !config.expires_at) return secret.secret_key;
  if (Date.now() < config.expires_at - REFRESH_MARGIN_MS) return secret.secret_key;

  const oauth = oauthConfig();
  if (!oauth || !secret.refresh_token) {
    // Vencido y sin forma de renovar: lo dejamos anotado para que la pantalla
    // de Pagos pueda pedirle al vendedor que vuelva a conectar.
    if (Date.now() >= config.expires_at) {
      saveIntegration(workspaceId, "mercadopago", {
        status: "error",
        last_error: "La conexión con Mercado Pago venció. Volvé a conectar tu cuenta.",
      });
      return null;
    }
    return secret.secret_key;
  }

  const result = await refreshToken({ config: oauth, refreshToken: secret.refresh_token });

  if (!result.ok) {
    if (Date.now() >= config.expires_at) {
      saveIntegration(workspaceId, "mercadopago", {
        status: "error",
        last_error: `No pudimos renovar la conexión con Mercado Pago: ${result.reason}`,
      });
      return null;
    }
    // Todavía no venció: seguimos con el token actual y reintentamos después.
    return secret.secret_key;
  }

  storeToken(workspaceId, result.token, config.nickname ?? undefined);
  return result.token.accessToken;
}

/* -------------------------------------------------------------------------- */
/* Datos de la cuenta conectada                                                */
/* -------------------------------------------------------------------------- */

/**
 * El apodo de la cuenta, para poder mostrar "Conectado como X".
 *
 * Es un detalle chico que evita el error más caro de todos: conectar sin
 * querer la cuenta personal en vez de la del negocio, y enterarse recién
 * cuando el dinero cae en el lugar equivocado.
 */
export async function fetchAccountNickname(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch("https://api.mercadopago.com/users/me", {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { nickname?: string; email?: string };
    return payload.nickname ?? payload.email ?? null;
  } catch {
    return null;
  }
}
