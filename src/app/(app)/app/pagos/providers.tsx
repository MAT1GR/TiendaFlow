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
  { blurb: string; publicLabel: string; secretLabel: string; help: string }
> = {
  stripe: {
    blurb: "Tarjetas internacionales. Ideal si vendés fuera de Latinoamérica.",
    publicLabel: "Publishable key (pk_…)",
    secretLabel: "Secret key (sk_…)",
    help: "Las encontrás en el panel de Stripe, en Developers → API keys.",
  },
  mercadopago: {
    blurb: "Tarjetas, débito y efectivo en Argentina, México, Brasil, Chile y más.",
    publicLabel: "Public key (APP_USR…)",
    secretLabel: "Access token",
    help: "Las encontrás en el panel de Mercado Pago, en Tus integraciones → Credenciales.",
  },
};

export function PaymentProviders({ providers }: { providers: ProviderStatus[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<ProviderStatus | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <div className="flex flex-col gap-4">
        {providers.map((provider) => {
          const detail = DETAILS[provider.id];
          return (
            <Card key={provider.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-600">
                      <Icon name="card" size={19} />
                    </span>
                    <div>
                      <p className="text-[15px] font-semibold text-ink-900">{provider.name}</p>
                      <ConnectionStatus
                        status={provider.connected ? "connected" : "disconnected"}
                      />
                    </div>
                  </div>
                  <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-ink-500">
                    {detail?.blurb}
                  </p>
                  {provider.connected ? (
                    <p className="mt-2 text-[12.5px] text-ink-500">
                      Clave pública: <code className="text-ink-700">{provider.publicKey}</code> ·
                      Modo {provider.mode === "live" ? "producción" : "prueba"}
                    </p>
                  ) : null}
                  {provider.lastError ? (
                    <p className="mt-2 text-[12.5px] text-red-600">{provider.lastError}</p>
                  ) : null}
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    variant={provider.connected ? "secondary" : "primary"}
                    size="sm"
                    icon={provider.connected ? "edit" : "plug"}
                    onClick={() => setEditing(provider)}
                  >
                    {provider.connected ? "Editar" : "Conectar"}
                  </Button>
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
              </div>
            </Card>
          );
        })}
      </div>

      <ProviderModal provider={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function ProviderModal({
  provider,
  onClose,
}: {
  provider: ProviderStatus | null;
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
      title={`Conectar ${provider.name}`}
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

        <Field label="Modo">
          <Select name="mode" defaultValue={provider.mode ?? "test"}>
            <option value="test">Prueba</option>
            <option value="live">Producción</option>
          </Select>
        </Field>

        <Alert tone="info">
          No verificamos la conexión en este momento: la validación real ocurre en el primer cobro.
          Si las credenciales están mal, el checkout te lo va a decir con el error del proveedor.
        </Alert>
      </form>
    </Modal>
  );
}
