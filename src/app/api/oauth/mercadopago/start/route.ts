import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import {
  authorizationUrl,
  createState,
  oauthConfig,
  OAUTH_STATE_COOKIE,
  redirectUri,
} from "@/lib/integrations/mercadopago-oauth";

/**
 * Arranca la conexión con Mercado Pago.
 *
 * Es una ruta y no una server action porque necesita hacer dos cosas a la vez:
 * dejar una cookie httpOnly con el nonce y redirigir al vendedor a Mercado
 * Pago. Desde el botón es un link común.
 */
export async function GET() {
  let workspace;
  try {
    ({ workspace } = await requireSession());
  } catch {
    return NextResponse.redirect(new URL("/ingresar", await origin()), 307);
  }

  const config = oauthConfig();
  if (!config) {
    return NextResponse.redirect(
      new URL("/app/pagos?mp=sin_configurar", await origin()),
      307,
    );
  }

  const base = await origin();
  const { state, nonce } = createState(workspace.id);

  const url = authorizationUrl({
    clientId: config.clientId,
    redirectUri: redirectUri(base),
    state,
    country: workspace.country,
  });

  const response = NextResponse.redirect(url, 307);

  // El nonce ata la vuelta a este navegador. `lax` alcanza y es necesario: la
  // vuelta desde Mercado Pago es una navegación de primer nivel.
  response.cookies.set(OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/oauth/mercadopago",
    maxAge: 10 * 60,
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
