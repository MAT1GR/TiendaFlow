"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { generateAdCopyAction } from "@/app/actions/ai";
import { createCampaignAction } from "@/app/actions/settings";
import { AiProgress, useAiProgress } from "@/components/app/ai-progress";
import { Table, Td, Tr } from "@/components/ui/data";
import { Explain, TermLabel } from "@/components/ui/explain";
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
import { cn, formatMoney, formatNumber } from "@/lib/utils";

/**
 * Marketing.
 *
 * Cuatro herramientas y no cuarenta, en el orden en que se usan: primero el
 * link para pegar en tus redes, después el anuncio, después la campaña para
 * saber qué trajo cada venta, y al final los emails.
 */
export function MarketingWorkspace({
  campaigns,
  destinations,
  offers,
  currency,
  metaConnected,
}: {
  campaigns: CampaignPerformance[];
  destinations: Destination[];
  offers: Array<{ id: string; name: string }>;
  currency: string;
  metaConnected: boolean;
}) {
  const [tab, setTab] = useState("links");

  return (
    <div className="flex flex-col gap-5">
      {!metaConnected ? (
        <Alert
          tone="warning"
          title="Todavía no sabemos de dónde vienen tus ventas"
          action={
            <LinkButton href="/app/integraciones/meta" size="sm" variant="secondary">
              Conectar Meta
            </LinkButton>
          }
        >
          Conectá tu cuenta de Meta y vamos a poder decirte qué anuncio trajo cada compra y cuánto
          te costó conseguirla.
        </Alert>
      ) : null}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "links", label: "🔗 Links" },
          { value: "anuncios", label: "✍️ Anuncios" },
          { value: "campanas", label: "📣 Campañas", count: campaigns.length },
          { value: "emails", label: "📧 Emails" },
        ]}
      />

      {tab === "links" ? <LinksPanel destinations={destinations} campaigns={campaigns} /> : null}

      {tab === "anuncios" ? <AdCopyPanel offers={offers} /> : null}

      {tab === "campanas" ? (
        <CampaignsPanel campaigns={campaigns} destinations={destinations} currency={currency} />
      ) : null}

      {tab === "emails" ? (
        <Card className="p-5">
          <CardHeader
            title="Recuperar compradores"
            subtitle="Escribirle a quien dejó una compra sin terminar"
            className="px-0 pt-0"
          />
          <Alert tone="warning" className="mt-4">
            Todavía no hay un proveedor de email conectado, así que no podemos enviar nada. Conectá
            uno y vamos a poder avisarte cuántas personas dejaron la compra a medias y escribirles.
          </Alert>
          <div className="mt-4">
            <LinkButton href="/app/integraciones" variant="secondary" size="sm">
              Ir a Integraciones
            </LinkButton>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

/** Un producto al que se le puede mandar tráfico. */
interface Destination {
  id: string;
  name: string;
  publicUrl: string;
}

/* -------------------------------------------------------------------------- */

function CampaignsPanel({
  campaigns,
  destinations,
  currency,
}: {
  campaigns: CampaignPerformance[];
  destinations: Destination[];
  currency: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader
          title={<TermLabel term="campana">Campañas</TermLabel>}
          subtitle="Anotá acá cada campaña para saber qué ventas trajo. La campaña real la seguís creando en el Administrador de Anuncios de Meta."
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
                description="Anotá acá tu campaña y te damos el link para usar en el anuncio. Con ese link sabemos qué venta trajo cada campaña."
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
                { key: "roas", label: "Por cada $1", align: "right" },
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
                    {campaign.roas ? `$${campaign.roas.toFixed(2)}` : "—"}
                  </Td>
                </Tr>
              ))}
            </Table>
          )}
        </div>
      </Card>

      <CampaignModal
        open={open}
        onClose={() => setOpen(false)}
        destinations={destinations}
        currency={currency}
      />
    </>
  );
}

