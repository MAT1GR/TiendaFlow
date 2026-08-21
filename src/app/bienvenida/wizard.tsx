"use client";

import { useActionState, useMemo, useState } from "react";

import { completeOnboardingAction } from "@/app/actions/auth";
import { DISPLAY_FONTS, PRESETS, themeVars, type Preset } from "@/components/landing/theme";
import { Alert } from "@/components/ui/feedback";
import { Icon, type IconName } from "@/components/ui/icon";
import { Button, Card, Field, Input, Stepper } from "@/components/ui/primitives";
import { PLAN_IDS, PLANS } from "@/lib/plans";
import { cn, slugify } from "@/lib/utils";

/**
 * El alta de la primera tienda.
 *
 * No es un cuestionario: es la tienda naciendo. El vendedor le pone nombre,
 * dice qué va a vender y elige los colores, y cada paso se ve aplicado al
 * instante en la vista previa de la derecha. Cuando termina, eso que vio ya
 * está guardado: el nombre es su tienda, los colores son los que va a heredar
 * cada página de venta que arme después.
 *
 * Dos preguntas se sacaron de acá. La de "¿de dónde viene tu tráfico?", porque
 * no cambiaba nada de lo que la app hacía después y era la única del alta que
 * exigía saber jerga de marketing. Y la de "¿qué querés hacer primero?", porque
 * no era una elección real: sin producto no hay oferta, ni página, ni cobro.
 * El alta termina siempre en la creación del producto.
 */

interface Choice {
  value: string;
  label: string;
  hint: string;
  icon: IconName;
}

const SOURCES: Choice[] = [
  { value: "ebook", label: "Tengo un ebook", hint: "Lo subís y armamos la oferta.", icon: "file" },
  { value: "ia", label: "Quiero crear un ebook con IA", hint: "Partimos de una idea.", icon: "sparkles" },
  { value: "otro", label: "Tengo otro producto digital", hint: "Plantillas, guías, packs.", icon: "box" },
  { value: "cero", label: "Quiero empezar desde cero", hint: "Te guiamos paso a paso.", icon: "rocket" },
];

const STEPS = ["Tu tienda", "Qué vendés", "Colores", "Tu plan"];

