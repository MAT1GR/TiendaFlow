import type { Metadata } from "next";

import { MetaForm } from "@/app/(app)/app/integraciones/meta/form";
import { PageHeader } from "@/components/ui/data";
import { requireSession } from "@/lib/auth";
import { META_EVENTS } from "@/lib/integrations/meta";
import { getIntegration, hasIntegrationSecret } from "@/lib/repo";
import { parseJson } from "@/lib/utils";

export const metadata: Metadata = { title: "Meta Ads" };

export default async function MetaIntegrationPage() {
  const { workspace } = await requireSession();
  const integration = getIntegration(workspace.id, "meta");
  const config = parseJson<{ pixel_id?: string; dataset_id?: string; events?: string[] }>(
    integration?.public_config ?? null,
    {},
  );
  const hasToken = hasIntegrationSecret(workspace.id, "meta");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title="Meta Ads"
        subtitle="Pixel en el navegador y API de Conversiones desde el servidor."
        breadcrumb={[
          { label: "Integraciones", href: "/app/integraciones" },
          { label: "Meta Ads" },
        ]}
      />

      <MetaForm
        status={integration?.status ?? "disconnected"}
        lastError={integration?.last_error ?? null}
        pixelId={config.pixel_id ?? ""}
        datasetId={config.dataset_id ?? ""}
        events={config.events ?? [...META_EVENTS]}
        allEvents={[...META_EVENTS]}
        hasToken={hasToken}
      />
    </div>
  );
}
