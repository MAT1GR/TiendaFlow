"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";

import { generateLandingDraftAction } from "@/app/actions/ai";
import {
  publishLandingAction,
  saveLandingSectionsAction,
  type LandingPublishResult,
} from "@/app/actions/funnels";
import { SectionProperties } from "@/app/(app)/app/landings/[id]/campos";
import { DesignPanel } from "@/app/(app)/app/landings/[id]/diseno";
import { AiModal, type LandingBrief } from "@/app/(app)/app/landings/[id]/ia";
import { useAiProgress } from "@/components/app/ai-progress";
import { PantallaSelector } from "@/components/app/experience-steps";
import { FlowContinue, type FlowNext } from "@/components/app/flow-continue";
import { LandingSectionView, SECTION_LIBRARY, type SectionData } from "@/components/landing/blocks";
import { LANDING_LAYOUT, applyLayout, type LandingLayout } from "@/components/landing/estructuras";
import { findPreset, readTheme, themeVars, type LandingTheme } from "@/components/landing/theme";
import { Alert, TemplateNotice } from "@/components/ui/feedback";
import { Icon, type IconName } from "@/components/ui/icon";
import { Badge, Button, Drawer, LinkButton, Modal, useToast } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { LandingSectionType } from "@/lib/types";

/**
 * El constructor de la página de venta.
 *
 * Tres columnas en computadora —las secciones, la página, lo que estás
 * editando— y una sola cosa por vez en celular. Esa asimetría es a propósito:
 * en una pantalla de 1400px esconder los controles obliga a abrir y cerrar
 * paneles todo el tiempo, y en una de 390px mostrarlos todos juntos no deja
 * ver nada. Hacer responsive el layout de escritorio da lo peor de los dos.
 *
 * El protagonista siempre es la página, no los controles.
 */

type Device = "mobile" | "desktop";

