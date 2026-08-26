"use client";

import { LANDING_LAYOUT, type LandingLayout } from "@/components/landing/estructuras";
import {
  BODY_FONTS,
  BUTTON_STYLES,
  DISPLAY_FONTS,
  PRESETS,
  type BodyFont,
  type ButtonStyle,
  type DisplayFont,
  type LandingTheme,
} from "@/components/landing/theme";
import { Button, Field, Select } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * El diseño de toda la página.
 *
 * Vive en un panel aparte y no en una pestaña al lado de "Contenido" porque no
 * es lo mismo: los campos de la derecha son del bloque que estás editando y el
 * diseño es de la página entera. Cuando las dos cosas comparten un par de
 * pestañas, cambiar un color obliga a perder de vista el texto que estabas
 * escribiendo, y volver cuesta un click que nadie pidió.
 *
 * Lo que este panel NO tiene es un selector de estructura. La estructura es una
 * sola y ya está decidida (ver `estructuras.ts`): ofrecerle al vendedor ocho
 * órdenes distintos es pedirle que adivine cuál convierte cuando la respuesta
 * ya se sabe. Lo único que queda acá es la identidad visual — qué colores y qué
 * tipografía usa su marca dentro de esa estructura.
 *
 * Tocar cualquier cosa acá repinta la vista previa al instante: elegir un color
 * mirando un cuadradito no sirve, hay que verlo aplicado sobre la página real.
 */

/** Los colores que el vendedor puede tocar, en el orden en que importan. */
const COLORES: Array<{ key: keyof LandingTheme; label: string; hint?: string }> = [
  { key: "accent", label: "Color principal", hint: "Botones, precios y etiquetas." },
  { key: "accent2", label: "Color de los ahorros", hint: 'Los "GRATIS" y cuánto se ahorra.' },
  { key: "bg", label: "Fondo de la página" },
  { key: "surface", label: "Fondo de las secciones alternas" },
  { key: "text", label: "Texto", hint: "También define el fondo oscuro del precio." },
  { key: "muted", label: "Texto secundario" },
];

export function DesignPanel({
  theme,
  onChange,
  onLayout,
  faltantes,
}: {
  theme: LandingTheme;
  onChange: (theme: LandingTheme) => void;
  onLayout: (layout: LandingLayout) => void;
  /** Cuántos bloques de la estructura no están en la página. */
  faltantes: number;
}) {
  const set = (patch: Partial<LandingTheme>) =>
    // Cualquier retoque manual desengancha el preset: ya no es "Venta directa",
    // es la versión de esta persona.
    onChange({ ...theme, ...patch, preset: patch.preset ?? "custom" });

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-ink-200 p-3">
        <p className="text-[13px] font-semibold text-ink-900">Estructura de la página</p>
        <p className="mt-1 text-[11.5px] leading-snug text-ink-500">
          Todas las páginas de TiendaFlow tienen las mismas {LANDING_LAYOUT.structure.length}{" "}
          secciones, en el mismo orden. {LANDING_LAYOUT.blurb}
        </p>

        {faltantes > 0 ? (
          <>
            <p className="mt-2 text-[11.5px] font-medium text-amber-700">
              A tu página le faltan {faltantes} {faltantes === 1 ? "sección" : "secciones"}.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon="refresh"
              className="mt-2 w-full"
              onClick={() => onLayout(LANDING_LAYOUT)}
            >
              Completar la estructura
            </Button>
            <p className="mt-1.5 text-[11px] leading-snug text-ink-400">
              Reordena lo que ya tenés y agrega lo que falta. No se borra nada de lo que
              escribiste.
            </p>
          </>
        ) : (
          <p className="mt-2 text-[11.5px] font-medium text-emerald-700">
            Tu página tiene la estructura completa.
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 text-[13px] font-medium text-ink-700">Paleta</p>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.preset}
              type="button"
              onClick={() => onChange({ ...preset, layout: theme.layout })}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors",
                theme.preset === preset.preset
                  ? "border-brand-400 bg-brand-50"
                  : "border-ink-200 hover:bg-ink-50",
              )}
            >
              <span className="flex shrink-0 overflow-hidden rounded-md">
                {preset.swatch.map((color) => (
                  <span key={color} className="size-4" style={{ backgroundColor: color }} />
                ))}
              </span>
              <span className="truncate text-[12.5px] font-medium text-ink-800">
                {preset.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Field label="Tipografía de los títulos">
        <Select
          value={theme.display}
          onChange={(event) => set({ display: event.target.value as DisplayFont })}
        >
          {Object.entries(DISPLAY_FONTS).map(([value, font]) => (
            <option key={value} value={value}>
              {font.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Tipografía del cuerpo">
        <Select
          value={theme.body}
          onChange={(event) => set({ body: event.target.value as BodyFont })}
        >
          {Object.entries(BODY_FONTS).map(([value, font]) => (
            <option key={value} value={value}>
              {font.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Botones" hint={BUTTON_STYLES[theme.button].hint}>
        <Select
          value={theme.button}
          onChange={(event) => set({ button: event.target.value as ButtonStyle })}
        >
          {Object.entries(BUTTON_STYLES).map(([value, style]) => (
            <option key={value} value={value}>
              {style.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Esquinas" hint={`${theme.radius}px`}>
        <input
          type="range"
          min={0}
          max={28}
          step={2}
          value={theme.radius}
          onChange={(event) => set({ radius: Number(event.target.value) })}
          className="w-full accent-brand-600"
        />
      </Field>

      <div>
        <p className="mb-2 text-[13px] font-medium text-ink-700">Colores</p>
        <div className="flex flex-col gap-3">
          {COLORES.map((color) => (
            <div key={color.key} className="flex items-center gap-3">
              <input
                type="color"
                value={normalizarColor(theme[color.key] as string)}
                onChange={(event) =>
                  set({ [color.key]: event.target.value } as Partial<LandingTheme>)
                }
                className="size-9 shrink-0 cursor-pointer rounded-lg border border-ink-200 bg-white p-0.5"
                aria-label={color.label}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink-800">{color.label}</p>
                {color.hint ? <p className="text-[11.5px] text-ink-400">{color.hint}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <label className="flex items-start gap-2.5 rounded-xl border border-ink-200 p-3">
        <input
          type="checkbox"
          checked={theme.dark}
          onChange={(event) => set({ dark: event.target.checked })}
          className="mt-0.5 size-4 accent-brand-600"
        />
        <span>
          <span className="block text-[13px] font-medium text-ink-800">Fondo oscuro</span>
          <span className="block text-[11.5px] text-ink-500">
            Avisá si tu fondo es oscuro para que los detalles se sigan leyendo.
          </span>
        </span>
      </label>

      <p className="rounded-xl bg-ink-50 px-3 py-2.5 text-[12px] leading-relaxed text-ink-500">
        Los cambios se ven al instante acá al lado, pero recién quedan guardados cuando apretás
        <strong className="text-ink-700"> Guardar</strong>.
      </p>
    </div>
  );
}

/**
 * `<input type="color">` solo entiende `#rrggbb`.
 *
 * El tema puede traer `rgba(...)` —los bordes, por ejemplo— y en ese caso el
 * navegador muestra negro sin avisar. Devolvemos un gris neutro para que al
 * menos no mienta sobre el color actual.
 */
function normalizarColor(valor: string): string {
  return /^#[0-9a-f]{6}$/i.test(valor) ? valor : "#888888";
}
