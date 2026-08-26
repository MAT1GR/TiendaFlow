/**
 * El tema visual de una página de venta.
 *
 * La estructura de la página (los bloques) es una cosa y cómo se ve es otra.
 * Separarlas es lo que permite que dos vendedores con productos opuestos —una
 * guía de arcilla y un kit de rutinas para chicos— usen los mismos bloques y no
 * parezcan la misma marca.
 *
 * Todo sale de acá como variables CSS. Los bloques nunca escriben un color a
 * mano: piden `var(--tf-accent)`. Así cambiar el tema no obliga a tocar ni un
 * renderizador, y el vendedor ve el cambio completo al instante.
 *
 * Un tema no es solo una paleta. Una página se reconoce por cuatro cosas a la
 * vez —color, tipografía, forma de los botones y textura del fondo— y si el
 * sistema solo modela la primera, todas las páginas terminan siendo la misma
 * página pintada de otro color. Por eso acá viven también la familia
 * tipográfica del cuerpo, el estilo del botón y el patrón del fondo: son las
 * tres cosas que separan una página editorial de una juguetona.
 */

import { DEFAULT_LAYOUT } from "@/components/landing/estructuras";

export interface LandingTheme {
  /** Id del preset elegido, o `"custom"` si el vendedor tocó los colores. */
  preset: string;
  /**
   * Id del estilo de página (ver `estructuras.ts`).
   *
   * Vive acá y no en su propia columna porque es lo mismo que los colores: una
   * decisión de presentación que se guarda junto con la página. El orden real
   * de los bloques ya está en `landing_sections`; esto solo recuerda cuál eligió
   * para poder marcarlo en el panel.
   */
  layout: string;
  /** Fondo de la página. */
  bg: string;
  /** Fondo de tarjetas y cajas. */
  surface: string;
  /** El color de marca: botones, números, etiquetas. */
  accent: string;
  /** Versión clara del acento, para textos sobre fondo oscuro. */
  accentSoft: string;
  /** Versión oscura, para hovers, degradés y el relieve del botón. */
  accentDeep: string;
  /**
   * El segundo color de marca.
   *
   * Las paletas editoriales viven con un solo acento; las juguetonas no. En el
   * kit de rutinas cada beneficio tiene su color y el fondo son dos lluvias de
   * puntos de colores distintos: sin un segundo color el bloque se dibuja
   * monocromo y pierde exactamente lo que lo hacía reconocible. En los presets
   * de un solo acento vale lo mismo que `accentSoft`, así que nada cambia.
   */
  accent2: string;
  /** Color del texto principal. */
  text: string;
  /** Texto secundario. */
  muted: string;
  /** Bordes y separadores. */
  line: string;
  /** Radio de las esquinas, en píxeles. */
  radius: number;
  /** Tipografía del nombre del producto y los títulos. */
  display: DisplayFont;
  /** Tipografía del cuerpo. */
  body: BodyFont;
  /** La forma de los botones. */
  button: ButtonStyle;
  /** La textura del fondo. */
  pattern: BackgroundPattern;
  /** `true` cuando el fondo es oscuro: cambia el color del texto de los botones. */
  dark: boolean;
}

/**
 * El fondo oscuro de las secciones de cierre.
 *
 * Tres bloques de la estructura —la cuenta completa, los tres pasos y el pie—
 * van sobre oscuro, y no es una preferencia estética: después de seis secciones
 * claras, el cambio de fondo marca que se terminó de explicar y empezó a
 * cobrarse. Se calcula desde el color de texto del tema en vez de ser un `#111`
 * fijo para que una paleta cálida no termine con un bloque azulado en el medio.
 */
