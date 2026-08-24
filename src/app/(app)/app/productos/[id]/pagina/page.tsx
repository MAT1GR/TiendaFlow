import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { LandingEditor } from "@/app/(app)/app/landings/[id]/editor";
import { PantallaSelector } from "@/components/app/experience-steps";
import { Card, LinkButton } from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { isFlowActive, withFlow } from "@/lib/product-flow";
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
 * El constructor de la experiencia de compra, parado en la página de venta.
 *
 * Arriba de todo van las cuatro pantallas del recorrido —página de venta,
 * checkout, después de comprar, gracias— como tarjetas seleccionables, porque
 * esa es la pregunta que se hace el vendedor ("¿qué ve mi cliente?") y no "¿en
 * qué paso del funnel estoy?". Debajo, el editor: los bloques a la izquierda,
 * la página al medio dibujada dentro de un teléfono, y a la derecha los campos
 * del bloque que está tocando.
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

  const { product, offer, funnel } = context;

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

  /*
   * Acá no va nada arriba del editor.
   *
   * La barra del editor es el encabezado de esta pantalla: adentro tiene el
   * selector de las cuatro pantallas del recorrido, el estado de la página y
   * todas las acciones. Cualquier cosa que se apile encima —un título, un
   * recorrido, un aviso— es alto que se le saca a la vista previa, que es lo
   * único que la persona vino a mirar.
   */
  return (
    <div className="flex flex-col">
      <LandingEditor
        productId={id}
        page={{
          id: page.id,
          name: page.name,
          status: page.status,
          theme: theme,
          seoTitle: page.seo_title,
          seoDescription: page.seo_description,
        }}
        backHref={{ href: `/app/productos/${id}`, label: product.name }}
        cover={{ url: product.cover_url, href: `/app/productos/${id}/producto` }}
        /* El formulario de la IA arranca con lo que ya contestó al cargar su
           producto. Si está completo es apretar un botón; si falta algo, el
           hueco se ve y se llena ahí mismo. */
        brief={{
          audience: product.audience ?? "",
          problem: product.main_problem ?? "",
          transformation: product.transformation ?? "",
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
    </div>
  );
}

/**
 * El selector de pantallas, para las puertas.
 *
 * Estar bloqueado —"todavía no tenés precio"— no es motivo para esconderle a
 * alguien el mapa de lo que está armando.
 */
function Recorrido({ productId, step }: { productId: string; step: "venta" }) {
  return <PantallaSelector productId={productId} current={step} className="w-fit" />;
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
