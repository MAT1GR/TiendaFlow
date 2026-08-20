import type { IconName } from "@/components/ui/icon";

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  exact?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { label: "Dashboard", href: "/app", icon: "dashboard", exact: true },
      { label: "Productos", href: "/app/productos", icon: "box" },
      { label: "Ofertas", href: "/app/ofertas", icon: "tag" },
      { label: "Funnels", href: "/app/funnels", icon: "funnel" },
      { label: "Ventas", href: "/app/ventas", icon: "cart" },
      { label: "Clientes", href: "/app/clientes", icon: "users" },
    ],
  },
  {
    label: "Crecimiento",
    items: [
      { label: "IA", href: "/app/ia", icon: "sparkles" },
      { label: "Marketing", href: "/app/marketing", icon: "megaphone" },
      { label: "Analytics", href: "/app/analytics", icon: "chart" },
      { label: "Afiliados", href: "/app/afiliados", icon: "handshake" },
    ],
  },
  {
    label: "Configuración",
    items: [
      { label: "Pagos", href: "/app/pagos", icon: "card" },
      { label: "Integraciones", href: "/app/integraciones", icon: "plug" },
      { label: "Dominios", href: "/app/dominios", icon: "globe" },
      { label: "Configuración", href: "/app/configuracion", icon: "settings" },
    ],
  },
];

export const CREATE_MENU: Array<{ label: string; href: string; icon: IconName; hint: string }> = [
  { label: "Producto", href: "/app/productos/nuevo", icon: "box", hint: "Subí o creá un digital" },
  { label: "Oferta", href: "/app/ofertas/nueva", icon: "tag", hint: "Precio, promesa y bonos" },
  { label: "Funnel", href: "/app/funnels/nuevo", icon: "funnel", hint: "Landing → checkout → gracias" },
  { label: "Landing", href: "/app/landings", icon: "layers", hint: "Editor visual de página" },
  { label: "Bono", href: "/app/ofertas", icon: "gift", hint: "Sumalo a una oferta" },
  { label: "Upsell", href: "/app/ofertas", icon: "trendUp", hint: "Después del checkout" },
  { label: "Order bump", href: "/app/ofertas", icon: "plus", hint: "Dentro del checkout" },
  { label: "Campaña", href: "/app/marketing", icon: "megaphone", hint: "Atribución y UTMs" },
];
