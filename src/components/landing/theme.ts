/**
 * El tema visual de una página de venta.
 *
 * La estructura de la página (los 13 bloques) es una cosa y cómo se ve es otra.
 * Separarlas es lo que permite que dos vendedores con productos opuestos —una
 * guía de arcilla y un curso de crochet— usen la misma página y no parezcan la
 * misma marca.
 *
 * Todo sale de acá como variables CSS. Los bloques nunca escriben un color a
 * mano: piden `var(--tf-accent)`. Así cambiar el tema no obliga a tocar ni un
 * renderizador, y el vendedor ve el cambio completo al instante.
 *
 * Los valores por defecto están calcados de páginas que ya venden: DM Sans para
 * el cuerpo, Playfair Display para el nombre del producto, radios de 16px,
 * títulos apretados (`letter-spacing` negativo) y etiquetas en mayúscula bien
 * espaciadas. Ese contraste —titular compacto, etiqueta expandida— es la mitad
 * del carácter de estas páginas.
 */

export interface LandingTheme {
  /** Id del preset elegido, o `"custom"` si el vendedor tocó los colores. */
  preset: string;
  /** Fondo de la página. */
  bg: string;
  /** Fondo de tarjetas y cajas. */
  surface: string;
  /** El color de marca: botones, números, etiquetas. */
  accent: string;
  /** Versión clara del acento, para textos sobre fondo oscuro. */
  accentSoft: string;
  /** Versión oscura, para hovers y degradés. */
  accentDeep: string;
  /** Color del texto principal. */
  text: string;
  /** Texto secundario. */
  muted: string;
  /** Bordes y separadores. */
  line: string;
  /** Radio de las esquinas, en píxeles. */
  radius: number;
  /** Tipografía del nombre del producto. */
  display: DisplayFont;
  /** `true` cuando el fondo es oscuro: cambia el color del texto de los botones. */
  dark: boolean;
}

export type DisplayFont = "playfair" | "sans";

export const DISPLAY_FONTS: Record<DisplayFont, { label: string; stack: string }> = {
  playfair: {
    label: "Serif elegante",
    stack: '"Playfair Display", Georgia, "Times New Roman", serif',
  },
  sans: {
    label: "Igual que el resto",
    stack: '"DM Sans", "Inter", ui-sans-serif, system-ui, sans-serif',
  },
};

const BODY_STACK = '"DM Sans", "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif';

/* -------------------------------------------------------------------------- */
/* Presets                                                                     */
/* -------------------------------------------------------------------------- */

export interface Preset extends LandingTheme {
  label: string;
  /** Para dibujar la muestra en el selector. */
  swatch: [string, string, string];
}

export const PRESETS: Preset[] = [
  {
    preset: "terracota",
    label: "Terracota",
    swatch: ["#F7F2EC", "#B86643", "#342821"],
    bg: "#F7F2EC",
    surface: "#FFFFFF",
    accent: "#B86643",
    accentSoft: "#D99A72",
    accentDeep: "#8A4A2E",
    text: "#342821",
    muted: "#74665D",
    line: "rgba(184,102,67,.20)",
    radius: 16,
    display: "playfair",
    dark: false,
  },
  {
    preset: "noche",
    label: "Noche",
    swatch: ["#171411", "#B86F4B", "#F4E9D8"],
    bg: "#171411",
    surface: "#261F19",
    accent: "#B86F4B",
    accentSoft: "#D99A72",
    accentDeep: "#8A4A2E",
    text: "#FFFFFF",
    muted: "#CDBEAE",
    line: "rgba(199,139,67,.22)",
    radius: 16,
    display: "playfair",
    dark: true,
  },
  {
    preset: "rosa",
    label: "Rosa",
    swatch: ["#FBF5F1", "#C2185B", "#3A2530"],
    bg: "#FBF5F1",
    surface: "#FFFDFB",
    accent: "#C2185B",
    accentSoft: "#E0648B",
    accentDeep: "#8E1447",
    text: "#3A2530",
    muted: "#7A6570",
    line: "rgba(194,24,91,.18)",
    radius: 16,
    display: "playfair",
    dark: false,
  },
  {
    preset: "salvia",
    label: "Salvia",
    swatch: ["#F5F7F2", "#7C8B65", "#2C332A"],
    bg: "#F5F7F2",
    surface: "#FFFFFF",
    accent: "#7C8B65",
    accentSoft: "#9BAA82",
    accentDeep: "#5A6849",
    text: "#2C332A",
    muted: "#6E7568",
    line: "rgba(124,139,101,.22)",
    radius: 16,
    display: "playfair",
    dark: false,
  },
  {
    preset: "oceano",
    label: "Océano",
    swatch: ["#F2F7FA", "#0E7490", "#0F2A33"],
    bg: "#F2F7FA",
    surface: "#FFFFFF",
    accent: "#0E7490",
    accentSoft: "#38BDF8",
    accentDeep: "#0A4F63",
    text: "#0F2A33",
    muted: "#5B7480",
    line: "rgba(14,116,144,.18)",
    radius: 16,
    display: "sans",
    dark: false,
  },
  {
    preset: "violeta",
    label: "Violeta",
    swatch: ["#F7F6FE", "#5B4AE8", "#1B1832"],
    bg: "#F7F6FE",
    surface: "#FFFFFF",
    accent: "#5B4AE8",
    accentSoft: "#8B83FC",
    accentDeep: "#3D2FB8",
    text: "#1B1832",
    muted: "#6B6785",
    line: "rgba(91,74,232,.18)",
    radius: 18,
    display: "sans",
    dark: false,
  },
];

