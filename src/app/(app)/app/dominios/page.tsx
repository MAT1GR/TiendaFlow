import type { Metadata } from "next";

import { DomainsPanel } from "@/app/(app)/app/dominios/panel";
import { PageHeader } from "@/components/ui/data";
import { Alert } from "@/components/ui/feedback";
import { requireSession } from "@/lib/auth";
import { listDomains } from "@/lib/repo";

export const metadata: Metadata = { title: "Dominios" };

export default async function DomainsPage() {
  const { workspace } = await requireSession();
  const domains = listDomains(workspace.id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title="Dominios" subtitle="Publicá tus funnels en tu propia marca." />

      <Alert tone="warning" title="La verificación automática todavía no está conectada">
        Podés cargar tus dominios y ver los registros DNS que hay que crear, pero TiendaFlow no
        puede verificarlos ni emitir el certificado SSL hasta que se conecte la infraestructura de
        dominios. Ningún dominio va a figurar como activo sin esa verificación.
      </Alert>

      <DomainsPanel domains={domains} workspaceSlug={workspace.slug} />
    </div>
  );
}
