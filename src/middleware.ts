import { NextResponse, type NextRequest } from "next/server";

/**
 * Guardia de rutas privadas.
 *
 * `redirect()` dentro del layout funciona, pero Next lo resuelve como una
 * redirección de cliente: la respuesta HTTP sigue siendo 200 y la URL no cambia
 * hasta que el navegador procesa el payload. Acá cortamos antes, con un 307
 * real, para que un request sin sesión válida nunca llegue a renderizar.
 *
 * La verificación de la firma se hace con Web Crypto (mismo HMAC-SHA256 y mismo
 * secreto que `src/lib/auth.ts`). La comprobación autoritativa —que la sesión
 * exista en la base y no esté vencida— la sigue haciendo el layout: acá solo
 * descartamos lo que ni siquiera tiene una cookie legítima.
 */

const SESSION_COOKIE = "tf_session";

function sessionSecret() {
  const secret = process.env.TIENDAFLOW_SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  return "tiendaflow-dev-secret-no-usar-en-produccion";
}

function base64url(buffer: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hasValidSignature(token: string | undefined) {
  if (!token) return false;
  const index = token.lastIndexOf(".");
  if (index <= 0) return false;

  const sessionId = token.slice(0, index);
  const signature = token.slice(index + 1);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = base64url(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(sessionId)),
  );

  // Comparación en tiempo constante.
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await hasValidSignature(token)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/ingresar";
  url.search = "";
  return NextResponse.redirect(url, 307);
}

export const config = {
  // Solo las rutas privadas. Las páginas públicas del funnel (/f/...), el
  // checkout, la página de acceso del comprador y el sitio de marketing quedan
  // fuera a propósito.
  matcher: ["/app/:path*", "/bienvenida"],
};