export function LandingEditor({
  page,
  sections: initialSections,
  offer,
  brief,
  backHref,
  productId,
  next,
  cover,
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
  /** Lo que ya cargó del producto, para precargar el formulario de la IA. */
  brief?: Partial<LandingBrief>;
  /** Adónde vuelve la flecha de arriba a la izquierda. */
  backHref?: { href: string; label: string };
  /**
   * Con esto la barra muestra el selector de pantallas del recorrido. Va vacío
   * cuando el editor se abre suelto, fuera del espacio de trabajo de un
   * producto: ahí no hay checkout ni página de gracias adónde saltar.
   */
  productId?: string;
  /** Lo que sigue después de la página. Lo calcula el servidor con el recorrido. */
  next?: FlowNext | null;
  /** La portada del producto, para avisar cuando falta antes de generar. */
  cover?: { url: string | null; href: string };
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const ai = useAiProgress();
  const [publishResult, setPublishResult] = useState<LandingPublishResult | null>(null);

  const [sections, setSections] = useState<SectionData[]>(initialSections);
  const [selectedId, setSelectedId] = useState<string | null>(initialSections[0]?.id ?? null);

  /*
   * Arranca en celular.
   *
   * La página que está armando se va a ver, casi siempre, en un teléfono: el
   * tráfico llega de Instagram, de TikTok, de un link mandado por WhatsApp. Si
   * el editor abre en escritorio, el vendedor pasa una hora acomodando una
   * versión de su página que casi nadie va a ver, y la que sí ven la mira
   * recién al final. Escritorio sigue estando a un click.
   */
  const [device, setDevice] = useState<Device>("mobile");
  const [dirty, setDirty] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [disenoOpen, setDisenoOpen] = useState(false);
  /* En celular no hay tres paneles: hay una pantalla y dos hojas que suben. */
  const [hoja, setHoja] = useState<"secciones" | "editar" | null>(null);
  const [aiNotice, setAiNotice] = useState<{
    isTemplate: boolean;
    warning?: string;
    cleaned?: number;
  } | null>(null);

  // El tema se edita en vivo: cambiar un color repinta la vista previa entera
  // sin guardar ni recargar, que es la única forma de elegir bien un color.
  const [theme, setTheme] = useState<LandingTheme>(() => readTheme(page.theme));

  /*
   * Cuántas secciones de la estructura no están en la página.
   *
   * Una página creada con este editor las tiene todas desde el minuto cero; las
   * que faltan son de páginas armadas antes de que la estructura fuera única.
   * El panel de diseño lo usa para ofrecer completarlas, y cuando no falta
   * ninguna no dice nada: un aviso permanente que no se puede resolver es ruido.
   */
  const faltantes = LANDING_LAYOUT.structure.filter(
    (type) => !sections.some((section) => section.type === type),
  ).length;

  const selected = sections.find((section) => section.id === selectedId) ?? null;
  const selectedBlock = selected
    ? SECTION_LIBRARY.find((item) => item.type === selected.type)
    : null;

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
   * abajo de la ventana. `null` en celular y en el primer render del servidor:
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
    const content = structuredClone(block?.defaults ?? {}) as Record<string, unknown>;

    /*
     * Un bloque nuevo con hueco de imagen nace con la portada que ya usa el
     * resto de la página. Es la misma imagen en todos lados: hacérsela pegar
     * de nuevo cada vez que suma una sección sería pedirle que copie una URL
     * larguísima desde otro bloque.
     */
    if ("image" in content && !content.image) {
      const conPortada = sections.find(
        (section) => typeof section.content.image === "string" && section.content.image,
      );
      if (conPortada) {
        content.image = conPortada.content.image;
        content.image_alt = conPortada.content.image_alt ?? content.image_alt;
      }
    }

    return {
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      content,
    };
  }

  function addSection(type: string) {
    const section = nuevaSeccion(type);
    mutate([...sections, section]);
    setSelectedId(section.id);
    setAddOpen(false);
  }

  /**
   * Cambia el estilo o la plantilla de la página.
   *
   * Reordena lo que ya hay, agrega los bloques que pide y deja al final los que
   * no contempla. Nada de lo que el vendedor escribió se pierde: si el estilo
   * nuevo no usa un bloque, ese bloque baja, no desaparece.
   *
   * Cuando es una plantilla —y no solo un orden— viene además con su paleta,
   * su tipografía y su botón. Es a propósito: la mitad de lo que hace
   * reconocible a una página de venta no es qué bloques tiene sino cómo se ven,
   * y aplicar la estructura sin la identidad da una página que se parece a la
   * referencia en el esqueleto y a ninguna otra cosa en la pantalla.
   */
  function aplicarEstilo(layout: LandingLayout) {
    const antes = sections.length;
    const next = applyLayout(sections, layout, nuevaSeccion);
    mutate(next);

    setTheme((current) =>
      layout.preset
        ? { ...findPreset(layout.preset), layout: layout.id }
        : { ...current, layout: layout.id },
    );
    setDirty(true);

    const agregados = next.length - antes;
    const reordenado = agregados
      ? `Reordenamos tu página y sumamos ${agregados} ${agregados === 1 ? "bloque" : "bloques"}. Revisalos antes de publicar.`
      : "Reordenamos los bloques que ya tenías.";

    toast.toast({
      title: layout.preset ? `Plantilla ${layout.label}` : `Estilo ${layout.label}`,
      description: layout.preset
        ? `${reordenado} También aplicamos su paleta y su tipografía: podés cambiarlas abajo.`
        : reordenado,
      tone: "info",
    });
  }

  /** Mueve un bloque a otra posición. Lo usan el arrastre y las flechas. */
  function reorder(from: number, to: number) {
    if (from === to || to < 0 || to >= sections.length) return;
    const next = [...sections];
    const [movido] = next.splice(from, 1);
    next.splice(to, 0, movido);
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
        toast.success("Tu página quedó guardada.");
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
      if (!result.ok) {
        toast.error("Todavía no podemos publicarla", result.error);
        return;
      }

      /*
       * El resultado se muestra en pantalla, no en un cartelito que se va.
       *
       * Publicar la página es el momento en el que la persona espera que pase
       * algo, y hasta ahora lo único que pasaba era un toast verde de tres
       * segundos mientras su página seguía sin poder verse. El panel se queda:
       * o trae el link para abrirla, o dice qué falta y el botón para ir.
       */
      setPublishResult(result.data);
      if (result.data.online) {
        toast.success("Tu página está online.");
      }
      router.refresh();
    });
  }

  /**
   * El modal se cierra recién cuando la barra llega al final, no cuando vuelve
   * la respuesta. Son medio segundo de diferencia, pero es la diferencia entre
   * ver que terminó y ver que algo desapareció.
   */
  async function generate(tone: string, datos: LandingBrief) {
    const listo = await ai.run("Escribiendo tu página de venta", async () => {
      const result = await generateLandingDraftAction(page.id, tone, datos);
      if (!result.ok) {
        toast.error("No pudimos crear la página", result.error);
        return false;
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
    });

    if (listo) setAiOpen(false);
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

  const vacia = sections.length === 0;

  /*
   * El editor ocupa exactamente lo que queda de ventana, y no un píxel más.
   *
   * Con alto fijo y `overflow-hidden` en la raíz el scroll queda adentro de
   * cada panel, así que scrollear la página no se lleva puesta la barra de
   * Guardar y Publicar.
   *
   * El alto se mide en vez de calcularse, porque el editor vive en dos lugares
   * con encabezados distintos: suelto en /app/landings y embebido adentro del
   * producto, debajo de su título y del selector de pantallas.
   *
   * `data-fullbleed` le pide al shell que suelte su columna de 1400px: los
   * paneles van pegados a los bordes de la ventana.
   */
  return (
    <div
      ref={rootRef}
      data-fullbleed
      style={alto ? { height: alto } : undefined}
      className="flex min-h-dvh flex-col lg:min-h-0 lg:overflow-hidden"
    >
      <BarraSuperior
        productId={productId}
        publicada={page.status === "published"}
        dirty={dirty}
        offer={offer}
        device={device}
        onDevice={setDevice}
        onDiseno={() => setDisenoOpen(true)}
        onIa={() => setAiOpen(true)}
        onSave={save}
        onPublish={publish}
        pending={pending}
        backHref={backHref}
      />

      {publishResult ? (
        <ResultadoDePublicar
          resultado={publishResult}
          productId={productId ?? null}
          onClose={() => setPublishResult(null)}
        />
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
        {/* Columna izquierda: los bloques de la página. En celular no existe:
            vive adentro de la hoja "Secciones". */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-200 bg-white lg:flex lg:h-full">
          <p className="flex shrink-0 items-center gap-1.5 px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-ink-400">
            <span className="tf-emoji text-[13px]" aria-hidden="true">
              🧱
            </span>
            Secciones
          </p>
          <ListaSecciones
            sections={sections}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onReorder={reorder}
            onDuplicate={duplicate}
            onRemove={remove}
            onAdd={() => setAddOpen(true)}
          />
        </aside>

        {/* Centro: la página */}
        <div className="tf-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain bg-ink-100 p-3 sm:p-6">
          <Preview
            device={device}
            theme={theme}
            sections={sections}
            selectedId={selectedId}
            offer={offer}
            onSelect={(id) => {
              setSelectedId(id);
              // En celular, tocar un bloque de la página es pedir editarlo: no
              // hay un panel al costado esperando para mostrar los campos.
              if (!window.matchMedia("(min-width: 1024px)").matches) setHoja("editar");
            }}
            onIa={() => setAiOpen(true)}
            vacia={vacia}
          />
        </div>

        {/* Columna derecha: los campos del bloque elegido. Sin pestañas: el
            diseño de la página vive en su propio panel, no acá. */}
        <aside className="hidden w-80 shrink-0 flex-col border-l border-ink-200 bg-white lg:flex lg:h-full">
          <div className="flex shrink-0 items-center gap-2 border-b border-ink-100 px-4 py-3">
            <span className="tf-emoji text-[15px]" aria-hidden="true">
              {selectedBlock?.emoji ?? "✏️"}
            </span>
            <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink-900">
              {selectedBlock?.label ?? "Editar"}
            </p>
            {selected ? (
              <Button variant="ghost" size="sm" icon="refresh" onClick={regenerateSection}>
                Restablecer
              </Button>
            ) : null}
          </div>

          <div className="tf-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            {selected ? (
              <SectionProperties section={selected} onChange={updateContent} />
            ) : (
              <p className="text-[13px] text-ink-500">
                Tocá una sección —en la lista de la izquierda o directo sobre la página— para
                editarla.
              </p>
            )}
          </div>
        </aside>
      </div>

      {/*
        Las acciones, abajo y a la derecha.
        Ocupa el ancho completo en vez de flotar sobre la vista previa: una
        barra flotante tapa el pie de la página —el último llamado a la acción,
        justo lo que más se revisa— y hay que correrla para ver qué hay debajo.
      */}
      <div className="hidden shrink-0 items-center gap-2 border-t border-ink-200 bg-white px-4 py-2.5 lg:flex">
        {/*
          "Crear con IA" y no "Mejorar con IA".
          Lo que hace el botón es escribir la página entera de cero; llamarlo
          "mejorar" hace que quien todavía no tiene nada escrito lo esquive
          justo cuando más le serviría.
        */}
        <Button variant="ai" size="sm" icon="sparkles" onClick={() => setAiOpen(true)}>
          Crear con IA
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" size="sm" loading={pending} onClick={save} disabled={!dirty}>
            Guardar
          </Button>
          <Button size="sm" icon="rocket" loading={pending} onClick={publish}>
            Publicar
          </Button>
          {/* Va último: es el hilo del paso a paso, no una acción sobre la
              página. Su propio separador lo distingue de las dos de al lado. */}
          <FlowContinue next={next ?? null} />
        </div>
      </div>

      {/* Barra de abajo, solo en celular: una tarea por vez. */}
      <div className="sticky bottom-0 z-20 flex shrink-0 items-center gap-2 border-t border-ink-200 bg-white/95 px-3 py-2.5 backdrop-blur lg:hidden">
        <Button
          variant="secondary"
          className="h-11 flex-1"
          icon="layers"
          onClick={() => setHoja("secciones")}
        >
          Secciones
        </Button>
        <Button
          className="h-11 flex-1"
          icon="edit"
          disabled={!selected}
          onClick={() => setHoja("editar")}
        >
          Editar sección
        </Button>
      </div>

      {/* Hoja de secciones (celular) */}
      <Drawer
        open={hoja === "secciones"}
        onClose={() => setHoja(null)}
        title="Secciones de tu página"
        width="max-w-md"
        footer={
          <Button
            variant="secondary"
            icon="plus"
            className="h-11 w-full"
            onClick={() => {
              setHoja(null);
              setAddOpen(true);
            }}
          >
            Agregar sección
          </Button>
        }
      >
        <ListaSecciones
          sections={sections}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setHoja("editar");
          }}
          onReorder={reorder}
          onDuplicate={duplicate}
          onRemove={remove}
          compacto
        />
      </Drawer>

      {/* Hoja de edición (celular) */}
      <Drawer
        open={hoja === "editar"}
        onClose={() => setHoja(null)}
        title={selectedBlock?.label ?? "Editar sección"}
        width="max-w-md"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="ghost" icon="refresh" className="h-11" onClick={regenerateSection}>
              Restablecer
            </Button>
            <Button className="h-11 flex-1" onClick={() => setHoja(null)}>
              Ver la página
            </Button>
          </div>
        }
      >
        {selected ? (
          <SectionProperties section={selected} onChange={updateContent} />
        ) : (
          <p className="text-[13px] text-ink-500">Elegí una sección para editarla.</p>
        )}
      </Drawer>

      {/* Panel de diseño de toda la página */}
      <Drawer
        open={disenoOpen}
        onClose={() => setDisenoOpen(false)}
        title="Diseño de la página"
        width="max-w-md"
        footer={
          <Button className="h-11 w-full" onClick={() => setDisenoOpen(false)}>
            Listo
          </Button>
        }
      >
        <DesignPanel
          faltantes={faltantes}
          theme={theme}
          onChange={(next) => {
            setTheme(next);
            setDirty(true);
          }}
          onLayout={aplicarEstilo}
        />
      </Drawer>

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
                    className="flex min-h-11 items-center gap-2.5 rounded-xl border border-ink-200 px-3 py-2.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/50"
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

      <AiModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onGenerate={generate}
        loading={ai.running}
        progress={ai.progress}
        progressLabel={ai.label}
        hasOffer={Boolean(offer)}
        hasSections={!vacia}
        cover={cover}
        initial={{
          audience: brief?.audience ?? "",
          problem: brief?.problem ?? "",
          transformation: brief?.transformation ?? "",
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Barra superior                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Contexto mínimo y las acciones. Nada más.
 *
 * No dice "Landing Funnel X" en ningún lado: dice qué está editando y de qué
 * oferta. El nombre interno de la página no le sirve a nadie que no haya
 * escrito el código.
 */
function BarraSuperior({
  productId,
  publicada,
  dirty,
  offer,
  device,
  onDevice,
  onDiseno,
  onIa,
  onSave,
  onPublish,
  pending,
  backHref,
}: {
  publicada: boolean;
  dirty: boolean;
  offer: { name: string; priceLabel: string } | null;
  device: Device;
  onDevice: (device: Device) => void;
  onDiseno: () => void;
  onIa: () => void;
  onSave: () => void;
  onPublish: () => void;
  pending: boolean;
  backHref?: { href: string; label: string };
  productId?: string;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-ink-200 bg-white px-3 py-2.5 sm:px-4">
      {/*
        En celular el título de esta barra no se muestra.
        Justo arriba hay una tarjeta que dice "Página de venta · EDITANDO", y
        repetirlo acá consumía la mitad de un renglón de 390px para no agregar
        nada. Lo que sí queda es el estado —publicada, sin guardar—, que no
        está en ningún otro lado.
      */}
      {/*
        Sin `flex-1`.
        Con él, este grupo se quedaba con el sobrante y, cuando las acciones no
        entraban, se achicaba por debajo de su contenido: el estado de la
        página terminaba desbordando y pintado abajo de los botones. Sin él,
        el grupo mide lo que mide y son las acciones las que bajan a una
        segunda fila —la barra envuelve en vez de recortar—.
      */}
      <div className="flex min-w-0 shrink items-center gap-1.5 sm:gap-2">
        {backHref ? (
          <Link
            href={backHref.href}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-800"
            aria-label={`Volver a ${backHref.label}`}
            title={`Volver a ${backHref.label}`}
          >
            <Icon name="chevronLeft" size={17} />
          </Link>
        ) : null}
        {productId ? (
          <PantallaSelector productId={productId} current="venta" compacto />
        ) : (
          <span className="flex items-center gap-2 px-1">
            <span className="tf-emoji text-[16px]" aria-hidden="true">
              🛍️
            </span>
            <span className="truncate text-[14px] font-semibold text-ink-900">Página de venta</span>
          </span>
        )}

        <span className="flex shrink-0 items-center gap-1.5">
          <Badge tone={publicada ? "success" : "neutral"}>
            {publicada ? "Publicada" : "Borrador"}
          </Badge>
          {dirty ? <Badge tone="warning">Sin guardar</Badge> : null}
        </span>

        {/* La oferta es contexto, no navegación: se va apenas falta lugar. */}
        {offer ? (
          <p className="hidden min-w-0 truncate text-[12.5px] text-ink-500 xl:block">
            {offer.name} · {offer.priceLabel}
          </p>
        ) : (
          <p className="hidden text-[12.5px] text-amber-600 xl:block">Todavía no tiene precio</p>
        )}
      </div>

      {/*
        Arriba, navegación. Las acciones están abajo.
        Cuando "dónde estoy", "cómo lo miro" y "qué hago" comparten un renglón,
        los tres compiten y ninguno se lee: nueve controles en fila obligan a
        buscar Publicar con la vista cada vez. Arriba queda de dónde vengo,
        qué pantalla estoy editando y cómo la miro; abajo, lo que hace algo.
      */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        {/* En un celular elegir "ver como celular" no significa nada, y "ver
            como escritorio" no entra en la pantalla. El switch arranca en lg. */}
        <span className="hidden lg:block">
          <VistaSwitch device={device} onChange={onDevice} />
        </span>

        <Button variant="secondary" size="sm" onClick={onDiseno}>
          <span className="tf-emoji" aria-hidden="true">
            🎨
          </span>
          <span className="hidden sm:inline">Diseño</span>
        </Button>

        {/*
          En celular las acciones se quedan acá arriba: abajo está la barra de
          "Secciones / Editar sección", que es la navegación de una pantalla
          donde se hace una cosa por vez, y dos barras apiladas se comen un
          tercio del teléfono.
        */}
        <span className="flex items-center gap-1.5 lg:hidden">
          <Button variant="ai" size="sm" icon="sparkles" onClick={onIa}>
            IA
          </Button>
          <Button
            variant="secondary"
            size="sm"
            loading={pending}
            onClick={onSave}
            disabled={!dirty}
          >
            Guardar
          </Button>
          <Button size="sm" icon="rocket" loading={pending} onClick={onPublish}>
            Publicar
          </Button>
        </span>
      </div>
    </div>
  );
}

/**
 * Celular o escritorio, con la palabra escrita y el celular primero.
 *
 * El orden importa: lo que está a la izquierda se lee como el caso normal, y
 * el caso normal de una página de infoproducto es un teléfono. La tablet no
 * está —nadie compra un curso desde una tablet— y cada opción de más es una
 * decisión que le pedimos al vendedor sin que le sirva para nada.
 */
function VistaSwitch({
  device,
  onChange,
}: {
  device: Device;
  onChange: (device: Device) => void;
}) {
  const opciones: Array<{ value: Device; label: string; icon: IconName }> = [
    { value: "mobile", label: "Celular", icon: "mobile" },
    { value: "desktop", label: "Escritorio", icon: "desktop" },
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
          <span className="hidden sm:inline">{opcion.label}</span>
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* La página                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * La vista previa.
 *
 * En celular se dibuja adentro de un teléfono —marco, muesca, hora— y no como
 * una columna angosta sobre fondo gris. No es decoración: el marco es lo que
 * hace que el vendedor juzgue su titular como lo va a juzgar quien lo abra
 * desde Instagram, con esa cantidad exacta de pantalla y nada más.
 *
 * Cada bloque es un botón: tocarlo lo abre para editar. Junto con la lista de
 * la izquierda —que también resalta el bloque acá— la selección va y viene
 * para los dos lados, que es como la gente espera que funcione algo que se ve.
 */
function Preview({
  device,
  theme,
  sections,
  selectedId,
  offer,
  onSelect,
  onIa,
  vacia,
}: {
  device: Device;
  theme: LandingTheme;
  sections: SectionData[];
  selectedId: string | null;
  offer: { priceLabel: string; compareLabel: string | null } | null;
  onSelect: (id: string) => void;
  onIa: () => void;
  vacia: boolean;
}) {
  const contenido = vacia ? (
    <div className="grid min-h-64 place-items-center bg-white px-6 py-16 text-center">
      <div>
        <span className="tf-emoji !inline-flex text-[30px]" aria-hidden="true">
          ✨
        </span>
        <p className="mt-3 text-[14px] font-semibold text-ink-800">Tu página todavía está vacía</p>
        <p className="mx-auto mt-1 max-w-[28ch] text-[13px] leading-relaxed text-ink-500">
          Contanos tres cosas de tu producto y la escribimos entera por vos.
        </p>
        <Button variant="ai" size="sm" icon="sparkles" className="mt-4" onClick={onIa}>
          Crear mi página con IA
        </Button>
      </div>
    </div>
  ) : (
    sections.map((section) => (
      <button
        key={section.id}
        type="button"
        onClick={() => onSelect(section.id)}
        className={cn(
          "block w-full cursor-pointer text-left outline-none transition-shadow",
          selectedId === section.id && "ring-2 ring-inset ring-brand-500",
        )}
      >
        <LandingSectionView
          section={section}
          priceLabel={offer?.priceLabel}
          compareLabel={offer?.compareLabel ?? undefined}
          editor
        />
      </button>
    ))
  );

  /*
   * `@container` hace que la vista previa sea una vista previa de verdad: los
   * bloques miden esta caja, no la ventana. Sin esto, elegir "celular" achica
   * la columna pero los textos siguen calculando su tamaño contra una pantalla
   * de 1600px, y queda un titular gigante adentro de un teléfono.
   */
  const pagina = (
    <div className="@container overflow-hidden" style={themeVars(theme)}>
      {contenido}
    </div>
  );

  if (device === "desktop") {
    return (
      <div className="mx-auto w-full overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,.5)]">
        {pagina}
      </div>
    );
  }

  /*
   * El marco.
   *
   * Un borde fino, esquinas redondeadas y una sombra suave. Nada más: ni
   * muesca, ni hora, ni batería, ni un bisel negro grueso. Eso convertía la
   * vista previa en la maqueta de un iPhone, y lo que el vendedor tiene que
   * estar juzgando es su página, no el dispositivo. El marco solo cumple una
   * función —decir dónde termina la pantalla— y para eso alcanza con una línea.
   *
   * En un celular ni siquiera hace falta la línea: la pantalla ya es el
   * teléfono, así que las clases del marco arrancan recién en `lg`. Es un solo
   * árbol de DOM, la página no se renderiza dos veces.
   */
  return (
    <div className="mx-auto w-full lg:w-[390px]">
      {/*
        390 de ancho y todo el alto que la ventana permita.
        Un teléfono real es mucho más alto que ancho, y con el alto recortado
        la vista previa mentía sobre cuánto entra sin scrollear —que es
        exactamente la pregunta que uno le hace a esta pantalla—.
      */}
      <div className="relative overflow-hidden rounded-2xl bg-white lg:h-[min(78vh,844px)] lg:rounded-[2rem] lg:border lg:border-ink-300 lg:shadow-[0_24px_60px_-28px_rgba(15,23,42,.45)]">
        <div className="tf-scroll h-full overscroll-contain lg:overflow-y-auto">{pagina}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* La lista de bloques                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Los bloques de la página, en orden y arrastrables.
 *
 * Cada uno muestra si tiene texto adentro o quedó vacío. Un bloque vacío se
 * publica igual y sale una franja en blanco en la página real; verlo acá,
 * antes, sale más barato que descubrirlo después.
 *
 * El arrastre es lo natural para reordenar, pero no es lo único: las flechas
 * siguen ahí porque arrastrar con teclado no existe y en un celular es una
 * pelea. Dos caminos para lo mismo se justifican cuando uno de los dos es el
 * único que le sirve a alguien.
 */
function ListaSecciones({
  sections,
  selectedId,
  onSelect,
  onReorder,
  onDuplicate,
  onRemove,
  onAdd,
  compacto = false,
}: {
  sections: SectionData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onDuplicate: (index: number) => void;
  onRemove: (index: number) => void;
  onAdd?: () => void;
  /** En la hoja de celular el botón de agregar va en el pie, no acá adentro. */
  compacto?: boolean;
}) {
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const [encima, setEncima] = useState<number | null>(null);

  if (sections.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <p className="px-4 py-6 text-center text-[13px] text-ink-500">
          Tu página está vacía. Creala con IA o agregá secciones a mano.
        </p>
        {onAdd ? <PieAgregar onAdd={onAdd} /> : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ol className="tf-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
        {sections.map((section, index) => {
          const block = SECTION_LIBRARY.find((item) => item.type === section.type);
          const activo = selectedId === section.id;
          const llena = tieneContenido(section);

          return (
            <li
              key={section.id}
              draggable
              onDragStart={() => setArrastrando(index)}
              onDragEnd={() => {
                setArrastrando(null);
                setEncima(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setEncima(index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (arrastrando !== null) onReorder(arrastrando, index);
                setArrastrando(null);
                setEncima(null);
              }}
              className={cn(
                "rounded-xl transition-colors",
                arrastrando === index && "opacity-40",
                encima === index && arrastrando !== null && arrastrando !== index
                  ? "ring-2 ring-brand-400"
                  : undefined,
              )}
            >
              {/*
                Los botones van encima de la fila, no al lado.
                Ocupando lugar en la fila —aunque estén invisibles— le robaban
                ancho al nombre del bloque, y la columna terminaba llena de
                "Encab…", "Testim…", "Galerí…". El nombre es lo único que esta
                lista tiene que comunicar; las acciones aparecen cuando la
                persona ya eligió sobre cuál quiere actuar.
              */}
              <div
                className={cn(
                  "group relative flex items-center gap-1.5 rounded-xl px-1.5 transition-colors",
                  activo ? "bg-brand-50" : "hover:bg-ink-50",
                )}
              >
                <span
                  className="cursor-grab px-0.5 text-ink-300 active:cursor-grabbing"
                  aria-hidden="true"
                  title="Arrastrá para reordenar"
                >
                  <Icon name="grip" size={14} />
                </span>

                <button
                  type="button"
                  onClick={() => onSelect(section.id)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 py-2 text-left",
                    compacto && "min-h-11",
                  )}
                >
                  {/* El estado del bloque: elegido, con texto, o vacío. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      activo ? "bg-brand-600" : llena ? "bg-emerald-500" : "bg-ink-300",
                    )}
                  />
                  <span className="tf-emoji shrink-0 text-[14px]" aria-hidden="true">
                    {block?.emoji ?? "📄"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-[13px] font-medium",
                        activo ? "text-brand-800" : "text-ink-700",
                      )}
                    >
                      {block?.label ?? section.type}
                    </span>
                    {!llena ? (
                      <span className="block text-[11px] text-ink-400">Sin texto todavía</span>
                    ) : null}
                  </span>
                </button>

                <div
                  className={cn(
                    "flex shrink-0 items-center rounded-lg transition-opacity",
                    compacto
                      ? "opacity-100"
                      : cn(
                          "absolute right-1 top-1/2 -translate-y-1/2 shadow-sm",
                          activo ? "bg-brand-50" : "bg-white",
                          "opacity-0 focus-within:opacity-100 group-hover:opacity-100",
                        ),
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onReorder(index, index - 1)}
                    disabled={index === 0}
                    className="rounded p-1 text-ink-400 hover:text-ink-700 disabled:opacity-30"
                    aria-label={`Subir ${block?.label ?? "sección"}`}
                  >
                    <Icon name="chevronDown" size={13} className="rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onReorder(index, index + 1)}
                    disabled={index === sections.length - 1}
                    className="rounded p-1 text-ink-400 hover:text-ink-700 disabled:opacity-30"
                    aria-label={`Bajar ${block?.label ?? "sección"}`}
                  >
                    <Icon name="chevronDown" size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicate(index)}
                    className="rounded p-1 text-ink-400 hover:text-ink-700"
                    aria-label={`Duplicar ${block?.label ?? "sección"}`}
                  >
                    <Icon name="copy" size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="rounded p-1 text-ink-400 hover:text-red-600"
                    aria-label={`Eliminar ${block?.label ?? "sección"}`}
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {onAdd ? <PieAgregar onAdd={onAdd} /> : null}
    </div>
  );
}

function PieAgregar({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="shrink-0 border-t border-ink-100 p-2">
      <Button variant="secondary" size="sm" icon="plus" className="w-full" onClick={onAdd}>
        Agregar sección
      </Button>
    </div>
  );
}

/**
 * ¿El bloque tiene algo escrito?
 *
 * Mira los valores del contenido sin asumir su forma: puede venir de una
 * generación con IA, de una versión vieja de la app o de un `defaults` con
 * listas adentro. Alcanza con que haya un texto de más de dos caracteres en
 * algún lado para considerarlo lleno.
 */
function tieneContenido(section: SectionData): boolean {
  const hayTexto = (valor: unknown): boolean => {
    if (typeof valor === "string") return valor.trim().length > 2;
    if (Array.isArray(valor)) return valor.some(hayTexto);
    if (valor && typeof valor === "object") return Object.values(valor).some(hayTexto);
    return false;
  };
  return Object.values(section.content).some(hayTexto);
}

/**
 * Qué pasó cuando apretaste Publicar.
 *
 * Antes esto era un toast verde que decía "Tu página está publicada" y se iba
 * a los tres segundos — mientras la página seguía sin poder verla nadie,
 * porque lo que la hace pública es publicar el producto, no la página. El
 * vendedor apretaba el botón, leía que estaba todo bien y su link no existía.
 *
 * El panel se queda hasta que lo cierren y tiene una sola salida clara:
 * si ya está online, el link para abrirla; si no, qué falta y el botón para
 * ir a terminarlo. Nunca dice "listo" sobre algo que no está listo.
 */
function ResultadoDePublicar({
  resultado,
  productId,
  onClose,
}: {
  resultado: LandingPublishResult;
  productId: string | null;
  onClose: () => void;
}) {
  const destino = resultado.productId ?? productId;

  return (
    <div className="border-b border-ink-200 bg-white px-4 py-3">
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-x-5 gap-y-3 rounded-2xl border px-4 py-3.5",
          resultado.online
            ? "border-accent-200 bg-accent-50/50"
            : "border-brand-200 bg-brand-50/60",
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-white",
              resultado.online ? "bg-accent-500" : "bg-brand-600",
            )}
            aria-hidden="true"
          >
            <Icon name={resultado.online ? "check" : "rocket"} size={13} />
          </span>

          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-ink-900">
              {resultado.online
                ? "Tu página está online"
                : "Guardamos tu página, pero todavía no la puede ver nadie"}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500">
              {resultado.online
                ? "Cualquiera con el link puede entrar y comprar."
                : resultado.blockers.length
                  ? `Para ponerla a la venta falta: ${resultado.blockers[0].toLowerCase()}`
                  : "Falta un último paso: publicar tu producto."}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {resultado.online && resultado.publicUrl ? (
            <LinkButton href={resultado.publicUrl} icon="eye" size="sm" target="_blank">
              Ver mi página
            </LinkButton>
          ) : destino ? (
            <LinkButton href={`/app/productos/${destino}/publicar`} icon="rocket" size="sm">
              Publicar mi producto
            </LinkButton>
          ) : null}

          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
