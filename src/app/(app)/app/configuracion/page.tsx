import type { Metadata } from "next";

import { SettingsWorkspace } from "@/app/(app)/app/configuracion/workspace";
import { MoreLink } from "@/components/app/more-link";
import { PageHeader } from "@/components/ui/data";
import { requireSession } from "@/lib/auth";
import { ensureSubscription } from "@/lib/repo";
import { hasDemoData } from "@/lib/seed";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const { user, workspace } = await requireSession();
  const subscription = ensureSubscription(workspace.id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title="Configuración" subtitle="Tu cuenta, tu negocio y tu plan." />

      <SettingsWorkspace
        user={{ full_name: user.full_name, email: user.email }}
        workspace={{
          name: workspace.name,
          slug: workspace.slug,
          country: workspace.country,
          currency: workspace.currency,
          taxId: workspace.tax_id,
        }}
        subscription={{
          plan: subscription.plan,
          status: subscription.status,
          periodEnd: subscription.current_period_end,
        }}
        hasDemo={hasDemoData(workspace.id)}
      />

      <MoreLink
        emoji="🌐"
        title="Dominios"
        blurb="Usá tu propio dominio en vez del link que te damos nosotros."
        href="/app/dominios"
      />
    </div>
  );
}
