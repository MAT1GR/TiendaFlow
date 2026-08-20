import type { Metadata } from "next";

import { PaymentProviders } from "@/app/(app)/app/pagos/providers";
import { PageHeader } from "@/components/ui/data";
import { Alert } from "@/components/ui/feedback";
import { requireSession } from "@/lib/auth";
import { listProviderStatus } from "@/lib/integrations/payments";

export const metadata: Metadata = { title: "Pagos" };

export default async function PaymentsPage() {
  const { workspace } = await requireSession();
  const providers = listProviderStatus(workspace.id);
  const anyConnected = providers.some((provider) => provider.connected);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title="Pagos"
        subtitle="Conectá un proveedor para poder cobrar en tu checkout."
      />

      {!anyConnected ? (
        <Alert tone="warning" title="Sin proveedor conectado no podés cobrar">
          El checkout va a seguir funcionando y guardando pedidos, pero van a quedar en estado
          pendiente. TiendaFlow nunca marca una venta como pagada sin la confirmación del proveedor.
        </Alert>
      ) : null}

      <PaymentProviders providers={providers} />

      <Alert tone="info" title="Dónde viven tus credenciales">
        La clave pública se guarda junto a la configuración del workspace. La clave secreta se
        guarda aparte y nunca se envía al navegador: solo la usa el servidor al crear el cobro.
      </Alert>
    </div>
  );
}
