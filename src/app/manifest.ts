import type { MetadataRoute } from "next";

/**
 * Manifest para cuando alguien instala TiendaFlow como app (Android / Chrome).
 * Los íconos salen de `public/brand/`, generados con `scripts/brand-assets.mjs`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TiendaFlow",
    short_name: "TiendaFlow",
    description: "De una idea a una oferta lista para vender.",
    start_url: "/app",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6d5dfb",
    lang: "es-AR",
    icons: [
      {
        src: "/brand/tiendaflow-mark-128.png",
        sizes: "128x128",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/tiendaflow-mark.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/tiendaflow-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
