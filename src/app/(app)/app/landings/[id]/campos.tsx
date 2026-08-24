"use client";

import type { SectionData } from "@/components/landing/blocks";
import { Alert } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";


/**
 * Los campos de cada bloque.
 *
 * Están declarados como datos y no como JSX repetido: sumar un campo a un
 * bloque es agregar una línea acá. Así no hay forma de que un bloque termine
 * con texto que solo se pueda cambiar tocando el código.
 */

interface TextField {
  key: string;
  label: string;
  multiline?: boolean;
  hint?: string;
}

const TEXT_FIELDS: Record<string, TextField[]> = {
  hero: [
    { key: "eyebrow", label: "Etiqueta de arriba", hint: "Para quién es, en mayúsculas." },
    { key: "headline", label: "Titular", multiline: true, hint: "Enter corta la línea." },
    { key: "subheadline", label: "Subtítulo", multiline: true },
    { key: "image", label: "URL de la imagen", hint: "Se completa sola con la portada de tu producto. Pegá otra si querés cambiarla." },
    { key: "image_alt", label: "Qué muestra la imagen" },
    { key: "cta", label: "Texto del botón" },
    { key: "social", label: "Frase de respaldo" },
    { key: "trust", label: "Línea de confianza", hint: "Garantía, forma de pago, entrega." },
  ],
  problems: [
    { key: "title", label: "Título" },
    { key: "subtitle", label: "Segunda línea del título" },
    { key: "closing", label: "Cierre", multiline: true },
  ],
  gallery: [
    { key: "kicker", label: "Etiqueta de arriba" },
    { key: "title", label: "Título", multiline: true },
    { key: "subtitle", label: "Subtítulo", multiline: true },
    { key: "featured_url", label: "URL de la imagen principal" },
    { key: "featured_alt", label: "Qué muestra la imagen principal" },
    { key: "video_url", label: "URL del video", hint: "Opcional. Vacío = no se muestra." },
    { key: "note", label: "Nota al pie" },
  ],
  solution: [
    { key: "badge", label: "Etiqueta de arriba" },
    { key: "image", label: "URL de la imagen", hint: "Se completa sola con la portada de tu producto. Pegá otra si querés cambiarla." },
    { key: "image_alt", label: "Qué muestra la imagen" },
    { key: "title", label: "Nombre del producto" },
    { key: "subtitle", label: "La promesa en una línea" },
    { key: "text", label: "Descripción", multiline: true },
    { key: "highlight", label: "Frase destacada" },
  ],
  modules: [
    { key: "kicker", label: "Etiqueta de arriba" },
    { key: "title", label: "Título", multiline: true },
    { key: "box_title", label: "Título de la caja" },
  ],
  bonuses: [
    { key: "kicker", label: "Etiqueta de arriba" },
    { key: "title", label: "Título" },
    { key: "footer_note", label: "Nota al pie" },
  ],
  pricing: [
    { key: "title", label: "Título de la sección", multiline: true },
    { key: "badge", label: "Etiqueta de la tarjeta" },
    { key: "image", label: "URL de la imagen", hint: "Se completa sola con la portada de tu producto. Pegá otra si querés cambiarla." },
    { key: "image_alt", label: "Qué muestra la imagen" },
    { key: "product_name", label: "Nombre del producto" },
    { key: "subtitle", label: "Qué incluye, en una línea" },
    { key: "price_label", label: "Precio mostrado" },
    { key: "compare_label", label: "Precio tachado" },
    { key: "note", label: "Nota debajo del precio" },
    { key: "cta", label: "Texto del botón" },
  ],
  testimonials: [
    { key: "kicker", label: "Etiqueta de arriba" },
    { key: "title", label: "Título", multiline: true },
    { key: "subtitle", label: "Subtítulo", multiline: true },
  ],
  guarantee: [
    { key: "title", label: "Título", multiline: true },
    { key: "text", label: "Texto", multiline: true },
    { key: "seal", label: "Sello" },
    { key: "note", label: "Nota al pie" },
  ],
  faq: [
    { key: "kicker", label: "Etiqueta de arriba" },
    { key: "title", label: "Título", multiline: true },
  ],
  cta: [
    { key: "kicker", label: "Etiqueta de arriba" },
    { key: "headline", label: "Titular", multiline: true },
    { key: "subheadline", label: "Subtítulo", multiline: true },
    { key: "image", label: "URL de la imagen", hint: "Se completa sola con la portada de tu producto. Pegá otra si querés cambiarla." },
    { key: "image_alt", label: "Qué muestra la imagen" },
    { key: "cta", label: "Texto del botón" },
    { key: "micro", label: "Línea chica debajo del botón" },
  ],
  footer: [
    { key: "brand", label: "Nombre de tu marca" },
    { key: "text", label: "Texto legal", multiline: true },
  ],
  headline: [{ key: "text", label: "Texto", multiline: true }],
  subheadline: [{ key: "text", label: "Texto", multiline: true }],
  benefits: [{ key: "title", label: "Título" }],
  features: [{ key: "title", label: "Título" }],
  comparison: [
    { key: "title", label: "Título" },
    { key: "without_title", label: "Columna sin tu producto — título" },
    { key: "with_title", label: "Columna con tu producto — título" },
  ],
  countdown: [
    { key: "title", label: "Título" },
    { key: "text", label: "Texto", multiline: true },
  ],
  social_proof: [{ key: "text", label: "Texto", multiline: true }],
  video: [
    { key: "title", label: "Título" },
    { key: "url", label: "URL del video" },
  ],
  image: [
    { key: "alt", label: "Qué muestra la imagen" },
    { key: "url", label: "URL de la imagen" },
  ],
  mockup: [
    { key: "title", label: "Título" },
    { key: "caption", label: "Epígrafe" },
  ],
  stats: [],
};

