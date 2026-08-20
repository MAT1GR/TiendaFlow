"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { generateLandingDraftAction } from "@/app/actions/ai";
import { publishLandingAction, saveLandingSectionsAction } from "@/app/actions/funnels";
import { LandingSectionView, SECTION_LIBRARY, type SectionData } from "@/components/landing/blocks";
import { Alert, TemplateNotice } from "@/components/ui/feedback";
import { Icon, type IconName } from "@/components/ui/icon";
import {
  Badge,
  Button,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
  useToast,
} from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { LandingSectionType } from "@/lib/types";

type Device = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTH: Record<Device, string> = {
  desktop: "100%",
  tablet: "820px",
  mobile: "390px",
};

const DEVICE_ICON: Record<Device, IconName> = {
  desktop: "desktop",
  tablet: "tablet",
  mobile: "mobile",
};

export function LandingEditor({
  page,
  sections: initialSections,
  offer,
}: {
  page: {
    id: string;
    name: string;
    status: string;
    accent: string;
    seoTitle: string | null;
    seoDescription: string | null;
  };
  sections: SectionData[];
  offer: { id: string; name: string; priceLabel: string; compareLabel: string | null } | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [sections, setSections] = useState<SectionData[]>(initialSections);
  const [selectedId, setSelectedId] = useState<string | null>(initialSections[0]?.id ?? null);
  // Arranca en celular: la enorme mayoría del tráfico de infoproducto entra
  // desde Instagram o TikTok, así que esa es la vista que hay que cuidar.
  const [device, setDevice] = useState<Device>("mobile");
  const [dirty, setDirty] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiNotice, setAiNotice] = useState<{ isTemplate: boolean; warning?: string } | null>(null);

  const selected = sections.find((section) => section.id === selectedId) ?? null;

  const grouped = useMemo(() => {
    const map = new Map<string, typeof SECTION_LIBRARY>();
    for (const block of SECTION_LIBRARY) {
      const current = map.get(block.group) ?? [];
      current.push(block);
      map.set(block.group, current);
    }
    return [...map.entries()];
  }, []);

  function mutate(next: SectionData[]) {
    setSections(next);
    setDirty(true);
  }

  function addSection(type: string) {
    const block = SECTION_LIBRARY.find((item) => item.type === type);
    const section: SectionData = {
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      content: structuredClone(block?.defaults ?? {}),
    };
    mutate([...sections, section]);
    setSelectedId(section.id);
    setAddOpen(false);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    mutate(next);
  }

  function duplicate(index: number) {
    const source = sections[index];
    const copy: SectionData = {
      ...structuredClone(source),
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    const next = [...sections];
    next.splice(index + 1, 0, copy);
    mutate(next);
    setSelectedId(copy.id);
  }

  function remove(index: number) {
    const next = sections.filter((_, i) => i !== index);
    mutate(next);
    if (sections[index].id === selectedId) setSelectedId(next[0]?.id ?? null);
  }

  function updateContent(patch: Record<string, unknown>) {
    if (!selected) return;
    mutate(
      sections.map((section) =>
        section.id === selected.id
          ? { ...section, content: { ...section.content, ...patch } }
          : section,
      ),
    );
  }

  function save() {
    startTransition(async () => {
      const result = await saveLandingSectionsAction(
        page.id,
        sections.map((section) => ({
          id: section.id,
          type: section.type as LandingSectionType,
          content: section.content,
        })),
      );
      if (result.ok) {
        setDirty(false);
        toast.success("Landing guardada.");
        router.refresh();
      } else {
        toast.error("No pudimos guardar", result.error);
      }
    });
  }

  function publish() {
    startTransition(async () => {
      if (dirty) {
        const saved = await saveLandingSectionsAction(
          page.id,
          sections.map((section) => ({
            id: section.id,
            type: section.type as LandingSectionType,
            content: section.content,
          })),
        );
        if (!saved.ok) {
          toast.error("No pudimos guardar antes de publicar", saved.error);
          return;
        }
        setDirty(false);
      }
      const result = await publishLandingAction(page.id);
      if (result.ok) {
        toast.success("Landing publicada.");
        router.refresh();
      } else {
        toast.error("Todavía no podemos publicarla", result.error);
      }
    });
  }

  function generate(tone: string) {
    startTransition(async () => {
      const result = await generateLandingDraftAction(page.id, tone);
      if (!result.ok) {
        toast.error("No pudimos generar la landing", result.error);
        return;
      }
      const generated = result.data.data.sections.map((section, index) => ({
        id: `tmp-${Date.now()}-${index}`,
        type: section.type,
        content: section.content as Record<string, unknown>,
      }));
      mutate(generated);
      setSelectedId(generated[0]?.id ?? null);
      setAiNotice({ isTemplate: result.data.isTemplate, warning: result.data.warning });
      setAiOpen(false);
    });
  }

  function regenerateSection() {
    if (!selected) return;
    const block = SECTION_LIBRARY.find((item) => item.type === selected.type);
    if (!block) return;
    updateContent(structuredClone(block.defaults));
    toast.toast({
      title: "Sección restablecida",
      description: "Volvimos al contenido base de esta sección para que la reescribas.",
      tone: "info",
    });
  }

  return (
    <div className="-mx-4 -my-6 flex min-h-[calc(100dvh-3.5rem)] flex-col sm:-mx-6 lg:-mx-8">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-ink-900">
            {page.name}
            <Badge tone={page.status === "published" ? "success" : "neutral"}>
              {page.status === "published" ? "Publicada" : "Borrador"}
            </Badge>
            {dirty ? <Badge tone="warning">Sin guardar</Badge> : null}
          </p>
          {offer ? (
            <p className="text-[12px] text-ink-500">
              Oferta: {offer.name} · {offer.priceLabel}
            </p>
          ) : (
            <p className="text-[12px] text-amber-600">Esta landing no tiene oferta asociada</p>
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-xl bg-ink-100 p-1">
            {(["desktop", "tablet", "mobile"] as Device[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDevice(value)}
                aria-pressed={device === value}
                aria-label={`Vista ${value}`}
                className={cn(
                  "grid size-8 place-items-center rounded-lg transition-colors",
                  device === value ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-800",
                )}
              >
                <Icon name={DEVICE_ICON[value]} size={16} />
              </button>
            ))}
          </div>

          <Button variant="ai" size="sm" icon="sparkles" onClick={() => setAiOpen(true)}>
            Generar landing con IA
          </Button>
          <Button variant="secondary" size="sm" loading={pending} onClick={save} disabled={!dirty}>
            Guardar
          </Button>
          <Button size="sm" icon="rocket" loading={pending} onClick={publish}>
            Publicar
          </Button>
        </div>
      </div>

      {aiNotice?.isTemplate ? (
        <div className="border-b border-ink-200 bg-white px-4 py-3">
          <TemplateNotice warning={aiNotice.warning} />
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Panel izquierdo: secciones */}
        <aside className="w-full shrink-0 border-b border-ink-200 bg-white lg:w-64 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">
              Secciones
            </p>
            <Button variant="ghost" size="sm" icon="plus" onClick={() => setAddOpen(true)}>
              Agregar
            </Button>
          </div>
          <ol className="tf-scroll max-h-64 overflow-y-auto px-2 pb-3 lg:max-h-[calc(100dvh-10rem)]">
            {sections.length === 0 ? (
              <li className="px-2 py-6 text-center text-[13px] text-ink-500">
                La landing está vacía. Agregá una sección o generala con IA.
              </li>
            ) : (
              sections.map((section, index) => {
                const block = SECTION_LIBRARY.find((item) => item.type === section.type);
                return (
                  <li key={section.id}>
                    <div
                      className={cn(
                        "group flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors",
                        selectedId === section.id ? "bg-brand-50" : "hover:bg-ink-50",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(section.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <Icon
                          name={block?.icon ?? "file"}
                          size={15}
                          className={selectedId === section.id ? "text-brand-600" : "text-ink-400"}
                        />
                        <span
                          className={cn(
                            "truncate text-[13px] font-medium",
                            selectedId === section.id ? "text-brand-800" : "text-ink-700",
                          )}
                        >
                          {block?.label ?? section.type}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={() => move(index, -1)}
                          disabled={index === 0}
                          className="rounded p-0.5 text-ink-400 hover:text-ink-700 disabled:opacity-30"
                          aria-label="Subir sección"
                        >
                          <Icon name="chevronDown" size={13} className="rotate-180" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(index, 1)}
                          disabled={index === sections.length - 1}
                          className="rounded p-0.5 text-ink-400 hover:text-ink-700 disabled:opacity-30"
                          aria-label="Bajar sección"
                        >
                          <Icon name="chevronDown" size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicate(index)}
                          className="rounded p-0.5 text-ink-400 hover:text-ink-700"
                          aria-label="Duplicar sección"
                        >
                          <Icon name="copy" size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="rounded p-0.5 text-ink-400 hover:text-red-600"
                          aria-label="Eliminar sección"
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ol>
        </aside>

        {/* Preview */}
        <div className="tf-scroll min-h-0 flex-1 overflow-y-auto bg-ink-100 p-4 sm:p-6">
          <div
            className="mx-auto overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,.5)] transition-[max-width] duration-300"
            style={{ maxWidth: DEVICE_WIDTH[device] }}
          >
            {sections.length === 0 ? (
              <div className="grid min-h-64 place-items-center px-6 py-16 text-center">
                <div>
                  <Icon name="layers" size={32} className="mx-auto text-ink-300" />
                  <p className="mt-3 text-[14px] font-medium text-ink-700">
                    Tu landing todavía está vacía
                  </p>
                  <p className="mt-1 text-[13px] text-ink-500">
                    Generala con IA o agregá secciones desde el panel izquierdo.
                  </p>
                  <Button variant="ai" size="sm" icon="sparkles" className="mt-4" onClick={() => setAiOpen(true)}>
                    Generar landing con IA
                  </Button>
                </div>
              </div>
            ) : (
              sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setSelectedId(section.id)}
                  className={cn(
                    "block w-full cursor-pointer text-left outline-none transition-shadow",
                    selectedId === section.id && "ring-2 ring-inset ring-brand-500",
                  )}
                >
                  <LandingSectionView
                    section={section}
                    accent={page.accent}
                    priceLabel={offer?.priceLabel}
                    compareLabel={offer?.compareLabel ?? undefined}
                  />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Panel derecho: propiedades */}
        <aside className="w-full shrink-0 border-t border-ink-200 bg-white lg:w-80 lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">
              Propiedades
            </p>
            {selected ? (
              <Button variant="ghost" size="sm" icon="refresh" onClick={regenerateSection}>
                Regenerar sección
              </Button>
            ) : null}
          </div>

          <div className="tf-scroll max-h-[60vh] overflow-y-auto px-4 pb-5 lg:max-h-[calc(100dvh-10rem)]">
            {!selected ? (
              <p className="text-[13px] text-ink-500">
                Elegí una sección en el panel izquierdo o en la vista previa para editarla.
              </p>
            ) : (
              <SectionProperties section={selected} onChange={updateContent} />
            )}
          </div>
        </aside>
      </div>

      {/* Modal: agregar sección */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Agregar sección" size="lg">
        <div className="flex flex-col gap-5">
          {grouped.map(([group, blocks]) => (
            <div key={group}>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-400">
                {group}
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {blocks.map((block) => (
                  <button
                    key={block.type}
                    type="button"
                    onClick={() => addSection(block.type)}
                    className="flex items-center gap-2.5 rounded-xl border border-ink-200 px-3 py-2.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/50"
                  >
                    <Icon name={block.icon} size={16} className="shrink-0 text-ink-400" />
                    <span className="truncate text-[13px] font-medium text-ink-800">
                      {block.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Modal: generar con IA */}
      <AiModal open={aiOpen} onClose={() => setAiOpen(false)} onGenerate={generate} loading={pending} hasOffer={Boolean(offer)} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function SectionProperties({
  section,
  onChange,
}: {
  section: SectionData;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const c = section.content;

  const text = (key: string) => (typeof c[key] === "string" ? (c[key] as string) : "");
  const arr = <T,>(key: string): T[] => (Array.isArray(c[key]) ? (c[key] as T[]) : []);

  const simpleFields: Record<string, Array<{ key: string; label: string; multiline?: boolean }>> = {
    hero: [
      { key: "eyebrow", label: "Etiqueta superior" },
      { key: "headline", label: "Titular", multiline: true },
      { key: "subheadline", label: "Subtítulo", multiline: true },
      { key: "cta", label: "Texto del botón" },
    ],
    headline: [{ key: "text", label: "Texto", multiline: true }],
    subheadline: [{ key: "text", label: "Texto", multiline: true }],
    guarantee: [
      { key: "title", label: "Título" },
      { key: "text", label: "Texto", multiline: true },
    ],
    pricing: [
      { key: "title", label: "Título" },
      { key: "price_label", label: "Precio mostrado" },
      { key: "compare_label", label: "Precio tachado" },
      { key: "cta", label: "Texto del botón" },
    ],
    cta: [
      { key: "headline", label: "Titular" },
      { key: "cta", label: "Texto del botón" },
    ],
    countdown: [
      { key: "title", label: "Título" },
      { key: "text", label: "Texto", multiline: true },
    ],
    footer: [{ key: "text", label: "Texto", multiline: true }],
    video: [
      { key: "title", label: "Título" },
      { key: "url", label: "URL del video" },
    ],
    image: [
      { key: "alt", label: "Texto alternativo" },
      { key: "url", label: "URL de la imagen" },
    ],
    mockup: [
      { key: "title", label: "Título" },
      { key: "caption", label: "Epígrafe" },
    ],
    social_proof: [{ key: "text", label: "Texto", multiline: true }],
  };

  return (
    <div className="flex flex-col gap-4">
      {(simpleFields[section.type] ?? []).map((field) => (
        <Field key={field.key} label={field.label}>
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

      {section.type === "benefits" ? (
        <>
          <Field label="Título">
            <Input value={text("title")} onChange={(event) => onChange({ title: event.target.value })} />
          </Field>
          <Field label="Beneficios" hint="Uno por línea.">
            <Textarea
              rows={7}
              value={arr<string>("items").join("\n")}
              onChange={(event) =>
                onChange({ items: event.target.value.split("\n").filter((line) => line.trim()) })
              }
            />
          </Field>
        </>
      ) : null}

      {section.type === "features" ? (
        <>
          <Field label="Título">
            <Input value={text("title")} onChange={(event) => onChange({ title: event.target.value })} />
          </Field>
          <ListEditor
            items={arr<{ title: string; description: string }>("items")}
            fields={[
              { key: "title", label: "Título" },
              { key: "description", label: "Descripción", multiline: true },
            ]}
            empty={{ title: "", description: "" }}
            onChange={(items) => onChange({ items })}
          />
        </>
      ) : null}

      {section.type === "bonuses" ? (
        <>
          <Field label="Título">
            <Input value={text("title")} onChange={(event) => onChange({ title: event.target.value })} />
          </Field>
          <ListEditor
            items={arr<{ name: string; description: string }>("items")}
            fields={[
              { key: "name", label: "Nombre" },
              { key: "description", label: "Descripción", multiline: true },
            ]}
            empty={{ name: "", description: "" }}
            onChange={(items) => onChange({ items })}
          />
        </>
      ) : null}

      {section.type === "faq" ? (
        <>
          <Field label="Título">
            <Input value={text("title")} onChange={(event) => onChange({ title: event.target.value })} />
          </Field>
          <ListEditor
            items={arr<{ question: string; answer: string }>("items")}
            fields={[
              { key: "question", label: "Pregunta" },
              { key: "answer", label: "Respuesta", multiline: true },
            ]}
            empty={{ question: "", answer: "" }}
            onChange={(items) => onChange({ items })}
          />
        </>
      ) : null}

      {section.type === "testimonials" ? (
        <>
          <Field label="Título">
            <Input value={text("title")} onChange={(event) => onChange({ title: event.target.value })} />
          </Field>
          <Alert tone="warning">
            Cargá solo testimonios reales de tus clientes. Inventarlos puede costarte la cuenta
            publicitaria y es ilegal en varios países.
          </Alert>
          <ListEditor
            items={arr<{ name: string; text: string }>("items")}
            fields={[
              { key: "name", label: "Nombre" },
              { key: "text", label: "Testimonio", multiline: true },
            ]}
            empty={{ name: "", text: "" }}
            onChange={(items) => onChange({ items, placeholder: false })}
          />
        </>
      ) : null}

      {section.type === "comparison" ? (
        <>
          <Field label="Título">
            <Input value={text("title")} onChange={(event) => onChange({ title: event.target.value })} />
          </Field>
          <Field label="Columna con tu producto — título">
            <Input
              value={text("with_title")}
              onChange={(event) => onChange({ with_title: event.target.value })}
            />
          </Field>
          <Field label="Columna con tu producto — items" hint="Uno por línea.">
            <Textarea
              rows={4}
              value={arr<string>("with_items").join("\n")}
              onChange={(event) =>
                onChange({ with_items: event.target.value.split("\n").filter((l) => l.trim()) })
              }
            />
          </Field>
          <Field label="Columna sin tu producto — título">
            <Input
              value={text("without_title")}
              onChange={(event) => onChange({ without_title: event.target.value })}
            />
          </Field>
          <Field label="Columna sin tu producto — items" hint="Uno por línea.">
            <Textarea
              rows={4}
              value={arr<string>("without_items").join("\n")}
              onChange={(event) =>
                onChange({ without_items: event.target.value.split("\n").filter((l) => l.trim()) })
              }
            />
          </Field>
        </>
      ) : null}
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

function AiModal({
  open,
  onClose,
  onGenerate,
  loading,
  hasOffer,
}: {
  open: boolean;
  onClose: () => void;
  onGenerate: (tone: string) => void;
  loading: boolean;
  hasOffer: boolean;
}) {
  const [tone, setTone] = useState("directo");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generar landing con IA"
      description="Escribimos la página completa usando los datos de tu producto y tu oferta."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="ai" icon="sparkles" loading={loading} onClick={() => onGenerate(tone)}>
            Generar landing
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!hasOffer ? (
          <Alert tone="warning">
            Esta landing no tiene una oferta asociada, así que la generación va a ser más genérica.
            Asocialá desde los ajustes del funnel para mejores resultados.
          </Alert>
        ) : null}

        <Alert tone="warning">
          Reemplaza todas las secciones actuales. Si tenés contenido que querés conservar, copialo
          antes.
        </Alert>

        <Field label="Tono">
          <Select value={tone} onChange={(event) => setTone(event.target.value)}>
            <option value="directo">Directo y enérgico</option>
            <option value="cercano">Cercano y conversacional</option>
            <option value="profesional">Profesional y simple</option>
            <option value="inspirador">Inspirador</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
