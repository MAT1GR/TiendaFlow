import Link from "next/link";

import { Icon, Wordmark } from "@/components/ui/icon";

/**
 * El encabezado y el pie del sitio público.
 *
 * Vivían escritos adentro de la portada. Con una segunda página pública
 * —precios— eso significaba dos copias del mismo menú, y la primera vez que
 * alguien agregara un link en una sola las dos iban a decir cosas distintas.
 *
 * El menú se pasa por parámetro porque no es el mismo en las dos: la portada
 * navega hacia sus propias secciones con anclas, y precios tiene que poder
 * volver a la portada.
 */

export interface SiteLink {
  label: string;
  href: string;
}

export function SiteHeader({
  user,
  nav,
}: {
  user: { full_name: string } | null;
  nav: SiteLink[];
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-5 sm:px-8">
        <Link href="/" className="flex items-center">
          <Wordmark />
        </Link>

        <nav className="ml-6 hidden items-center gap-6 md:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[13.5px] font-medium text-ink-600 transition-colors hover:text-ink-900"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <Link
              href="/app"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-[13.5px] font-medium text-white transition-colors hover:bg-brand-700"
            >
              Ir a mi panel
              <Icon name="arrowRight" size={15} />
            </Link>
          ) : (
            <>
              <Link
                href="/ingresar"
                className="hidden h-9 items-center rounded-xl px-3 text-[13.5px] font-medium text-ink-700 transition-colors hover:bg-ink-100 sm:inline-flex"
              >
                Ingresar
              </Link>
              <Link
                href="/crear-cuenta"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-[13.5px] font-medium text-white transition-colors hover:bg-brand-700"
              >
                Empezar gratis
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ nav }: { nav: SiteLink[] }) {
  return (
    <footer className="border-t border-ink-200">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/" className="flex w-fit items-center">
            <Wordmark size="sm" />
          </Link>
          <p className="mt-2 text-[13px] text-ink-500">
            De una idea a una oferta lista para vender.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-ink-600">
          {nav.map((item) => (
            <a key={item.href} href={item.href} className="hover:text-ink-900">
              {item.label}
            </a>
          ))}
          <Link href="/ingresar" className="hover:text-ink-900">
            Ingresar
          </Link>
        </nav>
      </div>
      <div className="border-t border-ink-100 py-5">
        <p className="text-center text-[12.5px] text-ink-400">
          © {new Date().getFullYear()} TiendaFlow
        </p>
      </div>
    </footer>
  );
}
