import "server-only";

import { headers } from "next/headers";

/**
 * Header interno con la tienda del pedido.
 *
 * Lo pone el middleware cuando el pedido llega por un subdominio
 * (`tienda.tiendaflow.com`). El valor está duplicado en `src/middleware.ts`
 * porque ese archivo corre en el runtime Edge y no puede importar nada que
 * traiga `next/headers`. Si cambia acá, hay que cambiarlo allá.
 */
export const STORE_HEADER = "x-tf-tienda";

/** La tienda del pedido actual, o `null` si no vino por un subdominio. */
export async function tiendaActual(): Promise<string | null> {
  return (await headers()).get(STORE_HEADER);
}

/**
 * La URL pública de un producto, con el subdominio de la tienda.
 *
 * `mitienda.tiendaflow.com/mi-producto` en vez de `/f/mi-producto--a1b2c3`.
 * Es la que el vendedor comparte, así que tiene que ser corta y sin ruido.
 *
 * Cae al formato largo cuando el host no admite subdominios —los túneles de
 * desarrollo, por ejemplo—: mejor una URL fea que funcione que una linda que
 * dé 404.
 */
export async function storeUrl(input: {
  workspaceSlug: string;
  funnelSlug: string;
  /** El formato largo, para cuando no se puede usar subdominio. */
  fallback: string;
}): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const hostname = host.split(":")[0].toLowerCase();
  const puerto = host.includes(":") ? `:${host.split(":")[1]}` : "";

  const soportaSubdominio =
    hostname === "localhost" ||
    (hostname.split(".").length === 2 && !/^\d+$/.test(hostname.split(".")[0]));

  if (!soportaSubdominio) return input.fallback;

  return `${proto}://${input.workspaceSlug}.${hostname}${puerto}/${input.funnelSlug}`;
}
