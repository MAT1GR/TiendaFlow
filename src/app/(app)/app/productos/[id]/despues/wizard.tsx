"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { saveOrderBumpAction, saveUpsellAction } from "@/app/actions/catalog";
import { Icon } from "@/components/ui/icon";
import { Button, Field, Input, Modal, Textarea, useToast } from "@/components/ui/primitives";
import { cn, formatMoney } from "@/lib/utils";

/**
 * Agregar una oferta para después de la compra.
 *
 * Cinco preguntas, una por pantalla, en el orden en el que las piensa una
 * persona: qué ofrezco, a cuánto, cómo se lo digo, cómo se va a ver, y recién
 * ahí la activo. Por debajo esto crea un *order bump* o un *upsell*, pero esas
 * dos palabras no aparecen en ningún lado.
 *
 * Se abre con `?agregar=pago` o `?agregar=despues` para que cada momento del
 * recorrido pueda ofrecer su propio botón sin volver toda la pantalla un
 * componente de cliente.
 */

type Moment = "pago" | "despues";

const MOMENTS: Array<{ value: Moment; emoji: string; title: string; blurb: string }> = [
  {
    value: "pago",
    emoji: "➕",
    title: "Mientras está pagando",
    blurb: "Un agregado barato que se suma con un clic, sin salir de la página de pago.",
  },
  {
    value: "despues",
    emoji: "💎",
    title: "Justo después de que compre",
    blurb: "Una segunda oferta cuando ya te compró y ya confía. Suele ser algo más completo.",
  },
];

const TOTAL = 5;

export function AfterPurchaseWizard({
  offerId,
  currency,
  productName,
}: {
  offerId: string;
  currency: string;
  productName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [moment, setMoment] = useState<Moment>("pago");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [pitch, setPitch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Cada momento del recorrido abre el mismo asistente con su propia respuesta
  // a la primera pregunta ya elegida.
  const requested = params.get("agregar");
  useEffect(() => {
    if (requested !== "pago" && requested !== "despues") return;
    setMoment(requested);
    setStep(1);
    setOpen(true);
  }, [requested]);

  function close() {
    setOpen(false);
    setStep(0);
    setError(null);
    if (requested) router.replace(window.location.pathname, { scroll: false });
  }

  const priceValue = Number(price.replace(",", "."));
  const priceOk = Number.isFinite(priceValue) && priceValue > 0;

  function next() {
    setError(null);
    if (step === 1 && !name.trim()) {
      setError("Poné un nombre para que tu comprador sepa qué está agregando.");
      return;
    }
    if (step === 2 && !priceOk) {
      setError("El precio tiene que ser mayor a cero.");
      return;
    }
    setStep((current) => Math.min(current + 1, TOTAL - 1));
  }

  function save() {
    const data = new FormData();
    data.set("offer_id", offerId);
    data.set("name", name.trim());
    data.set("price", String(priceValue));
    data.set("description", pitch.trim());

    if (moment === "pago") {
      data.set("checkbox_label", `Sí, quiero agregar ${name.trim()}`);
      data.set("active", "1");
    } else {
      data.set("accept_label", "Sí, lo quiero agregar");
      data.set("decline_label", "No gracias, seguir sin esto");
    }

    startTransition(async () => {
      const result =
        moment === "pago"
          ? await saveOrderBumpAction(null, data)
          : await saveUpsellAction(null, data);

      if (result.ok) {
        toast.success("Tu oferta ya está activa.");
        close();
        setName("");
        setPrice("");
        setPitch("");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <Button icon="plus" onClick={() => setOpen(true)}>
        Agregar oferta
      </Button>

      <Modal
        open={open}
        onClose={close}
        title="Ofrecerle algo más a quien te compra"
        size="md"
        footer={
          <>
            {step > 0 ? (
              <Button variant="secondary" onClick={() => setStep((c) => c - 1)}>
                Atrás
              </Button>
            ) : null}

            {step < TOTAL - 1 ? (
              <Button onClick={next} iconRight="arrowRight">
                Siguiente
              </Button>
            ) : (
              <Button onClick={save} loading={pending} icon="check">
                Activar
              </Button>
            )}
          </>
        }
      >
        <Progress step={step} />

        {step === 0 ? (
          <Question title="¿En qué momento querés ofrecerlo?">
            <div className="flex flex-col gap-2.5">
              {MOMENTS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setMoment(item.value)}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                    moment === item.value
                      ? "border-brand-400 bg-brand-50/60"
                      : "border-ink-200 hover:bg-ink-50",
                  )}
                >
                  <span className="tf-emoji mt-0.5 shrink-0" aria-hidden="true">
                    {item.emoji}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-ink-900">
                      {item.title}
                    </span>
                    <span className="block text-[13px] leading-relaxed text-ink-500">
                      {item.blurb}
                    </span>
                  </span>
                  {moment === item.value ? (
                    <Icon name="check" size={16} className="ml-auto shrink-0 text-brand-600" />
                  ) : null}
                </button>
              ))}
            </div>
          </Question>
        ) : null}

        {step === 1 ? (
          <Question title="¿Qué querés ofrecer?">
            <Field
              label="Nombre"
              hint="Cómo lo va a ver tu comprador. Por ejemplo: “Plan de comidas de 30 días”."
            >
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Plan de comidas de 30 días"
                autoFocus
              />
            </Field>
          </Question>
        ) : null}

        {step === 2 ? (
          <Question title="¿A qué precio?">
            <Field
              label="Precio"
              hint={
                moment === "pago"
                  ? "Los agregados que mejor funcionan cuestan entre el 15% y el 25% del producto principal."
                  : "Una segunda oferta suele costar parecido o un poco más que el producto principal."
              }
            >
              <Input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                inputMode="decimal"
                placeholder="7000"
                autoFocus
              />
            </Field>
          </Question>
        ) : null}

        {step === 3 ? (
          <Question title="¿Qué querés decirle a tu cliente?">
            <Field
              label="En una o dos líneas"
              hint="Qué se lleva y por qué le conviene sumarlo ahora."
            >
              <Textarea
                rows={4}
                value={pitch}
                onChange={(event) => setPitch(event.target.value)}
                placeholder={`Sumá el plan y sabé exactamente qué comer cada día mientras hacés ${productName}.`}
                autoFocus
              />
            </Field>
          </Question>
        ) : null}

        {step === 4 ? (
          <Question title="Así lo va a ver">
            <Preview
              moment={moment}
              name={name}
              pitch={pitch}
              price={priceOk ? formatMoney(priceValue, currency) : "—"}
            />
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">
              Podés cambiar todo esto cuando quieras. Si no funciona, se apaga y listo.
            </p>
          </Question>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">{error}</p>
        ) : null}
      </Modal>
    </>
  );
}

