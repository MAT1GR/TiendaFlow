"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";

import { disconnectIntegrationAction, savePaymentProviderAction } from "@/app/actions/settings";
import { HowTo } from "@/components/ui/explain";
import { Alert, ConnectionStatus } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  Select,
  useToast,
} from "@/components/ui/primitives";
import type { ProviderStatus } from "@/lib/integrations/payments";

const STEPS: Record<string, React.ReactNode[]> = {
  stripe: [
    <>Entrá a <strong>dashboard.stripe.com</strong> con tu cuenta.</>,
    <>En el menú de arriba tocá <strong>Desarrolladores</strong> (Developers).</>,
    <>Entrá a <strong>Claves de API</strong> (API keys).</>,
    <>
      Copiá la <strong>Publishable key</strong> (empieza con <code>pk_</code>) y la{" "}
      <strong>Secret key</strong> (empieza con <code>sk_</code>). Para ver la secreta hay que tocar
      “Revelar”.
    </>,
  ],
  mercadopago: [
    <>Entrá a <strong>mercadopago.com.ar/developers</strong> con tu cuenta de Mercado Pago.</>,
    <>Andá a <strong>Tus integraciones</strong> y elegí tu aplicación (o creá una).</>,
    <>En el menú de la izquierda tocá <strong>Credenciales de producción</strong>.</>,
    <>
      Copiá la <strong>Public Key</strong> (empieza con <code>APP_USR</code>) y el{" "}
      <strong>Access Token</strong>.
    </>,
  ],
};

const DETAILS: Record<
  string,
  { flag: string; blurb: string; who: string; publicLabel: string; secretLabel: string; help: string }
> = {
  stripe: {
    flag: "💳",
    blurb: "Tarjetas internacionales, en dólares o en la moneda que elijas.",
    who: "Si le vendés a gente de afuera, necesitás este.",
    publicLabel: "Publishable key (pk_…)",
    secretLabel: "Secret key (sk_…)",
    help: "Te vamos guiando: son dos claves que copiás del panel de Stripe.",
  },
  mercadopago: {
    flag: "🇦🇷",
    blurb: "Tarjetas, débito, efectivo y cuotas en Argentina y el resto de Latinoamérica.",
    who: "Si vendés en pesos, este es el que usa casi todo el mundo.",
    publicLabel: "Public key (APP_USR…)",
    secretLabel: "Access token",
    help: "Te vamos guiando: son dos datos que copiás del panel de Mercado Pago.",
  },
};

/**
 * Los medios de pago, en tarjetas grandes.
 *
 * La decisión que toma la persona acá es una sola: *conectá tu cuenta y listo*.
 * Las claves, el modo y el aviso de cobro son plomería —importan, pero no son
 * la decisión— así que viven adentro del diálogo de conexión y de un desplegable
 * de datos técnicos que se abre solo si alguien lo busca.
 */
