"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { applyProductDraftAction, generateProductDraftAction } from "@/app/actions/ai";
import { createProductAction } from "@/app/actions/catalog";
import { MoreOptions } from "@/components/ui/explain";
import { Alert, TemplateNotice } from "@/components/ui/feedback";
import { Icon, type IconName } from "@/components/ui/icon";
import {
  Button,
  Card,
  Field,
  Input,
  Select,
  Stepper,
  Textarea,
  useToast,
} from "@/components/ui/primitives";
import type { ProductDraft } from "@/lib/ai/tasks";
import { cn, formatMoney } from "@/lib/utils";

type Source = "propio" | "ia" | "cero";

const STEPS = ["Origen", "Información", "Portada", "Archivos", "Entrega", "Publicar"];

const SOURCE_OPTIONS: Array<{ value: Source; title: string; hint: string; icon: IconName }> = [
  {
    value: "propio",
    title: "Tengo un producto",
    hint: "Subís tu PDF, EPUB, ZIP o imágenes.",
    icon: "upload",
  },
  {
    value: "ia",
    title: "Crear con IA",
    hint: "Partimos de una idea y armamos el borrador completo.",
    icon: "sparkles",
  },
  {
    value: "cero",
    title: "Crear desde cero",
    hint: "Cargás todo a mano, con total control.",
    icon: "edit",
  },
];

const ACCEPTED = ".pdf,.epub,.zip,.png,.jpg,.jpeg,.mobi,.docx,.mp4,.mp3";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