export function fondoOscuro(theme: Pick<LandingTheme, "text" | "dark" | "bg">): {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  line: string;
} {
  if (theme.dark) {
    return {
      bg: theme.bg,
      surface: `color-mix(in srgb, ${theme.text} 8%, ${theme.bg})`,
      text: "#FFFFFF",
      muted: `color-mix(in srgb, #FFFFFF 60%, transparent)`,
      line: `color-mix(in srgb, #FFFFFF 14%, transparent)`,
    };
  }

  return {
    bg: `color-mix(in srgb, ${theme.text} 94%, #000000)`,
    surface: `color-mix(in srgb, ${theme.text} 82%, #000000)`,
    text: "#FFFFFF",
    muted: `color-mix(in srgb, #FFFFFF 62%, transparent)`,
    line: `color-mix(in srgb, #FFFFFF 16%, transparent)`,
  };
}

/* -------------------------------------------------------------------------- */
/* Tipografía                                                                  */
/* -------------------------------------------------------------------------- */

export type DisplayFont = "playfair" | "sans" | "rounded" | "geometric" | "grotesk";
export type BodyFont = "dm" | "nunito" | "poppins";

export const DISPLAY_FONTS: Record<DisplayFont, { label: string; stack: string }> = {
  playfair: {
    label: "Serif elegante",
    stack: '"Playfair Display", Georgia, "Times New Roman", serif',
  },
  sans: {
    label: "Igual que el resto",
    stack: '"DM Sans", "Inter", ui-sans-serif, system-ui, sans-serif',
  },
  rounded: {
    label: "Redondeada y amable",
    stack: '"Baloo 2", "Nunito", ui-rounded, "Segoe UI", system-ui, sans-serif',
  },
  geometric: {
    label: "Geométrica y firme",
    stack: '"Poppins", "DM Sans", ui-sans-serif, system-ui, sans-serif',
  },
  grotesk: {
    label: "Compacta y pesada",
    stack: '"Inter", "DM Sans", ui-sans-serif, system-ui, sans-serif',
  },
};

export const BODY_FONTS: Record<BodyFont, { label: string; stack: string }> = {
  dm: {
    label: "Neutra",
    stack: '"DM Sans", "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
  },
  nunito: {
    label: "Cálida",
    stack: '"Nunito", "DM Sans", ui-sans-serif, system-ui, sans-serif',
  },
  poppins: {
    label: "Geométrica",
    stack: '"Poppins", "DM Sans", ui-sans-serif, system-ui, sans-serif',
  },
};

/**
 * Las familias que hay que bajar para que las páginas se vean como se diseñaron.
 *
 * Está acá y no repetido en cada layout porque venía escrito a mano en cuatro
 * archivos distintos y el editor —que es donde el vendedor decide— era
 * justamente el que no lo tenía: la vista previa dibujaba los títulos con la
 * fuente del sistema y mentía sobre cómo iba a quedar la página publicada.
 *
 * `display=swap` es deliberado: mientras baja Playfair el texto se ve con la
 * fuente del sistema en vez de quedar invisible. En una página de venta que
 * llega desde un anuncio, medio segundo de pantalla en blanco es gente que se
 * va antes de leer el titular.
 */
export const LANDING_FONTS_HREF =
  "https://fonts.googleapis.com/css2" +
  "?family=DM+Sans:wght@400;500;600;700;800" +
  "&family=Playfair+Display:ital,wght@0,700;0,800;1,700" +
  "&family=Nunito:wght@400;600;700;800;900" +
  "&family=Baloo+2:wght@600;700;800" +
  "&family=Poppins:wght@400;500;600;700;800;900" +
  "&family=Inter:wght@400;500;600;700;800;900" +
  "&display=swap";

/* -------------------------------------------------------------------------- */
/* Botones y fondo                                                             */
/* -------------------------------------------------------------------------- */

/**
 * El botón es la mitad del carácter de una página.
 *
 * Un rectángulo plano y una pastilla con relieve venden lo mismo con dos voces
 * distintas, y copiar la paleta de una referencia sin copiar su botón da una
 * página que se parece de lejos y se cae de cerca.
 */
