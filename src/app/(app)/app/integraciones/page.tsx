import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/data";
import { Alert, ConnectionStatus } from "@/components/ui/feedback";
import { Icon, type IconName } from "@/components/ui/icon";
import { Card, LinkButton } from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { listIntegrations } from "@/lib/repo";

export const metadata: Metadata = { title: "Integraciones" };

const CATALOG: Array<{
  provider: string;
  name: string;
  description: string;
  icon: IconName;
  href: string | null;
  available: boolean;
}> = [
  {
    provider: "meta",
    name: "Meta (Pixel + API de Conversiones)",
    description: "Medí cada evento del funnel y atribuí las ventas a tus campañas.",
    icon: "megaphone",
    href: "/app/integraciones/meta",
    available: true,
  },
  {
    provider: "stripe",
    name: "Stripe",
    description: "Cobrá con tarjeta internacional.",
    icon: "card",
    href: "/app/pagos",
    available: true,
  },
  {
    provider: "mercadopago",
    name: "Mercado Pago",
    description: "Cobrá en Latinoamérica con tarjeta, débito y efectivo.",
    icon: "card",
    href: "/app/pagos",
    available: true,
  },
  {
    provider: "google_analytics",
    name: "Google Analytics 4",
    description: "Sumá una segunda fuente de medición de tráfico.",
    icon: "chart",
    href: null,
    available: false,
  },
  {
    provider: "email",
    name: "Proveedor de email",
    description: "Entregá el producto y armá secuencias post-compra.",
    icon: "mail",
    href: null,
    available: false,
  },
];

export default async function IntegrationsPage() {
  const { workspace } = await requireSession();
  const integrations = listIntegrations(workspace.id);
  const statusMap = Object.fromEntries(
    integrations.map((integration) => [integration.provider, integration]),
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title="Integraciones"
        subtitle="Todo lo que TiendaFlow puede conectar con tus otras herramientas."
      />

      <div className="flex flex-col gap-3">
        {CATALOG.map((item) => {
          const integration = statusMap[item.provider];
          return (
            <Card key={item.provider} className="flex flex-wrap items-center gap-4 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-600">
                <Icon name={item.icon} size={20} />
              </span>

              <div className="min-w-48 flex-1">
                <p className="text-[15px] font-semibold text-ink-900">{item.name}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink-500">{item.description}</p>
                <div className="mt-1.5">
                  {item.available ? (
                    <ConnectionStatus
                      status={
                        integration?.status === "connected"
                          ? "connected"
                          : integration?.status === "error"
                            ? "error"
                            : "disconnected"
                      }
                    />
                  ) : (
                    <span className="text-[12.5px] font-medium text-ink-400">
                      Todavía no disponible
                    </span>
                  )}
                </div>
                {integration?.last_error ? (
                  <p className="mt-1.5 text-[12.5px] text-amber-700">{integration.last_error}</p>
                ) : null}
              </div>

              {item.href ? (
                <LinkButton href={item.href} variant="secondary" size="sm" iconRight="arrowRight">
                  {integration?.status === "connected" ? "Administrar" : "Conectar"}
                </LinkButton>
              ) : (
                <span className="rounded-lg bg-ink-100 px-3 py-1.5 text-[12.5px] font-medium text-ink-500">
                  Próximamente
                </span>
              )}
            </Card>
          );
        })}
      </div>

      <Alert tone="info" title="Cómo tratamos tus credenciales">
        Las claves secretas (tokens de Meta, claves de pago) se guardan separadas de la
        configuración pública y nunca se envían al navegador. Solo las lee el servidor al hacer la
        llamada correspondiente.
      </Alert>
    </div>
  );
}
