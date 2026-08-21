"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";

import { generateLandingDraftAction } from "@/app/actions/ai";
import { publishLandingAction, saveLandingSectionsAction } from "@/app/actions/funnels";
import { LandingSectionView, SECTION_LIBRARY, type SectionData } from "@/components/landing/blocks";
import {
  applyLayout,
  LANDING_LAYOUTS,
  type LandingLayout,
} from "@/components/landing/estructuras";
import {
  DISPLAY_FONTS,
  PRESETS,
  readTheme,
  themeVars,
  type DisplayFont,
  type LandingTheme,
} from "@/components/landing/theme";
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
  blockers,
}: {
  page: {
    id: string;
    name: string;
    status: string;
    theme: unknown;
    seoTitle: string | null;
    seoDescription: string | null;
  };
  sections: SectionData[];
  offer: { id: string; name: string; priceLabel: string; compareLabel: string | null } | null;
  /** Lo que falta para poder publicar, en criollo. Vacío = se puede publicar. */
  blockers?: Array<{ label: string; href?: string; cta?: string }>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [sections, setSections] = useState<SectionData[]>(initialSections);
  const [selectedId, setSelectedId] = useState<string | null>(initialSections[0]?.id ?? null);
  /*
   * Arranca en escritorio.
   *
   * Arrancaba en mobile "porque el tráfico viene del celular", pero el editor
   * se ve en una computadora: la columna de 390px dejaba dos franjas grises
   * enormes a los costados y no se veía casi nada de la página. El botón de
   * mobile sigue ahí, a un click, y ahora sí muestra la página como se ve en
   * un teléfono de verdad.
   */
  const [device, setDevice] = useState<Device>("desktop");
  const [dirty, setDirty] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiNotice, setAiNotice] = useState<{
    isTemplate: boolean;
    warning?: string;
    cleaned?: number;
  } | null>(null);

  // El tema se edita en vivo: cambiar un color repinta la vista previa entera
  // sin guardar ni recargar, que es la única forma de elegir bien un color.
  const [theme, setTheme] = useState<LandingTheme>(() => readTheme(page.theme));
  const [panel, setPanel] = useState<"contenido" | "diseno">("contenido");

  /*
   * Los paneles se cierran.
   *
   * El protagonista de esta pantalla es la página, no los controles. Tres
   * columnas fijas dejan la página del vendedor apretada en el medio; con los
   * costados plegados, la ve casi a pantalla completa.
   */
  const [seccionesAbiertas, setSeccionesAbiertas] = useState(true);
  const [propiedadesAbiertas, setPropiedadesAbiertas] = useState(true);

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

  /*
   * El alto disponible, medido desde donde arranca el editor hasta el borde de
   * abajo de la ventana. `null` en mobile y en el primer render del servidor:
   * ahí manda la clase CSS.
   */
  const rootRef = useRef<HTMLDivElement>(null);
  const [alto, setAlto] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const escritorio = window.matchMedia("(min-width: 1024px)");
    const medir = () => {
      if (!escritorio.matches) {
        setAlto(null);
        return;
      }
      // Un piso de 480px: en una ventana muy baja es preferible que la página
      // scrollee un poco antes que dejar los tres paneles aplastados.
      setAlto(Math.max(480, window.innerHeight - el.getBoundingClientRect().top));
    };

    medir();
    window.addEventListener("resize", medir);
    escritorio.addEventListener("change", medir);
    return () => {
      window.removeEventListener("resize", medir);
      escritorio.removeEventListener("change", medir);
    };
  }, []);

  function mutate(next: SectionData[]) {
    setSections(next);
    setDirty(true);
  }

  function nuevaSeccion(type: string): SectionData {
    const block = SECTION_LIBRARY.find((item) => item.type === type);
    return {
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      content: structuredClone(block?.defaults ?? {}),
    };
  }

  function addSection(type: string) {
    const section = nuevaSeccion(type);
    mutate([...sections, section]);
    setSelectedId(section.id);
    setAddOpen(false);
  }

  /**
   * Cambia el estilo de la página.
   *
   * Reordena lo que ya hay, agrega los bloques que el estilo pide y deja al
   * final los que no contempla. Nada de lo que el vendedor escribió se pierde:
   * si el estilo nuevo no usa un bloque, ese bloque baja, no desaparece.
   */
  function aplicarEstilo(layout: LandingLayout) {
    const antes = sections.length;
    const next = applyLayout(sections, layout, nuevaSeccion);
    mutate(next);
    setTheme((current) => ({ ...current, layout: layout.id }));
    setDirty(true);

    const agregados = next.length - antes;
    toast.toast({
      title: `Estilo ${layout.label}`,
      description: agregados
        ? `Reordenamos tu página y sumamos ${agregados} ${agregados === 1 ? "bloque" : "bloques"}. Revisalos antes de publicar.`
        : "Reordenamos los bloques que ya tenías.",
      tone: "info",
    });
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
        theme,
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
          theme,
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
      setAiNotice({
        isTemplate: result.data.isTemplate,
        warning: result.data.warning,
        cleaned: result.data.cleaned,
      });
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

  /*
   * El editor ocupa exactamente lo que queda de ventana, y no un píxel más.
   *
   * Antes usaba `min-h`, así que la columna de la vista previa crecía con el
   * contenido y quien scrolleaba movía la página entera: los paneles se iban
   * para arriba y la barra de Guardar/Publicar desaparecía. Con alto fijo y
   * `overflow-hidden` en la raíz, el scroll queda adentro de cada panel.
   *
   * El alto se mide en vez de calcularse, porque el editor vive en dos lugares
   * con encabezados distintos: suelto en /app/landings y embebido adentro del
   * producto, debajo de su título y sus pestañas. Una constante en CSS acierta
   * en uno y sobra en el otro.
   *
   * `data-fullbleed` le pide al shell que suelte su columna de 1400px: los
   * paneles van pegados a los bordes de la ventana.
   *
   * En mobile nada de esto aplica: los tres paneles se apilan y lo natural es
   * que scrollee la página.
   */
  return (
    <div
      ref={rootRef}
      data-fullbleed
      style={alto ? { height: alto } : undefined}
      className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:min-h-0 lg:overflow-hidden"
    >
      {/*
        Barra superior.

        No dice "Landing Funnel X" en ningún lado: dice qué pantalla del
        recorrido está editando y de qué oferta. El nombre interno de la página
        no le sirve a nadie que no haya escrito el código.
      */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-ink-200 bg-white px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="tf-emoji text-[17px]" aria-hidden="true">
            🛍️
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-ink-900">
              Página de venta
              <Badge tone={page.status === "published" ? "success" : "neutral"}>
                {page.status === "published" ? "Publicada" : "Borrador"}
              </Badge>
              {dirty ? <Badge tone="warning">Sin guardar</Badge> : null}
            </p>
            {offer ? (
              <p className="truncate text-[12px] text-ink-500">
                {offer.name} · {offer.priceLabel}
              </p>
            ) : (
              <p className="text-[12px] text-amber-600">Todavía no tiene precio</p>
            )}
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <VistaSwitch device={device} onChange={setDevice} />

          {/*
            El estilo vive acá arriba y no solo adentro de la pestaña "Diseño":
            es la decisión más grande de toda la pantalla y estaba escondida a
            dos clicks.
          */}
          <label className="flex items-center gap-2 rounded-xl bg-ink-100 py-1 pl-2.5 pr-1">
            <span className="tf-emoji text-[13px]" aria-hidden="true">
              🎨
            </span>
            <select
              value={theme.layout}
              aria-label="Estilo de la página"
              onChange={(event) => {
                const elegido = LANDING_LAYOUTS.find((item) => item.id === event.target.value);
                if (elegido) aplicarEstilo(elegido);
              }}
              className="h-8 rounded-lg border-0 bg-white px-2 text-[13px] font-medium text-ink-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              {LANDING_LAYOUTS.map((layout) => (
                <option key={layout.id} value={layout.id}>
                  {layout.label}
                </option>
              ))}
            </select>
          </label>

          <Button variant="ai" size="sm" icon="sparkles" onClick={() => setAiOpen(true)}>
            Mejorar con IA
          </Button>
          <Button variant="secondary" size="sm" loading={pending} onClick={save} disabled={!dirty}>
            Guardar
          </Button>
          <Button size="sm" icon="rocket" loading={pending} onClick={publish}>
            Publicar
          </Button>
        </div>
      </div>

      {/*
        Lo que falta para publicar, dicho antes de que lo intente.
        Un botón que falla cuando lo apretás enseña peor que una lista que se ve.
      */}
      {blockers?.length ? (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <p className="text-[13px] font-semibold text-amber-900">
              Tu página todavía no puede publicarse
            </p>
            {blockers.map((blocker) => (
              <span
                key={blocker.label}
                className="flex items-center gap-1.5 text-[12.5px] text-amber-800"
              >
                <span aria-hidden="true">🟡</span>
                {blocker.label}
                {blocker.href ? (
                  <Link
                    href={blocker.href}
                    className="font-semibold underline underline-offset-2 hover:text-amber-950"
                  >
                    {blocker.cta ?? "Resolver"} →
                  </Link>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {aiNotice?.isTemplate ? (
        <div className="border-b border-ink-200 bg-white px-4 py-3">
          <TemplateNotice warning={aiNotice.warning} />
        </div>
      ) : null}

      {/* Si la IA afirmó algo que nadie puede comprobar, lo decimos en vez de
          arreglarlo a escondidas: el vendedor tiene que saber qué se sacó. */}
      {aiNotice?.cleaned ? (
        <div className="border-b border-ink-200 bg-white px-4 py-3">
          <Alert tone="warning" title="Sacamos algunas frases">
            La IA escribió {aiNotice.cleaned}{" "}
            {aiNotice.cleaned === 1 ? "frase que afirmaba" : "frases que afirmaban"} algo que no
            podemos comprobar (cantidad de clientes, porcentajes de éxito). Las reemplazamos por
            texto neutro. Si tenés los números reales, escribilos vos.
          </Alert>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Panel izquierdo: las secciones de la página */}
        <aside
          className={cn(
            "flex w-full shrink-0 flex-col border-b border-ink-200 bg-white lg:h-full lg:border-b-0 lg:border-r",
            seccionesAbiertas ? "lg:w-60" : "lg:w-11",
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-1 px-2 py-2.5 lg:px-3">
            {seccionesAbiertas ? (
              <p className="flex items-center gap-1.5 pl-1 text-[12px] font-semibold uppercase tracking-wider text-ink-400">
                <span className="tf-emoji text-[13px]" aria-hidden="true">
                  🧱
                </span>
                Secciones
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setSeccionesAbiertas((abierto) => !abierto)}
              aria-label={seccionesAbiertas ? "Ocultar secciones" : "Mostrar secciones"}
              title={seccionesAbiertas ? "Ocultar secciones" : "Mostrar secciones"}
              className="grid size-7 shrink-0 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-800"
            >
              <Icon
                name="chevronLeft"
                size={15}
                className={seccionesAbiertas ? undefined : "rotate-180"}
              />
            </button>
          </div>
          <ol
            className={cn(
              "tf-scroll max-h-64 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3 lg:max-h-none",
              !seccionesAbiertas && "hidden lg:hidden",
            )}
          >
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
                        <span className="tf-emoji shrink-0 text-[14px]" aria-hidden="true">
                          {block?.emoji ?? "📄"}
                        </span>
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

          {seccionesAbiertas ? (
            <div className="shrink-0 border-t border-ink-100 p-2">
              <Button
                variant="secondary"
                size="sm"
                icon="plus"
                className="w-full"
                onClick={() => setAddOpen(true)}
              >
                Agregar sección
              </Button>
            </div>
          ) : null}
        </aside>

        {/* Preview */}
        <div className="tf-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain bg-ink-100 p-4 sm:p-6">
          {/*
            `@container` hace que la vista previa sea una vista previa de
            verdad: los bloques miden esta caja, no la ventana. Sin esto,
            elegir "mobile" achicaba la columna pero los textos seguían
            calculando su tamaño contra una pantalla de 1600px, y quedaba un
            titular gigante adentro de un teléfono.
          */}
          <div
            className="@container mx-auto overflow-hidden rounded-2xl shadow-[0_20px_60px_-30px_rgba(15,23,42,.5)] transition-[max-width] duration-300"
            style={{ ...themeVars(theme), maxWidth: DEVICE_WIDTH[device] }}
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
                    priceLabel={offer?.priceLabel}
                    compareLabel={offer?.compareLabel ?? undefined}
                  />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Panel derecho: el contenido del bloque, o el diseño de toda la página */}
        <aside
          className={cn(
            "flex w-full shrink-0 flex-col border-t border-ink-200 bg-white lg:h-full lg:border-l lg:border-t-0",
            propiedadesAbiertas ? "lg:w-80" : "lg:w-11",
          )}
        >
          {/* El botón de plegar y las pestañas comparten fila: una barra sola
              con una flecha adentro era una fila entera gastada en un icono. */}
          <div className="flex shrink-0 items-center gap-1 border-b border-ink-100 px-2 py-2.5 lg:px-2.5">
            <button
              type="button"
              onClick={() => setPropiedadesAbiertas((abierto) => !abierto)}
              aria-label={propiedadesAbiertas ? "Ocultar el panel" : "Mostrar el panel"}
              title={propiedadesAbiertas ? "Ocultar el panel" : "Mostrar el panel"}
              className="grid size-7 shrink-0 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-800"
            >
              <Icon
                name="chevronRight"
                size={15}
                className={propiedadesAbiertas ? undefined : "rotate-180"}
              />
            </button>

            {propiedadesAbiertas ? (
              <>
                {(
                  [
                    ["contenido", "Contenido"],
                    ["diseno", "Diseño"],
                  ] as const
                ).map(([valor, etiqueta]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => setPanel(valor)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                      panel === valor
                        ? "bg-brand-50 text-brand-700"
                        : "text-ink-500 hover:bg-ink-100 hover:text-ink-800",
                    )}
                  >
                    {etiqueta}
                  </button>
                ))}

                {panel === "contenido" && selected ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="refresh"
                    className="ml-auto"
                    onClick={regenerateSection}
                  >
                    Restablecer
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>

          <div
            className={cn(
              "tf-scroll max-h-[60vh] min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 lg:max-h-none",
              !propiedadesAbiertas && "hidden",
            )}
          >
            {panel === "diseno" ? (
              <DesignPanel
                theme={theme}
                onChange={(next) => {
                  setTheme(next);
                  setDirty(true);
                }}
                onLayout={aplicarEstilo}
              />
            ) : !selected ? (
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
                    <span className="tf-emoji shrink-0 text-[15px]" aria-hidden="true">
                      {block.emoji}
                    </span>
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


/* -------------------------------------------------------------------------- */
/* Diseño                                                                      */
/* -------------------------------------------------------------------------- */

/** Los colores que el vendedor puede tocar, en el orden en que importan. */
const COLORES: Array<{ key: keyof LandingTheme; label: string; hint?: string }> = [
  { key: "accent", label: "Color principal", hint: "Botones, números y etiquetas." },
  { key: "bg", label: "Fondo de la página" },
  { key: "surface", label: "Fondo de las tarjetas" },
  { key: "text", label: "Texto" },
  { key: "muted", label: "Texto secundario" },
];

/**
 * El panel de diseño.
 *
 * Tres decisiones, de la más grande a la más chica: qué estilo de página
 * (qué bloques y en qué orden), qué paleta, y después cada color suelto para
 * quien quiera hilar fino.
 *
 * Tocar cualquier cosa acá repinta la vista previa al instante: elegir un color
 * mirando un cuadradito no sirve, hay que verlo aplicado sobre la página real.
 */
/**
 * Escritorio o celular, con la palabra escrita.
 *
 * Eran tres iconitos grises indistinguibles y no se entendía cuál estaba
 * activo. La tablet se fue: nadie compra un infoproducto desde una tablet, y
 * cada opción de más es una decisión que le pedimos al vendedor sin que le
 * sirva para nada.
 */
function VistaSwitch({
  device,
  onChange,
}: {
  device: Device;
  onChange: (device: Device) => void;
}) {
  const opciones: Array<{ value: Device; label: string; icon: IconName }> = [
    { value: "desktop", label: "Escritorio", icon: "desktop" },
    { value: "mobile", label: "Celular", icon: "mobile" },
  ];

  return (
    <div className="flex items-center gap-0.5 rounded-xl bg-ink-100 p-1">
      {opciones.map((opcion) => (
        <button
          key={opcion.value}
          type="button"
          onClick={() => onChange(opcion.value)}
          aria-pressed={device === opcion.value}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
            device === opcion.value
              ? "bg-white text-ink-900 shadow-sm"
              : "text-ink-500 hover:text-ink-800",
          )}
        >
          <Icon name={opcion.icon} size={15} />
          {opcion.label}
        </button>
      ))}
    </div>
  );
}

function DesignPanel({
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
    { key: "featured_alt", label: "Qué muestra la imagen principal" },
    { key: "video_url", label: "URL del video", hint: "Opcional. Vacío = no se muestra." },
    { key: "note", label: "Nota al pie" },
  ],
  solution: [
    { key: "badge", label: "Etiqueta de arriba" },
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
      fields: [{ key: "alt", label: "Qué muestra" }],
      empty: { alt: "" },
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
