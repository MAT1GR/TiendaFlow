import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { PublishButton } from "@/app/(app)/app/productos/[id]/publicar/publish";
import { ShareLink } from "@/app/(app)/app/productos/[id]/share-link";
import { SectionIntro } from "@/components/app/section-intro";
import { Icon } from "@/components/ui/icon";
import { LinkButton } from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { storeUrl } from "@/lib/public-url";
import { productContext, productJourney } from "@/lib/product-workspace";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Publicar" };

/**
 * La pantalla de publicación.
 *
 * Merece ser una pantalla propia y no un botón perdido en un editor: es el
 * momento en el que el producto deja de ser un borrador y pasa a existir para
 * el mundo. Antes de publicar muestra el checklist completo; después, el link.
 */
export default async function PublishPage({ params }: { params: Promise<{ id: string }> }) {
  const { workspace } = await requireSession();
  const { id } = await params;

  const context = productContext(workspace.id, id);
  const journey = productJourney(workspace.id, id);
  if (!context || !journey) notFound();

  const { funnel, publicUrl, product } = context;

  // El link que se comparte lleva el subdominio de la tienda; el formato largo
  // queda de respaldo para hosts que no admiten subdominios.
  const linkDeVenta =
    publicUrl && funnel
      ? await storeUrl({
          workspaceSlug: workspace.slug,
          funnelSlug: funnel.slug,
          fallback: publicUrl,
        })
      : publicUrl;
  const checklist = journey.steps.filter((step) => step.code !== "publicar");
  const blockers = checklist.filter((step) => step.required && step.state !== "done");
  const published = funnel?.status === "published";

  /* --- Ya está publicado --- */
  if (published && publicUrl) {
    return (
      <div className="flex flex-col gap-5">
        <section className="tf-enter rounded-2xl border border-accent-200 bg-accent-50/50 p-8 text-center">
          <p className="tf-emoji tf-pop !inline-flex !text-[40px]" aria-hidden="true">
            🎉
          </p>
          <h2 className="mt-3 text-[22px] font-semibold tracking-tight text-ink-900">
            ¡Ya está! Tu producto está publicado
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink-600">
            Cualquiera que abra este link puede comprar <strong>{product.name}</strong>. Compartilo
            donde esté tu gente: Instagram, WhatsApp, TikTok o un anuncio.
          </p>
        </section>

        <ShareLink url={linkDeVenta!} prominent />

        <div className="flex flex-wrap gap-2">
          <LinkButton href="/app/marketing" icon="megaphone">
            Conseguir visitas
          </LinkButton>
          <LinkButton
            href={`/app/productos/${id}/resultados`}
            variant="secondary"
            icon="chart"
          >
            Ver resultados
          </LinkButton>
          <LinkButton href={`/app/productos/${id}/pagina`} variant="secondary" icon="edit">
            Editar mi página
          </LinkButton>
        </div>

        <p className="text-[12.5px] leading-relaxed text-ink-400">
          Podés seguir editando tu página cuando quieras: los cambios se ven al guardar, sin volver
          a publicar.
        </p>
      </div>
    );
  }

  /* --- Todavía no --- */
  return (
    <div className="flex flex-col gap-5">
      <SectionIntro
        emoji="🚀"
        title="Publicar"
        blurb="Cuando esté todo listo, publicás y tenés un link para empezar a vender."
      />

      <section className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
        <header className="border-b border-ink-100 px-5 py-4">
          <h3 className="text-[15px] font-semibold tracking-tight text-ink-900">
            {blockers.length === 0
              ? "Está todo listo"
              : blockers.length === 1
                ? "Falta una sola cosa"
                : `Faltan ${blockers.length} cosas`}
          </h3>
          <p className="mt-0.5 text-[13px] text-ink-500">
            {blockers.length === 0
              ? "Revisá que esté todo como querés y publicá."
              : "Estas son las que bloquean la publicación. Clickeá para resolverlas."}
          </p>
        </header>

        <ul className="flex flex-col divide-y divide-ink-100">
          {checklist.map((step) => {
            const done = step.state === "done";
            const optional = !step.required;

            return (
              <li key={step.code}>
                <Link
                  href={step.href}
                  className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-ink-50"
                >
                  {done ? (
                    <span className="tf-pop grid size-5 shrink-0 place-items-center rounded-full bg-accent-500 text-white">
                      <Icon name="check" size={12} />
                    </span>
                  ) : (
                    <span className="grid size-5 shrink-0 place-items-center">
                      <span
                        className={cn(
                          "size-2.5 rounded-full",
                          optional ? "border border-ink-300 bg-white" : "bg-amber-400",
                        )}
                      />
                    </span>
                  )}

                  <span className="tf-emoji shrink-0" aria-hidden="true">
                    {step.emoji}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-ink-900">{step.title}</span>
                    <span
                      className={cn(
                        "block truncate text-[12.5px]",
                        done ? "text-accent-700" : optional ? "text-ink-400" : "text-amber-700",
                      )}
                    >
                      {step.status}
                    </span>
                  </span>

                  <Icon
                    name="chevronRight"
                    size={16}
                    className="shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-ink-200 bg-ink-50/60 px-5 py-7 text-center">
        {funnel ? (
          <PublishButton funnelId={funnel.id} blocked={blockers.length > 0} />
        ) : (
          <LinkButton href={`/app/productos/${id}/pagina`} icon="arrowRight">
            Armar mi página de venta
          </LinkButton>
        )}

        <p className="max-w-md text-[13px] leading-relaxed text-ink-500">
          {blockers.length > 0
            ? "En cuanto resuelvas lo de arriba, este botón se activa."
            : "Al publicar vas a tener un link propio. Podés despublicar cuando quieras."}
        </p>
      </div>
    </div>
  );
}
