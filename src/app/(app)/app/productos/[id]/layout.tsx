import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductTabs, type WorkspaceTab } from "@/app/(app)/app/productos/[id]/tabs";
import { ProductNextStep } from "@/components/app/next-step";
import { ProgressLine } from "@/components/app/progress-line";
import { Badge, LinkButton } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { requireSession } from "@/lib/auth";
import {
  PRODUCT_SECTIONS,
  productContext,
  productJourney,
  STAGE_LABEL,
  STAGE_TONE,
} from "@/lib/product-workspace";
import { formatMoney } from "@/lib/utils";

/**
 * Espacio de trabajo del producto.
 *
 * Todo lo que sirve para vender este producto vive acá adentro. El usuario no
 * salta entre "Ofertas" y "Funnels": entra a su producto y no pierde el
 * contexto hasta que lo publica.
 */
export default async function ProductWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requireSession();
  const { id } = await params;

  const context = productContext(workspace.id, id);
  const journey = productJourney(workspace.id, id);
  if (!context || !journey) notFound();

  const { product, offer, stats, stage, publicUrl } = context;

  // Las pestañas salen de la misma lista que el sidebar: una sola fuente de
  // verdad para el vocabulario del producto. El aviso ámbar lo pone el GPS.
  const attention = new Map(
    journey.steps.map((step) => [step.code, step.required && step.state === "todo"]),
  );

  const tabs: WorkspaceTab[] = PRODUCT_SECTIONS.map((section) => ({
    segment: section.segment,
    label: section.label,
    emoji: section.emoji,
    attention: attention.get(section.segment === "" ? "resumen" : section.segment) ?? false,
  }));

  const readyToPublish = journey.nextStep === null && !publicUrl;

  /*
   * En celular el encabezado se aprieta.
   *
   * Es el mismo contenido, no menos: el nombre del producto, en qué estado
   * está y cuánto vendió. Pero con los tamaños de escritorio ocupaba media
   * pantalla de teléfono, y lo que la persona vino a hacer —editar algo—
   * quedaba abajo del pliegue en todas las secciones del producto.
   */
  /*
   * El encabezado desaparece en las pantallas que piden todo el ancho.
   *
   * Hoy eso es el constructor de la página de venta, y ahí su propia barra ya
   * es el encabezado: tiene la flecha para volver, el selector de las cuatro
   * pantallas del recorrido, el estado de la página y todas las acciones.
   * Dejar además el título del producto, sus botones y sus pestañas apilaba
   * tres encabezados distintos antes de que empezara la vista previa —en un
   * teléfono, media pantalla— para repetir cosas que la barra ya dice.
   *
   * El `group/producto` es lo que deja preguntarlo: el `data-fullbleed` lo
   * pone la pantalla hija, así que el layout no necesita saber en qué ruta
   * está ni volverse un Client Component para leer el pathname.
   */
  return (
    <div className="group/producto flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-2.5 group-has-[[data-fullbleed]]/producto:hidden sm:gap-4">
        <Link
          href="/app/productos"
          className="hidden w-fit items-center gap-1.5 text-[13px] font-medium text-ink-500 transition-colors hover:text-ink-800 sm:inline-flex"
        >
          <Icon name="chevronLeft" size={15} />
          Mis productos
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[21px] font-semibold leading-tight tracking-tight text-ink-900 sm:text-[26px]">
              {product.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-ink-500 sm:mt-2 sm:text-[13.5px]">
              <Badge tone={STAGE_TONE[stage]}>{STAGE_LABEL[stage]}</Badge>
              {offer && offer.price > 0 ? (
                <span className="font-medium text-ink-800">
                  {formatMoney(offer.price, offer.currency)}
                </span>
              ) : (
                <span>Sin precio todavía</span>
              )}
              {/* Las ventas solo se muestran cuando existen: un "0 ventas" al
                  lado del nombre no informa nada y suma ruido. */}
              {stats.orders > 0 ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {stats.orders === 1 ? "1 venta" : `${stats.orders} ventas`}
                    {stats.revenue > 0
                      ? ` · ${formatMoney(stats.revenue, offer?.currency ?? workspace.currency)}`
                      : ""}
                  </span>
                </>
              ) : null}
            </div>

            {/*
              Cuánto llevo, en un renglón. Lo que hago ahora está abajo, en la
              barra de "lo que sigue": son dos preguntas distintas y cada una
              tiene su lugar.

              Desaparece en el Resumen, que es la pantalla que dibuja el
              recorrido completo: ahí este renglón sería la misma información
              comprimida, arriba de la versión larga.
            */}
            <div className="group-has-[[data-recorrido]]/producto:hidden">
              <ProgressLine
                steps={journey.steps.map((step) => ({
                  code: step.code,
                  title: step.title,
                  status: step.status,
                  state: step.state,
                  href: step.href,
                  required: step.required,
                }))}
                className="-ml-2 mt-2"
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {publicUrl ? (
              <>
                <LinkButton href={publicUrl} variant="secondary" size="sm" icon="eye">
                  Vista previa
                </LinkButton>
                <LinkButton
                  href={`/app/productos/${product.id}/publicar`}
                  variant="secondary"
                  size="sm"
                  icon="link"
                >
                  Compartir
                </LinkButton>
              </>
            ) : readyToPublish ? (
              <LinkButton href={`/app/productos/${product.id}/publicar`} size="sm" icon="rocket">
                Publicar
              </LinkButton>
            ) : null}
          </div>
        </div>
      </div>

      {/* En desktop la navegación del producto vive en el sidebar. Estas
          pestañas son para móvil, donde el sidebar está oculto. */}
      <ProductTabs
        productId={product.id}
        tabs={tabs}
        className="group-has-[[data-fullbleed]]/producto:hidden lg:hidden"
      />

      {children}

      {/*
        "¿Y ahora qué?", contestado en todas las secciones.
        Va acá abajo y no en cada pantalla para que ninguna se olvide, y se
        esconde en el constructor de la página de venta, que ocupa el alto
        completo de la ventana y tiene su propia barra de acciones.
      */}
      <div className="group-has-[[data-fullbleed]]/producto:hidden">
        <ProductNextStep
          steps={journey.steps.map((step) => ({
            code: step.code,
            title: step.title,
            status: step.status,
            state: step.state,
            href: step.href,
            required: step.required,
          }))}
          publicUrl={publicUrl}
        />
      </div>
    </div>
  );
}
