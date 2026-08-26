"use client";

import type { SectionData } from "@/components/landing/blocks";
import { Alert } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";


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
  /**
   * Cómo se edita el campo.
   *
   * `datetime` para la fecha de cierre de una oferta —tipearla a mano en un
   * campo de texto es la forma más segura de que quede mal escrita y el
   * contador no arranque nunca—, `toggle` para los sí/no, y `select` para los
   * campos que solo aceptan un puñado de valores.
   */
  type?: "datetime" | "toggle" | "select";
  options?: Array<{ value: string; label: string }>;
}

/*
 * Los campos de las trece secciones de la estructura, en orden.
 *
 * Debajo quedan los de bloques de páginas armadas con versiones anteriores de
 * la app: no se borran porque esas páginas siguen publicadas y su contenido
 * tiene que poder editarse.
 */
const TEXT_FIELDS: Record<string, TextField[]> = {
  announcement_bar: [
    { key: "message", label: "El aviso", hint: "Tiene que ser cierto. Sin cupos inventados." },
    {
      key: "deadline",
      label: "Cuándo cierra la oferta",
      type: "datetime",
      hint: "Sin fecha, la barra sale sin reloj. No pongas una que no vaya a cumplirse.",
    },
    { key: "timer_label", label: "Texto antes del reloj" },
    { key: "expired", label: "Qué decir cuando ya cerró" },
  ],
  hero: [
    { key: "headline", label: "Titular", multiline: true, hint: "10 a 13 palabras. Enter corta la línea." },
    { key: "subheadline", label: "Subtítulo", multiline: true, hint: "15 a 20 palabras." },
    { key: "image", label: "URL de la portada", hint: "Se completa sola con la portada de tu producto." },
    { key: "image_alt", label: "Qué muestra la portada" },
    { key: "ebook_label", label: "Etiqueta antes del nombre", hint: 'Por ejemplo: "EBOOK:". Vacío = no sale.' },
    { key: "product_name", label: "Nombre del producto" },
    {
      key: "rating_value",
      label: "Puntaje",
      hint: "Solo si es real y lo podés mostrar. Vacío = no salen las estrellas.",
    },
    { key: "rating_note", label: "Qué hay al lado del puntaje", hint: 'Por ejemplo: "500+ ventas".' },
    { key: "urgency_text", label: "Etiqueta de arriba de la tarjeta" },
    {
      key: "savings",
      label: "Cuánto se ahorra",
      hint: "Escribilo vos con tus números reales. Vacío = no sale.",
    },
    {
      key: "slots_note",
      label: "Cupos a este precio",
      hint: "Solo si de verdad limitás la cantidad. Vacío = no sale.",
    },
    { key: "deadline", label: "Cuándo cierra la oferta", type: "datetime" },
    { key: "timer_label", label: "Texto antes del reloj" },
    { key: "expired", label: "Qué decir cuando ya cerró" },
    { key: "cta", label: "Texto del botón" },
    { key: "viewers_note", label: "Texto después del número de visitantes" },
  ],
  bonuses: [
    { key: "kicker", label: "Etiqueta de arriba" },
    { key: "title", label: "Título", multiline: true },
    { key: "subtitle", label: "Subtítulo", multiline: true },
    { key: "total_label", label: "Texto antes del valor total" },
    {
      key: "total_value",
      label: "Valor total de los bonos",
      hint: "La suma de los valores de abajo. Vacío = no sale la línea.",
    },
  ],
  benefits: [
    { key: "title", label: "Título" },
    { key: "subtitle", label: "Subtítulo" },
  ],
  problems: [
    { key: "title", label: "Título" },
    { key: "subtitle", label: "Subtítulo", multiline: true },
    { key: "closing", label: "Cierre", multiline: true },
  ],
  social_proof: [
    { key: "kicker", label: "Etiqueta de arriba" },
    { key: "title", label: "Título", multiline: true },
    { key: "question", label: "La pregunta que abre el chat" },
    { key: "closing_reply", label: "La respuesta que cierra el chat" },
  ],
  pricing: [
    { key: "title", label: "Título", multiline: true },
    { key: "subtitle", label: "Subtítulo", multiline: true },
    { key: "total_label", label: "Texto antes del valor de lista" },
    { key: "total_value", label: "Valor total regular", hint: "Se completa solo con el precio tachado de tu oferta." },
    { key: "today_label", label: "Etiqueta del precio de hoy" },
    { key: "note", label: "Nota debajo del precio" },
    { key: "cta", label: "Texto del botón" },
    { key: "savings", label: "Cuánto se ahorra", hint: "Con tus números reales. Vacío = no sale." },
    { key: "trust_note", label: "Línea de confianza del final" },
  ],
  features: [
    { key: "title", label: "Título" },
    { key: "subtitle", label: "Subtítulo" },
  ],
  guarantee: [
    { key: "title", label: "Título", multiline: true },
    { key: "text", label: "Texto", multiline: true, hint: "Dos frases: qué puede hacer y qué le devolvés." },
    { key: "seal", label: "Sello" },
  ],
  faq: [
    { key: "title", label: "Título" },
    { key: "subtitle", label: "Subtítulo" },
  ],
  cta: [
    { key: "headline", label: "Titular", multiline: true, hint: "9 a 13 palabras." },
    { key: "subheadline", label: "Subtítulo", multiline: true },
    { key: "bonus_note", label: "Texto antes de los bonos" },
    { key: "savings", label: "Cuánto se ahorra", hint: "Con tus números reales. Vacío = no sale." },
    { key: "cta", label: "Texto del botón" },
  ],
  footer: [
    { key: "brand", label: "Nombre de tu marca" },
    { key: "text", label: "Texto legal", multiline: true },
  ],
  sticky_cta: [
    { key: "timer_label", label: "Texto antes del reloj" },
    { key: "deadline", label: "Cuándo cierra la oferta", type: "datetime" },
    { key: "expired", label: "Qué decir cuando ya cerró" },
    { key: "pack_label", label: "Qué incluye, en corto", hint: 'Por ejemplo: "EBOOK + 2 BONOS".' },
    { key: "cta", label: "Texto del botón" },
  ],

  /* --- Bloques de páginas armadas con versiones anteriores --- */

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
  para_vos_si: [
    { key: "title", label: "Título" },
    { key: "subtitle", label: "Subtítulo", multiline: true },
  ],
  headline: [{ key: "text", label: "Texto", multiline: true }],
  subheadline: [{ key: "text", label: "Texto", multiline: true }],
  comparison: [
    { key: "title", label: "Título" },
    { key: "without_title", label: "Columna sin tu producto — título" },
    { key: "with_title", label: "Columna con tu producto — título" },
  ],
  vas_a_lograr: [
    { key: "title", label: "Título", hint: "Poné el plazo real: \"En 30 días vas a lograr…\"." },
    { key: "subtitle", label: "Subtítulo", multiline: true },
  ],
  live_purchases: [
    { key: "title", label: "Título" },
    {
      key: "empty_note",
      label: "Qué decir mientras no haya ventas",
      multiline: true,
      hint: "Solo lo ves vos acá. En tu página el bloque no aparece hasta tu primera venta.",
    },
  ],
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

  /* --- Los bloques de las plantillas maestras --- */

  pack: [
    { key: "kicker", label: "Etiqueta de arriba" },
    { key: "title", label: "Título", multiline: true },
    { key: "subtitle", label: "Subtítulo", multiline: true },
    { key: "head", label: "Título de la tabla" },
    { key: "bonus_intro", label: "Línea que separa los bonos" },
    { key: "total_label", label: "Etiqueta del total" },
    {
      key: "total_value",
      label: "Valor de todo el pack",
      hint: "La suma de las filas. Tiene que ser un precio que hayas cobrado alguna vez.",
    },
    { key: "save_note", label: "Cuánto se ahorra" },
    { key: "now_label", label: "Etiqueta del precio de hoy" },
    { key: "cta", label: "Texto del botón" },
    { key: "cta_sub", label: "Línea chica dentro del botón" },
  ],
};