/* -------------------------------------------------------------------------- */

function Progress({ step }: { step: number }) {
  return (
    <div className="mb-5 flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: TOTAL }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors duration-300",
            index <= step ? "bg-brand-600" : "bg-ink-200",
          )}
        />
      ))}
    </div>
  );
}

function Question({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="tf-rise">
      <h3 className="mb-4 text-[16px] font-semibold tracking-tight text-ink-900">{title}</h3>
      {children}
    </div>
  );
}

/**
 * La vista previa.
 *
 * No es un mockup fiel al píxel: es lo suficientemente parecido como para que
 * la persona entienda dónde va a aparecer lo que está escribiendo.
 */
function Preview({
  moment,
  name,
  pitch,
  price,
}: {
  moment: Moment;
  name: string;
  pitch: string;
  price: string;
}) {
  if (moment === "pago") {
    return (
      <div className="rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/40 p-4">
        <label className="flex items-start gap-3">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-brand-600 text-white">
            <Icon name="check" size={13} />
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold text-ink-900">
              Sí, quiero agregar {name || "…"} por {price}
            </span>
            {pitch ? (
              <span className="mt-1 block text-[13px] leading-relaxed text-ink-600">{pitch}</span>
            ) : null}
          </span>
        </label>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 text-center">
      <p className="text-[11.5px] font-semibold uppercase tracking-wider text-brand-700">
        Esperá, una cosa más
      </p>
      <p className="mt-2 text-[17px] font-semibold tracking-tight text-ink-900">{name || "…"}</p>
      {pitch ? (
        <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-ink-600">{pitch}</p>
      ) : null}
      <p className="mt-3 text-[22px] font-semibold tracking-tight text-ink-900">{price}</p>
      <span className="mt-4 inline-flex rounded-xl bg-brand-600 px-4 py-2.5 text-[13.5px] font-semibold text-white">
        Sí, lo quiero agregar
      </span>
      <p className="mt-2 text-[12.5px] text-ink-400">No gracias, seguir sin esto</p>
    </div>
  );
}
