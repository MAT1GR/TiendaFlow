"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";

import { analyzeFunnelAction } from "@/app/actions/ai";
import {
  addFunnelStepAction,
  deleteFunnelStepAction,
  duplicateFunnelStepAction,
  publishFunnelAction,
  renameFunnelAction,
  renameFunnelStepAction,
  reorderFunnelStepsAction,
  setFunnelStatusAction,
} from "@/app/actions/funnels";
import { TermLabel } from "@/components/ui/explain";
import { Alert, TemplateNotice } from "@/components/ui/feedback";
import { Icon, type IconName } from "@/components/ui/icon";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Dropdown,
  Field,
  Input,
  LinkButton,
  MenuItem,
  Modal,
  Select,
  useToast,
} from "@/components/ui/primitives";
import type { FunnelDiagnosis } from "@/lib/ai/tasks";
import type { FunnelMetrics } from "@/lib/analytics";
import type { Funnel, FunnelStep, FunnelStepType } from "@/lib/types";
import { cn, formatNumber, formatPercent, STATUS_LABEL, statusTone, STEP_TYPE_LABEL } from "@/lib/utils";

const STEP_ICON: Record<string, IconName> = {
  landing: "layers",
  checkout: "card",
  upsell: "trendUp",
  downsell: "trendDown",
  thankyou: "check",
  custom: "file",
};

const STEP_COLOR: Record<string, string> = {
  landing: "from-brand-600 to-brand-500",
  checkout: "from-brand-700 to-brand-600",
  upsell: "from-accent-600 to-accent-500",
  downsell: "from-amber-600 to-amber-500",
  thankyou: "from-ink-700 to-ink-600",
  custom: "from-ink-500 to-ink-400",
};