export function PaymentProviders({
  providers,
  workspaceId,
  origin,
  oauthAvailable,
}: {
  providers: ProviderStatus[];
  workspaceId: string;
  origin: string;
  /** `true` si la plataforma tiene cargada su aplicación de Mercado Pago. */
  oauthAvailable: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<ProviderStatus | null>(null);
  const [pending, startTransition] = useTransition();

  const webhookUrl = (provider: ProviderStatus) =>
    `${origin}/api/webhooks/${provider.id}/${workspaceId}`;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {providers.map((provider) => {
          const detail = DETAILS[provider.id];

          // Mercado Pago se conecta con un botón cuando la plataforma tiene su
          // aplicación cargada. Si no, queda el camino manual, que sigue
          // funcionando pero le pide al vendedor buscar un access token.
          const useOAuth = provider.id === "mercadopago" && oauthAvailable;

          return (
            <Card
              key={provider.id}
              className={provider.connected ? "border-accent-200 p-5" : "p-5"}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className="tf-emoji !inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-ink-100 !text-[22px]"
                  aria-hidden="true"
                >
                  {detail?.flag ?? "💳"}
                </span>
                <ConnectionStatus status={provider.connected ? "connected" : "disconnected"} />
              </div>

              <p className="mt-3.5 text-[16px] font-semibold text-ink-900">{provider.name}</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">{detail?.blurb}</p>
              <p className="mt-1.5 text-[13px] text-ink-500">{detail?.who}</p>

              {provider.connected && provider.accountName ? (
                <p className="mt-3 text-[13px] text-ink-600">
                  Conectado como <strong className="text-ink-900">{provider.accountName}</strong>
                  {provider.mode === "test" ? (
                    <span className="ml-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      modo prueba
                    </span>
                  ) : null}
                </p>
              ) : null}

              {provider.connected && provider.mode === "test" && !provider.accountName ? (
                <p className="mt-3 text-[12.5px] text-amber-700">
                  Está en modo prueba: los cobros no son reales.
                </p>
              ) : null}

              {provider.lastError ? (
                <p className="mt-3 text-[12.5px] text-red-600">{provider.lastError}</p>
              ) : null}

              {/* La conexión de un clic depende de que la plataforma tenga
                  cargada su aplicación de Mercado Pago. Si no la tiene, el
                  camino manual sigue funcionando — pero lo decimos, en vez de
                  mostrar un formulario de claves sin explicar por qué. */}
              {provider.id === "mercadopago" && !oauthAvailable ? (
                <p className="mt-3 rounded-xl bg-ink-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-600">
                  <strong className="text-ink-900">Conectar con un botón todavía no está activo.</strong>{" "}
                  Falta cargar <code className="text-ink-700">MERCADOPAGO_CLIENT_SECRET</code> en el
                  servidor. Mientras tanto podés conectarte cargando tus claves a mano.
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {useOAuth ? (
                  <a
                    href="/api/oauth/mercadopago/start"
                    className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#009EE3] px-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#0088c4]"
                  >
                    <Icon name="link" size={15} />
                    {provider.connected ? "Reconectar mi cuenta" : "Conectar con Mercado Pago"}
                  </a>
                ) : (
                  <Button
                    variant={provider.connected ? "secondary" : "primary"}
                    size="sm"
                    icon={provider.connected ? "settings" : "plug"}
                    onClick={() => setEditing(provider)}
                  >
                    {provider.connected ? "Administrar" : "Conectar mi cuenta"}
                  </Button>
                )}
                {provider.connected ? (
                  <Button
                    variant="danger"
                    size="sm"
                    loading={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await disconnectIntegrationAction(provider.id);
                        if (result.ok) {
                          toast.success(result.message ?? "Desconectado.");
                          router.refresh();
                        } else {
                          toast.error("No pudimos desconectarlo", result.error);
                        }
                      })
                    }
                  >
                    Desconectar
                  </Button>
                ) : null}
              </div>

              {provider.connected ? (
                <details className="mt-4 border-t border-ink-100 pt-3">
                  <summary className="cursor-pointer list-none text-[12.5px] font-medium text-ink-500 transition-colors hover:text-ink-700">
                    Ver datos técnicos
                  </summary>
                  <dl className="mt-2.5 flex flex-col gap-1.5 text-[12.5px]">
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-500">Clave pública</dt>
                      <dd className="truncate font-mono text-ink-700">{provider.publicKey}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-500">Modo</dt>
                      <dd className="text-ink-700">
                        {provider.mode === "live" ? "Vendiendo de verdad" : "Prueba"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-500">Aviso de cobro</dt>
                      <dd className="text-ink-700">
                        {provider.webhookVerified ? "Con firma verificada" : "Sin clave de firma"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-500">Conexión</dt>
                      <dd className="text-ink-700">
                        {provider.connection === "oauth"
                          ? "Autorizada desde Mercado Pago"
                          : "Claves cargadas a mano"}
                      </dd>
                    </div>
                    {provider.expiresAt ? (
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-500">Vence</dt>
                        <dd className="text-ink-700">
                          {new Date(provider.expiresAt).toLocaleDateString("es-AR")}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </details>
              ) : null}
            </Card>
          );
        })}
      </div>

      <ProviderModal
        provider={editing}
        webhookUrl={editing ? webhookUrl(editing) : ""}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

function ProviderModal({
  provider,
  webhookUrl,
  onClose,
}: {
  provider: ProviderStatus | null;
  webhookUrl: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction, pending] = useActionState(savePaymentProviderAction, null);

  useEffect(() => {
    if (state?.ok) {
      toast.toast({ title: "Credenciales guardadas", description: state.message, tone: "info" });
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!provider) return null;
  const detail = DETAILS[provider.id];

  return (
    <Modal
      open
      onClose={onClose}
      title={`Conectar tu cuenta de ${provider.name}`}
      description={detail?.help}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="provider-form" loading={pending} icon="check">
            Guardar credenciales
          </Button>
        </>
      }
    >
      <form id="provider-form" action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="provider" value={provider.id} />

        {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}

        {STEPS[provider.id] ? <HowTo steps={STEPS[provider.id]} /> : null}

        <Field
          label={detail?.publicLabel ?? "Clave pública"}
          error={state && !state.ok ? state.fieldErrors?.public_key : undefined}
          required
        >
          <Input name="public_key" defaultValue={provider.publicKey ?? ""} required />
        </Field>

        <Field
          label={detail?.secretLabel ?? "Clave secreta"}
          hint={
            provider.connected
              ? "Dejalo vacío para conservar la clave que ya guardaste."
              : "Se guarda solo en el servidor y nunca se envía al navegador."
          }
          error={state && !state.ok ? state.fieldErrors?.secret_key : undefined}
          required={!provider.connected}
        >
          <Input name="secret_key" type="password" autoComplete="off" />
        </Field>

        <Field
          label="¿Estás probando o vendiendo de verdad?"
          hint="En modo prueba los cobros no son reales: sirve para ver que todo funcione antes de publicar."
        >
          <Select name="mode" defaultValue={provider.mode ?? "test"}>
            <option value="test">Estoy probando</option>
            <option value="live">Vendiendo de verdad</option>
          </Select>
        </Field>

        <WebhookSection
          provider={provider}
          webhookUrl={webhookUrl}
          error={state && !state.ok ? state.fieldErrors?.webhook_secret : undefined}
        />

        <Alert tone="info">
          No verificamos las credenciales al guardarlas: la validación real ocurre en el primer
          cobro. Si están mal, el checkout te lo va a decir con el error del proveedor.
        </Alert>
      </form>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Aviso de cobro.
 *
 * Mercado Pago acepta la URL de notificación en cada preferencia, así que se la
 * mandamos nosotros y el vendedor no toca nada. Stripe, en cambio, exige dar de
 * alta el endpoint en su panel: ahí sí le mostramos la URL para copiar.
 *
 * La clave de firma es opcional en los dos casos. Sin ella igual es seguro:
 * antes de acreditar una venta siempre le volvemos a preguntar al proveedor con
 * las credenciales del vendedor. La firma solo nos deja descartar ruido antes.
 */
function WebhookSection({
  provider,
  webhookUrl,
  error,
}: {
  provider: ProviderStatus;
  webhookUrl: string;
  error?: string;
}) {
  const toast = useToast();
  const isStripe = provider.id === "stripe";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ink-200 bg-ink-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13.5px] font-semibold text-ink-900">Aviso de cobro</p>
        <ConnectionStatus status={provider.webhookVerified ? "connected" : "disconnected"} />
      </div>

      <p className="text-[12.5px] leading-relaxed text-ink-500">
        {isStripe
          ? "Stripe necesita que des de alta esta URL en tu panel, en Developers → Webhooks. Sin eso no nos entera cuando alguien paga."
          : "A Mercado Pago le pasamos esta URL en cada cobro, así que no tenés que configurar nada. Te la dejamos por si querés verla."}
      </p>

      <div className="flex items-center gap-2">
        <code className="tf-scroll min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-xl border border-ink-200 bg-white px-3 py-2 text-[12px] text-ink-700">
          {webhookUrl}
        </code>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon="copy"
          onClick={() => {
            void navigator.clipboard
              .writeText(webhookUrl)
              .then(() => toast.success("Copiamos la URL."))
              .catch(() => toast.error("No pudimos copiar", "Seleccioná la URL y copiala a mano."));
          }}
        >
          <span className="sr-only">Copiar URL</span>
        </Button>
      </div>

      <Field
        label={isStripe ? "Clave de firma del webhook (whsec_…)" : "Clave secreta del webhook"}
        hint={
          provider.webhookVerified
            ? "Ya tenés una cargada. Dejalo vacío para conservarla."
            : "Opcional. Si la cargás, verificamos la firma de cada aviso antes de procesarlo."
        }
        error={error}
      >
        <Input name="webhook_secret" type="password" autoComplete="off" />
      </Field>
    </div>
  );
}