export const DEFAULT_PRESET = PRESETS[0];

/* -------------------------------------------------------------------------- */
/* Lectura y escritura                                                         */
/* -------------------------------------------------------------------------- */

function texto(valor: unknown, fallback: string): string {
  return typeof valor === "string" && valor.trim() ? valor.trim() : fallback;
}

/**
 * Arma un tema completo a partir de lo que haya guardado.
 *
 * Tolera cualquier cosa: páginas viejas que solo tienen `{ accent }`, campos
 * sueltos, o nada. Nunca devuelve un tema incompleto, porque un color faltante
 * en la página pública se ve como un bloque roto.
 */
export function readTheme(stored: unknown): LandingTheme {
  const raw = (stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>;

  /**
   * Compatibilidad con páginas anteriores, que guardaban solo `{ accent }`.
   *
   * `#6D5DFB` era el violeta que la app ponía sola, no una decisión de nadie:
   * si lo respetáramos, esas páginas quedarían con un acento violeta sobre una
   * paleta terracota. Cuando es exactamente ese valor lo tratamos como "sin
   * elegir" y usamos el preset entero. Cualquier otro color sí lo respetamos,
   * porque ahí alguien lo eligió a mano.
   */
  const acentoHeredado =
    typeof raw.accent === "string" && raw.accent.toUpperCase() !== "#6D5DFB" ? raw.accent : null;

  const base =
    PRESETS.find((preset) => preset.preset === raw.preset) ??
    (acentoHeredado ? { ...DEFAULT_PRESET, accent: acentoHeredado } : DEFAULT_PRESET);

  const display = raw.display === "sans" || raw.display === "playfair" ? raw.display : base.display;
  const radius = typeof raw.radius === "number" && raw.radius >= 0 ? raw.radius : base.radius;

  return {
    preset: texto(raw.preset, base.preset),
    bg: texto(raw.bg, base.bg),
    surface: texto(raw.surface, base.surface),
    accent: acentoHeredado ?? texto(raw.preset ? raw.accent : null, base.accent),
    accentSoft: texto(raw.accentSoft, base.accentSoft),
    accentDeep: texto(raw.accentDeep, base.accentDeep),
    text: texto(raw.text, base.text),
    muted: texto(raw.muted, base.muted),
    line: texto(raw.line, base.line),
    radius,
    display: display as DisplayFont,
    dark: typeof raw.dark === "boolean" ? raw.dark : base.dark,
  };
}

/** Las variables CSS que consumen todos los bloques. */
export function themeVars(theme: LandingTheme): React.CSSProperties {
  return {
    "--tf-bg": theme.bg,
    "--tf-surface": theme.surface,
    "--tf-accent": theme.accent,
    "--tf-accent-soft": theme.accentSoft,
    "--tf-accent-deep": theme.accentDeep,
    "--tf-text": theme.text,
    "--tf-muted": theme.muted,
    "--tf-line": theme.line,
    "--tf-radius": `${theme.radius}px`,
    "--tf-radius-lg": `${Math.round(theme.radius * 1.5)}px`,
    "--tf-display": DISPLAY_FONTS[theme.display].stack,
    "--tf-body": BODY_STACK,
    // El texto de los botones tiene que contrastar con el acento, no con el fondo.
    "--tf-on-accent": "#FFFFFF",
    backgroundColor: theme.bg,
    color: theme.text,
    fontFamily: BODY_STACK,
  } as React.CSSProperties;
}
