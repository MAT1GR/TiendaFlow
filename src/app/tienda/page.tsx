import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { DISPLAY_FONTS, readTheme, themeVars } from "@/components/landing/theme";
import { Icon } from "@/components/ui/icon";
import { tiendaActual } from "@/lib/public-url";
import { all } from "@/lib/db";
import { getWorkspaceBySlug } from "@/lib/repo";
import { formatMoney, parseJson } from "@/lib/utils";
import { LANDING_FONTS_HREF } from "@/components/landing/theme";

/**
 * La portada de una tienda.
 *
 * Es lo que ve alguien que entra a `tienda.tiendaflow.com` sin un producto en
 * la URL. Antes eso terminaba en un error: ahora muestra lo que el vendedor
 * tiene publicado, que es lo único razonable cuando no sabemos qué vino a
 * buscar la persona.
 *
 * Solo lista productos **publicados**: los borradores son del vendedor, no del
 * público.
 */

interface Publicado {
  slug: string;
  nombre: string;
  subtitulo: string | null;
  precio: number | null;
  moneda: string | null;
}

function publicados(workspaceId: string): Publicado[] {
  return all<Publicado>(
    `SELECT f.slug AS slug, p.name AS nombre, p.subtitle AS subtitulo,
            o.price AS precio, o.currency AS moneda
     FROM funnels f
     JOIN offers o ON o.id = f.offer_id
     JOIN products p ON p.id = o.product_id
     WHERE f.workspace_id = ? AND f.status = 'published' AND p.status != 'archived'
     ORDER BY p.created_at DESC`,
    workspaceId,
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const tienda = await tiendaActual();
  const workspace = tienda ? getWorkspaceBySlug(tienda) : null;
  return { title: workspace?.name ?? "Tienda" };
}

export default async function StorefrontPage() {
  const tienda = await tiendaActual();
  if (!tienda) notFound();

  const workspace = getWorkspaceBySlug(tienda);
  if (!workspace) notFound();

  const productos = publicados(workspace.id);

  // Los colores que el vendedor eligió al crear la tienda. La portada tiene
  // que verse como sus páginas de venta: es la misma marca.
  const theme = readTheme(parseJson<unknown>(workspace.theme, {}));

  return (
    <div className="min-h-dvh" style={themeVars(theme)}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href={LANDING_FONTS_HREF}
      />

      <main className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8">
        <h1
          className="text-[30px] font-bold tracking-tight sm:text-[38px]"
          style={{ fontFamily: DISPLAY_FONTS[theme.display].stack }}
        >
          {workspace.name}
        </h1>

        {productos.length === 0 ? (
          <p
            className="mt-6 border border-dashed px-5 py-8 text-center text-[14px]"
            style={{
              borderColor: "var(--tf-line)",
              color: "var(--tf-muted)",
              borderRadius: "var(--tf-radius)",
            }}
          >
            Todavía no hay nada publicado en esta tienda.
          </p>
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {productos.map((producto) => (
              <li key={producto.slug}>
                <Link
                  href={`/${producto.slug}`}
                  className="group flex items-center gap-4 border p-5 transition-all hover:shadow-soft"
                  style={{
                    backgroundColor: "var(--tf-surface)",
                    borderColor: "var(--tf-line)",
                    borderRadius: "var(--tf-radius)",
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold">{producto.nombre}</span>
                    {producto.subtitulo ? (
                      <span
                        className="mt-0.5 block text-[13.5px]"
                        style={{ color: "var(--tf-muted)" }}
                      >
                        {producto.subtitulo}
                      </span>
                    ) : null}
                  </span>

                  {producto.precio ? (
                    <span className="shrink-0 text-[16px] font-semibold tabular-nums">
                      {formatMoney(producto.precio, producto.moneda ?? "ARS")}
                    </span>
                  ) : null}

                  <Icon
                    name="chevronRight"
                    size={18}
                    className="shrink-0 transition-transform group-hover:translate-x-0.5"
                    style={{ color: "var(--tf-accent)" }}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
