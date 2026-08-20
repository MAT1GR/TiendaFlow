import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { LandingEditor } from "@/app/(app)/app/landings/[id]/editor";
import { Card, LinkButton } from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { productContext } from "@/lib/product-workspace";
import {
  getLandingPage,
  getLandingPageByStep,
  listFunnelSteps,
  listLandingSections,
} from "@/lib/repo";
import { formatMoney, parseJson } from "@/lib/utils";

export const metadata: Metadata = { title: "Página de venta" };

/**
 * Página de venta: el armador.
 *
 * Es el mismo editor visual que ya existía en `/app/landings/[id]`, pero traído
 * adentro del producto. Antes había que salir del producto para editar la
 * página, que es justo el salto de contexto que estamos sacando.
 *
 * Los bloques quedan a la izquierda, la vista previa en celular al medio y las
 * propiedades del bloque elegido a la derecha.
 */
export default async function SalesPageTab({ params }: { params: Promise<{ id: string }> }) {
  const { workspace } = await requireSession();
  const { id } = await params;

  const context = productContext(workspace.id, id);
  if (!context) notFound();

  const { offer, funnel } = context;

  if (!offer) {
    return (
      <Gate
        emoji="🔒"
        title="Primero necesitás ponerle precio"
        body="La página de venta se arma alrededor del precio y la promesa de tu producto."
        href={`/app/productos/${id}/oferta`}
        cta="Ir a mi oferta"
      />
    );
  }

  if (!funnel) {
    return (
      <Gate
        emoji="🛍️"
        title="Todavía no tenés página de venta"
        body="Es la página donde contás tu producto y desde donde te compran. La podés armar bloque por bloque o dejar que la IA la escriba por vos."
        href={`/app/funnels/nuevo?oferta=${offer.id}`}
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
        emoji="🧱"
        title="A tu página le falta el contenido"
        body="El recorrido de venta existe, pero todavía no hay una página que mostrarle a la gente."
        href={`/app/funnels/${funnel.id}`}
        cta="Revisar el recorrido"
      />
    );
  }

  const sections = listLandingSections(workspace.id, page.id);
  const theme = parseJson<{ accent?: string }>(page.theme, {});

  return (
    <LandingEditor
      page={{
        id: page.id,
        name: page.name,
        status: page.status,
        accent: theme.accent ?? "#6D5DFB",
        seoTitle: page.seo_title,
        seoDescription: page.seo_description,
      }}
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
  );
}

function Gate({
  emoji,
  title,
  body,
  href,
  cta,
}: {
  emoji: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
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
  );
}
