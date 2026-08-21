"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { applyProductDraftAction, generateProductDraftAction } from "@/app/actions/ai";
import { MoreOptions } from "@/components/ui/explain";
import { Alert, TemplateNotice } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import {
  Button,
  Card,
  Field,
  Input,
  Stepper,
  Textarea,
  useToast,
} from "@/components/ui/primitives";
import type { ProductDraft } from "@/lib/ai/tasks";
import { withFlow } from "@/lib/product-flow";
import { cn } from "@/lib/utils";

/**
 * Crear un producto: dos datos y la IA escribe la carta de ventas.
 *
 * Antes esto eran seis pasos y catorce campos, y tres de esos campos —"para
 * quién es", "problema principal", "transformación"— le pedían al vendedor que
 * hiciera el trabajo de un copywriter antes de tener siquiera el producto
 * cargado. El que no sabe qué poner ahí lo deja vacío, y con esos campos vacíos
 * la oferta, la página de venta y los anuncios salen genéricos.
 *
 * Ahora el vendedor pone el nombre y cuenta con sus palabras qué vende. De ahí
 * la IA deduce el avatar, el dolor y la transformación, y escribe el resto. El
 * segundo paso muestra todo eso **editable**: la IA propone, el vendedor
 * corrige. Nada se guarda sin que él lo haya visto.
 *
 * Lo que se sacó de acá no desapareció: la portada, los archivos y la entrega
 * se editan en la ficha del producto, donde igual hay que volver.
 */

const STEPS = ["Tu producto", "Tu carta de ventas"];