/** Campos que son una lista simple: un item por línea. */
const LINE_FIELDS: Record<string, Array<{ key: string; label: string; hint?: string }>> = {
  hero: [{ key: "pills", label: "Etiquetas cortas", hint: "Una por línea." }],
  problems: [{ key: "items", label: "Los problemas", hint: "Uno por línea." }],
  solution: [
    { key: "tags", label: "Etiquetas", hint: "Una por línea." },
    { key: "features", label: "Características", hint: "Una por línea." },
  ],
  pricing: [
    { key: "includes", label: "Qué incluye", hint: "Uno por línea." },
    { key: "trust", label: "Sellos de confianza", hint: "Uno por línea." },
  ],
  cta: [{ key: "trust", label: "Sellos de confianza", hint: "Uno por línea." }],
  footer: [{ key: "links", label: "Links del pie", hint: "Uno por línea." }],
  benefits: [{ key: "items", label: "Beneficios", hint: "Uno por línea." }],
  comparison: [
    { key: "without_items", label: "Columna sin tu producto", hint: "Uno por línea." },
    { key: "with_items", label: "Columna con tu producto", hint: "Uno por línea." },
  ],
};

/** Listas de tarjetas, cada una con sus propios campos. */
interface ObjectList {
  key: string;
  label: string;
  fields: Array<{ key: string; label: string; multiline?: boolean }>;
  empty: Record<string, string>;
}

const OBJECT_LISTS: Record<string, ObjectList[]> = {
  stats: [
    {
      key: "items",
      label: "Los números",
      fields: [
        { key: "value", label: "Número" },
        { key: "label", label: "Qué es" },
      ],
      empty: { value: "", label: "" },
    },
    {
      key: "highlights",
      label: "Puntos destacados",
      fields: [
        { key: "title", label: "Título" },
        { key: "subtitle", label: "Subtítulo" },
        { key: "text", label: "Texto", multiline: true },
      ],
      empty: { title: "", subtitle: "", text: "" },
    },
  ],
  gallery: [
    {
      key: "images",
      label: "Los ejemplos",
      fields: [
        { key: "url", label: "URL de la imagen" },
        { key: "alt", label: "Qué muestra" },
      ],
      empty: { url: "", alt: "" },
    },
  ],
  solution: [
    {
      key: "stats",
      label: "Los números",
      fields: [
        { key: "value", label: "Número" },
        { key: "label", label: "Qué es" },
      ],
      empty: { value: "", label: "" },
    },
  ],
  modules: [
    {
      key: "items",
      label: "Los módulos",
      fields: [
        { key: "title", label: "Título" },
        { key: "description", label: "Descripción", multiline: true },
      ],
      empty: { title: "", description: "" },
    },
    {
      key: "metrics",
      label: "Los números del final",
      fields: [
        { key: "value", label: "Número" },
        { key: "label", label: "Qué es" },
      ],
      empty: { value: "", label: "" },
    },
  ],
  bonuses: [
    {
      key: "items",
      label: "Los bonos",
      fields: [
        { key: "name", label: "Nombre" },
        { key: "description", label: "Descripción", multiline: true },
        { key: "badge", label: "Etiqueta" },
      ],
      empty: { name: "", description: "", badge: "INCLUIDO" },
    },
  ],
  testimonials: [
    {
      key: "items",
      label: "Los testimonios",
      fields: [
        { key: "name", label: "Nombre" },
        { key: "location", label: "De dónde es" },
        { key: "text", label: "Testimonio", multiline: true },
      ],
      empty: { name: "", location: "", text: "" },
    },
  ],
  faq: [
    {
      key: "items",
      label: "Las preguntas",
      fields: [
        { key: "question", label: "Pregunta" },
        { key: "answer", label: "Respuesta", multiline: true },
      ],
      empty: { question: "", answer: "" },
    },
  ],
  features: [
    {
      key: "items",
      label: "Los pasos",
      fields: [
        { key: "title", label: "Título" },
        { key: "description", label: "Descripción", multiline: true },
      ],
      empty: { title: "", description: "" },
    },
  ],
};

