import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node:sqlite"],

  /**
   * Permite levantar una segunda instancia sin pisar la carpeta de la primera.
   *
   * `next dev` y `next build` escriben los dos en `.next`. Correr un build
   * mientras alguien tiene el dev server abierto le rompe la sesión de trabajo.
   * Con `TF_DIST_DIR=.next-build npm run build` cada uno usa la suya.
   */
  distDir: process.env.TF_DIST_DIR || ".next",
  experimental: {
    optimizePackageImports: [],

    /**
     * Cuánto vale una parte de la pantalla ya descargada antes de volver a
     * pedirla.
     *
     * Next 15 trae esto en cero para lo dinámico, así que cada click volvía a
     * pedirle al servidor el layout completo del panel —notificaciones, lista
     * de productos, suscripción— aunque el layout fuera exactamente el mismo
     * que ya estaba en pantalla. Ir de Ventas a Clientes y volver repetía todo
     * ese trabajo tres veces.
     *
     * 30 segundos es corto a propósito: alcanza para que moverse entre
     * secciones sea instantáneo y es demasiado poco para que alguien llegue a
     * ver un dato viejo. Todo lo que escribe llama a `revalidatePath`, que
     * invalida esta caché igual.
     */
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
