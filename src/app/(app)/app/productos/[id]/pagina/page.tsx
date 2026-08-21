import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { LandingEditor } from "@/app/(app)/app/landings/[id]/editor";
import { ExperienceSteps, stepBlurb } from "@/components/app/experience-steps";
import { Card, LinkButton } from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { isFlowActive, withFlow } from "@/lib/product-flow";
import { productContext } from "@/lib/product-workspace";
import { publishChecklist } from "@/lib/publish-checklist";
import {
  getLandingPage,
  getLandingPageByStep,
  listFunnelSteps,
  listLandingSections,
} from "@/lib/repo";
import { formatMoney, parseJson } from "@/lib/utils";

export const metadata: Metadata = { title: "Página de venta" };

/**
 * El constructor de la experiencia de compra, parado en la página de venta.
 *
 * Arriba de todo va el recorrido completo —página de venta, checkout, después
 * de comprar, gracias— porque esa es la pregunta que se hace el vendedor
 * ("¿qué ve mi cliente?"), no "¿en qué paso del funnel estoy?". Debajo, el
 * editor visual: bloques a la izquierda, la página al medio, lo que está
 * editando a la derecha.
 */
export default async function SalesPageTab({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ guia?: string }>;
}) {
  const { workspace } = await requireSession();
  const { id } = await params;
  // Si viene del paso a paso, las puertas de esta pantalla mandan al lugar
  // que falta sin cortar la cadena.
  const enFlujo = isFlowActive((await searchParams).guia);

  const context = productContext(workspace.id, id);
  if (!context) notFound();

  const { offer, funnel } = context;

  if (!offer) {
    return (
      <Gate
        productId={id}
        emoji="🔒"
        title="Primero necesitás ponerle precio"
        body="La página de venta se arma alrededor del precio y la promesa de tu producto."
        href={withFlow(`/app/productos/${id}/oferta`, enFlujo)}
        cta="Ir a mi oferta"
      />
    );
  }

  if (!funnel) {
    return (
      <Gate
        productId={id}
        emoji="🛍️"
        title="Todavía no tenés página de venta"
        body="Es la página donde contás tu producto y desde donde te compran. La podés armar bloque por bloque o dejar que la IA la escriba por vos."
        href={withFlow(`/app/funnels/nuevo?oferta=${offer.id}`, enFlujo)}
        cta="Armar mi página"
      />
    );
  }

  const steps = listFunnelSteps(workspace.id, funnel.id);
  const landingStep = steps.find((step) => step.type === "landing");
  const pageRef = landingStep ? getLandingPageByStep(workspace.id, landingStep.id) : null;
  const page = pageRef ? getLandingPage(workspace.id, pageRef.id) : null;

  if (!page) {
    return (
      <Gate
        productId={id}
        emoji="🧱"
        title="A tu página le falta el contenido"
        body="La página existe pero todavía no hay nada adentro para mostrarle a la gente."
        href={`/app/funnels/${funnel.id}`}
        cta="Revisar la página"
      />
    );
  }

  const sections = listLandingSections(workspace.id, page.id);
  const theme = parseJson<unknown>(page.theme, {});

  return (
    <div className="flex flex-col gap-4">
      <Recorrido productId={id} step="venta" />

      <LandingEditor
        page={{
          id: page.id,
          name: page.name,
          status: page.status,
          theme: theme,
          seoTitle: page.seo_title,
          seoDescription: page.seo_description,
        }}
        blockers={publishChecklist(workspace.id, funnel.id, id)}
        sections={sections.map((section) => ({
          id: section.id,
          type: section.type,
          content: parseJson<Record<string, unknown>>(section.content, {}),
        }))}
        offer={{
          id: offer.id,
          name: offer.name,
          priceLabel: formatMoney(offer.price, offer.currency),
          compareLabel: offer.compare_at_price
            ? formatMoney(offer.compare_at_price, offer.currency)
            : null,
        }}
      />
    </div>
  );
}

/**
 * El recorrido de compra, con la frase que explica dónde está parado.
 *
 * Se repite en las cuatro pantallas del recorrido y también en las puertas
 * ("todavía no tenés precio"): estar bloqueado no es motivo para esconderle a
 * alguien el mapa de lo que está armando.
 */
function Recorrido({ productId, step }: { productId: string; step: "venta" }) {
  return (
    <div className="flex flex-col gap-1.5">
      <ExperienceSteps productId={productId} current={step} />
      <p className="text-[13px] text-ink-500">{stepBlurb(step)}</p>
    </div>
  );
}

function Gate({
  productId,
  emoji,
  title,
  body,
  href,
  cta,
}: {
  productId: string;
  emoji: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Recorrido productId={productId} step="venta" />

      <Card className="p-10 text-center">
        <p className="tf-emoji !inline-flex text-[32px]" aria-hidden="true">
          {emoji}
        </p>
        <h2 className="mt-4 text-[19px] font-semibold tracking-tight text-ink-900">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink-500">{body}</p>
        <div className="mt-6 flex justify-center">
          <LinkButton href={href} icon="arrowRight">
            {cta}
          </LinkButton>
        </div>
      </Card>
    </div>
  );
}
