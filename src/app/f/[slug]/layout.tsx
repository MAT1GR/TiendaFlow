/**
 * Envoltorio de las páginas públicas.
 *
 * Solo carga las tipografías del sistema de diseño de las landings. Los colores
 * los pone cada página con las variables del tema, porque cambian por vendedor
 * y este layout es el mismo para todos.
 *
 * Cuáles son las tipografías lo decide `theme.ts`, no este archivo: la lista
 * estaba copiada en cuatro lados y el editor —que es donde el vendedor elige—
 * era justamente el que se había quedado atrás.
 */

import { LANDING_FONTS_HREF } from "@/components/landing/theme";

export default function PublicFunnelLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={LANDING_FONTS_HREF} />
      <div className="min-h-dvh">{children}</div>
    </>
  );
}
