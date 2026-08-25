import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { readIdealClient } from "@/lib/ai/research";
import { InvestigacionCliente } from "./investigacion";
import { SectionIntro } from "@/components/app/section-intro";
import { requireSession } from "@/lib/auth";
import { productContext, sectionBlurb } from "@/lib/product-workspace";

export const metadata: Metadata = { title: "Mi cliente" };

/**
 * Mi cliente.
 *
 * La sección que faltaba. Todas las demás le piden al vendedor que escriba
 * —el producto, la oferta, la página, los anuncios— y ninguna le preguntaba
 * antes a quién le está hablando. Acá se investiga una vez y el resto de la app
 * escribe con eso adelante.
 *
 * La investigación se lee del servidor y baja ya cargada: es material de
 * consulta, no algo que haya que volver a generar cada vez que entrás.
 */
export default async function ProductClientTab({ params }: { params: Promise<{ id: string }> }) {
  const { workspace } = await requireSession();
  const { id } = await params;

  const context = productContext(workspace.id, id);
  if (!context) notFound();

  return (
    <div className="flex flex-col gap-5">
      <SectionIntro emoji="🎯" title="Mi cliente" blurb={sectionBlurb("cliente")} />

      <InvestigacionCliente
        productId={id}
        productName={context.product.name}
        research={readIdealClient(workspace.id, id)}
      />
    </div>
  );
}
