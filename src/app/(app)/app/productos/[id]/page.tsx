import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Journey } from "@/app/(app)/app/productos/[id]/journey";
import { Icon } from "@/components/ui/icon";
import { LinkButton } from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { productBoosters, productContext, productJourney } from "@/lib/product-workspace";

export const metadata: Metadata = { title: "Resumen" };

/**
 * Resumen del producto: la pantalla única.
 *
 * Está ordenada por lo que la persona necesita saber, en ese orden y no otro:
 *
 *   1. ¿En qué etapa estoy y qué hago ahora?  → el camino
 *   2. ¿Está funcionando?                     → los números
 *   3. ¿Cómo lo mejoro?                       → las sugerencias, recién al final
 *
 * Los números aparecen solo cuando el producto está publicado. Mostrar cuatro
 * métricas en cero a alguien que todavía no publicó es ruido: no le dicen nada
 * y le tapan lo único que tiene que hacer.
 */
export default async function ProductOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requireSession();
  const { id } = await params;

  const context = productContext(workspace.id, id);
  const journey = productJourney(workspace.id, id);
  if (!context || !journey) notFound();

  const { publicUrl } = context;
  const boosters = journey.live ? productBoosters(workspace.id, id) : [];

  return (
    <div className="flex flex-col gap-5">
      <Journey journey={journey} />

      {publicUrl ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-ink-50/60 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[12.5px] font-medium text-ink-500">Tu link de venta</p>
            <code className="mt-0.5 block truncate text-[13.5px] font-medium text-ink-800">
              {publicUrl}
            </code>
          </div>
          <LinkButton href={publicUrl} variant="secondary" size="sm" icon="arrowUpRight">
            Abrir
          </LinkButton>
        </div>
      ) : null}


      {boosters.length > 0 ? (
        <section className="rounded-2xl border border-ink-200 bg-white p-5">
          <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">
            Para vender más
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-500">
            Nada de esto es obligatorio. Son las cosas que más mueven la aguja una vez que ya vendés.
          </p>

          <ul className="mt-4 flex flex-col divide-y divide-ink-100">
            {boosters.map((booster) => (
              <li key={booster.code} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span
                  className={
                    booster.done
                      ? "grid size-6 shrink-0 place-items-center rounded-full bg-accent-100 text-accent-700"
                      : "grid size-6 shrink-0 place-items-center rounded-full bg-ink-100 text-ink-400"
                  }
                >
                  <Icon name={booster.done ? "check" : "plus"} size={13} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-ink-900">{booster.title}</p>
                  <p className="text-[12.5px] text-ink-500">{booster.description}</p>
                </div>

                {!booster.done ? (
                  <LinkButton href={booster.href} variant="secondary" size="sm">
                    Agregar
                  </LinkButton>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
