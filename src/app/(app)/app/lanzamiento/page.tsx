import Link from "next/link";
import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/data";
import { Alert } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import { Card, LinkButton, ProgressBar } from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { getLaunchStatus } from "@/lib/launch";
import { listFunnels } from "@/lib/repo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Modo Lanzamiento" };

export default async function LaunchPage() {
  const { workspace } = await requireSession();
  const launch = getLaunchStatus(workspace.id);
  const funnels = listFunnels(workspace.id);
  const publishedFunnel = funnels.find((funnel) => funnel.status === "published");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="Modo Lanzamiento"
        subtitle="El camino completo desde tu producto hasta el primer clic de tráfico."
      />

      <Card className="overflow-hidden">
        <div className="tf-grid-bg flex flex-wrap items-center justify-between gap-5 p-6">
          <div className="min-w-56 flex-1">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">
              Progreso
            </p>
            <p className="mt-1 text-[28px] font-semibold tracking-tight text-ink-900">
              {launch.completion}% listo
            </p>
            <ProgressBar
              value={launch.completion}
              tone={launch.completion === 100 ? "success" : "brand"}
              className="mt-3"
            />
            <p className="mt-3 text-[13.5px] text-ink-600">
              {launch.nextStep
                ? `Lo próximo: ${launch.nextStep.title}.`
                : "Está todo listo. Ya podés mandar tráfico."}
            </p>
          </div>

          {launch.ready ? (
            <div className="rounded-2xl bg-accent-50 px-5 py-4 ring-1 ring-inset ring-accent-300/60">
              <p className="flex items-center gap-2 text-[14px] font-semibold text-accent-800">
                <Icon name="check" size={17} />
                Tu oferta está lista para recibir tráfico
              </p>
              {publishedFunnel?.published_url ? (
                <Link
                  href={publishedFunnel.published_url}
                  target="_blank"
                  className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent-800 underline underline-offset-4"
                >
                  Ver mi funnel publicado
                  <Icon name="arrowUpRight" size={13} />
                </Link>
              ) : null}
            </div>
          ) : launch.nextStep ? (
            <LinkButton href={launch.nextStep.ctaHref} size="lg" icon="rocket">
              {launch.nextStep.ctaLabel}
            </LinkButton>
          ) : null}
        </div>
      </Card>

      <ol className="flex flex-col gap-3">
        {launch.steps.map((step, index) => (
          <li key={step.code}>
            <Card
              className={cn(
                "flex flex-wrap items-start gap-4 p-5",
                step.state === "done" && "border-accent-300/60 bg-accent-50/30",
              )}
            >
              <span
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-2xl text-[13px] font-bold",
                  step.state === "done"
                    ? "bg-accent-600 text-white"
                    : step.state === "warning"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-ink-100 text-ink-400",
                )}
              >
                {step.state === "done" ? <Icon name="check" size={19} /> : step.index}
              </span>

              <div className="min-w-56 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink-900">
                  {step.title}
                  {step.state === "done" ? (
                    <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-accent-800">
                      Listo
                    </span>
                  ) : step.state === "warning" ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-amber-800">
                      Falta algo
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-500">{step.description}</p>

                {step.missing.length ? (
                  <ul className="mt-2.5 flex flex-col gap-1">
                    {step.missing.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[13px] text-amber-700">
                        <Icon name="warning" size={14} className="mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <LinkButton
                href={step.ctaHref}
                variant={step.state === "done" ? "ghost" : "secondary"}
                size="sm"
                iconRight="arrowRight"
              >
                {step.ctaLabel}
              </LinkButton>
            </Card>

            {index < launch.steps.length - 1 ? (
              <div className="ml-[38px] flex h-3 justify-center">
                <span className="w-px bg-ink-200" />
              </div>
            ) : null}
          </li>
        ))}
      </ol>

      {launch.ready ? (
        <Card className="overflow-hidden">
          <div className="tf-gradient-ai p-6 text-center">
            <h2 className="text-[24px] font-semibold tracking-tight text-white">
              Tu oferta está lista para recibir tráfico
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-[14px] leading-relaxed text-white/75">
              Funnel publicado, checkout con proveedor de pago y producto cargado. El próximo paso es
              crear la campaña en el Administrador de Anuncios de Meta con tu link de UTMs.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <LinkButton href="/app/marketing" variant="secondary" icon="megaphone">
                Generar mi link de campaña
              </LinkButton>
              <LinkButton href="/app/analytics" variant="secondary" icon="chart">
                Ver analytics
              </LinkButton>
            </div>
          </div>
        </Card>
      ) : (
        <Alert tone="info" title="Por qué te pedimos cada paso">
          Cada requisito es algo sin lo cual la venta no puede completarse: un producto para
          entregar, una oferta con precio, un funnel con checkout, un proveedor de pago que cobre y
          el tracking para saber qué campaña funcionó.
        </Alert>
      )}
    </div>
  );
}