export type ButtonStyle = "solid" | "chunky" | "pill";

export const BUTTON_STYLES: Record<ButtonStyle, { label: string; hint: string }> = {
  solid: { label: "Sólido", hint: "Rectángulo con las esquinas del tema. Sobrio." },
  chunky: { label: "Con relieve", hint: "Pastilla con sombra dura abajo. Se hunde al tocarlo." },
  pill: {
    label: "Pastilla con brillo",
    hint: "Redondeado, con sombra de color y un brillo que pasa.",
  },
};

export type BackgroundPattern = "none" | "dots";

export const BACKGROUND_PATTERNS: Record<BackgroundPattern, { label: string }> = {
  none: { label: "Liso" },
  dots: { label: "Lluvia de puntos" },
};

/* -------------------------------------------------------------------------- */
/* Presets                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Un preset es solo una identidad visual: no decide la estructura de la página.
 *
 * Por eso deja afuera `layout` — elegir "Noche" no tiene por qué reordenarle
 * los bloques a nadie.
 */
export interface Preset extends Omit<LandingTheme, "layout"> {
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
    accent2: "#7C896A",
    text: "#342821",
    muted: "#74665D",
    line: "rgba(184,102,67,.20)",
    radius: 16,
    display: "playfair",
    body: "dm",
    button: "solid",
    pattern: "none",
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
    accent2: "#7C8B65",
    text: "#FFFFFF",
    muted: "#CDBEAE",
    line: "rgba(199,139,67,.22)",
    radius: 16,
    display: "playfair",
    body: "dm",
    button: "solid",
    pattern: "none",
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
    accent2: "#7C8B65",
    text: "#3A2530",
    muted: "#7A6570",
    line: "rgba(194,24,91,.18)",
    radius: 16,
    display: "playfair",
    body: "dm",
    button: "solid",
    pattern: "none",
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
    accent2: "#B08968",
    text: "#2C332A",
    muted: "#6E7568",
    line: "rgba(124,139,101,.22)",
    radius: 16,
    display: "playfair",
    body: "dm",
    button: "solid",
    pattern: "none",
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
    accent2: "#F59E0B",
    text: "#0F2A33",
    muted: "#5B7480",
    line: "rgba(14,116,144,.18)",
    radius: 16,
    display: "sans",
    body: "dm",
    button: "solid",
    pattern: "none",
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
    accent2: "#8B83FC",
    text: "#1B1832",
    muted: "#6B6785",
    line: "rgba(91,74,232,.18)",
    radius: 18,
    display: "sans",
    body: "dm",
    button: "solid",
    pattern: "none",
    dark: false,
  },
  /*
   * Las dos paletas que no eran una variante de las anteriores.
   *
   * "Pack violeta" y "Juguetona" no salieron de elegir colores lindos: están
   * calcadas de dos páginas de infoproducto que ya venden, y traen su
   * tipografía, su botón y su fondo porque sin eso son la misma página de
   * siempre con otro acento. La primera es una página de bonos —violeta
   * saturado, Poppins, pastilla con brillo—; la segunda es para productos de
   * chicos —coral y menta, redondeada, botón con relieve y lluvia de puntos—.
   */
  {
    preset: "pack",
    label: "Pack violeta",
    swatch: ["#FFFFFF", "#6D28D9", "#0F0D15"],
    bg: "#FFFFFF",
    surface: "#FAF5FF",
    accent: "#6D28D9",
    accentSoft: "#A78BFA",
    accentDeep: "#4C1D95",
    accent2: "#10B981",
    text: "#0F0D15",
    muted: "#64748B",
    line: "rgba(109,40,217,.16)",
    radius: 24,
    display: "geometric",
    body: "poppins",
    button: "pill",
    pattern: "none",
    dark: false,
  },
  /*
   * Venta directa.
   *
   * La identidad de la estructura canónica: rosa saturado sobre blanco, Inter
   * en negrísima para los títulos, Nunito para el cuerpo y botón pastilla con
   * degradé. Los verdes de "GRATIS" y "Ahorrás" salen del segundo acento, que
   * en esta paleta es el único color que no es de marca: en una página donde
   * cada precio tiene su tachado al lado, el verde no es decoración, es lo que
   * separa lo que pagás de lo que no.
   */
  {
    preset: "venta",
    label: "Venta directa",
    swatch: ["#FFFFFF", "#E15771", "#111827"],
    bg: "#FFFFFF",
    surface: "#F9FAFB",
    accent: "#E15771",
    accentSoft: "#F6D6DD",
    accentDeep: "#BC4066",
    accent2: "#16A34A",
    text: "#111827",
    muted: "#6B7280",
    line: "#E5E7EB",
    radius: 16,
    display: "grotesk",
    body: "nunito",
    button: "pill",
    pattern: "none",
    dark: false,
  },
  {
    preset: "juguetona",
    label: "Juguetona",
    swatch: ["#F7FFF7", "#FF6B6B", "#292F36"],
    bg: "#F7FFF7",
    surface: "#FFFFFF",
    accent: "#FF6B6B",
    accentSoft: "#FFA5A5",
    accentDeep: "#CC4949",
    accent2: "#4ECDC4",
    text: "#292F36",
    muted: "#6B7A8F",
    line: "#E5E7EB",
    radius: 16,
    display: "rounded",
    body: "nunito",
    button: "chunky",
    pattern: "dots",
    dark: false,
  },
];