export function FunnelBuilder({
  funnel,
  steps,
  metrics,
  blockers,
  landingByStep,
  offers,
  currency,
  justCreated,
}: {
  funnel: Funnel;
  steps: FunnelStep[];
  metrics: FunnelMetrics | null;
  blockers: string[];
  landingByStep: Record<string, string>;
  offers: Array<{ id: string; name: string }>;
  currency: string;
  justCreated: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [order, setOrder] = useState(steps.map((step) => step.id));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [renaming, setRenaming] = useState<FunnelStep | null>(null);
  const [diagnosis, setDiagnosis] = useState<{
    data: FunnelDiagnosis;
    isTemplate: boolean;
    warning?: string;
  } | null>(null);

  useEffect(() => {
    setOrder(steps.map((step) => step.id));
  }, [steps]);

  const ordered = order
    .map((id) => steps.find((step) => step.id === id))
    .filter((step): step is FunnelStep => Boolean(step));

  function move(index: number, direction: -1 | 1) {
    const next = [...order];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    startTransition(async () => {
      const result = await reorderFunnelStepsAction(funnel.id, next);
      if (!result.ok) {
        toast.error("No pudimos reordenar", result.error);
        setOrder(steps.map((step) => step.id));
      } else {
        router.refresh();
      }
    });
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast.success(result.message ?? "Listo.");
        router.refresh();
      } else {
        toast.error("No pudimos completar la acción", result.error);
      }
    });
  }

  function analyze() {
    startTransition(async () => {
      const result = await analyzeFunnelAction(funnel.id, "30d");
      if (!result.ok) {
        toast.error("No pudimos analizar el funnel", result.error);
        return;
      }
      setDiagnosis({
        data: result.data.data,
        isTemplate: result.data.isTemplate,
        warning: result.data.warning,
      });
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {justCreated ? (
        <Alert tone="ai" title="Funnel creado. Ahora generá la landing.">
          Entrá al paso de landing y usá “Generar con IA” para escribir toda la página en un clic.
        </Alert>
      ) : null}

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={statusTone(funnel.status)} dot>
            {STATUS_LABEL[funnel.status] ?? funnel.status}
          </Badge>
          {funnel.published_url ? (
            <Link
              href={funnel.published_url}
              target="_blank"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800"
            >
              Ver funnel publicado
              <Icon name="arrowUpRight" size={13} />
            </Link>
          ) : (
            <span className="text-[13px] text-ink-500">Todavía sin publicar</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" icon="settings" onClick={() => setSettingsOpen(true)}>
            Ajustes
          </Button>
          <Button variant="ai" size="sm" icon="sparkles" loading={pending} onClick={analyze}>
            Optimizar mi funnel
          </Button>
          {funnel.status === "published" ? (
            <Button
              variant="secondary"
              size="sm"
              loading={pending}
              onClick={() => run(() => setFunnelStatusAction(funnel.id, "paused"))}
            >
              Pausar
            </Button>
          ) : (
            <Button
              size="sm"
              icon="rocket"
              loading={pending}
              onClick={() => run(() => publishFunnelAction(funnel.id))}
            >
              Publicar funnel
            </Button>
          )}
        </div>
      </Card>

      {blockers.length && funnel.status !== "published" ? (
        <Alert tone="warning" title="Para publicar este funnel falta:">
          <ul className="mt-1 flex flex-col gap-1">
            {blockers.map((blocker) => (
              <li key={blocker} className="flex gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-current" />
                {blocker}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {diagnosis ? (
        <DiagnosisPanel
          diagnosis={diagnosis}
          onClose={() => setDiagnosis(null)}
          onRegenerate={analyze}
          loading={pending}
        />
      ) : null}

      <Card>
        <CardHeader
          title={<TermLabel term="funnel">Pasos del funnel</TermLabel>}
          subtitle="Cada pantalla que ve la persona, en orden. Abajo de cada una está cuánta gente pasó a la siguiente."
          action={
            <Dropdown
              trigger={() => (
                <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-[13px] font-medium text-white hover:bg-brand-700">
                  <Icon name="plus" size={15} />
                  Agregar paso
                </span>
              )}
            >
              {(close) =>
                (
                  ["landing", "checkout", "upsell", "downsell", "thankyou", "custom"] as FunnelStepType[]
                ).map((type) => (
                  <MenuItem
                    key={type}
                    icon={STEP_ICON[type]}
                    onClick={() => {
                      close();
                      run(() => addFunnelStepAction(funnel.id, type));
                    }}
                  >
                    {STEP_TYPE_LABEL[type]}
                  </MenuItem>
                ))
              }
            </Dropdown>
          }
        />

        <div className="p-5 pt-4">
          <ol className="flex flex-col gap-3">
            {ordered.map((step, index) => {
              const stepMetrics = metrics?.steps.find((item) => item.stepId === step.id);
              const landingId = landingByStep[step.id];
              return (
                <li key={step.id}>
                  <div className="flex items-stretch gap-3">
                    <div className="flex flex-col items-center gap-1 pt-3">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0 || pending}
                        className="rounded p-0.5 text-ink-300 transition-colors hover:text-ink-600 disabled:opacity-30"
                        aria-label={`Subir ${step.name}`}
                      >
                        <Icon name="chevronDown" size={14} className="rotate-180" />
                      </button>
                      <span className="text-[11px] font-semibold text-ink-400">{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === ordered.length - 1 || pending}
                        className="rounded p-0.5 text-ink-300 transition-colors hover:text-ink-600 disabled:opacity-30"
                        aria-label={`Bajar ${step.name}`}
                      >
                        <Icon name="chevronDown" size={14} />
                      </button>
                    </div>

                    <div className="flex-1 rounded-2xl border border-ink-200 transition-colors hover:border-ink-300">
                      <div className="flex flex-wrap items-center gap-3 p-4">
                        <span
                          className={cn(
                            "grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white",
                            STEP_COLOR[step.type] ?? STEP_COLOR.custom,
                          )}
                        >
                          <Icon name={STEP_ICON[step.type] ?? "file"} size={18} />
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-ink-900">
                            {step.name}
                            <span className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-ink-500">
                              {STEP_TYPE_LABEL[step.type]}
                            </span>
                            {step.published ? <Badge tone="success">Publicado</Badge> : null}
                          </p>
                          {stepMetrics ? (
                            <p className="mt-1 text-[12.5px] text-ink-500">
                              Visitantes: {formatNumber(stepMetrics.visitors, true)}
                              {index < ordered.length - 1 ? (
                                <>
                                  {" · "}Al siguiente: {formatNumber(stepMetrics.conversions, true)} (
                                  {formatPercent(stepMetrics.conversionRate)})
                                </>
                              ) : null}
                            </p>
                          ) : (
                            <p className="mt-1 text-[12.5px] text-ink-400">Sin datos todavía</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {landingId ? (
                            // Link y no botón: navegar no debería depender de que
                            // React ya haya hidratado, y así se puede abrir en
                            // una pestaña nueva.
                            <LinkButton
                              href={`/app/landings/${landingId}`}
                              variant="secondary"
                              size="sm"
                              icon="edit"
                            >
                              Editar página
                            </LinkButton>
                          ) : null}
                          {funnel.published_url ? (
                            <Link
                              href={`${funnel.published_url}/${step.type}`}
                              target="_blank"
                              className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                              aria-label={`Previsualizar ${step.name}`}
                            >
                              <Icon name="eye" size={16} />
                            </Link>
                          ) : null}
                          <Dropdown
                            trigger={() => (
                              <span className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700">
                                <Icon name="grip" size={16} />
                              </span>
                            )}
                          >
                            {(close) => (
                              <>
                                <MenuItem
                                  icon="edit"
                                  onClick={() => {
                                    close();
                                    setRenaming(step);
                                  }}
                                >
                                  Renombrar
                                </MenuItem>
                                <MenuItem
                                  icon="copy"
                                  onClick={() => {
                                    close();
                                    run(() => duplicateFunnelStepAction(funnel.id, step.id));
                                  }}
                                >
                                  Duplicar
                                </MenuItem>
                                <MenuItem
                                  icon="trash"
                                  tone="danger"
                                  onClick={() => {
                                    close();
                                    run(() => deleteFunnelStepAction(funnel.id, step.id));
                                  }}
                                >
                                  Eliminar paso
                                </MenuItem>
                              </>
                            )}
                          </Dropdown>
                        </div>
                      </div>

                      {stepMetrics && stepMetrics.visitors > 0 && index < ordered.length - 1 ? (
                        <div className="border-t border-ink-100 px-4 py-2.5">
                          <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                            <div
                              className="h-full rounded-full bg-brand-500 transition-all duration-500"
                              style={{ width: `${Math.min(100, stepMetrics.conversionRate)}%` }}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {index < ordered.length - 1 ? (
                    <div className="ml-[26px] flex h-4 justify-center">
                      <span className="w-px bg-ink-200" />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      </Card>

      <SettingsModal
        funnel={funnel}
        offers={offers}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <RenameStepModal
        funnelId={funnel.id}
        step={renaming}
        onClose={() => setRenaming(null)}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function DiagnosisPanel({
  diagnosis,
  onClose,
  onRegenerate,
  loading,
}: {
  diagnosis: { data: FunnelDiagnosis; isTemplate: boolean; warning?: string };
  onClose: () => void;
  onRegenerate: () => void;
  loading: boolean;
}) {
  const { data } = diagnosis;
  return (
    <Card className="overflow-hidden">
      <div className="tf-gradient-ai flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-xl bg-white/20 text-white">
            <Icon name="sparkles" size={17} />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-white">Optimizar mi funnel</h2>
            <p className="text-[12.5px] text-white/70">{data.summary}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-white/70 hover:bg-white/15 hover:text-white"
          aria-label="Cerrar análisis"
        >
          <Icon name="x" size={17} />
        </button>
      </div>

      <div className="flex flex-col gap-3 p-5">
        {diagnosis.isTemplate ? <TemplateNotice warning={diagnosis.warning} /> : null}
        {data.data_warning ? <Alert tone="warning">{data.data_warning}</Alert> : null}

        {data.findings.map((finding, index) => (
          <div key={index} className="rounded-2xl border border-ink-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[14px] font-semibold text-ink-900">{finding.problem}</p>
              <Badge
                tone={
                  finding.confidence === "alta"
                    ? "success"
                    : finding.confidence === "media"
                      ? "brand"
                      : "neutral"
                }
              >
                Confianza {finding.confidence}
              </Badge>
            </div>

            <dl className="mt-3 flex flex-col gap-2.5 text-[13px]">
              <Line label="Evidencia" value={finding.evidence} />
              <Line label="Recomendación" value={finding.recommendation} />
              <Line label="Área de impacto" value={finding.impact_area} />
              <Line label="Test sugerido" value={finding.suggested_test} />
            </dl>
          </div>
        ))}

        <div>
          <Button variant="secondary" size="sm" icon="refresh" loading={loading} onClick={onRegenerate}>
            Volver a analizar
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[130px_1fr] sm:gap-3">
      <dt className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="leading-relaxed text-ink-700">{value}</dd>
    </div>
  );
}

function SettingsModal({
  funnel,
  offers,
  open,
  onClose,
}: {
  funnel: Funnel;
  offers: Array<{ id: string; name: string }>;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction, pending] = useActionState(renameFunnelAction, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Guardado.");
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajustes del funnel"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="funnel-settings" loading={pending} icon="check">
            Guardar
          </Button>
        </>
      }
    >
      <form id="funnel-settings" action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={funnel.id} />
        {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}

        <Field label="Nombre" required>
          <Input name="name" defaultValue={funnel.name} required />
        </Field>
        <Field label="Oferta asociada">
          <Select name="offer_id" defaultValue={funnel.offer_id ?? ""}>
            <option value="">Sin oferta</option>
            {offers.map((offer) => (
              <option key={offer.id} value={offer.id}>
                {offer.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fuente de tráfico">
          <Select name="traffic_source" defaultValue={funnel.traffic_source}>
            <option value="meta_ads">Meta Ads</option>
            <option value="organico">Orgánico</option>
            <option value="afiliados">Afiliados</option>
            <option value="email">Email</option>
            <option value="otro">Otro</option>
          </Select>
        </Field>
        <Field label="URL pública" hint="Se genera al publicar.">
          <Input value={funnel.published_url ?? "Sin publicar"} readOnly disabled />
        </Field>
      </form>
    </Modal>
  );
}

function RenameStepModal({
  funnelId,
  step,
  onClose,
}: {
  funnelId: string;
  step: FunnelStep | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setName(step?.name ?? "");
  }, [step]);

  return (
    <Modal
      open={step !== null}
      onClose={onClose}
      title="Renombrar paso"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={pending}
            icon="check"
            onClick={() =>
              startTransition(async () => {
                if (!step) return;
                const result = await renameFunnelStepAction(funnelId, step.id, name);
                if (result.ok) {
                  toast.success("Renombramos el paso.");
                  router.refresh();
                  onClose();
                } else {
                  toast.error("No pudimos renombrarlo", result.error);
                }
              })
            }
          >
            Guardar
          </Button>
        </>
      }
    >
      <Field label="Nombre del paso">
        <Input value={name} onChange={(event) => setName(event.target.value)} autoFocus />
      </Field>
    </Modal>
  );
}
