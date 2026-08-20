"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useTransition } from "react";

import { disconnectIntegrationAction, saveMetaIntegrationAction } from "@/app/actions/settings";
import { Explain, HowTo, MoreOptions } from "@/components/ui/explain";
import { Alert, ConnectionStatus } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import {
  Button,
  Card,
  CardHeader,
  Checkbox,
  Field,
  Input,
  useToast,
} from "@/components/ui/primitives";

const EVENT_HELP: Record<string, string> = {
  PageView: "Cada visita a una página del funnel.",
  ViewContent: "Vista de la landing con la oferta.",
  InitiateCheckout: "La persona llegó al checkout.",
  AddPaymentInfo: "Cargó los datos de pago.",
  Purchase: "Compra confirmada. Es el evento que optimiza tus campañas.",
  Lead: "Dejó sus datos sin comprar.",
};

export function MetaForm({
  status,
  lastError,
  pixelId,
  datasetId,
  events,
  allEvents,
  hasToken,
}: {
  status: string;
  lastError: string | null;
  pixelId: string;
  datasetId: string;
  events: string[];
  allEvents: string[];
  hasToken: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction, pending] = useActionState(saveMetaIntegrationAction, null);
  const [disconnecting, startDisconnect] = useTransition();

  useEffect(() => {
    if (state?.ok) {
      toast.toast({ title: "Configuración guardada", description: state.message, tone: "info" });
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-ink-100 text-ink-600">
            <Icon name="megaphone" size={20} />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-ink-900">Estado de la conexión</p>
            <ConnectionStatus
              status={
                status === "connected" ? "connected" : status === "error" ? "error" : "disconnected"
              }
            />
          </div>
        </div>
        {status !== "disconnected" ? (
          <Button
            variant="danger"
            size="sm"
            loading={disconnecting}
            onClick={() =>
              startDisconnect(async () => {
                const result = await disconnectIntegrationAction("meta");
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
      </Card>

      {lastError ? <Alert tone="warning">{lastError}</Alert> : null}
      {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}

      <form action={formAction} className="flex flex-col gap-5">
        <Card className="flex flex-col gap-4 p-5">
          <CardHeader
            title={
              <span className="inline-flex items-center gap-1.5">
                Pixel
                <Explain term="pixel" />
              </span>
            }
            subtitle="Le avisa a Facebook e Instagram qué hace la gente que te mandan: si miró, si empezó a comprar, si compró."
            className="px-0 pt-0"
          />

          <HowTo
            steps={[
              <>Entrá a <strong>business.facebook.com</strong> con la cuenta que usás para tus anuncios.</>,
              <>En el menú de la izquierda buscá <strong>Administrador de Eventos</strong>.</>,
              <>Elegí tu conjunto de datos. Si no tenés ninguno, creá uno con <strong>Conectar orígenes de datos → Web</strong>.</>,
              <>Arriba de todo vas a ver el nombre y abajo un número largo: <strong>ese número es el ID del Pixel</strong>. Copialo y pegalo acá.</>,
            ]}
          />

          <Field
            label="ID del Pixel"
            hint="Solo números. Lo encontrás en el Administrador de Eventos de Meta."
            error={state && !state.ok ? state.fieldErrors?.pixel_id : undefined}
            required
          >
            <Input name="pixel_id" defaultValue={pixelId} required inputMode="numeric" placeholder="123456789012345" />
          </Field>

          <Alert tone="info">
            El ID del Pixel es público por definición: viaja en el HTML de tus páginas. El token de
            la API de Conversiones, en cambio, nunca sale del servidor.
          </Alert>
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <CardHeader
            title={
              <span className="inline-flex items-center gap-1.5">
                API de Conversiones
                <Explain term="capi" />
              </span>
            }
            subtitle="Hace lo mismo que el Pixel pero desde el servidor. Se usan los dos juntos porque muchos navegadores bloquean el Pixel."
            className="px-0 pt-0"
          />

          <HowTo
            title="¿Dónde saco el token?"
            steps={[
              <>En el mismo <strong>Administrador de Eventos</strong>, entrá a tu conjunto de datos.</>,
              <>Andá a la pestaña <strong>Configuración</strong>.</>,
              <>Bajá hasta <strong>API de conversiones</strong> y tocá <strong>Generar token de acceso</strong>.</>,
              <>Copialo y pegalo acá. Se guarda solo en el servidor: no viaja al navegador de nadie.</>,
            ]}
          />

          <Field
            label="Access token"
            hint={
              hasToken
                ? "Ya hay un token guardado. Dejalo vacío para conservarlo."
                : "Generalo en el Administrador de Eventos → Configuración → API de Conversiones."
            }
          >
            <Input name="access_token" type="password" autoComplete="off" placeholder="EAAG…" />
          </Field>

          <MoreOptions hint="casi nadie necesita tocar esto">
            <Field
              label="Dataset ID"
              hint="Dejalo vacío y usamos el ID del Pixel, que es lo correcto en la mayoría de los casos."
            >
              <Input name="dataset_id" defaultValue={datasetId} inputMode="numeric" />
            </Field>

            <Field
              label="Código de evento de prueba"
              hint="Solo si estás verificando la conexión con la herramienta Test Events de Meta."
            >
              <Input name="test_event_code" placeholder="TEST12345" />
            </Field>
          </MoreOptions>
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <CardHeader
            title="Eventos"
            subtitle="Los momentos del recorrido que le avisamos a Meta. Vienen todos activos, que es lo recomendado."
            className="px-0 pt-0"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {allEvents.map((event) => (
              <Checkbox
                key={event}
                name="events"
                value={event}
                defaultChecked={events.includes(event)}
                label={event}
                description={EVENT_HELP[event]}
              />
            ))}
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={pending} icon="check">
            Guardar configuración
          </Button>
        </div>
      </form>

      <Alert tone="info" title="Cómo verificar que funciona">
        Abrí tu funnel publicado con el Test Events de Meta abierto. Deberías ver el PageView del
        Pixel y, al confirmar una compra, el evento Purchase enviado desde el servidor con el mismo
        <code className="mx-1 rounded bg-ink-100 px-1 py-0.5 text-[12px]">event_id</code>
        para que Meta los deduplique.
      </Alert>
    </div>
  );
}