export function SectionProperties({
  section,
  onChange,
}: {
  section: SectionData;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const c = section.content;

  const text = (key: string) => (typeof c[key] === "string" ? (c[key] as string) : "");
  const arr = <T,>(key: string): T[] => (Array.isArray(c[key]) ? (c[key] as T[]) : []);

  /**
   * Los controles leen contenido que puede venir de una generación con IA o de
   * una versión anterior de la app, así que nunca asumen la forma: si donde
   * esperábamos un texto hay un objeto, sacamos el texto que se pueda en lugar
   * de mostrar "[object Object]".
   */
  const lines = (key: string) => arr<unknown>(key).map(asText).filter(Boolean).join("\n");
  const toLines = (value: string) => value.split("\n").filter((line) => line.trim());
  const cards = (key: string) =>
    arr<unknown>(key).map((item) => {
      if (!item || typeof item !== "object") return { title: asText(item) };
      return Object.fromEntries(
        Object.entries(item as Record<string, unknown>).map(([field, value]) => [
          field,
          asText(value),
        ]),
      );
    });

  return (
    <div className="flex flex-col gap-4">
      {(TEXT_FIELDS[section.type] ?? []).map((field) => (
        <Field key={field.key} label={field.label} hint={field.hint}>
          {field.multiline ? (
            <Textarea
              rows={3}
              value={text(field.key)}
              onChange={(event) => onChange({ [field.key]: event.target.value })}
            />
          ) : (
            <Input
              value={text(field.key)}
              onChange={(event) => onChange({ [field.key]: event.target.value })}
            />
          )}
        </Field>
      ))}

      {(LINE_FIELDS[section.type] ?? []).map((field) => (
        <Field key={field.key} label={field.label} hint={field.hint}>
          <Textarea
            rows={5}
            value={lines(field.key)}
            onChange={(event) => onChange({ [field.key]: toLines(event.target.value) })}
          />
        </Field>
      ))}

      {section.type === "testimonials" ? (
        <Alert tone="warning">
          Cargá solo testimonios reales de tus clientes. Inventarlos puede costarte la cuenta
          publicitaria y es ilegal en varios países.
        </Alert>
      ) : null}

      {(OBJECT_LISTS[section.type] ?? []).map((group) => (
        <Field key={group.key} label={group.label}>
          <ListEditor
            items={cards(group.key)}
            fields={group.fields}
            empty={group.empty}
            onChange={(items) =>
              onChange(
                section.type === "testimonials"
                  ? { [group.key]: items, placeholder: false }
                  : { [group.key]: items },
              )
            }
          />
        </Field>
      ))}
    </div>
  );
}

function ListEditor<T extends Record<string, string>>({
  items,
  fields,
  empty,
  onChange,
}: {
  items: T[];
  fields: Array<{ key: keyof T & string; label: string; multiline?: boolean }>;
  empty: T;
  onChange: (items: T[]) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <div key={index} className="rounded-xl border border-ink-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-400">
              Item {index + 1}
            </span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              className="rounded p-1 text-ink-400 hover:text-red-600"
              aria-label={`Quitar item ${index + 1}`}
            >
              <Icon name="trash" size={13} />
            </button>
          </div>
          <div className="flex flex-col gap-2.5">
            {fields.map((field) => (
              <Field key={field.key} label={field.label}>
                {field.multiline ? (
                  <Textarea
                    rows={2}
                    value={item[field.key] ?? ""}
                    onChange={(event) =>
                      onChange(
                        items.map((row, i) =>
                          i === index ? { ...row, [field.key]: event.target.value } : row,
                        ),
                      )
                    }
                  />
                ) : (
                  <Input
                    value={item[field.key] ?? ""}
                    onChange={(event) =>
                      onChange(
                        items.map((row, i) =>
                          i === index ? { ...row, [field.key]: event.target.value } : row,
                        ),
                      )
                    }
                  />
                )}
              </Field>
            ))}
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        icon="plus"
        onClick={() => onChange([...items, structuredClone(empty)])}
      >
        Agregar item
      </Button>
    </div>
  );
}

/** Cualquier valor, convertido al texto mas razonable que se pueda. */
function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["text", "label", "title", "name", "value", "alt"]) {
      if (typeof record[key] === "string") return record[key];
    }
  }
  return "";
}
