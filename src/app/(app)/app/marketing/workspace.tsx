"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";

import { generateAdCopyAction } from "@/app/actions/ai";
import { createCampaignAction } from "@/app/actions/settings";
import { Table, Td, Tr } from "@/components/ui/data";
import { Alert, TemplateNotice } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  LinkButton,
  Modal,
  Select,
  Tabs,
  useToast,
} from "@/components/ui/primitives";
import type { AdCopyDraft } from "@/lib/ai/tasks";
import type { CampaignPerformance } from "@/lib/analytics";
import { formatMoney, formatNumber } from "@/lib/utils";

export function MarketingWorkspace({
  campaigns,
  funnels,
  offers,
  currency,
  metaConnected,
}: {
  campaigns: CampaignPerformance[];
  funnels: Array<{ id: string; name: string; status: string; publicUrl: string }>;
  offers: Array<{ id: string; name: string }>;
  currency: string;
  metaConnected: boolean;
}) {
  const [tab, setTab] = useState("campanas");

  return (
    <div className="flex flex-col gap-5">
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "campanas", label: "Campañas", count: campaigns.length },
          { value: "copy", label: "Copy de anuncios" },
          { value: "creativos", label: "Creativos" },
          { value: "emails", label: "Emails" },
          { value: "tracking", label: "Tracking" },
        ]}
      />

      {tab === "campanas" ? (
        <CampaignsPanel campaigns={campaigns} funnels={funnels} currency={currency} />
      ) : null}

      {tab === "copy" ? <AdCopyPanel offers={offers} /> : null}

      {tab === "creativos" ? (
        <Card className="p-5">
          <CardHeader
            title="Creativos"
            subtitle="Los archivos de tus anuncios"
            className="px-0 pt-0"
          />
          <Alert tone="warning" className="mt-4">
            La biblioteca de creativos necesita almacenamiento de archivos, que todavía no está
            conectado. Cuando lo configures vas a poder subir imágenes y videos acá y asociarlos a
            cada campaña.
          </Alert>
        </Card>
      ) : null}

      {tab === "emails" ? (
        <Card className="p-5">
          <CardHeader
            title="Emails"
            subtitle="Secuencias post-compra y recuperación de carrito"
            className="px-0 pt-0"
          />
          <Alert tone="warning" className="mt-4">
            No hay proveedor de email conectado. Sin eso no podemos enviar nada: conectá uno en
            Integraciones para habilitar las secuencias.
          </Alert>
          <div className="mt-4">
            <LinkButton href="/app/integraciones" variant="secondary" size="sm">
              Ir a Integraciones
            </LinkButton>
          </div>
        </Card>
      ) : null}

      {tab === "tracking" ? (
        <TrackingPanel funnels={funnels} campaigns={campaigns} metaConnected={metaConnected} />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function CampaignsPanel({
  campaigns,
  funnels,
  currency,
}: {
  campaigns: CampaignPerformance[];
  funnels: Array<{ id: string; name: string }>;
  currency: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader
          title="Campañas"
          subtitle="Sirven para atribuir cada venta a su origen."
          action={
            <Button size="sm" icon="plus" onClick={() => setOpen(true)}>
              Crear campaña
            </Button>
          }
        />
        <div className="pb-2 pt-3">
          {campaigns.length === 0 ? (
            <div className="px-5 pb-4">
              <EmptyState
                icon="megaphone"
                title="Todavía no cargaste campañas"
                description="Creá la campaña acá para generar sus UTMs y poder atribuir ventas. La campaña real la seguís creando en el Administrador de Anuncios de Meta."
                action={
                  <Button icon="plus" onClick={() => setOpen(true)}>
                    Crear campaña
                  </Button>
                }
              />
            </div>
          ) : (
            <Table
              columns={[
                { key: "name", label: "Campaña" },
                { key: "status", label: "Estado" },
                { key: "spend", label: "Inversión", align: "right" },
                { key: "orders", label: "Ventas", align: "right" },
                { key: "revenue", label: "Facturación", align: "right" },
                { key: "roas", label: "ROAS", align: "right" },
              ]}
            >
              {campaigns.map((campaign) => (
                <Tr key={campaign.id}>
                  <Td className="font-medium text-ink-900">{campaign.name}</Td>
                  <Td>
                    <Badge tone={campaign.status === "active" ? "success" : "neutral"}>
                      {campaign.status}
                    </Badge>
                  </Td>
                  <Td align="right">
                    {campaign.spend > 0 ? formatMoney(campaign.spend, currency, true) : "—"}
                  </Td>
                  <Td align="right">{formatNumber(campaign.orders)}</Td>
                  <Td align="right" className="font-medium text-ink-900">
                    {formatMoney(campaign.revenue, currency, true)}
                  </Td>
                  <Td align="right" className="font-semibold text-ink-900">
                    {campaign.roas ? `${campaign.roas.toFixed(2)}x` : "—"}
                  </Td>
                </Tr>
              ))}
            </Table>
          )}
        </div>
      </Card>

      <CampaignModal open={open} onClose={() => setOpen(false)} funnels={funnels} currency={currency} />
    </>
  );
}

function CampaignModal({
  open,
  onClose,
  funnels,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  funnels: Array<{ id: string; name: string }>;
  currency: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction, pending] = useActionState(createCampaignAction, null);

  useEffect(() => {
    if (state?.ok) {
      toast.toast({ title: "Campaña creada", description: state.message, tone: "info" });
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva campaña"
      description="La creamos en TiendaFlow para atribuir ventas. No se crea nada en tu cuenta de Meta."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="campaign-form" loading={pending} icon="check">
            Crear campaña
          </Button>
        </>
      }
    >
      <form id="campaign-form" action={formAction} className="flex flex-col gap-4">
        {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}

        <Field label="Nombre" required>
          <Input name="name" required placeholder="Hábitos — Tráfico frío" />
        </Field>
        <Field label="Funnel al que manda el tráfico">
          <Select name="funnel_id" defaultValue="">
            <option value="">Sin funnel asociado</option>
            {funnels.map((funnel) => (
              <option key={funnel.id} value={funnel.id}>
                {funnel.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Objetivo">
            <Select name="objective" defaultValue="conversiones">
              <option value="conversiones">Conversiones</option>
              <option value="trafico">Tráfico</option>
              <option value="alcance">Alcance</option>
              <option value="interacciones">Interacciones</option>
            </Select>
          </Field>
          <Field label={`Presupuesto diario (${currency})`}>
            <Input name="daily_budget" type="number" min={0} step="any" defaultValue={0} />
          </Field>
        </div>
        <Field label="utm_campaign" hint="Se usa para atribuir cada venta a esta campaña.">
          <Input name="utm_campaign" placeholder="habitos-frio-01" />
        </Field>
      </form>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */

function AdCopyPanel({ offers }: { offers: Array<{ id: string; name: string }> }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [offerId, setOfferId] = useState(offers[0]?.id ?? "");
  const [tone, setTone] = useState("directo");
  const [draft, setDraft] = useState<AdCopyDraft | null>(null);
  const [isTemplate, setIsTemplate] = useState(false);
  const [warning, setWarning] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  function generate() {
    if (!offerId) {
      setError("Necesitás una oferta para generar el copy.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await generateAdCopyAction(offerId, tone);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDraft(result.data.data);
      setIsTemplate(result.data.isTemplate);
      setWarning(result.data.warning);
    });
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado al portapapeles.");
    } catch {
      toast.error("No pudimos copiar", "Tu navegador bloqueó el acceso al portapapeles.");
    }
  }

  if (!offers.length) {
    return (
      <EmptyState
        icon="tag"
        title="Necesitás una oferta primero"
        description="El copy de los anuncios se genera a partir de tu oferta: producto, promesa y precio."
        action={
          <LinkButton href="/app/ofertas/nueva" icon="plus">
            Crear oferta
          </LinkButton>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Oferta" className="min-w-56 flex-1">
            <Select value={offerId} onChange={(event) => setOfferId(event.target.value)}>
              {offers.map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {offer.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tono" className="min-w-44">
            <Select value={tone} onChange={(event) => setTone(event.target.value)}>
              <option value="directo">Directo</option>
              <option value="cercano">Cercano</option>
              <option value="profesional">Profesional</option>
              <option value="inspirador">Inspirador</option>
            </Select>
          </Field>
          <Button variant="ai" icon="sparkles" loading={pending} onClick={generate}>
            Crear anuncio con IA
          </Button>
        </div>

        {error ? (
          <Alert tone="error" className="mt-4">
            {error}
          </Alert>
        ) : null}
      </Card>

      {draft ? (
        <>
          {isTemplate ? <TemplateNotice warning={warning} /> : null}

          <Alert tone="warning" title="Revisá las políticas de Meta antes de publicar">
            {draft.review_note}
          </Alert>

          <div className="grid gap-5 lg:grid-cols-2">
            <CopyBlock title="Textos principales" items={draft.primary_texts} onCopy={copy} />
            <CopyBlock title="Títulos" items={draft.headlines} onCopy={copy} />
            <CopyBlock title="Descripciones" items={draft.descriptions} onCopy={copy} />
            <CopyBlock title="Hooks (primeros 3 segundos)" items={draft.hooks} onCopy={copy} />
            <CopyBlock title="Variantes de CTA" items={draft.ctas} onCopy={copy} />

            <Card>
              <CardHeader title="Ángulos" />
              <ul className="flex flex-col gap-2 p-5 pt-4">
                {draft.angles?.map((angle) => (
                  <li key={angle.name} className="rounded-xl border border-ink-200 p-3.5">
                    <p className="text-[13.5px] font-semibold text-ink-900">{angle.name}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{angle.idea}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

function CopyBlock({
  title,
  items,
  onCopy,
}: {
  title: string;
  items: string[];
  onCopy: (text: string) => void;
}) {
  if (!items?.length) return null;
  return (
    <Card>
      <CardHeader title={title} />
      <ul className="flex flex-col gap-2 p-5 pt-4">
        {items.map((item, index) => (
          <li
            key={index}
            className="group flex items-start gap-2 rounded-xl border border-ink-200 p-3.5"
          >
            <p className="min-w-0 flex-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-700">
              {item}
            </p>
            <button
              type="button"
              onClick={() => onCopy(item)}
              className="shrink-0 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
              aria-label="Copiar"
            >
              <Icon name="copy" size={15} />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

function TrackingPanel({
  funnels,
  campaigns,
  metaConnected,
}: {
  funnels: Array<{ id: string; name: string; publicUrl: string }>;
  campaigns: CampaignPerformance[];
  metaConnected: boolean;
}) {
  const toast = useToast();
  const [funnelId, setFunnelId] = useState(funnels[0]?.id ?? "");
  const [utm, setUtm] = useState({
    utm_source: "facebook",
    utm_medium: "cpc",
    utm_campaign: campaigns[0]?.name ? slug(campaigns[0].name) : "",
    utm_content: "",
    utm_term: "",
  });

  const funnel = funnels.find((item) => item.id === funnelId);
  const params = new URLSearchParams(
    Object.entries(utm).filter(([, value]) => Boolean(value)) as Array<[string, string]>,
  );
  const link = funnel ? `${funnel.publicUrl}${params.toString() ? `?${params}` : ""}` : "";

  return (
    <div className="flex flex-col gap-5">
      {!metaConnected ? (
        <Alert
          tone="warning"
          title="Meta todavía no está conectado"
          action={
            <LinkButton href="/app/integraciones/meta" size="sm" variant="secondary">
              Configurar
            </LinkButton>
          }
        >
          El Pixel y la API de Conversiones son lo que permite medir cada venta desde el anuncio.
        </Alert>
      ) : null}

      <Card>
        <CardHeader
          title="Generador de links con UTM"
          subtitle="Pegá este link en tu anuncio para que TiendaFlow pueda atribuir la venta."
        />
        <div className="flex flex-col gap-4 p-5 pt-4">
          {funnels.length === 0 ? (
            <p className="text-[13.5px] text-ink-500">
              Creá un funnel para generar sus links de campaña.
            </p>
          ) : (
            <>
              <Field label="Funnel de destino">
                <Select value={funnelId} onChange={(event) => setFunnelId(event.target.value)}>
                  {funnels.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["utm_source", "Fuente"],
                    ["utm_medium", "Medio"],
                    ["utm_campaign", "Campaña"],
                    ["utm_content", "Contenido"],
                    ["utm_term", "Término"],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={`${label} (${key})`}>
                    <Input
                      value={utm[key]}
                      onChange={(event) => setUtm((current) => ({ ...current, [key]: event.target.value }))}
                    />
                  </Field>
                ))}
              </div>

              <div className="rounded-2xl bg-ink-900 p-4">
                <p className="text-[11.5px] font-semibold uppercase tracking-wider text-white/50">
                  Link listo para usar
                </p>
                <p className="mt-1.5 break-all font-mono text-[12.5px] text-white/90">{link}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  icon="copy"
                  className="mt-3"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        `${window.location.origin}${link}`,
                      );
                      toast.success("Link copiado.");
                    } catch {
                      toast.error("No pudimos copiar el link");
                    }
                  }}
                >
                  Copiar link
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Cómo se lee la atribución"
          subtitle="Cada venta guarda los UTMs con los que llegó el visitante."
        />
        <div className="p-5 pt-4">
          <ol className="tf-scroll flex items-center gap-2 overflow-x-auto">
            {["Campaña", "Landing", "Checkout", "Compra", "Facturación", "ROAS"].map(
              (step, index, list) => (
                <li key={step} className="flex shrink-0 items-center gap-2">
                  <span className="rounded-xl bg-brand-50 px-3 py-2 text-[12.5px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
                    {step}
                  </span>
                  {index < list.length - 1 ? (
                    <Icon name="arrowRight" size={15} className="text-ink-300" />
                  ) : null}
                </li>
              ),
            )}
          </ol>
          <p className="mt-4 text-[13px] leading-relaxed text-ink-600">
            El ROAS solo se puede calcular con la inversión real de Meta. Hasta que conectes la
            integración, esa columna aparece vacía en vez de mostrar un número inventado.
          </p>
        </div>
      </Card>
    </div>
  );
}

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
