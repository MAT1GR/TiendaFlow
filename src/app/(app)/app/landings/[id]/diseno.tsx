"use client";

import {
  LANDING_LAYOUTS,
  type LandingLayout,
} from "@/components/landing/estructuras";
import {
  DISPLAY_FONTS,
  PRESETS,
  type DisplayFont,
  type LandingTheme,
} from "@/components/landing/theme";
import { Field, Select } from "@/components/ui/primitives";
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
 * Tocar cualquier cosa acá repinta la vista previa al instante: elegir un color
 * mirando un cuadradito no sirve, hay que verlo aplicado sobre la página real.
 */

/** Los colores que el vendedor puede tocar, en el orden en que importan. */
const COLORES: Array<{ key: keyof LandingTheme; label: string; hint?: string }> = [
  { key: "accent", label: "Color principal", hint: "Botones, números y etiquetas." },
  { key: "bg", label: "Fondo de la página" },
  { key: "surface", label: "Fondo de las tarjetas" },
  { key: "text", label: "Texto" },
  { key: "muted", label: "Texto secundario" },
];

export function DesignPanel({
  theme,
  onChange,
  onLayout,
}: {
  theme: LandingTheme;
  onChange: (theme: LandingTheme) => void;
  onLayout: (layout: LandingLayout) => void;
}) {
  const set = (patch: Partial<LandingTheme>) =>
    // Cualquier retoque manual desengancha el preset: ya no es "Terracota",
    // es la versión de esta persona.
    onChange({ ...theme, ...patch, preset: patch.preset ?? "custom" });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[13px] font-medium text-ink-700">Estilo de página</p>
        <p className="mb-2 text-[11.5px] text-ink-400">
          Cambia qué bloques tiene la página y en qué orden. No se borra nada de lo que
          escribiste: lo que sobra queda al final.
        </p>
        <div className="flex flex-col gap-2">
          {LANDING_LAYOUTS.map((layout) => {
            const activo = theme.layout === layout.id;
            return (
              <button
                key={layout.id}
                type="button"
                aria-pressed={activo}
                onClick={() => onLayout(layout)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left transition-colors",
                  activo
                    ? "border-brand-400 bg-brand-50"
                    : "border-ink-200 hover:border-ink-300 hover:bg-ink-50",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-[13px] font-semibold text-ink-900">{layout.label}</span>
                  <span className="text-[11px] text-ink-400">
                    {layout.structure.length} bloques
                  </span>
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-500">
                  {layout.blurb}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[13px] font-medium text-ink-700">Paleta</p>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.preset}
              type="button"
              // El estilo de página no se toca al cambiar de paleta: son dos
              // decisiones distintas y mezclarlas sorprende al vendedor.
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

      <Field label="Tipografía del nombre del producto">
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
                onChange={(event) => set({ [color.key]: event.target.value } as Partial<LandingTheme>)}
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
