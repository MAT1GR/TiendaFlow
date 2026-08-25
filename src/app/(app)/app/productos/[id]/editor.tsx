"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";

import { rewriteTextAction } from "@/app/actions/ai";
import {
  addProductFileAction,
  deleteProductFileAction,
  updateProductAction,
} from "@/app/actions/catalog";
import { AiProgress, useAiProgress } from "@/components/app/ai-progress";
import { Alert } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Select,
  Tabs,
  Textarea,
  useToast,
} from "@/components/ui/primitives";
import { formatDate, formatMoney, PRODUCT_TYPE_LABEL, STATUS_LABEL, statusTone } from "@/lib/utils";
import type { Product, ProductFile } from "@/lib/types";

export function ProductEditor({
  product,
  files,
  benefits,
  outline,
  offers,
  currency,
}: {
  product: Product;
  files: ProductFile[];
  benefits: string[];
  outline: {
    chapters?: Array<{ chapter: string; summary: string }>;
    faq?: Array<{ question: string; answer: string }>;
  };
  offers: Array<{ id: string; name: string; status: string }>;
  currency: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState("info");
  const [state, formAction, pending] = useActionState(updateProductAction, null);
  const [description, setDescription] = useState(product.description ?? "");
  /*
   * La portada vive en el estado y no en un `defaultValue` porque abajo se
   * dibuja: pegar la URL y ver la imagen en el momento es la única forma de
   * saber que el link sirve antes de que salga publicada en la página de venta.
   */
  const [cover, setCover] = useState(product.cover_url ?? "");
  const ai = useAiProgress();

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Guardado.");
      router.refresh();
    }
  }, [state, toast, router]);

  const ETIQUETA_REESCRITURA = {
    improve: "Mejorando tu texto",
    expand: "Ampliando tu texto",
    shorten: "Acortando tu texto",
  } as const;

  function rewrite(action: "improve" | "expand" | "shorten") {
    return ai.run(ETIQUETA_REESCRITURA[action], async () => {
      const result = await rewriteTextAction({
        text: description,
        action,
        context: `Descripción del producto "${product.name}" para ${product.audience ?? "su audiencia"}.`,
      });
      if (!result.ok) {
        toast.error("No pudimos reescribir el texto", result.error);
        return false;
      }
      setDescription(result.data.data.text);
      if (result.data.isTemplate) {
        toast.toast({
          title: "Sin proveedor de IA conectado",
          description:
            action === "shorten"
              ? "Acortamos el texto localmente. Conectá un proveedor para reescrituras reales."
              : "No hay proveedor conectado, así que dejamos tu texto igual.",
          tone: "info",
        });
      } else {
        toast.success("Texto reescrito.");
      }
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "info", label: "Información" },
            { value: "files", label: "Archivos", count: files.length },
            { value: "delivery", label: "Entrega" },
            { value: "content", label: "Contenido" },
          ]}
        />

        {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}

        <form action={formAction}>
          <input type="hidden" name="id" value={product.id} />
          {/* Los campos que no están en la pestaña visible viajan igual, ocultos,
              para que guardar desde cualquier pestaña no borre el resto. */}

          <div className={tab === "info" ? "block" : "hidden"}>
            <Card className="flex flex-col gap-4 p-5">
              <Field label="Nombre" required>
                <Input name="name" defaultValue={product.name} required />
              </Field>
              <Field label="Subtítulo">
                <Input name="subtitle" defaultValue={product.subtitle ?? ""} />
              </Field>

              <Field
                label="Portada"
                hint="La imagen de tu producto. Es lo que se ve en tu página de venta."
              >
                <Input
                  name="cover_url"
                  value={cover}
                  placeholder="https://…"
                  onChange={(event) => setCover(event.target.value)}
                />
              </Field>

              {cover ? (
                <div className="-mt-1 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- la URL la pega el vendedor: puede ser de cualquier dominio. */}
                  <img
                    src={cover}
                    alt="Portada del producto"
                    className="h-24 w-20 rounded-lg border border-ink-200 object-contain"
                  />
                  <p className="text-[12.5px] text-ink-500">
                    Así se va a ver en tu página. Si no aparece nada, revisá el link.
                  </p>
                </div>
              ) : null}

              <Field
                label="Descripción"
                hint="Este texto alimenta la landing y la página de gracias."
              >
                <Textarea
                  name="description"
                  rows={6}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>

              <div className="-mt-1 flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon="sparkles"
                  loading={ai.running}
                  onClick={() => rewrite("improve")}
                >
                  Mejorar
                </Button>
                <Button type="button" variant="ghost" size="sm" loading={ai.running} onClick={() => rewrite("expand")}>
                  Ampliar
                </Button>
                <Button type="button" variant="ghost" size="sm" loading={ai.running} onClick={() => rewrite("shorten")}>
                  Acortar
                </Button>
              </div>

              <AiProgress running={ai.running} progress={ai.progress} label={ai.label} />

              <Field label="Descripción corta" hint="Máximo 160 caracteres, se usa en previews.">
                <Input
                  name="short_description"
                  defaultValue={product.short_description ?? ""}
                  maxLength={160}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tipo">
                  <Select name="type" defaultValue={product.type}>
                    {Object.entries(PRODUCT_TYPE_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Estado">
                  <Select name="status" defaultValue={product.status}>
                    <option value="draft">Borrador</option>
                    <option value="active">Activo</option>
                    <option value="archived">Archivado</option>
                  </Select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Categoría">
                  <Input name="category" defaultValue={product.category ?? ""} />
                </Field>
                <Field label={`Precio base (${currency})`}>
                  <Input
                    name="base_price"
                    type="number"
                    min={0}
                    step="any"
                    defaultValue={product.base_price}
                  />
                </Field>
              </div>

              <Field label="Para quién es">
                <Input name="audience" defaultValue={product.audience ?? ""} />
              </Field>
              <Field label="Problema principal">
                <Input name="main_problem" defaultValue={product.main_problem ?? ""} />
              </Field>
              <Field label="Transformación principal">
                <Input name="transformation" defaultValue={product.transformation ?? ""} />
              </Field>
              <Field label="Beneficios" hint="Uno por línea.">
                <Textarea name="benefits" rows={5} defaultValue={benefits.join("\n")} />
              </Field>
            </Card>
          </div>

          <div className={tab === "delivery" ? "block" : "hidden"}>
            <Card className="flex flex-col gap-4 p-5">
              <Field label="Tipo de entrega">
                <Select name="delivery_type" defaultValue={product.delivery_type}>
                  <option value="download">Descarga directa</option>
                  <option value="email">Envío por email</option>
                  <option value="access">Página de acceso</option>
                  <option value="external">Link externo</option>
                </Select>
              </Field>
              <Field label="Mensaje de la página de gracias">
                <Textarea name="delivery_message" rows={4} defaultValue={product.delivery_message ?? ""} />
              </Field>
              <Alert tone="info">
                La página de gracias de cada funnel usa este mensaje y muestra los archivos que
                cargaste acá.
              </Alert>
            </Card>
          </div>

          {tab !== "info" ? (
            <>
              <input type="hidden" name="name" value={product.name} />
              <input type="hidden" name="subtitle" value={product.subtitle ?? ""} />
              <input type="hidden" name="cover_url" value={cover} />
              <input type="hidden" name="description" value={description} />
              <input type="hidden" name="short_description" value={product.short_description ?? ""} />
              <input type="hidden" name="type" value={product.type} />
              <input type="hidden" name="status" value={product.status} />
              <input type="hidden" name="category" value={product.category ?? ""} />
              <input type="hidden" name="base_price" value={product.base_price} />
              <input type="hidden" name="audience" value={product.audience ?? ""} />
              <input type="hidden" name="main_problem" value={product.main_problem ?? ""} />
              <input type="hidden" name="transformation" value={product.transformation ?? ""} />
              <input type="hidden" name="benefits" value={benefits.join("\n")} />
            </>
          ) : null}
          {tab !== "delivery" ? (
            <>
              <input type="hidden" name="delivery_type" value={product.delivery_type} />
              <input type="hidden" name="delivery_message" value={product.delivery_message ?? ""} />
            </>
          ) : null}

          {tab === "info" || tab === "delivery" ? (
            <div className="mt-4 flex justify-end">
              <Button type="submit" loading={pending} icon="check">
                Guardar cambios
              </Button>
            </div>
          ) : null}
        </form>

        {tab === "files" ? <FilesPanel productId={product.id} files={files} /> : null}

        {tab === "content" ? (
          <Card className="p-5">
            <CardHeader
              title="Contenido generado"
              subtitle="Índice y preguntas frecuentes guardadas con el producto"
              className="px-0 pt-0"
            />
            {!outline.chapters?.length && !outline.faq?.length ? (
              <p className="mt-4 text-[13.5px] text-ink-500">
                Este producto no tiene índice ni FAQ guardados. Podés generarlos creando un producto
                con IA o cargándolos a mano en la descripción.
              </p>
            ) : (
              <div className="mt-4 flex flex-col gap-5">
                {outline.chapters?.length ? (
                  <div>
                    <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-400">
                      Índice
                    </p>
                    <ol className="flex flex-col gap-2">
                      {outline.chapters.map((chapter, index) => (
                        <li key={`${chapter.chapter}-${index}`} className="rounded-xl bg-ink-50 p-3">
                          <p className="text-[13.5px] font-semibold text-ink-900">
                            {index + 1}. {chapter.chapter}
                          </p>
                          <p className="mt-0.5 text-[12.5px] text-ink-600">{chapter.summary}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {outline.faq?.length ? (
                  <div>
                    <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-400">
                      Preguntas frecuentes
                    </p>
                    <dl className="flex flex-col gap-2">
                      {outline.faq.map((item, index) => (
                        <div key={index} className="rounded-xl border border-ink-200 p-3">
                          <dt className="text-[13.5px] font-semibold text-ink-900">{item.question}</dt>
                          <dd className="mt-0.5 text-[12.5px] text-ink-600">{item.answer}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}
              </div>
            )}
          </Card>
        ) : null}
      </div>

      <aside className="flex flex-col gap-4">
        <Card className="p-5">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">Resumen</p>
          <dl className="mt-3 flex flex-col gap-2.5 text-[13px]">
            <Row label="Estado">
              <Badge tone={statusTone(product.status)}>
                {STATUS_LABEL[product.status] ?? product.status}
              </Badge>
            </Row>
            <Row label="Tipo">{PRODUCT_TYPE_LABEL[product.type] ?? product.type}</Row>
            <Row label="Precio base">{formatMoney(product.base_price, product.currency)}</Row>
            <Row label="Archivos">{files.length}</Row>
            <Row label="Creado">{formatDate(product.created_at)}</Row>
            <Row label="Actualizado">{formatDate(product.updated_at)}</Row>
          </dl>
        </Card>

        <Card className="p-5">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">
            Ofertas con este producto
          </p>
          {offers.length === 0 ? (
            <>
              <p className="mt-3 text-[13px] text-ink-500">
                Todavía no armaste una oferta con este producto.
              </p>
              <Button
                variant="ai"
                size="sm"
                icon="sparkles"
                full
                className="mt-3"
                onClick={() => router.push(`/app/ofertas/nueva?producto=${product.id}&ia=1`)}
              >
                Crear oferta con IA
              </Button>
            </>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {offers.map((offer) => (
                <li key={offer.id}>
                  <Link
                    href={`/app/ofertas/${offer.id}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-ink-200 px-3 py-2 hover:border-ink-300 hover:bg-ink-50"
                  >
                    <span className="truncate text-[13px] font-medium text-ink-800">{offer.name}</span>
                    <Badge tone={statusTone(offer.status)}>
                      {STATUS_LABEL[offer.status] ?? offer.status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div
            className="flex aspect-[3/4] flex-col justify-between p-5 text-white"
            style={{ background: "linear-gradient(150deg,#6D5DFB,#22D3EE)" }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/70">
              {PRODUCT_TYPE_LABEL[product.type] ?? product.type}
            </span>
            <div>
              <p className="text-[19px] font-semibold leading-tight">{product.name}</p>
              {product.subtitle ? (
                <p className="mt-1.5 text-[12.5px] text-white/75">{product.subtitle}</p>
              ) : null}
            </div>
          </div>
        </Card>
      </aside>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-500">{label}</dt>
      <dd className="font-medium text-ink-900">{children}</dd>
    </div>
  );
}

function FilesPanel({ productId, files }: { productId: string; files: ProductFile[] }) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction, pending] = useActionState(addProductFileAction, null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (state?.ok) {
      toast.toast({ title: "Archivo registrado", description: state.message, tone: "info" });
      router.refresh();
    }
  }, [state, toast, router]);

  return (
    <Card className="p-5">
      <CardHeader
        title="Archivos"
        subtitle="Lo que recibe la persona después de comprar"
        className="px-0 pt-0"
      />

      <Alert tone="warning" className="mt-4">
        El almacenamiento de archivos todavía no está conectado. Registramos nombre, tipo y peso
        para armar la entrega, pero el binario no se sube.
      </Alert>

      {state && !state.ok ? (
        <Alert tone="error" className="mt-3">
          {state.error}
        </Alert>
      ) : null}

      {files.length ? (
        <ul className="mt-4 flex flex-col gap-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-3 rounded-xl border border-ink-200 px-3.5 py-2.5"
            >
              <Icon name="file" size={17} className="shrink-0 text-ink-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-ink-900">
                  {file.file_name}
                </span>
                <span className="text-[11.5px] text-ink-500">
                  {file.file_size ? `${(file.file_size / 1024 / 1024).toFixed(2)} MB` : "Sin peso registrado"}
                </span>
              </span>
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteProductFileAction(file.id, productId);
                    if (result.ok) {
                      toast.success("Quitamos el archivo.");
                      router.refresh();
                    } else {
                      toast.error("No pudimos quitarlo", result.error);
                    }
                  })
                }
                className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-red-600"
                aria-label={`Quitar ${file.file_name}`}
              >
                <Icon name="trash" size={15} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-[13.5px] text-ink-500">Todavía no registraste archivos.</p>
      )}

      <form action={formAction} className="mt-5 flex flex-col gap-3 border-t border-ink-100 pt-5">
        <input type="hidden" name="product_id" value={productId} />
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <Field label="Nombre del archivo">
            <Input name="file_name" required placeholder="guia-habitos.pdf" />
          </Field>
          <Field label="Peso (bytes)">
            <Input name="file_size" type="number" min={0} defaultValue={0} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" icon="plus" loading={pending}>
            Registrar archivo
          </Button>
        </div>
      </form>
    </Card>
  );
}
