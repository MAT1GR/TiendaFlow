"use client";

import { useActionState, useState } from "react";

import { completeOnboardingAction } from "@/app/actions/auth";
import { Alert } from "@/components/ui/feedback";
import { Icon, type IconName } from "@/components/ui/icon";
import { Button, Card, Stepper } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

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

const CHANNELS: Choice[] = [
  { value: "meta", label: "Meta Ads", hint: "Facebook e Instagram.", icon: "megaphone" },
  { value: "organico", label: "Orgánico", hint: "Redes, comunidad, boca a boca.", icon: "users" },
  { value: "afiliados", label: "Afiliados", hint: "Otros venden por vos.", icon: "handshake" },
  { value: "otro", label: "Otro", hint: "Email, WhatsApp, marketplaces.", icon: "globe" },
];

const GOALS: Choice[] = [
  { value: "producto", label: "Crear mi producto", hint: "Arrancamos por el contenido.", icon: "box" },
  { value: "funnel", label: "Crear mi funnel", hint: "Landing, checkout y gracias.", icon: "funnel" },
  { value: "oferta", label: "Lanzar una oferta", hint: "Precio, bonos y upsells.", icon: "tag" },
  { value: "ventas", label: "Configurar ventas", hint: "Cobros y seguimiento.", icon: "card" },
];

const STEPS = ["Tu producto", "Tu canal", "Tu objetivo"];

export function OnboardingWizard({ firstName }: { firstName: string }) {
  const [state, formAction, pending] = useActionState(completeOnboardingAction, null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ product_source: "", channel: "", goal: "" });

  const questions = [
    {
      title: "¿Qué querés vender?",
      subtitle: "Con esto decidimos por dónde arrancar.",
      name: "product_source" as const,
      choices: SOURCES,
    },
    {
      title: "¿Cómo vendés principalmente?",
      subtitle: "Preparamos el tracking según tu canal.",
      name: "channel" as const,
      choices: CHANNELS,
    },
    {
      title: "¿Qué querés conseguir primero?",
      subtitle: "Te llevamos derecho a eso al terminar.",
      name: "goal" as const,
      choices: GOALS,
    },
  ];

  const question = questions[step];
  const selected = answers[question.name];
  const isLast = step === questions.length - 1;

  return (
    <Card className="tf-rise p-6 sm:p-8">
      {step === 0 ? (
        <div className="mb-7">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink-900">
            Bienvenido a TiendaFlow, {firstName}
          </h1>
          <p className="mt-2 text-[15px] text-ink-500">
            Vamos a preparar tu primera oferta para vender. Son tres preguntas.
          </p>
        </div>
      ) : null}

      <Stepper steps={STEPS} current={step} className="mb-7" />

      {state && !state.ok ? (
        <Alert tone="error" className="mb-5">
          {state.error}
        </Alert>
      ) : null}

      <form action={formAction}>
        <input type="hidden" name="product_source" value={answers.product_source} />
        <input type="hidden" name="channel" value={answers.channel} />
        <input type="hidden" name="goal" value={answers.goal} />

        <fieldset>
          <legend className="text-[20px] font-semibold tracking-tight text-ink-900">
            {question.title}
          </legend>
          <p className="mt-1 text-[14px] text-ink-500">{question.subtitle}</p>

          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {question.choices.map((choice) => {
              const active = selected === choice.value;
              return (
                <button
                  key={choice.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setAnswers((current) => ({ ...current, [question.name]: choice.value }))
                  }
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

          {isLast ? (
            <Button type="submit" size="lg" disabled={!selected} loading={pending} iconRight="arrowRight">
              Empezar
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              disabled={!selected}
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
