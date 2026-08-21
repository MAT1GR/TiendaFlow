import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { requireSession } from "@/lib/auth";
import {
  exchangeCode,
  fetchAccountNickname,
  oauthConfig,
  OAUTH_STATE_COOKIE,
  redirectUri,
  storeToken,
  verifyState,
} from "@/lib/integrations/mercadopago-oauth";

/**
 * La vuelta desde Mercado Pago.
 *
 * Antes de tocar nada se verifican cuatro cosas, y el orden importa: primero
 * que haya sesión, después que el `state` sea nuestro y esté vigente, después
 * que el nonce de la cookie coincida, y recién ahí que el workspace del state
 * sea el mismo de la sesión.
 *
 * Esa última comprobación es la que evita el ataque que importa: alguien
 * consigue un `state` válido de su propio workspace y hace que la víctima lo
 * dispare, terminando con la cuenta de Mercado Pago del atacante enganchada al
 * workspace de la víctima —y el dinero de las ventas yendo a otro lado—.
 */
export async function GET(request: NextRequest) {
  const base = await origin();
  const back = (status: string) =>
    NextResponse.redirect(new URL(`/app/pagos?mp=${status}`, base), 307);

  let workspace;
  try {
    ({ workspace } = await requireSession());
  } catch {
    return NextResponse.redirect(new URL("/ingresar", base), 307);
  }

  const params = request.nextUrl.searchParams;

  // El vendedor puede haber apretado "cancelar" en la pantalla de Mercado Pago.
  if (params.get("error")) return clearCookie(back("cancelado"));

  const config = oauthConfig();
  if (!config) return clearCookie(back("sin_configurar"));

  const cookieNonce = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const check = verifyState(params.get("state"), cookieNonce);
  if (!check.ok) {
    console.warn("[tiendaflow] callback de Mercado Pago rechazado:", check.reason);
    return clearCookie(back("estado_invalido"));
  }

  if (check.workspaceId !== workspace.id) {
    console.warn("[tiendaflow] callback de Mercado Pago para otro workspace.");
    return clearCookie(back("estado_invalido"));
  }

  const code = params.get("code");
  if (!code) return clearCookie(back("sin_codigo"));

  const result = await exchangeCode({
    config,
    code,
    redirectUri: redirectUri(base),
  });

  if (!result.ok) {
    console.error("[tiendaflow] no pudimos canjear el código de Mercado Pago:", result.reason);
    return clearCookie(back("error"));
  }

  // El apodo es opcional: si Mercado Pago no lo devuelve, la conexión sigue
  // siendo válida y simplemente no mostramos con qué cuenta quedó.
  const nickname = await fetchAccountNickname(result.token.accessToken);
  storeToken(workspace.id, result.token, nickname ?? undefined);

  return clearCookie(back(result.token.liveMode ? "conectado" : "conectado_prueba"));
}

/** El nonce es de un solo uso: se borra pase lo que pase. */
function clearCookie(response: NextResponse): NextResponse {
  response.cookies.set(OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/oauth/mercadopago",
    maxAge: 0,
  });
  return response;
}

/** El origen público, respetando el proxy que haya adelante. */
async function origin(): Promise<string> {
  if (process.env.TIENDAFLOW_SITE_URL) return process.env.TIENDAFLOW_SITE_URL.replace(/\/$/, "");
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const host = headerList.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}
