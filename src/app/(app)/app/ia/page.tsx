import Link from "next/link";
import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/data";
import { Alert } from "@/components/ui/feedback";
import { Icon, type IconName } from "@/components/ui/icon";
import { Badge, Card, CardHeader, LinkButton } from "@/components/ui/primitives";
import { aiStatus } from "@/lib/ai/provider";
import { requireSession } from "@/lib/auth";
import { listAiGenerations, listFunnels, listOffers, listProducts } from "@/lib/repo";
import { relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "IA" };

const TASK_LABEL: Record<string, string> = {
  product_draft: "Borrador de producto",
  offer_draft: "Propuesta de oferta",
  landing_draft: "Landing generada",
  funnel_analysis: "Análisis de funnel",
  ad_copy: "Copy de anuncios",
  copilot: "Consulta al copiloto",
  rewrite_improve: "Texto mejorado",
  rewrite_expand: "Texto ampliado",
  rewrite_shorten: "Texto acortado",
  rewrite_tone: "Cambio de tono",
};

export default async function AiPage() {
  const { workspace } = await requireSession();
  const status = aiStatus();
  const history = listAiGenerations(workspace.id, 12);

  const products = listProducts(workspace.id, false);
  const offers = listOffers(workspace.id);
  const funnels = listFunnels(workspace.id);

  const tools: Array<{
    title: string;
    description: string;
    icon: IconName;
    href: string;
    cta: string;
    disabled?: string;
  }> = [
    {
      title: "Crear producto con IA",
      description: "De una idea a título, índice, capítulos, beneficios y FAQ.",
      icon: "box",
      href: "/app/productos/nuevo?fuente=ia",
      cta: "Empezar",
    },
    {
      title: "Crear oferta con IA",
      description: "Headline, promesa, beneficios, bonos, order bump y upsell.",
      icon: "tag",
      href: products.length ? "/app/ofertas/nueva?ia=1" : "/app/productos/nuevo",
      cta: products.length ? "Armar oferta" : "Crear producto primero",
      disabled: products.length ? undefined : "Necesitás al menos un producto.",
    },
    {
      title: "Generar landing con IA",
      description: "La página de venta completa, sección por sección.",
      icon: "layers",
      href: funnels.length ? "/app/landings" : "/app/funnels/nuevo",
      cta: funnels.length ? "Ir a landings" : "Crear funnel primero",
      disabled: funnels.length ? undefined : "Necesitás un funnel con landing.",
    },
    {
      title: "Optimizar mi funnel",
      description: "Dónde se cae la gente y qué testear primero.",
      icon: "target",
      href: funnels.length ? `/app/funnels/${funnels[0].id}` : "/app/funnels/nuevo",
      cta: funnels.length ? "Analizar funnel" : "Crear funnel primero",
      disabled: funnels.length ? undefined : "Necesitás un funnel con datos.",
    },
    {
      title: "Crear anuncio con IA",
      description: "Textos principales, títulos, hooks, ángulos y CTAs.",
      icon: "megaphone",
      href: offers.length ? "/app/marketing" : "/app/ofertas/nueva",
      cta: offers.length ? "Generar copy" : "Crear oferta primero",
      disabled: offers.length ? undefined : "Necesitás una oferta.",
    },
    {
      title: "Copiloto contextual",
      description: "Preguntale sobre lo que estás viendo, con tus datos reales.",
      icon: "sparkles",
      href: "/app",
      cta: "Abrilo con el botón ✨ del header",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="IA"
        subtitle="Todo lo que TiendaFlow puede escribir, armar y analizar por vos."
      />

      <Card className="overflow-hidden">
        <div className="tf-gradient-ai flex flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11.5px] font-semibold text-white ring-1 ring-inset ring-white/25">
              <Icon name="sparkles" size={13} />
              {status.configured ? "Proveedor conectado" : "Modo borrador local"}
            </p>
            <h2 className="mt-3 text-[22px] font-semibold tracking-tight text-white">
              {status.configured
                ? `Generación activa con ${status.model}`
                : "Todavía no hay un proveedor de IA conectado"}
            </h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-white/75">
              {status.configured
                ? "Las generaciones usan tus datos reales de producto, oferta y funnel."
                : "Podés usar todas las herramientas igual: armamos borradores locales con los datos que ya cargaste, y te lo avisamos en cada resultado."}
            </p>
          </div>
        </div>

        {!status.configured ? (
          <div className="p-5">
            <Alert tone="info" title="Cómo conectar un proveedor">
              Definí <code className="rounded bg-ink-100 px-1 py-0.5 text-[12px]">ANTHROPIC_API_KEY</code>{" "}
              en las variables de entorno del servidor y reiniciá la aplicación. La clave nunca se
              expone al navegador: todas las llamadas salen del servidor.
            </Alert>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <Card key={tool.title} hover className="flex flex-col p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Icon name={tool.icon} size={19} />
            </span>
            <h3 className="mt-3.5 text-[15px] font-semibold text-ink-900">{tool.title}</h3>
            <p className="mt-1 flex-1 text-[13px] leading-relaxed text-ink-500">
              {tool.description}
            </p>
            {tool.disabled ? (
              <p className="mt-3 text-[12px] text-amber-600">{tool.disabled}</p>
            ) : null}
            <LinkButton
              href={tool.href}
              variant="secondary"
              size="sm"
              full
              className="mt-4"
              iconRight="arrowRight"
            >
              {tool.cta}
            </LinkButton>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Historial de generaciones"
          subtitle="Guardamos cada generación para que puedas volver a lo anterior."
        />
        <div className="p-5 pt-4">
          {history.length === 0 ? (
            <p className="py-8 text-center text-[13.5px] text-ink-500">
              Todavía no generaste nada. Probá con “Crear producto con IA”.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {history.map((generation) => (
                <li
                  key={generation.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 px-4 py-3"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-500">
                    <Icon name="sparkles" size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium text-ink-900">
                      {TASK_LABEL[generation.task] ?? generation.task}
                    </span>
                    <span className="text-[11.5px] text-ink-400">
                      {relativeTime(generation.created_at)}
                    </span>
                  </span>
                  <Badge tone={generation.provider === "template" ? "warning" : "brand"}>
                    {generation.provider === "template" ? "Borrador local" : generation.provider}
                  </Badge>
                  {generation.entity_type === "landing_page" && generation.entity_id ? (
                    <Link
                      href={`/app/landings/${generation.entity_id}`}
                      className="text-[12.5px] font-semibold text-brand-700 hover:text-brand-800"
                    >
                      Abrir
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