export const DEFAULT_PRESET = PRESETS[0];

/** Un preset por id, o el de siempre. */
export function findPreset(id: unknown): Preset {
  return PRESETS.find((preset) => preset.preset === id) ?? DEFAULT_PRESET;
}

/* -------------------------------------------------------------------------- */
/* Lectura y escritura                                                         */
/* -------------------------------------------------------------------------- */

function texto(valor: unknown, fallback: string): string {
  return typeof valor === "string" && valor.trim() ? valor.trim() : fallback;
}

function opcion<T extends string>(valor: unknown, validas: readonly T[], fallback: T): T {
  return validas.includes(valor as T) ? (valor as T) : fallback;
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

  const radius = typeof raw.radius === "number" && raw.radius >= 0 ? raw.radius : base.radius;

  return {
    preset: texto(raw.preset, base.preset),
    layout: texto(raw.layout, DEFAULT_LAYOUT.id),
    bg: texto(raw.bg, base.bg),
    surface: texto(raw.surface, base.surface),
    accent: acentoHeredado ?? texto(raw.preset ? raw.accent : null, base.accent),
    accentSoft: texto(raw.accentSoft, base.accentSoft),
    accentDeep: texto(raw.accentDeep, base.accentDeep),
    // Las páginas guardadas antes de que existiera el segundo acento se leen
    // con el acento claro: es exactamente lo que dibujaban hasta ahora.
    accent2: texto(raw.accent2, texto(raw.accentSoft, base.accent2)),
    text: texto(raw.text, base.text),
    muted: texto(raw.muted, base.muted),
    line: texto(raw.line, base.line),
    radius,
    display: opcion(
      raw.display,
      ["playfair", "sans", "rounded", "geometric", "grotesk"] as const,
      base.display,
    ),
    body: opcion(raw.body, ["dm", "nunito", "poppins"] as const, base.body),
    button: opcion(raw.button, ["solid", "chunky", "pill"] as const, base.button),
    pattern: opcion(raw.pattern, ["none", "dots"] as const, base.pattern),
    dark: typeof raw.dark === "boolean" ? raw.dark : base.dark,
  };
}

/** Los colores y la tipografía de un tema, sin lo estructural. */
export type ThemeColors = Omit<LandingTheme, "layout" | "preset">;

