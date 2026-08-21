import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductTabs, type WorkspaceTab } from "@/app/(app)/app/productos/[id]/tabs";
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Link
          href="/app/productos"
          className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-ink-500 transition-colors hover:text-ink-800"
        >
          <Icon name="chevronLeft" size={15} />
          Mis productos
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-ink-900">
              {product.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13.5px] text-ink-500">
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
      <ProductTabs productId={product.id} tabs={tabs} className="lg:hidden" />

      {children}
    </div>
  );
}
