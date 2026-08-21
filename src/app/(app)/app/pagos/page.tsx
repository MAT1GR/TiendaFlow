import { headers } from "next/headers";
import type { Metadata } from "next";

import { PaymentProviders } from "@/app/(app)/app/pagos/providers";
import { PageHeader } from "@/components/ui/data";
import { Alert } from "@/components/ui/feedback";
import { requireSession } from "@/lib/auth";
import { listProviderStatus } from "@/lib/integrations/payments";
import { isOAuthAvailable } from "@/lib/integrations/mercadopago-oauth";

export const metadata: Metadata = { title: "Pagos" };

/**
 * El resultado de volver de Mercado Pago.
 *
 * Cada caso dice qué pasó y qué hacer, sin códigos ni jerga. "estado_invalido"
 * es el único que suena raro a propósito: casi siempre es una pestaña vieja o
 * un link reusado, pero también es lo que veríamos ante un intento de enganchar
 * una cuenta ajena, así que no lo minimizamos.
 */
const RESULTADO: Record<
  string,
  { tone: "success" | "warning" | "error"; title: string; body: string }
> = {
  conectado: {
    tone: "success",
    title: "¡Listo! Ya podés cobrar con Mercado Pago",
    body: "El dinero de cada venta va directo a tu cuenta. TiendaFlow no lo toca en ningún momento.",
  },
  conectado_prueba: {
    tone: "warning",
    title: "Conectamos tu cuenta, pero está en modo prueba",
    body: "Los cobros no van a ser reales. Revisá en Mercado Pago que estés usando tu aplicación en producción.",
  },
  cancelado: {
    tone: "warning",
    title: "Cancelaste la conexión",
    body: "No pasa nada: podés volver a intentarlo cuando quieras.",
  },
  sin_configurar: {
    tone: "error",
    title: "La conexión con Mercado Pago todavía no está habilitada",
    body: "Falta configurar la aplicación de Mercado Pago del lado del servidor. Mientras tanto podés conectar cargando tus claves a mano.",
  },
  estado_invalido: {
    tone: "error",
    title: "No pudimos verificar que la conexión saliera de acá",
    body: "Suele pasar si la pestaña quedó abierta mucho tiempo o si abriste el link en otro navegador. Empezá de nuevo desde este botón.",
  },
  sin_codigo: {
    tone: "error",
    title: "Mercado Pago no nos devolvió la autorización",
    body: "Probá de nuevo. Si vuelve a pasar, revisá que estés autorizando con la cuenta correcta.",
  },
  error: {
    tone: "error",
    title: "No pudimos completar la conexión",
    body: "Mercado Pago rechazó el pedido. Probá de nuevo en unos minutos.",
  },
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ mp?: string }>;
}) {
  const { workspace } = await requireSession();
  const providers = listProviderStatus(workspace.id);
  const anyConnected = providers.some((provider) => provider.connected);
  const oauthAvailable = isOAuthAvailable();

  const { mp } = await searchParams;
  const resultado = mp ? RESULTADO[mp] : null;

  // Base pública para armar las URLs de aviso de cobro que algunos proveedores
  // piden dar de alta en su panel.
  const headerList = await headers();
  const origin =
    process.env.TIENDAFLOW_SITE_URL ??
    `${headerList.get("x-forwarded-proto") ?? "http"}://${headerList.get("host") ?? "localhost:3000"}`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title="💳 ¿Cómo querés recibir tu dinero?"
        subtitle="Conectá tu cuenta y el dinero de tus ventas va directo ahí. TiendaFlow no lo toca en ningún momento."
      />

      {resultado ? (
        <Alert tone={resultado.tone} title={resultado.title}>
          {resultado.body}
        </Alert>
      ) : null}

      {!anyConnected && !resultado ? (
        <Alert tone="warning" title="Sin un medio de pago conectado no podés cobrar">
          Tus páginas van a seguir funcionando y guardando los pedidos, pero van a quedar
          pendientes: nadie puede pagarte y nadie recibe lo que compró.
        </Alert>
      ) : null}

      <PaymentProviders
        providers={providers}
        workspaceId={workspace.id}
        origin={origin}
        oauthAvailable={oauthAvailable}
      />

      <p className="text-[12.5px] leading-relaxed text-ink-400">
        Tus credenciales se guardan cifradas y nunca se envían al navegador: solo las descifra el
        servidor en el momento de crear un cobro o de confirmar un pago.
      </p>
    </div>
  );
}
