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
  /** Vacío cuando el grupo no necesita título: solo se separa con una línea. */
  label: string;
  items: NavItem[];
}

/**
 * Navegación principal.
 *
 * Seis destinos arriba y tres abajo. Nada más.
 *
 * El centro de la app es el producto: todo lo que sirve para venderlo —precio,
 * bonos, página, cobro, ofertas posteriores, métricas— vive adentro del
 * producto, no en secciones sueltas. Por eso no están "Ofertas", "Funnels" ni
 * "Landings": se llegan desde el producto que las usa.
 *
 * Lo de abajo es de otra naturaleza: no es trabajo diario, es plomería que se
 * toca una vez y se olvida. Por eso va separado y no compite con lo de arriba.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "",
    items: [
      { label: "Inicio", href: "/app", emoji: "🏠", icon: "dashboard", exact: true },
      { label: "Mis productos", href: "/app/productos", emoji: "📦", icon: "box" },
      { label: "Ventas", href: "/app/ventas", emoji: "🛒", icon: "cart" },
      { label: "Clientes", href: "/app/clientes", emoji: "👥", icon: "users" },
      { label: "Marketing", href: "/app/marketing", emoji: "📣", icon: "megaphone" },
      { label: "IA", href: "/app/ia", emoji: "🤖", icon: "sparkles" },
    ],
  },
  {
    label: "Tu cuenta",
    items: [
      { label: "Pagos", href: "/app/pagos", emoji: "💳", icon: "card" },
      { label: "Integraciones", href: "/app/integraciones", emoji: "🔗", icon: "plug" },
      { label: "Configuración", href: "/app/configuracion", emoji: "⚙️", icon: "settings" },
    ],
  },
];

export interface CreateItem {
  label: string;
  emoji: string;
  icon: IconName;
  hint: string;
  /** Ruta fija, o el segmento del producto al que lleva. */
  href?: string;
  /**
   * Lo que se va a crear necesita un producto. Si estás adentro de uno se usa
   * ese; si no, primero preguntamos para cuál.
   */
  needsProduct?: "oferta" | "pagina" | "bono";
}

/**
 * Menú "Crear".
 *
 * El camino recomendado empieza **siempre** por el producto: una oferta, una
 * página o un bono no existen en el aire, son de algún producto. Por eso los
 * tres de abajo, cuando no estás parado en un producto, primero preguntan para
 * cuál —en lugar de crear una entidad suelta que después hay que ir a atar—.
 */
export const CREATE_MENU: CreateItem[] = [
  {
    label: "Producto",
    emoji: "📕",
    icon: "box",
    hint: "El camino recomendado: empezá por acá",
    href: "/app/productos/nuevo",
  },
  {
    label: "Oferta",
    emoji: "💰",
    icon: "tag",
    hint: "Precio, promesa y beneficios",
    needsProduct: "oferta",
  },
  {
    label: "Página de venta",
    emoji: "🛍️",
    icon: "layers",
    hint: "Lo que ve tu cliente antes de comprar",
    needsProduct: "pagina",
  },
  {
    label: "Bono",
    emoji: "🎁",
    icon: "gift",
    hint: "Un regalo que acompaña la compra",
    needsProduct: "bono",
  },
];

/** A qué sección del producto lleva cada cosa que se puede crear. */
export const CREATE_TARGET: Record<
  NonNullable<CreateItem["needsProduct"]>,
  { segment: string; title: string; blurb: string }
> = {
  oferta: {
    segment: "oferta",
    title: "¿A qué producto le ponés precio?",
    blurb: "La oferta es de un producto: elegí cuál y te llevamos derecho ahí.",
  },
  pagina: {
    segment: "pagina",
    title: "¿De qué producto es la página?",
    blurb: "La página de venta cuenta un producto: elegí cuál y la armamos ahí.",
  },
  bono: {
    segment: "oferta",
    title: "¿A qué producto le sumás un bono?",
    blurb: "Los bonos acompañan la oferta de un producto: elegí cuál.",
  },
};