/** Campos que son una lista simple: un item por línea. */
const LINE_FIELDS: Record<string, Array<{ key: string; label: string; hint?: string }>> = {
  hero: [{ key: "trust", label: "Sellos debajo del botón", hint: "Uno por línea. Van tres." }],
  cta: [{ key: "trust", label: "Sellos debajo del botón", hint: "Uno por línea." }],

  /* --- Bloques de páginas armadas con versiones anteriores --- */

  solution: [
    { key: "tags", label: "Etiquetas", hint: "Una por línea." },
    { key: "features", label: "Características", hint: "Una por línea." },
  ],
  comparison: [
    { key: "without_items", label: "Columna sin tu producto", hint: "Uno por línea." },
    { key: "with_items", label: "Columna con tu producto", hint: "Uno por línea." },
  ],
};

/** Listas de tarjetas, cada una con sus propios campos. */
interface ObjectList {
  key: string;
  label: string;
  fields: Array<{ key: string; label: string; multiline?: boolean; toggle?: boolean }>;
  empty: Record<string, string>;
  hint?: string;
}

const OBJECT_LISTS: Record<string, ObjectList[]> = {
  hero: [
    {
      key: "bonuses",
      label: "Los bonos que se ven en el encabezado",
      hint: "Los mismos que abajo, en corto. El precio tachado es opcional.",
      fields: [
        { key: "name", label: "Nombre del bono" },
        { key: "value_before", label: "Precio tachado" },
        { key: "value", label: "Qué dice al lado" },
      ],
      empty: { name: "", value_before: "", value: "GRATIS" },
    },
  ],
  bonuses: [
    {
      key: "items",
      label: "Los bonos",
      hint: "La descripción va en dos frases: qué es y para qué le sirve.",
      fields: [
        { key: "name", label: "Nombre" },
        { key: "description", label: "Descripción", multiline: true },
        { key: "value", label: "Cuánto vale", },
      ],
      empty: { name: "", description: "", value: "" },
    },
  ],
  benefits: [
    {
      key: "items",
      label: "Qué hay adentro",
      hint: "Van cuatro. Cada descripción, dos frases.",
      fields: [
        { key: "emoji", label: "Emoji" },
        { key: "title", label: "Título" },
        { key: "description", label: "Descripción", multiline: true },
      ],
      empty: { emoji: "", title: "", description: "" },
    },
  ],
  problems: [
    {
      key: "items",
      label: "Los problemas",
      hint: "Van cuatro, escritos como los pensaría la persona.",
      fields: [
        { key: "title", label: "La situación" },
        { key: "description", label: "En qué termina y por qué", multiline: true },
      ],
      empty: { title: "", description: "" },
    },
  ],
  social_proof: [
    {
      key: "items",
      label: "Los mensajes",
      hint: "Solo mensajes reales que hayas recibido, tal como te llegaron.",
      fields: [
        { key: "name", label: "Quién lo escribió" },
        { key: "status", label: "Qué dice debajo del nombre" },
        { key: "text", label: "El mensaje", multiline: true },
      ],
      empty: { name: "", status: "en línea", text: "" },
    },
    {
      key: "stats",
      label: "Los números del final",
      hint: "Solo números que puedas respaldar.",
      fields: [
        { key: "value", label: "Número" },
        { key: "label", label: "Qué es" },
      ],
      empty: { value: "", label: "" },
    },
  ],
  pricing: [
    {
      key: "items",
      label: "Todo lo que entra",
      hint: "Se completa solo con tu producto, tus bonos y tu garantía.",
      fields: [
        { key: "name", label: "Qué es" },
        { key: "value", label: "Cuánto vale" },
      ],
      empty: { name: "", value: "GRATIS" },
    },
  ],
  features: [
    {
      key: "items",
      label: "Los pasos",
      hint: "Van tres. Cada uno, una frase.",
      fields: [
        { key: "title", label: "Título" },
        { key: "description", label: "Qué hace en ese paso", multiline: true },
      ],
      empty: { title: "", description: "" },
    },
  ],
  faq: [
    {
      key: "items",
      label: "Las preguntas",
      hint: "Van cinco: las que frenan la compra, no las decorativas.",
      fields: [
        { key: "question", label: "Pregunta" },
        { key: "answer", label: "Respuesta", multiline: true },
      ],
      empty: { question: "", answer: "" },
    },
  ],
  cta: [
    {
      key: "bonuses",
      label: "Los bonos que se repiten al final",
      fields: [
        { key: "name", label: "Nombre del bono" },
        { key: "value", label: "Qué dice al lado" },
      ],
      empty: { name: "", value: "GRATIS" },
    },
  ],
  footer: [
    {
      key: "legal",
      label: "Los legales",
      hint: "Se abren y cierran dentro de la página. Un párrafo por línea.",
      fields: [
        { key: "title", label: "Título" },
        { key: "text", label: "Texto", multiline: true },
      ],
      empty: { title: "", text: "" },
    },
  ],

  /* --- Bloques de páginas armadas con versiones anteriores --- */

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
  para_vos_si: [
    {
      key: "items",
      label: "Los ítems",
      fields: [
        { key: "line1", label: "La situación + lo que ya intentó" },
        { key: "line2", label: "Por qué le pasa y en qué termina", multiline: true },
      ],
      empty: { line1: "", line2: "" },
    },
  ],
  vas_a_lograr: [
    {
      key: "items",
      label: "Los ítems",
      fields: [
        { key: "line1", label: "La acción + el resultado" },
        { key: "line2", label: "Sin qué dolor y con qué beneficio", multiline: true },
      ],
      empty: { line1: "", line2: "" },
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
      {(TEXT_FIELDS[section.type] ?? []).map((field) => {
        /*
         * Los sí/no se guardan como texto, no como booleano.
         *
         * El contenido de un bloque es JSON que puede venir de una generación
         * con IA, y un modelo devuelve tanto `true` como `"si"` como `"sí"`.
         * Con un solo tipo —texto vacío o no vacío— los tres casos caen del
         * lado correcto y el renderizador no tiene que adivinar.
         */
        if (field.type === "toggle") {
          return (
            <label
              key={field.key}
              className="flex items-start gap-2.5 rounded-xl border border-ink-200 p-3"
            >
              <input
                type="checkbox"
                checked={Boolean(text(field.key))}
                onChange={(event) => onChange({ [field.key]: event.target.checked ? "si" : "" })}
                className="mt-0.5 size-4 accent-brand-600"
              />
              <span>
                <span className="block text-[13px] font-medium text-ink-800">{field.label}</span>
                {field.hint ? (
                  <span className="block text-[11.5px] text-ink-500">{field.hint}</span>
                ) : null}
              </span>
            </label>
          );
        }

        return (
          <Field key={field.key} label={field.label} hint={field.hint}>
            {field.type === "select" ? (
              <Select
                value={text(field.key)}
                onChange={(event) => onChange({ [field.key]: event.target.value })}
              >
                {(field.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            ) : field.type === "datetime" ? (
              <Input
                type="datetime-local"
                value={text(field.key)}
                onChange={(event) => onChange({ [field.key]: event.target.value })}
              />
            ) : field.multiline ? (
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
        );
      })}

      {(LINE_FIELDS[section.type] ?? []).map((field) => (
        <Field key={field.key} label={field.label} hint={field.hint}>
          <Textarea
            rows={5}
            value={lines(field.key)}
            onChange={(event) => onChange({ [field.key]: toLines(event.target.value) })}
          />
        </Field>
      ))}

      {section.type === "social_proof" ? (
        <Alert tone="warning">
          Cargá solo testimonios reales de tus clientes. Inventarlos puede costarte la cuenta
          publicitaria y es ilegal en varios países.
        </Alert>
      ) : null}

      {(OBJECT_LISTS[section.type] ?? []).map((group) => (
        <Field key={group.key} label={group.label} hint={group.hint}>
          <ListEditor
            items={cards(group.key)}
            fields={group.fields}
            empty={group.empty}
            onChange={(items) =>
              onChange(
                section.type === "social_proof"
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
  fields: Array<{ key: keyof T & string; label: string; multiline?: boolean; toggle?: boolean }>;
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
            {fields.map((field) =>
              field.toggle ? (
                <label key={field.key} className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={Boolean(item[field.key])}
                    onChange={(event) =>
                      onChange(
                        items.map((row, i) =>
                          i === index ? { ...row, [field.key]: event.target.checked ? "si" : "" } : row,
                        ),
                      )
                    }
                    className="size-4 accent-brand-600"
                  />
                  <span className="text-[12.5px] font-medium text-ink-700">{field.label}</span>
                </label>
              ) : (
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
              ),
            )}
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
