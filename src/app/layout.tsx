import type { Metadata, Viewport } from "next";

import "./globals.css";

/**
 * Base para resolver las URLs absolutas de las imágenes sociales
 * (`opengraph-image.png` / `twitter-image.png`).
 */
const siteUrl = process.env.TIENDAFLOW_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TiendaFlow — De una idea a una oferta lista para vender",
    template: "%s · TiendaFlow",
  },
  description:
    "Creá tu producto digital, armá la oferta, el funnel, el checkout, los upsells y el tracking desde una sola plataforma.",
  applicationName: "TiendaFlow",
  openGraph: {
    title: "TiendaFlow",
    description: "De una idea a una oferta lista para vender.",
    type: "website",
    siteName: "TiendaFlow",
    locale: "es_AR",
  },
  twitter: {
    card: "summary_large_image",
    title: "TiendaFlow",
    description: "De una idea a una oferta lista para vender.",
  },
};

export const viewport: Viewport = {
  themeColor: "#6D5DFB",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
