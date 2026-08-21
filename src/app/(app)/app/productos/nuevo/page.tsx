import type { Metadata } from "next";

import { NewProductFlow } from "@/app/(app)/app/productos/nuevo/flow";
import { FlowBar } from "@/components/app/flow-bar";
import { PageHeader } from "@/components/ui/data";
import { aiStatus } from "@/lib/ai/provider";
import { requireSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Crear producto" };

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ fuente?: string }>;
}) {
  await requireSession();
  const { fuente } = await searchParams;
  const status = aiStatus();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title="Crear producto"
        subtitle="Ponele nombre, contanos qué es y la IA escribe el resto."
        breadcrumb={[{ label: "Productos", href: "/app/productos" }, { label: "Nuevo" }]}
      />

      {/* Acá arranca el paso a paso, así que la barra se muestra siempre: es la
          primera vez que la persona ve cuántos pasos son en total. */}
      <FlowBar step="producto" always />
      <NewProductFlow
        aiConfigured={status.configured}
        // El alta ya preguntó si el material existe. Si existe, la IA describe
        // lo que hay adentro en vez de inventarle capítulos que nadie escribió.
        yaLoTiene={fuente === "propio"}
      />
    </div>
  );
}