export function NewProductFlow({
  aiConfigured,
  yaLoTiene,
}: {
  aiConfigured: boolean;
  /** Viene del alta: si ya tiene el material, la IA no le inventa un índice. */
  yaLoTiene?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [isTemplate, setIsTemplate] = useState(false);
  const [warning, setWarning] = useState<string | undefined>();
  const [titulo, setTitulo] = useState("");

  /** Edita un campo del borrador. La IA propone, el vendedor manda. */
  function editar(patch: Partial<ProductDraft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function generar() {
    setError(null);
    if (!nombre.trim()) {
      setError("Poné el nombre de tu producto.");
      return;
    }
    if (descripcion.trim().length < 20) {
      setError("Contanos un poco más: con dos o tres líneas la IA ya puede armar la carta.");
      return;
    }

    startTransition(async () => {
      const result = await generateProductDraftAction({
        topic: descripcion,
        productName: nombre,
        yaLoTiene,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDraft(result.data.data);
      setIsTemplate(result.data.isTemplate);
      setWarning(result.data.warning);
      setTitulo(nombre.trim());
      setStep(1);
    });
  }

  function crear() {
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      const result = await applyProductDraftAction(draft, titulo, {
        topic: descripcion,
        productName: nombre,
      });
      if (result.ok) {
        toast.success("Producto creado", "Seguimos con el precio.");
        // Sin escalas: el paso siguiente del paso a paso es ponerle precio, y
        // pasar por el menú del producto para llegar ahí solo agrega un click
        // y la sensación de haber terminado algo que recién empieza.
        router.push(withFlow(`/app/ofertas/nueva?producto=${result.data.id}`));
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

      {step === 0 ? (
        <Card className="p-6">
          <h2 className="text-[18px] font-semibold text-ink-900">Contanos qué vendés</h2>
          <p className="mt-1 text-[13.5px] text-ink-500">
            Con el nombre y una descripción alcanza. Con eso escribimos a quién le hablás, qué
            problema le resolvés, los beneficios y el texto de tu página de venta.
          </p>

          <div className="mt-5 flex flex-col gap-4">
            <Field label="Nombre del producto" required>
              <Input
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Guía de Hábitos Saludables"
                autoFocus
              />
            </Field>

            <Field
              label="¿Qué es y a quién ayuda?"
              hint="Escribilo como se lo contarías a un amigo. Con tres o cuatro líneas alcanza."
              required
            >
              <Textarea
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
                rows={7}
                placeholder={
                  "Es una guía de 21 días para gente que arranca mil veces con los hábitos y abandona a la semana.\n" +
                  "Adentro hay rutinas de 10 minutos, un plan para los días sin ganas y plantillas para hacer el seguimiento.\n" +
                  "La armé después de probar de todo y darme cuenta de que el problema no era la fuerza de voluntad."
                }
              />
            </Field>

            {!aiConfigured ? (
              <Alert tone="info">
                Todavía no hay un proveedor de IA conectado. Vamos a armar un borrador local con lo
                que escribiste: te sirve para arrancar, pero conviene revisarlo entero.
              </Alert>
            ) : null}

            <div className="flex justify-end border-t border-ink-100 pt-5">
              <Button variant="ai" size="lg" icon="sparkles" loading={pending} onClick={generar}>
                Armar mi carta de ventas
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {step === 1 && draft ? (
        <>
          {isTemplate ? <TemplateNotice warning={warning} /> : null}

          <Card className="p-6">
            <h2 className="text-[18px] font-semibold text-ink-900">Esta es tu carta de ventas</h2>
            <p className="mt-1 text-[13.5px] text-ink-500">
              Revisala y corregí lo que no te cierre. Estos tres campos son los que después usamos
              para escribir tu oferta, tu página y tus anuncios.
            </p>

            <div className="mt-5 flex flex-col gap-4">
              <Field label="Título" required>
                <Input value={titulo} onChange={(event) => setTitulo(event.target.value)} />
              </Field>

              {draft.titles?.length ? (
                <MoreOptions label="¿Querés probar otro título?">
                  <div className="flex flex-col gap-1.5">
                    {draft.titles.map((opcion) => (
                      <button
                        key={opcion}
                        type="button"
                        onClick={() => setTitulo(opcion)}
                        className={cn(
                          "rounded-xl border px-3.5 py-2.5 text-left text-[13.5px] transition-colors",
                          titulo === opcion
                            ? "border-brand-400 bg-brand-50/60 font-semibold text-ink-900"
                            : "border-ink-200 text-ink-700 hover:border-ink-300 hover:bg-ink-50/60",
                        )}
                      >
                        {opcion}
                      </button>
                    ))}
                  </div>
                </MoreOptions>
              ) : null}

              <Nucleo
                icon="users"
                label="A quién le hablás"
                hint="El avatar: quién es y en qué momento está."
                value={draft.audience ?? ""}
                onChange={(value) => editar({ audience: value })}
              />
              <Nucleo
                icon="warning"
                label="El problema que resolvés"
                hint="El dolor, dicho como lo diría esa persona."
                value={draft.main_problem ?? ""}
                onChange={(value) => editar({ main_problem: value })}
              />
              <Nucleo
                icon="rocket"
                label="En qué queda cuando termina"
                hint="La transformación: el después."
                value={draft.transformation ?? ""}
                onChange={(value) => editar({ transformation: value })}
              />

              <Field label="Subtítulo" hint="Una línea que resuma el resultado.">
                <Input
                  value={draft.subtitle ?? ""}
                  onChange={(event) => editar({ subtitle: event.target.value })}
                />
              </Field>

              <Field label="Beneficios" hint="Uno por línea. Resultados, no características.">
                <Textarea
                  rows={6}
                  value={(draft.benefits ?? []).join("\n")}
                  onChange={(event) =>
                    editar({ benefits: event.target.value.split("\n").filter(Boolean) })
                  }
                />
              </Field>

              <Field label="Descripción">
                <Textarea
                  rows={7}
                  value={draft.description ?? ""}
                  onChange={(event) => editar({ description: event.target.value })}
                />
              </Field>
            </div>
          </Card>

          {draft.outline?.length || draft.faq?.length ? (
            <Card className="p-6">
              <h3 className="text-[15px] font-semibold text-ink-900">
                Además te dejamos esto adentro del producto
              </h3>
              <p className="mt-1 text-[13.5px] text-ink-500">
                Lo podés editar después, desde la ficha del producto.
              </p>

              {draft.outline?.length ? (
                <>
                  <p className="mt-5 text-[12px] font-semibold uppercase tracking-wider text-ink-400">
                    Índice propuesto
                  </p>
                  <ol className="mt-2 flex flex-col gap-2">
                    {draft.outline.map((capitulo, index) => (
                      <li key={`${capitulo.chapter}-${index}`} className="rounded-xl bg-ink-50 p-3">
                        <p className="text-[13px] font-semibold text-ink-900">
                          {index + 1}. {capitulo.chapter}
                        </p>
                        <p className="mt-0.5 text-[12.5px] text-ink-600">{capitulo.summary}</p>
                      </li>
                    ))}
                  </ol>
                </>
              ) : null}

              {draft.faq?.length ? (
                <>
                  <p className="mt-5 text-[12px] font-semibold uppercase tracking-wider text-ink-400">
                    Preguntas frecuentes
                  </p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {draft.faq.map((item, index) => (
                      <li key={`${item.question}-${index}`} className="rounded-xl bg-ink-50 p-3">
                        <p className="text-[13px] font-semibold text-ink-900">{item.question}</p>
                        <p className="mt-0.5 text-[12.5px] text-ink-600">{item.answer}</p>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </Card>
          ) : null}

          <Card className="p-6">
            <Alert tone="ai">
              Se crea como borrador. Después de crearlo te llevamos a ponerle precio y armar la
              oferta; la portada, los archivos y la entrega se cargan en la ficha del producto.
            </Alert>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-5">
              <Button
                type="button"
                variant="ghost"
                icon="chevronLeft"
                onClick={() => setStep(0)}
              >
                Cambiar lo que escribí
              </Button>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" icon="refresh" loading={pending} onClick={generar}>
                  Regenerar
                </Button>
                <Button size="lg" icon="check" loading={pending} onClick={crear}>
                  Crear producto
                </Button>
              </div>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Uno de los tres campos que sostienen todo lo demás.
 *
 * Van destacados a propósito: si el vendedor solo lee una cosa de esta
 * pantalla, tienen que ser estos tres.
 */
function Nucleo({
  icon,
  label,
  hint,
  value,
  onChange,
}: {
  icon: "users" | "warning" | "rocket";
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
      <div className="mb-2.5 flex items-start gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
          <Icon name={icon} size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-ink-900">{label}</p>
          <p className="text-[12px] text-ink-500">{hint}</p>
        </div>
      </div>
      <Textarea
        rows={2}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-white"
      />
    </div>
  );
}