export function NewProductFlow({
  currency,
  initialSource,
  aiConfigured,
}: {
  currency: string;
  initialSource?: Source;
  aiConfigured: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const [step, setStep] = useState(initialSource ? 1 : 0);
  const [source, setSource] = useState<Source>(initialSource ?? "propio");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    subtitle: "",
    description: "",
    short_description: "",
    type: "ebook",
    category: "",
    audience: "",
    main_problem: "",
    transformation: "",
    benefits: "",
    base_price: "",
    delivery_type: "download",
    delivery_message: "¡Listo! Descargá tu material desde el botón de abajo.",
    cover_from: "#6D5DFB",
    cover_to: "#22D3EE",
  });

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function onFilesPicked(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }));
    setFiles((current) => [...current, ...next]);
  }

  function submit() {
    setError(null);
    if (!form.name.trim()) {
      setError("Poné un nombre para el producto.");
      setStep(1);
      return;
    }

    const data = new FormData();
    data.set("name", form.name);
    data.set("subtitle", form.subtitle);
    data.set("description", form.description);
    data.set("short_description", form.short_description);
    data.set("type", form.type);
    data.set("category", form.category);
    data.set("audience", form.audience);
    data.set("main_problem", form.main_problem);
    data.set("transformation", form.transformation);
    data.set("benefits", form.benefits);
    data.set("base_price", form.base_price || "0");
    data.set("delivery_type", form.delivery_type);
    data.set("delivery_message", form.delivery_message);
    data.set("status", "draft");
    data.set("source", source === "ia" ? "ai" : "manual");
    for (const file of files) data.append("file_name", file.name);

    startTransition(async () => {
      const result = await createProductAction(null, data);
      if (result.ok) {
        toast.success("Producto creado", "Ahora armemos tu oferta.");
        router.push(`/app/productos/${result.data.id}?nuevo=1`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <Stepper steps={STEPS} current={step} />
      </Card>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <Card className="p-6">
        {step === 0 ? (
          <section>
            <h2 className="text-[18px] font-semibold text-ink-900">¿De dónde sale tu producto?</h2>
            <p className="mt-1 text-[13.5px] text-ink-500">
              Podés cambiarlo después. Esto solo define cómo arrancamos.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {SOURCE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSource(option.value)}
                  aria-pressed={source === option.value}
                  className={cn(
                    "flex flex-col gap-2.5 rounded-2xl border p-4 text-left transition-all",
                    source === option.value
                      ? "border-brand-400 bg-brand-50/60 ring-4 ring-brand-500/10"
                      : "border-ink-200 hover:border-ink-300 hover:bg-ink-50/60",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-10 place-items-center rounded-xl",
                      option.value === "ia"
                        ? "tf-gradient-ai text-white"
                        : source === option.value
                          ? "bg-brand-600 text-white"
                          : "bg-ink-100 text-ink-500",
                    )}
                  >
                    <Icon name={option.icon} size={19} />
                  </span>
                  <span className="text-[14px] font-semibold text-ink-900">{option.title}</span>
                  <span className="text-[12.5px] leading-relaxed text-ink-500">{option.hint}</span>
                </button>
              ))}
            </div>

            {source === "propio" ? (
              <div className="mt-5">
                <FileDrop
                  files={files}
                  inputRef={fileRef}
                  onPick={onFilesPicked}
                  onRemove={(index) => setFiles((c) => c.filter((_, i) => i !== index))}
                />
              </div>
            ) : null}

            {source === "ia" ? (
              <div className="mt-5">
                <AiProductPanel
                  aiConfigured={aiConfigured}
                  onApply={(draft, title, brief) => {
                    setForm((current) => ({
                      ...current,
                      name: title,
                      subtitle: draft.subtitle ?? "",
                      description: draft.description ?? "",
                      short_description: draft.short_description ?? "",
                      benefits: (draft.benefits ?? []).join("\n"),
                      audience: brief.audience ?? "",
                      main_problem: brief.problem ?? "",
                      transformation: brief.outcome ?? "",
                    }));
                    setStep(1);
                  }}
                />
              </div>
            ) : null}
          </section>
        ) : null}

        {step === 1 ? (
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-[18px] font-semibold text-ink-900">Información del producto</h2>
              <p className="mt-1 text-[13.5px] text-ink-500">
                Esto alimenta la oferta, la landing y los anuncios. Cuanto más específico, mejor.
              </p>
            </div>

            <Field label="Nombre del producto" required>
              <Input
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Guía de Hábitos Saludables"
              />
            </Field>

            <Field label="Subtítulo" hint="Una línea que explique el resultado.">
              <Input
                value={form.subtitle}
                onChange={(event) => update("subtitle", event.target.value)}
                placeholder="El sistema de 21 días para sostener lo que empezás"
              />
            </Field>

            <Field label="Tipo">
              <Select value={form.type} onChange={(event) => update("type", event.target.value)}>
                <option value="ebook">Ebook</option>
                <option value="pdf">PDF</option>
                <option value="template">Plantilla</option>
                <option value="guide">Guía</option>
                <option value="file">Archivo digital</option>
                <option value="other">Otro producto digital</option>
              </Select>
            </Field>

            <Field label="Descripción">
              <Textarea
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                rows={5}
                placeholder="Contá qué se lleva la persona y por qué le sirve."
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Para quién es" hint="Sé específico.">
                <Input
                  value={form.audience}
                  onChange={(event) => update("audience", event.target.value)}
                  placeholder="Personas que arrancan mil veces y abandonan"
                />
              </Field>
              <Field label="Problema principal">
                <Input
                  value={form.main_problem}
                  onChange={(event) => update("main_problem", event.target.value)}
                  placeholder="Empezar con todo y abandonar a los pocos días"
                />
              </Field>
            </div>

            <Field label="Transformación principal">
              <Input
                value={form.transformation}
                onChange={(event) => update("transformation", event.target.value)}
                placeholder="Una rutina que sostenés sin fuerza de voluntad"
              />
            </Field>

            <Field label="Beneficios" hint="Uno por línea.">
              <Textarea
                value={form.benefits}
                onChange={(event) => update("benefits", event.target.value)}
                rows={5}
                placeholder={"Armás una rutina realista\nSabés qué hacer los días sin ganas"}
              />
            </Field>

            <Field label={`Precio base (${currency})`} hint="Después lo ajustás en la oferta.">
              <Input
                type="number"
                min={0}
                step="any"
                value={form.base_price}
                onChange={(event) => update("base_price", event.target.value)}
                placeholder="14900"
              />
            </Field>

            <MoreOptions>
              <Field
                label="Categoría"
                hint="Para ordenar tus productos entre sí. No se muestra a quien compra."
              >
                <Input
                  value={form.category}
                  onChange={(event) => update("category", event.target.value)}
                  placeholder="Desarrollo personal"
                />
              </Field>
            </MoreOptions>
          </section>
        ) : null}

        {step === 2 ? (
          <section>
            <h2 className="text-[18px] font-semibold text-ink-900">Portada</h2>
            <p className="mt-1 text-[13.5px] text-ink-500">
              Subí tu portada o generá un concepto de color mientras la diseñás.
            </p>

            <div className="mt-5 grid gap-5 sm:grid-cols-[220px_1fr]">
              <div
                className="flex aspect-[3/4] flex-col justify-between rounded-2xl p-5 text-white shadow-[0_20px_40px_-20px_rgba(15,23,42,.5)]"
                style={{
                  background: `linear-gradient(150deg, ${form.cover_from}, ${form.cover_to})`,
                }}
              >
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white/70">
                  {form.type}
                </span>
                <div>
                  <p className="text-[19px] font-semibold leading-tight">
                    {form.name || "Nombre de tu producto"}
                  </p>
                  <p className="mt-1.5 text-[12.5px] text-white/75">
                    {form.subtitle || "Tu subtítulo va acá"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <Alert tone="info">
                  El almacenamiento de imágenes todavía no está conectado. Por ahora podés definir el
                  concepto de color, y cuando conectes storage subís el archivo final.
                </Alert>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Color inicial">
                    <Input
                      type="color"
                      value={form.cover_from}
                      onChange={(event) => update("cover_from", event.target.value)}
                      className="h-10 p-1"
                    />
                  </Field>
                  <Field label="Color final">
                    <Input
                      type="color"
                      value={form.cover_to}
                      onChange={(event) => update("cover_to", event.target.value)}
                      className="h-10 p-1"
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["#6D5DFB", "#22D3EE"],
                    ["#0F172A", "#5B4AE8"],
                    ["#16A34A", "#22D3EE"],
                    ["#F97316", "#EF4444"],
                  ].map(([from, to]) => (
                    <button
                      key={from + to}
                      type="button"
                      onClick={() => {
                        update("cover_from", from);
                        update("cover_to", to);
                      }}
                      className="size-9 rounded-xl ring-1 ring-inset ring-ink-200"
                      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                      aria-label={`Usar paleta ${from} a ${to}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section>
            <h2 className="text-[18px] font-semibold text-ink-900">Archivos del producto</h2>
            <p className="mt-1 text-[13.5px] text-ink-500">
              Lo que la persona recibe cuando compra.
            </p>
            <div className="mt-5">
              <FileDrop
                files={files}
                inputRef={fileRef}
                onPick={onFilesPicked}
                onRemove={(index) => setFiles((c) => c.filter((_, i) => i !== index))}
              />
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-[18px] font-semibold text-ink-900">Entrega</h2>
              <p className="mt-1 text-[13.5px] text-ink-500">
                Qué pasa apenas se confirma el pago.
              </p>
            </div>

            <Field label="Tipo de entrega">
              <Select
                value={form.delivery_type}
                onChange={(event) => update("delivery_type", event.target.value)}
              >
                <option value="download">Descarga directa</option>
                <option value="email">Envío por email</option>
                <option value="access">Página de acceso</option>
                <option value="external">Link externo</option>
              </Select>
            </Field>

            <Field
              label="Mensaje de la página de gracias"
              hint="Lo lee la persona justo después de comprar."
            >
              <Textarea
                value={form.delivery_message}
                onChange={(event) => update("delivery_message", event.target.value)}
                rows={4}
              />
            </Field>

            {form.delivery_type === "email" ? (
              <Alert tone="warning">
                Todavía no hay proveedor de email conectado. Hasta que lo configures en
                Integraciones, la persona va a poder descargar desde la página de gracias pero no va
                a recibir el mail.
              </Alert>
            ) : null}
          </section>
        ) : null}

        {step === 5 ? (
          <section>
            <h2 className="text-[18px] font-semibold text-ink-900">Revisá antes de crear</h2>
            <p className="mt-1 text-[13.5px] text-ink-500">
              Se crea como borrador. Lo activás cuando quieras.
            </p>

            <dl className="mt-5 divide-y divide-ink-100 rounded-2xl border border-ink-200">
              <Review label="Nombre" value={form.name || "—"} />
              <Review label="Subtítulo" value={form.subtitle || "—"} />
              <Review label="Tipo" value={form.type} />
              <Review label="Para quién" value={form.audience || "—"} />
              <Review label="Problema" value={form.main_problem || "—"} />
              <Review label="Transformación" value={form.transformation || "—"} />
              <Review
                label="Beneficios"
                value={
                  form.benefits.split("\n").filter(Boolean).length
                    ? `${form.benefits.split("\n").filter(Boolean).length} beneficios cargados`
                    : "—"
                }
              />
              <Review
                label="Precio base"
                value={
                  form.base_price ? formatMoney(Number(form.base_price), currency) : "Sin definir"
                }
              />
              <Review
                label="Archivos"
                value={files.length ? files.map((file) => file.name).join(", ") : "Ninguno todavía"}
              />
            </dl>

            <Alert tone="ai" className="mt-5">
              Después de crearlo te llevamos directo a armar la oferta: precio, bonos, order bump y
              upsell.
            </Alert>
          </section>
        ) : null}

        <div className="mt-7 flex items-center justify-between gap-3 border-t border-ink-100 pt-5">
          <Button
            type="button"
            variant="ghost"
            icon="chevronLeft"
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            className={step === 0 ? "invisible" : undefined}
          >
            Atrás
          </Button>

          {step === STEPS.length - 1 ? (
            <Button size="lg" loading={pending} onClick={submit} icon="check">
              Crear producto
            </Button>
          ) : (
            <Button
              size="lg"
              iconRight="arrowRight"
              disabled={step === 1 && !form.name.trim()}
              onClick={() => setStep((value) => value + 1)}
            >
              Siguiente
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
      <dt className="text-[12.5px] text-ink-500">{label}</dt>
      <dd className="max-w-md text-right text-[13.5px] font-medium text-ink-900">{value}</dd>
    </div>
  );
}

function FileDrop({
  files,
  inputRef,
  onPick,
  onRemove,
}: {
  files: UploadedFile[];
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (list: FileList | null) => void;
  onRemove: (index: number) => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          onPick(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
          dragging ? "border-brand-400 bg-brand-50/60" : "border-ink-200 bg-ink-50/50",
        )}
      >
        <span className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-white text-brand-600 ring-1 ring-ink-200">
          <Icon name="upload" size={20} />
        </span>
        <p className="text-[14px] font-medium text-ink-800">
          Arrastrá tus archivos o elegilos desde tu compu
        </p>
        <p className="mt-1 text-[12.5px] text-ink-500">PDF, EPUB, ZIP, imágenes, audio o video.</p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => inputRef.current?.click()}
        >
          Elegir archivos
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="sr-only"
          onChange={(event) => onPick(event.target.files)}
        />
      </div>

      <Alert tone="warning" className="mt-3">
        Todavía no hay almacenamiento conectado: guardamos el nombre y el tipo del archivo para
        armar la entrega, pero el archivo en sí no se sube. Conectá un storage antes de vender.
      </Alert>

      {files.length ? (
        <ul className="mt-3 flex flex-col gap-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 rounded-xl border border-ink-200 px-3.5 py-2.5"
            >
              <Icon name="file" size={17} className="shrink-0 text-ink-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-ink-900">
                  {file.name}
                </span>
                <span className="text-[11.5px] text-ink-500">
                  {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Tamaño desconocido"}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-red-600"
                aria-label={`Quitar ${file.name}`}
              >
                <Icon name="x" size={15} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function AiProductPanel({
  aiConfigured,
  onApply,
}: {
  aiConfigured: boolean;
  onApply: (
    draft: ProductDraft,
    title: string,
    brief: { audience?: string; problem?: string; outcome?: string },
  ) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [isTemplate, setIsTemplate] = useState(false);
  const [warning, setWarning] = useState<string | undefined>();
  const [chosenTitle, setChosenTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [brief, setBrief] = useState({
    topic: "",
    audience: "",
    level: "principiante",
    problem: "",
    outcome: "",
    tone: "cercano",
    length: "corta (30-50 páginas)",
  });

  function generate() {
    setError(null);
    if (!brief.topic.trim()) {
      setError("Contanos sobre qué querés crear tu producto.");
      return;
    }
    startTransition(async () => {
      const result = await generateProductDraftAction(brief);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDraft(result.data.data);
      setIsTemplate(result.data.isTemplate);
      setWarning(result.data.warning);
      setChosenTitle(result.data.data.titles?.[0] ?? brief.topic);
    });
  }

  function createDirectly() {
    if (!draft) return;
    startTransition(async () => {
      const result = await applyProductDraftAction(draft, chosenTitle, brief);
      if (result.ok) {
        toast.success("Producto creado", "Revisá el contenido generado antes de publicarlo.");
        router.push(`/app/productos/${result.data.id}?nuevo=1`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-5">
      <div className="flex items-center gap-2.5">
        <span className="tf-gradient-ai grid size-8 place-items-center rounded-xl text-white">
          <Icon name="sparkles" size={17} />
        </span>
        <div>
          <h3 className="text-[15px] font-semibold text-ink-900">Crear producto con IA</h3>
          <p className="text-[12.5px] text-ink-500">
            {aiConfigured
              ? "Generamos títulos, índice, capítulos, beneficios y FAQ."
              : "Sin proveedor conectado armamos un borrador local con tus datos."}
          </p>
        </div>
      </div>

      {error ? (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      ) : null}

      {!draft ? (
        <div className="mt-5 flex flex-col gap-4">
          <Field label="¿Sobre qué querés crear tu producto?" required>
            <Input
              value={brief.topic}
              onChange={(event) => setBrief((c) => ({ ...c, topic: event.target.value }))}
              placeholder="Hábitos saludables para gente con poco tiempo"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Para quién es">
              <Input
                value={brief.audience}
                onChange={(event) => setBrief((c) => ({ ...c, audience: event.target.value }))}
                placeholder="Profesionales de 30 a 45 con agenda cargada"
              />
            </Field>
            <Field label="Nivel de experiencia">
              <Select
                value={brief.level}
                onChange={(event) => setBrief((c) => ({ ...c, level: event.target.value }))}
              >
                <option value="principiante">Principiante</option>
                <option value="intermedio">Intermedio</option>
                <option value="avanzado">Avanzado</option>
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Problema principal">
              <Input
                value={brief.problem}
                onChange={(event) => setBrief((c) => ({ ...c, problem: event.target.value }))}
                placeholder="Arrancar y abandonar a la semana"
              />
            </Field>
            <Field label="Resultado que busca">
              <Input
                value={brief.outcome}
                onChange={(event) => setBrief((c) => ({ ...c, outcome: event.target.value }))}
                placeholder="Sostener la rutina sin fuerza de voluntad"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tono">
              <Select
                value={brief.tone}
                onChange={(event) => setBrief((c) => ({ ...c, tone: event.target.value }))}
              >
                <option value="cercano">Cercano</option>
                <option value="profesional">Profesional</option>
                <option value="directo">Directo</option>
                <option value="inspirador">Inspirador</option>
              </Select>
            </Field>
            <Field label="Extensión aproximada">
              <Select
                value={brief.length}
                onChange={(event) => setBrief((c) => ({ ...c, length: event.target.value }))}
              >
                <option value="corta (30-50 páginas)">Corta (30-50 páginas)</option>
                <option value="media (60-100 páginas)">Media (60-100 páginas)</option>
                <option value="larga (120+ páginas)">Larga (120+ páginas)</option>
              </Select>
            </Field>
          </div>

          <Button variant="ai" size="lg" icon="sparkles" loading={pending} onClick={generate}>
            Generar borrador
          </Button>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          {isTemplate ? <TemplateNotice warning={warning} /> : null}

          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink-800">Elegí el título</p>
            <div className="flex flex-col gap-1.5">
              {draft.titles?.map((title) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => setChosenTitle(title)}
                  className={cn(
                    "rounded-xl border px-3.5 py-2.5 text-left text-[13.5px] transition-colors",
                    chosenTitle === title
                      ? "border-brand-400 bg-white font-semibold text-ink-900"
                      : "border-ink-200 bg-white/60 text-ink-700 hover:border-ink-300",
                  )}
                >
                  {title}
                </button>
              ))}
            </div>
          </div>

          <DraftPreview draft={draft} />

          <div className="flex flex-wrap gap-2">
            <Button variant="ai" icon="check" loading={pending} onClick={createDirectly}>
              Crear producto con este borrador
            </Button>
            <Button
              variant="secondary"
              icon="edit"
              onClick={() =>
                onApply(draft, chosenTitle, {
                  audience: brief.audience,
                  problem: brief.problem,
                  outcome: brief.outcome,
                })
              }
            >
              Editar antes de crear
            </Button>
            <Button variant="ghost" icon="refresh" loading={pending} onClick={generate}>
              Regenerar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DraftPreview({ draft }: { draft: ProductDraft }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-4">
      <p className="text-[13.5px] font-semibold text-ink-900">{draft.subtitle}</p>
      <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-600">
        {draft.description}
      </p>

      {draft.benefits?.length ? (
        <>
          <p className="mt-4 text-[12px] font-semibold uppercase tracking-wider text-ink-400">
            Beneficios
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {draft.benefits.map((benefit) => (
              <li key={benefit} className="flex gap-2 text-[13px] text-ink-700">
                <Icon name="check" size={14} className="mt-1 shrink-0 text-accent-600" />
                {benefit}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {draft.outline?.length ? (
        <>
          <p className="mt-4 text-[12px] font-semibold uppercase tracking-wider text-ink-400">
            Índice propuesto
          </p>
          <ol className="mt-1.5 flex flex-col gap-2">
            {draft.outline.map((chapter, index) => (
              <li key={`${chapter.chapter}-${index}`} className="rounded-xl bg-ink-50 p-3">
                <p className="text-[13px] font-semibold text-ink-900">
                  {index + 1}. {chapter.chapter}
                </p>
                <p className="mt-0.5 text-[12.5px] text-ink-600">{chapter.summary}</p>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </div>
  );
}
