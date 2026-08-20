import type { Metadata } from "next";

import { NewProductFlow } from "@/app/(app)/app/productos/nuevo/flow";
import { PageHeader } from "@/components/ui/data";
import { aiStatus } from "@/lib/ai/provider";
import { requireSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Crear producto" };

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ fuente?: string }>;
}) {
  const { workspace } = await requireSession();
  const { fuente } = await searchParams;
  const status = aiStatus();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="Crear producto"
        subtitle="En 6 pasos tenés el producto listo para armar tu oferta."
        breadcrumb={[{ label: "Productos", href: "/app/productos" }, { label: "Nuevo" }]}
      />
      <NewProductFlow
        currency={workspace.currency}
        initialSource={fuente === "ia" ? "ia" : undefined}
        aiConfigured={status.configured}
      />
    </div>
  );
}