function CampaignModal({
  open,
  onClose,
  destinations,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  destinations: Destination[];
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
        <Field label="¿A qué producto manda la gente?">
          <Select name="funnel_id" defaultValue="">
            <option value="">Todavía no lo sé</option>
            {destinations.map((destination) => (
              <option key={destination.id} value={destination.id}>
                {destination.name}
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
        <Field
          label="Nombre corto para el link"
          hint="Es lo que va en el link del anuncio. Con eso sabemos qué venta trajo esta campaña."
        >
          <Input name="utm_campaign" placeholder="habitos-frio-01" />
        </Field>
      </form>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */

function AdCopyPanel({ offers }: { offers: Array<{ id: string; name: string }> }) {
  const toast = useToast();
  const ai = useAiProgress();
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

    return ai.run("Escribiendo tus anuncios", async () => {
      const result = await generateAdCopyAction(offerId, tone);
      if (!result.ok) {
        setError(result.error);
        return false;
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
        title="Primero necesitás un producto con precio"
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
        <CardHeader
          title="✍️ Escribí tu anuncio con IA"
          subtitle="Con los datos de tu producto arma los textos, los títulos y los ganchos. Después copiás lo que te sirva."
          className="px-0 pt-0"
        />
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field label="¿Qué vas a anunciar?" className="min-w-56 flex-1">
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
          <Button variant="ai" icon="sparkles" loading={ai.running} onClick={generate}>
            Crear anuncio con IA
          </Button>
        </div>

        <AiProgress
          running={ai.running}
          progress={ai.progress}
          label={ai.label}
          className="mt-4"
        />

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
            <CopyBlock title="Ganchos: los primeros 3 segundos" items={draft.hooks} onCopy={copy} />
            <CopyBlock title="Frases para el botón" items={draft.ctas} onCopy={copy} />

            <Card>
              <CardHeader title="Ángulos" subtitle="Distintas maneras de contar lo mismo" />
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

/**
 * Los links para pegar en cada red.
 *
 * Por debajo esto son UTMs, pero nadie tiene por qué saberlo: elegís de dónde
 * va a venir la gente y te damos el link listo para copiar. Los parámetros
 * crudos quedan en un desplegable para quien ya sabe lo que está haciendo.
 */

const CHANNELS: Array<{
  id: string;
  emoji: string;
  label: string;
  source: string;
  medium: string;
}> = [
  { id: "instagram", emoji: "📸", label: "Instagram", source: "instagram", medium: "social" },
  { id: "tiktok", emoji: "🎵", label: "TikTok", source: "tiktok", medium: "social" },
  { id: "whatsapp", emoji: "💬", label: "WhatsApp", source: "whatsapp", medium: "mensaje" },
  { id: "facebook", emoji: "👍", label: "Facebook", source: "facebook", medium: "social" },
  { id: "anuncio", emoji: "📣", label: "Un anuncio pago", source: "facebook", medium: "cpc" },
];

function LinksPanel({
  destinations,
  campaigns,
}: {
  destinations: Destination[];
  campaigns: CampaignPerformance[];
}) {
  const toast = useToast();
  const [destinationId, setDestinationId] = useState(destinations[0]?.id ?? "");
  const [channel, setChannel] = useState(CHANNELS[0]);
  const [campaign, setCampaign] = useState(
    campaigns[0]?.name ? slug(campaigns[0].name) : "",
  );
  const [copied, setCopied] = useState(false);

  const destination = destinations.find((item) => item.id === destinationId);

  const params = new URLSearchParams({
    utm_source: channel.source,
    utm_medium: channel.medium,
  });
  if (campaign) params.set("utm_campaign", campaign);

  const link = destination ? `${destination.publicUrl}?${params}` : "";

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  if (destinations.length === 0) {
    return (
      <Card className="p-5">
        <EmptyState
          icon="link"
          title="Todavía no tenés una página adónde mandar gente"
          description="Los links se arman sobre la página de venta de un producto. Preparate uno y volvemos acá."
          action={
            <LinkButton href="/app/productos" icon="box">
              Ir a mis productos
            </LinkButton>
          }
          className="border-0 bg-transparent"
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="🔗 Creá el link para compartir"
        subtitle="Usá un link distinto en cada lugar y vas a saber de dónde viene cada venta."
      />

      <div className="flex flex-col gap-5 p-5 pt-4">
        <Field label="¿Qué producto querés vender?">
          <Select
            value={destinationId}
            onChange={(event) => setDestinationId(event.target.value)}
          >
            {destinations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <p className="mb-2 text-[13px] font-medium text-ink-700">¿Dónde lo vas a compartir?</p>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setChannel(item)}
                aria-pressed={channel.id === item.id}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors",
                  channel.id === item.id
                    ? "border-brand-300 bg-brand-50 text-brand-700"
                    : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50",
                )}
              >
                <span className="tf-emoji" aria-hidden="true">
                  {item.emoji}
                </span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-ink-900 p-4">
          <p className="text-[11.5px] font-semibold uppercase tracking-wider text-white/50">
            Tu link, listo para copiar
          </p>
          <p className="mt-1.5 break-all font-mono text-[12.5px] text-white/90">{link}</p>
          <Button
            variant="secondary"
            size="sm"
            icon={copied ? "check" : "copy"}
            className="mt-3"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${window.location.origin}${link}`);
                setCopied(true);
              } catch {
                toast.error("No pudimos copiar el link");
              }
            }}
          >
            {copied ? "Copiado" : "Copiar link"}
          </Button>
        </div>

        <details className="border-t border-ink-100 pt-4">
          <summary className="cursor-pointer list-none text-[12.5px] font-medium text-ink-500 transition-colors hover:text-ink-700">
            Opciones avanzadas
          </summary>
          <div className="mt-3">
            <Field
              label={<TermLabel term="utm">Nombre de la campaña</TermLabel>}
              hint="Si estás corriendo varias campañas, poné acá el mismo nombre corto que cargaste en Campañas."
            >
              <Input
                value={campaign}
                onChange={(event) => setCampaign(event.target.value)}
                placeholder="habitos-frio-01"
              />
            </Field>
          </div>
        </details>
      </div>
    </Card>
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
