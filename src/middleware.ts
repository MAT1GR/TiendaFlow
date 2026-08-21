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

/**
 * Header interno con la tienda del pedido.
 *
 * Duplicado a propósito de `src/lib/public-url.ts`: este archivo corre en el
 * runtime Edge y no puede importar nada que traiga `next/headers`.
 */
const STORE_HEADER = "x-tf-tienda";

/**
 * Hosts que NO son una tienda, aunque tengan varias partes.
 *
 * `www` es obvio. Los otros dos son para desarrollo: `localhost` a secas y las
 * URLs de túnel, donde el "subdominio" es en realidad el dominio entero.
 */
const RESERVADOS = new Set(["www", "app", "api", "admin"]);

/**
 * El subdominio de tienda, o `null` si el pedido no viene por una tienda.
 *
 * Funciona igual en producción (`tienda.tiendaflow.com`) que en desarrollo
 * (`tienda.localhost:3000`), porque los navegadores resuelven cualquier
 * `*.localhost` a 127.0.0.1 sin tocar el archivo de hosts.
 */
function tiendaDelHost(host: string | null): string | null {
  if (!host) return null;

  const hostname = host.split(":")[0].toLowerCase();

  /**
   * Una dirección IP no es una tienda.
   *
   * Sin esto, `127.0.0.1` se lee como subdominio "127" y TODO el sitio pasa a
   * tratarse como la tienda de alguien — incluido `/app`, que dejaría de pasar
   * por la guardia de sesión. Es la clase de agujero que aparece por un detalle
   * de parseo, así que se corta primero.
   */
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return null;
  if (hostname.includes(":")) return null;

  const partes = hostname.split(".");

  // `algo.localhost` → tienda "algo". `localhost` solo → no es tienda.
  if (partes.length === 2 && partes[1] === "localhost") {
    return RESERVADOS.has(partes[0]) ? null : partes[0];
  }

  // Dominios de túnel (`algo.trycloudflare.com`) y apex (`tiendaflow.com`) no
  // son tiendas: harían falta tres partes y que la primera no sea reservada.
  if (partes.length < 3) return null;
  if (hostname.endsWith(".trycloudflare.com")) return null;
  if (hostname.endsWith(".vercel.app") && partes.length === 3) return null;

  const sub = partes[0];
  return RESERVADOS.has(sub) ? null : sub;
}

/** Rutas que nunca son de una tienda, ni siquiera en un subdominio. */
function esInterna(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    /\.[a-z0-9]+$/i.test(pathname)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const tienda = tiendaDelHost(request.headers.get("host"));

  /* --- Pedido a una tienda: todo el host es la página del vendedor --- */
  if (tienda && !esInterna(pathname)) {
    // Si ya viene con el prefijo interno, no lo duplicamos: solo le sumamos
    // el header para que la página sepa de qué tienda se trata.
    //
    // La raíz del subdominio queda como `/f/`, que no matchea ninguna página y
    // termina en un 404 limpio. Todavía no hay una portada de tienda: sin un
    // producto elegido no sabríamos cuál de todos abrir.
    const url = request.nextUrl.clone();
    if (pathname === "/") {
      // La portada de la tienda: lo que el vendedor tiene publicado.
      url.pathname = "/tienda";
    } else if (!pathname.startsWith("/f/")) {
      url.pathname = `/f${pathname}`;
    }

    // El slug del producto viaja en la URL y la tienda en un header, para que
    // la página pueda resolver el funnel correcto sin tocar la base acá: el
    // middleware corre en el runtime Edge y no tiene acceso a SQLite.
    const headers = new Headers(request.headers);
    headers.set(STORE_HEADER, tienda);

    return NextResponse.rewrite(url, { request: { headers } });
  }

  /* --- Rutas privadas del panel --- */
  if (pathname.startsWith("/app") || pathname === "/bienvenida") {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (await hasValidSignature(token)) return NextResponse.next();

    const url = request.nextUrl.clone();
    url.pathname = "/ingresar";
    url.search = "";
    return NextResponse.redirect(url, 307);
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Corre en todo menos los assets.
   *
   * Antes solo miraba `/app`, pero ahora también tiene que detectar pedidos a
   * un subdominio de tienda, que pueden llegar a cualquier ruta.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
