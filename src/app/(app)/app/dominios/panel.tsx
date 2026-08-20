"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useTransition } from "react";

import { addDomainAction, deleteDomainAction, verifyDomainAction } from "@/app/actions/settings";
import { Alert, ConnectionStatus } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  useToast,
} from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";
import type { Domain } from "@/lib/types";

export function DomainsPanel({
  domains,
  workspaceSlug,
}: {
  domains: Domain[];
  workspaceSlug: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction, pending] = useActionState(addDomainAction, null);
  const [busy, startTransition] = useTransition();

  useEffect(() => {
    if (state?.ok) {
      toast.toast({ title: "Dominio agregado", description: state.message, tone: "info" });
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <CardHeader
          title="Dominio por defecto"
          subtitle="Siempre disponible, no requiere configuración."
          className="px-0 pt-0"
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink-50 px-4 py-3.5">
          <span className="flex items-center gap-2.5">
            <Icon name="globe" size={17} className="text-ink-400" />
            <code className="text-[13.5px] font-medium text-ink-800">
              {workspaceSlug}.tiendaflow.app
            </code>
          </span>
          <ConnectionStatus status="active" />
        </div>
      </Card>

      <Card className="p-5">
        <CardHeader
          title="Agregar dominio propio"
          subtitle="Un dominio o subdominio que ya tengas."
          className="px-0 pt-0"
        />

        {state && !state.ok ? (
          <Alert tone="error" className="mt-4">
            {state.error}
          </Alert>
        ) : null}

        <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
          <Field
            label="Dominio"
            className="min-w-56 flex-1"
            error={state && !state.ok ? state.fieldErrors?.hostname : undefined}
          >
            <Input name="hostname" placeholder="ofertas.tumarca.com" required />
          </Field>
          <Button type="submit" icon="plus" loading={pending}>
            Agregar
          </Button>
        </form>
      </Card>

      {domains.length === 0 ? (
        <EmptyState
          icon="globe"
          title="Todavía no cargaste dominios propios"
          description="Mientras tanto tus funnels se publican en el dominio por defecto de TiendaFlow."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {domains.map((domain) => (
            <Card key={domain.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
                    <Icon name="globe" size={17} className="text-ink-400" />
                    {domain.hostname}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <ConnectionStatus status={domain.status} />
                    <span className="text-[12.5px] text-ink-500">
                      SSL: {domain.ssl_status === "issued" ? "emitido" : "pendiente"}
                    </span>
                    {domain.last_checked_at ? (
                      <span className="text-[12.5px] text-ink-400">
                        Último chequeo: {formatDate(domain.last_checked_at)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon="refresh"
                    loading={busy}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await verifyDomainAction(domain.id);
                        if (result.ok) {
                          toast.toast({
                            title: "Verificación pendiente",
                            description: result.message,
                            tone: "info",
                          });
                          router.refresh();
                        } else {
                          toast.error("No pudimos verificar", result.error);
                        }
                      })
                    }
                  >
                    Verificar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon="trash"
                    loading={busy}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await deleteDomainAction(domain.id);
                        if (result.ok) {
                          toast.success("Eliminamos el dominio.");
                          router.refresh();
                        } else {
                          toast.error("No pudimos eliminarlo", result.error);
                        }
                      })
                    }
                  >
                    <span className="sr-only">Eliminar</span>
                  </Button>
                </div>
              </div>

              <div className="tf-scroll mt-4 overflow-x-auto rounded-2xl bg-ink-900 p-4">
                <p className="text-[11.5px] font-semibold uppercase tracking-wider text-white/50">
                  Registros DNS a crear
                </p>
                <table className="mt-2 w-full min-w-[420px] text-left font-mono text-[12px] text-white/85">
                  <tbody>
                    <tr>
                      <td className="py-1 pr-4 text-white/50">CNAME</td>
                      <td className="py-1 pr-4">{domain.hostname}</td>
                      <td className="py-1">cname.tiendaflow.app</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-4 text-white/50">TXT</td>
                      <td className="py-1 pr-4">_tiendaflow.{domain.hostname}</td>
                      <td className="break-all py-1">{domain.verification_token}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
