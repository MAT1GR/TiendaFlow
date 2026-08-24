"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * La navegación de celular.
 *
 * En una computadora el menú lateral está siempre a la vista y no molesta a
 * nadie. En un teléfono el mismo menú es un cajón que hay que abrir, y todo lo
 * que está adentro de un cajón se usa la mitad. Los cuatro destinos que
 * alguien abre todos los días —cómo va el negocio, qué está vendiendo, qué
 * vendió, y todo lo demás— pasan al lugar donde el pulgar ya está apoyado.
 *
 * Cuatro y no siete: una barra de abajo con siete iconos deja cada uno tan
 * angosto que errarle es lo normal. Lo que no entra vive detrás de "Más", que
 * abre el mismo menú lateral de siempre —no una copia—, así que no hay dos
 * listas de navegación que puedan quedar diciendo cosas distintas.
 */

interface Destino {
  label: string;
  href: string;
  emoji: string;
  icon: IconName;
  exact?: boolean;
}

const DESTINOS: Destino[] = [
  { label: "Inicio", href: "/app", emoji: "🏠", icon: "dashboard", exact: true },
  { label: "Productos", href: "/app/productos", emoji: "📦", icon: "box" },
  { label: "Ventas", href: "/app/ventas", emoji: "🛒", icon: "cart" },
];

export function BottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      /*
       * `fixed` y no `sticky`: como último hijo de una columna que crece con el
       * contenido, un `sticky bottom-0` se queda quieto al final del documento
       * y no se ve nunca. El espacio que ocupa se lo devuelve el `pb` del
       * `<main>`.
       */
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-ink-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {DESTINOS.map((destino) => {
        const activo = destino.exact
          ? pathname === destino.href
          : pathname.startsWith(destino.href);

        return (
          <Link
            key={destino.href}
            href={destino.href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
              activo ? "text-brand-700" : "text-ink-500",
            )}
          >
            <Icon name={destino.icon} size={19} />
            {destino.label}
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onMore}
        className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-ink-500 transition-colors"
      >
        <Icon name="menu" size={19} />
        Más
      </button>
    </nav>
  );
}