export function OnboardingWizard({ firstName }: { firstName: string }) {
  const [state, formAction, pending] = useActionState(completeOnboardingAction, null);
  const [step, setStep] = useState(0);
  const [storeName, setStoreName] = useState("");
  const [presetId, setPresetId] = useState(PRESETS[0].preset);
  const [productSource, setProductSource] = useState("");
  /*
   * Arranca en Free y no es un default de conveniencia: es el plan correcto
   * para alguien que todavía no vendió nada. Los pagos se muestran igual, con
   * la facturación a partir de la cual conviene cada uno, para que el vendedor
   * entienda desde el día uno que la comisión baja a medida que crece.
   */
  const [plan, setPlan] = useState<string>("free");

  const preset = useMemo(
    () => PRESETS.find((item) => item.preset === presetId) ?? PRESETS[0],
    [presetId],
  );

  const slug = slugify(storeName);
  const nombreVisible = storeName.trim() || "Tu tienda";

  // Cada paso decide solo si está completo. El botón de avanzar lee esto y
  // nada más: así agregar un paso no obliga a tocar la navegación.
  const listo = [
    Boolean(storeName.trim()),
    Boolean(productSource),
    true, // siempre hay un color elegido
    true, // siempre hay un plan elegido
  ][step];

  const isLast = step === STEPS.length - 1;

  return (
    <Card className="tf-rise p-6 sm:p-8">
      {step === 0 ? (
        <div className="mb-7">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink-900">
            Bienvenido a TiendaFlow, {firstName}
          </h1>
          <p className="mt-2 text-[15px] text-ink-500">
            Vamos a crear tu primera tienda. Son cuatro pasos y la vas viendo mientras la armás.
          </p>
        </div>
      ) : null}

      <Stepper steps={STEPS} current={step} className="mb-7" />

      {state && !state.ok ? (
        <Alert tone="error" className="mb-5">
          {state.error}
        </Alert>
      ) : null}

      <form
        action={formAction}
        onKeyDown={(event) => {
          /*
           * Enter dentro de un campo avanza al paso siguiente, no envía el alta.
           *
           * Un formulario con un solo campo de texto se envía solo al apretar
           * Enter, aunque el botón de submit todavía no esté en pantalla. Sin
           * esto, escribir el nombre de la tienda y apretar Enter salteaba
           * colores y objetivo y creaba la tienda a medio configurar.
           *
           * Solo interceptamos cuando el foco está en un input: los botones de
           * opción ya responden a Enter con su propio click.
           */
          if (event.key !== "Enter") return;
          if (!(event.target instanceof HTMLInputElement)) return;
          if (isLast) return;
          event.preventDefault();
          if (listo) setStep((value) => value + 1);
        }}
      >
        <input type="hidden" name="store_name" value={storeName} />
        <input type="hidden" name="theme_preset" value={presetId} />
        <input type="hidden" name="product_source" value={productSource} />
        <input type="hidden" name="plan" value={plan} />

        {step === 0 ? (
          <fieldset>
            <legend className="text-[20px] font-semibold tracking-tight text-ink-900">
              ¿Cómo se llama tu tienda?
            </legend>
            <p className="mt-1 text-[14px] text-ink-500">
              Es el nombre que van a ver tus compradores. Lo podés cambiar cuando quieras.
            </p>

            <div className="mt-5 max-w-md">
              <Field
                label="Nombre de la tienda"
                hint={
                  slug
                    ? `Tu dirección va a ser ${slug}.tiendaflow.com`
                    : "Con esto armamos la dirección de tu tienda."
                }
                required
              >
                <Input
                  name="store_name_visible"
                  value={storeName}
                  onChange={(event) => setStoreName(event.target.value)}
                  placeholder="Ej: Taller de Cerámica Luz"
                  maxLength={60}
                  autoFocus
                />
              </Field>
            </div>
          </fieldset>
        ) : null}

        {step === 1 ? (
          <Opciones
            title="¿Qué querés vender?"
            subtitle="Con esto decidimos por dónde arrancar."
            choices={SOURCES}
            selected={productSource}
            onSelect={setProductSource}
          />
        ) : null}

        {step === 2 ? (
          <fieldset>
            <legend className="text-[20px] font-semibold tracking-tight text-ink-900">
              Elegí los colores de tu tienda
            </legend>
            <p className="mt-1 text-[14px] text-ink-500">
              Todas las páginas que armes van a nacer con este estilo. Después podés cambiarle
              cada color a mano.
            </p>

            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
              <div className="grid grid-cols-2 gap-2 self-start">
                {PRESETS.map((item) => {
                  const active = item.preset === presetId;
                  return (
                    <button
                      key={item.preset}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setPresetId(item.preset)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all",
                        active
                          ? "border-brand-400 bg-brand-50 ring-4 ring-brand-500/10"
                          : "border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50/60",
                      )}
                    >
                      <span className="flex shrink-0 overflow-hidden rounded-md">
                        {item.swatch.map((color) => (
                          <span key={color} className="size-4" style={{ backgroundColor: color }} />
                        ))}
                      </span>
                      <span className="truncate text-[12.5px] font-medium text-ink-800">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <StorePreview preset={preset} storeName={nombreVisible} />
            </div>

          </fieldset>
        ) : null}

        {step === 3 ? (
          <fieldset>
            <legend className="text-[20px] font-semibold tracking-tight text-ink-900">
              Elegí con qué plan arrancás
            </legend>
            <p className="mt-1 text-[14px] text-ink-500">
              Podés cambiarlo cuando quieras. Si todavía no vendiste nada, Free es el que te
              conviene: no tiene abono y solo pagás cuando cobrás.
            </p>

            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {PLAN_IDS.map((id) => {
                const opcion = PLANS[id];
                const activo = plan === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => setPlan(id)}
                    className={cn(
                      "flex flex-col rounded-2xl border p-4 text-left transition-all",
                      activo
                        ? "border-brand-400 bg-brand-50/70 ring-4 ring-brand-500/10"
                        : "border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50/60",
                    )}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-[14px] font-semibold text-ink-900">{opcion.name}</span>
                      <span className="text-[15px] font-semibold tracking-tight text-ink-900">
                        {opcion.priceUsd === 0 ? "Gratis" : `US$${opcion.priceUsd}`}
                        {opcion.priceUsd > 0 ? (
                          <span className="text-[11.5px] font-medium text-ink-400">/mes</span>
                        ) : null}
                      </span>
                    </span>

                    <span className="mt-1 text-[12.5px] text-ink-500">{opcion.blurb}</span>

                    <span className="mt-2.5 inline-flex w-fit rounded-lg bg-white px-2 py-1 text-[11.5px] font-semibold text-ink-700 ring-1 ring-ink-200">
                      Comisión {Math.round(opcion.commissionRate * 100)}% por venta
                    </span>

                    {opcion.worthItFromUsd ? (
                      <span className="mt-2 text-[11.5px] text-ink-400">
                        Conviene si facturás más de US$
                        {opcion.worthItFromUsd.toLocaleString("es-AR")} por mes
                      </span>
                    ) : (
                      <span className="mt-2 text-[11.5px] text-ink-400">
                        Sin tarjeta y sin vencimiento
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {plan !== "free" ? (
              <Alert tone="warning" className="mt-4">
                Todavía no cobramos el abono: falta conectar el proveedor de facturación. Vas a
                tener el plan {PLANS[plan as keyof typeof PLANS].name} activo y la comisión más baja
                desde tu primera venta, y te avisamos antes del primer cobro.
              </Alert>
            ) : null}

            <p className="mt-4 text-[13px] text-ink-500">
              Al terminar te llevamos a cargar tu primer producto: es lo primero que necesita
              cualquier tienda para poder vender.
            </p>
          </fieldset>
        ) : null}

        <div className="mt-7 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            icon="chevronLeft"
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            className={step === 0 ? "invisible" : undefined}
          >
            Atrás
          </Button>

          {/*
            Las `key` distintas no son decorativas: sin ellas React reutiliza el
            mismo <button> del DOM y le cambia `type` de "button" a "submit"
            mientras se está procesando el click que lleva al último paso. El
            navegador entonces envía el formulario con ese mismo click y el alta
            se completa sin que el vendedor haya elegido los colores.
          */}
          {isLast ? (
            <Button
              key="enviar"
              type="submit"
              size="lg"
              disabled={!listo}
              loading={pending}
              iconRight="arrowRight"
            >
              Crear mi tienda y cargar mi producto
            </Button>
          ) : (
            <Button
              key="siguiente"
              type="button"
              size="lg"
              disabled={!listo}
              iconRight="arrowRight"
              onClick={() => setStep((value) => value + 1)}
            >
              Siguiente
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Piezas                                                                      */
/* -------------------------------------------------------------------------- */

function Opciones({
  title,
  subtitle,
  choices,
  selected,
  onSelect,
}: {
  title: string;
  subtitle: string;
  choices: Choice[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-[20px] font-semibold tracking-tight text-ink-900">{title}</legend>
      <p className="mt-1 text-[14px] text-ink-500">{subtitle}</p>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {choices.map((choice) => {
          const active = selected === choice.value;
          return (
            <button
              key={choice.value}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(choice.value)}
              className={cn(
                "flex items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                active
                  ? "border-brand-400 bg-brand-50/70 ring-4 ring-brand-500/10"
                  : "border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50/60",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl",
                  active ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500",
                )}
              >
                <Icon name={choice.icon} size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-ink-900">{choice.label}</span>
                <span className="mt-0.5 block text-[12.5px] text-ink-500">{choice.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * La tienda, en chiquito.
 *
 * Elegir una paleta mirando seis cuadraditos no dice nada. Acá se ve el mismo
 * fondo, la misma tipografía y el mismo botón que va a tener la página real,
 * con el nombre que el vendedor acaba de escribir.
 */
function StorePreview({ preset, storeName }: { preset: Preset; storeName: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 shadow-soft">
      <div className="flex items-center gap-1.5 border-b border-ink-200 bg-ink-50 px-3 py-2">
        <span className="size-2 rounded-full bg-ink-300" />
        <span className="size-2 rounded-full bg-ink-300" />
        <span className="size-2 rounded-full bg-ink-300" />
        <span className="ml-2 truncate text-[11px] text-ink-400">
          {slugify(storeName) || "tu-tienda"}.tiendaflow.com
        </span>
      </div>

      <div className="px-5 py-6" style={themeVars(preset)}>
        <p
          className="text-[10px] font-semibold uppercase tracking-[.18em]"
          style={{ color: "var(--tf-accent)" }}
        >
          Nuevo
        </p>
        <p
          className="mt-2 text-[22px] font-bold leading-tight"
          style={{ fontFamily: DISPLAY_FONTS[preset.display].stack }}
        >
          {storeName}
        </p>
        <p className="mt-1.5 text-[12.5px]" style={{ color: "var(--tf-muted)" }}>
          Acá van a aparecer los productos que publiques.
        </p>

        <div
          className="mt-4 border p-3.5"
          style={{
            backgroundColor: "var(--tf-surface)",
            borderColor: "var(--tf-line)",
            borderRadius: "var(--tf-radius)",
          }}
        >
          <p className="text-[13px] font-semibold">Tu primer producto</p>
          <p className="mt-0.5 text-[11.5px]" style={{ color: "var(--tf-muted)" }}>
            Guía digital · Acceso inmediato
          </p>
          <span
            className="mt-3 inline-block px-3.5 py-1.5 text-[12px] font-semibold"
            style={{
              backgroundColor: "var(--tf-accent)",
              color: "var(--tf-on-accent)",
              borderRadius: "calc(var(--tf-radius) * .75)",
            }}
          >
            Quiero mi acceso
          </span>
        </div>
      </div>
    </div>
  );
}
