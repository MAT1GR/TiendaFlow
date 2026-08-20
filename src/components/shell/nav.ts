import type { IconName } from "@/components/ui/icon";

export interface NavItem {
  label: string;
  href: string;
  /** Emoji que se muestra en el sidebar. */
  emoji: string;
  /** Ícono del set propio. Se sigue usando en menús y pantallas internas. */
  icon: IconName;
  exact?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Navegación principal.
 *
 * El centro de la app es el producto: todo lo que sirve para venderlo —precio,
 * bonos, funnel, checkout, marketing, métricas— vive adentro del producto, no
 * en secciones sueltas. Por eso "Ofertas" y "Funnels" ya no están acá: se
 * llegan desde el producto que las usa.
 *
 * Lo que queda en el sidebar es lo que de verdad es transversal a todos los
 * productos (clientes, plata, configuración).
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Mi negocio",
    items: [
      { label: "Inicio", href: "/app", emoji: "🏠", icon: "dashboard", exact: true },
      { label: "Mis productos", href: "/app/productos", emoji: "📦", icon: "box" },
      { label: "Ventas", href: "/app/ventas", emoji: "🛒", icon: "cart" },
      { label: "Clientes", href: "/app/clientes", emoji: "👥", icon: "users" },
    ],
  },
  {
    label: "Herramientas",
    items: [
      { label: "Marketing", href: "/app/marketing", emoji: "📣", icon: "megaphone" },
      { label: "Afiliados", href: "/app/afiliados", emoji: "🤝", icon: "handshake" },
      { label: "IA", href: "/app/ia", emoji: "🤖", icon: "sparkles" },
    ],
  },
  {
    label: "Configuración",
    items: [
      { label: "Pagos", href: "/app/pagos", emoji: "💳", icon: "card" },
      { label: "Integraciones", href: "/app/integraciones", emoji: "🔗", icon: "plug" },
      { label: "Dominios", href: "/app/dominios", emoji: "🌐", icon: "globe" },
      { label: "Configuración", href: "/app/configuracion", emoji: "⚙️", icon: "settings" },
    ],
  },
];

/**
 * Menú "Crear".
 *
 * Antes ofrecía crear una oferta, un funnel o un bono sueltos, que es
 * exactamente la dispersión que queremos sacar: nadie crea "un bono" en el
 * aire, lo crea para un producto. Ahora todo empieza por el producto y lo demás
 * se agrega desde adentro.
 */
export const CREATE_MENU: Array<{ label: string; href: string; icon: IconName; hint: string }> = [
  {
    label: "Producto",
    href: "/app/productos/nuevo",
    icon: "box",
    hint: "Subí un archivo o escribilo acá",
  },
  {
    label: "Producto con IA",
    href: "/app/productos/nuevo?fuente=ia",
    icon: "sparkles",
    hint: "Contale el tema y lo arma",
  },
  {
    label: "Campaña",
    href: "/app/marketing",
    icon: "megaphone",
    hint: "Atribución y UTMs",
  },
  {
    label: "Afiliado",
    href: "/app/afiliados",
    icon: "handshake",
    hint: "Que otros vendan por vos",
  },
];