/**
 * El fondo de la página, con su textura.
 *
 * Los puntos van en el `background` y no en un pseudo-elemento porque tienen
 * que quedar debajo de todo sin sumar un nodo: dos lluvias desfasadas media
 * celda, que es lo que hace que se lean como una trama y no como una grilla.
 *
 * Y van lavados contra el fondo, no con el color puro de la marca. Con el coral
 * y el menta a full, un párrafo apoyado sobre la trama pierde contraste contra
 * los puntos que le pasan por atrás y hay que forzar la vista para leerlo — que
 * es exactamente lo contrario de lo que hace la textura en la página de la que
 * salió, donde los puntos son un amarillo pálido que apenas se adivina. Una
 * trama de fondo tiene que sentirse, no leerse.
 */
const MEZCLA_PUNTOS = 32;

function fondo(theme: ThemeColors): React.CSSProperties {
  if (theme.pattern !== "dots") return { backgroundColor: theme.bg };

  const punto = (color: string) =>
    `radial-gradient(color-mix(in srgb, ${color} ${MEZCLA_PUNTOS}%, ${theme.bg}) 2px, transparent 2px)`;

  return {
    backgroundColor: theme.bg,
    backgroundImage: `${punto(theme.accentSoft)}, ${punto(theme.accent2)}`,
    backgroundSize: "40px 40px",
    backgroundPosition: "0 0, 20px 20px",
  };
}

/**
 * El relieve del botón, según su estilo.
 *
 * `--tf-btn-lift` es cuánto baja al apretarlo: tiene que ser exactamente la
 * altura de la sombra para que el botón parezca apoyarse en la página.
 */
function boton(theme: ThemeColors): Record<string, string> {
  switch (theme.button) {
    case "chunky":
      return {
        "--tf-btn-radius": "999px",
        "--tf-btn-shadow": `0 6px 0 ${theme.accentDeep}`,
        "--tf-btn-lift": "6px",
        "--tf-btn-tracking": "0.03em",
        "--tf-btn-case": "uppercase",
        "--tf-btn-shine": "0",
      };
    case "pill":
      return {
        "--tf-btn-radius": "999px",
        "--tf-btn-shadow": `0 10px 25px -5px color-mix(in srgb, ${theme.accent} 45%, transparent)`,
        "--tf-btn-lift": "2px",
        "--tf-btn-tracking": "0.01em",
        "--tf-btn-case": "none",
        "--tf-btn-shine": "1",
      };
    default:
      return {
        "--tf-btn-radius": `${theme.radius}px`,
        "--tf-btn-shadow": "none",
        "--tf-btn-lift": "0px",
        "--tf-btn-tracking": "0.01em",
        "--tf-btn-case": "none",
        "--tf-btn-shine": "0",
      };
  }
}

/** Las variables CSS que consumen todos los bloques. */
export function themeVars(theme: ThemeColors): React.CSSProperties {
  return {
    "--tf-bg": theme.bg,
    "--tf-surface": theme.surface,
    "--tf-accent": theme.accent,
    "--tf-accent-soft": theme.accentSoft,
    "--tf-accent-deep": theme.accentDeep,
    "--tf-accent-2": theme.accent2,
    "--tf-text": theme.text,
    "--tf-muted": theme.muted,
    "--tf-line": theme.line,
    "--tf-radius": `${theme.radius}px`,
    "--tf-radius-lg": `${Math.round(theme.radius * 1.5)}px`,
    "--tf-display": DISPLAY_FONTS[theme.display].stack,
    "--tf-body": BODY_FONTS[theme.body].stack,
    // El texto de los botones tiene que contrastar con el acento, no con el fondo.
    "--tf-on-accent": "#FFFFFF",
    ...boton(theme),
    ...fondo(theme),
    color: theme.text,
    fontFamily: BODY_FONTS[theme.body].stack,
  } as React.CSSProperties;
}
