import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { MetaPixel } from "@/components/public/meta-pixel";
import { VisitTracker } from "@/components/public/visit-tracker";
import { LandingSectionView, type SectionData } from "@/components/landing/blocks";
import { readTheme, themeVars } from "@/components/landing/theme";
import { Icon } from "@/components/ui/icon";
import { getMetaPublicConfig } from "@/lib/integrations/meta";
import { tiendaActual } from "@/lib/public-url";
import {
  resolvePublicFunnel,
  getLandingPageByStep,
  getOffer,
  getProduct,
  listFunnelSteps,
  listLandingSections,
} from "@/lib/repo";
import { formatMoney, parseJson, toLines } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const funnel = resolvePublicFunnel(slug, await tiendaActual());
  if (!funnel) return { title: "Página no encontrada" };

  const steps = listFunnelSteps(funnel.workspace_id, funnel.id);
  const landingStep = steps.find((step) => step.type === "landing");
  const page = landingStep ? getLandingPageByStep(funnel.workspace_id, landingStep.id) : null;
  const offer = funnel.offer_id ? getOffer(funnel.workspace_id, funnel.offer_id) : null;

  return {
    title: page?.seo_title ?? offer?.name ?? funnel.name,
    description: page?.seo_description ?? offer?.headline ?? undefined,
    robots: funnel.status === "published" ? undefined : { index: false, follow: false },
  };
}

export default async function PublicLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;

  /**
   * Vista previa desde el panel: la misma página, pero sin medir nada.
   *
   * Sin esto, cada vez que el vendedor mira su propia página le sumaría una
   * visita a sus estadísticas —hundiendo su tasa de conversión— y le mandaría
   * un PageView falso a Meta, que además usa esos eventos para optimizar.
   */
  const isPreview = preview === "1";
  const funnel = resolvePublicFunnel(slug, await tiendaActual());
  if (!funnel) notFound();

  const steps = listFunnelSteps(funnel.workspace_id, funnel.id);
  const landingStep = steps.find((step) => step.type === "landing");
  const page = landingStep ? getLandingPageByStep(funnel.workspace_id, landingStep.id) : null;
  const sections: SectionData[] = page
    ? listLandingSections(funnel.workspace_id, page.id)
        .filter((section) => section.visible)
        .map((section) => ({
          id: section.id,
          type: section.type,
          content: parseJson<Record<string, unknown>>(section.content, {}),
        }))
    : [];

  const offer = funnel.offer_id ? getOffer(funnel.workspace_id, funnel.offer_id) : null;
  const product = offer?.product_id ? getProduct(funnel.workspace_id, offer.product_id) : null;
  const theme = readTheme(parseJson<unknown>(page?.theme ?? null, {}));
  const checkoutHref = `/f/${slug}/checkout`;
  const pixel = getMetaPublicConfig(funnel.workspace_id);

  const priceLabel = offer ? formatMoney(offer.price, offer.currency) : undefined;
  const compareLabel = offer?.compare_at_price
    ? formatMoney(offer.compare_at_price, offer.currency)
    : undefined;

  return (
    <>
      {pixel && !isPreview ? (
        <MetaPixel pixelId={pixel.pixelId} events={["PageView", "ViewContent"]} />
      ) : null}
      {!isPreview ? <VisitTracker slug={slug} stepType="landing" /> : null}

      {funnel.status !== "published" ? (
        <div className="bg-amber-500 px-4 py-2 text-center text-[13px] font-medium text-white">
          Vista previa: este funnel todavía no está publicado.
        </div>
      ) : null}

      <main className="pb-24" style={themeVars(theme)}>
        {sections.length === 0 ? (
          <FallbackLanding
            title={offer?.headline ?? product?.name ?? funnel.name}
            subtitle={offer?.promise ?? product?.subtitle ?? ""}
            benefits={toLines(offer?.benefits ?? product?.benefits ?? null)}
            priceLabel={priceLabel}
            cta={offer?.cta_text ?? "Quiero mi acceso"}
            href={checkoutHref}
          />
        ) : (
          sections.map((section) => (
            <LandingSectionView
              key={section.id}
              section={section}
                ctaHref={checkoutHref}
              priceLabel={priceLabel}
              compareLabel={compareLabel}
            />
          ))
        )}
      </main>

      {/* CTA fijo en mobile: la mayor parte del tráfico de Meta llega desde el celular. */}
      {offer ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t p-3 backdrop-blur-md sm:hidden"
          style={{ ...themeVars(theme), borderColor: "var(--tf-line)" }}
        >
          <Link
            href={checkoutHref}
            className="flex items-center justify-center gap-2 px-5 py-3.5 text-[15px] font-extrabold"
            style={{
              backgroundColor: "var(--tf-accent)",
              color: "var(--tf-on-accent)",
              borderRadius: "var(--tf-radius)",
            }}
          >
            {offer.cta_text} · {formatMoney(offer.price, offer.currency)}
            <Icon name="arrowRight" size={17} />
          </Link>
        </div>
      ) : null}
    </>
  );
}

function FallbackLanding({
  title,
  subtitle,
  benefits,
  priceLabel,
  cta,
  href,
}: {
  title: string;
  subtitle: string;
  benefits: string[];
  priceLabel?: string;
  cta: string;
  href: string;
}) {
  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="text-[34px] font-semibold leading-[1.1] tracking-tight text-[color:var(--tf-text)] sm:text-[46px]">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-4 text-[17px] leading-relaxed text-[color:var(--tf-muted)]">{subtitle}</p>
      ) : null}

      {benefits.length ? (
        <ul className="mt-8 flex flex-col gap-2.5">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-3 text-[15px] text-[color:var(--tf-text)]">
              <span
                className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-white"
                style={{ backgroundColor: "var(--tf-accent)", color: "var(--tf-on-accent)", borderRadius: "var(--tf-radius)" }}
              >
                <Icon name="check" size={14} />
              </span>
              {benefit}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-10">
        {priceLabel ? (
          <p className="text-[32px] font-semibold tracking-tight text-[color:var(--tf-text)]">{priceLabel}</p>
        ) : null}
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-[16px] font-semibold text-white"
          style={{ backgroundColor: "var(--tf-accent)", color: "var(--tf-on-accent)", borderRadius: "var(--tf-radius)" }}
        >
          {cta}
          <Icon name="arrowRight" size={18} />
        </Link>
      </div>

      <p className="mt-10 rounded-xl border border-dashed border-[color:var(--tf-line)] px-4 py-3 text-[13px] text-[color:var(--tf-muted)]">
        Esta landing todavía no tiene secciones armadas. Editala desde el panel de TiendaFlow para
        controlar cada bloque.
      </p>
    </section>
  );
}
