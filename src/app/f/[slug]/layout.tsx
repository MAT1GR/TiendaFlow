/**
 * Envoltorio de las páginas públicas.
 *
 * Solo carga las tipografías del sistema de diseño de las landings. Los colores
 * los pone cada página con las variables del tema, porque cambian por vendedor
 * y este layout es el mismo para todos.
 *
 * `display=swap` es deliberado: mientras baja Playfair, el texto se ve con la
 * fuente del sistema en vez de quedar invisible. En una página de venta que
 * llega desde un anuncio, medio segundo de pantalla en blanco es gente que se
 * va antes de leer el titular.
 */
export default function PublicFunnelLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;0,800;1,700&display=swap"
      />
      <div className="min-h-dvh">{children}</div>
    </>
  );
}
