"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";

import {
  clearDemoDataAction,
  loadDemoDataAction,
  updateAccountAction,
} from "@/app/actions/auth";
import { changePlanAction, updateWorkspaceAction } from "@/app/actions/settings";
import { Avatar } from "@/components/ui/data";
import { Alert } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Field,
  Input,
  LinkButton,
  Modal,
  Select,
  Tabs,
  useToast,
} from "@/components/ui/primitives";
import { cn, formatDate } from "@/lib/utils";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    blurb: "Para lanzar tu primera oferta.",
    features: ["1 funnel activo", "Productos ilimitados", "Checkout y tracking", "Analytics básico"],
  },
  {
    id: "pro",
    name: "Pro",
    blurb: "Para escalar con varias ofertas a la vez.",
    features: ["Funnels ilimitados", "Upsells y downsells", "IA sin límite de uso", "Dominios propios"],
  },
  {
    id: "scale",
    name: "Scale",
    blurb: "Para equipos que operan varios productos.",
    features: ["Todo lo de Pro", "Afiliados", "Analytics avanzado", "Permisos por equipo"],
  },
];

export function SettingsWorkspace({
  user,
  workspace,
  subscription,
  hasDemo,
}: {
  user: { full_name: string; email: string };
  workspace: {
    name: string;
    slug: string;
    country: string;
    currency: string;
    taxId: string | null;
  };
  subscription: { plan: string; status: string; periodEnd: string | null };
  hasDemo: boolean;
}) {
  const [tab, setTab] = useState("cuenta");

  return (
    <div className="flex flex-col gap-5">
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "cuenta", label: "Cuenta" },
          { value: "negocio", label: "Negocio" },
          { value: "notificaciones", label: "Notificaciones" },
          { value: "plan", label: "Plan" },
          { value: "datos", label: "Datos" },
        ]}
      />

      {tab === "cuenta" ? <AccountForm user={user} /> : null}
      {tab === "negocio" ? <BusinessForm workspace={workspace} /> : null}
      {tab === "notificaciones" ? <NotificationsPanel /> : null}
      {tab === "plan" ? <PlanPanel subscription={subscription} /> : null}
      {tab === "datos" ? <DataPanel hasDemo={hasDemo} /> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function AccountForm({ user }: { user: { full_name: string; email: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction, pending] = useActionState(updateAccountAction, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Guardado.");
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}

      <Card className="flex flex-col gap-4 p-5">
        <CardHeader title="Tu cuenta" className="px-0 pt-0" />

        <div className="flex items-center gap-4">
          <Avatar name={user.full_name} size={56} />
          <div>
            <p className="text-[14px] font-semibold text-ink-900">{user.full_name}</p>
            <p className="text-[12.5px] text-ink-500">
              La foto de perfil necesita almacenamiento de archivos, que todavía no está conectado.
            </p>
          </div>
        </div>

        <Field label="Nombre" required>
          <Input name="full_name" defaultValue={user.full_name} required />
        </Field>

        <Field label="Email" hint="Todavía no se puede cambiar el email de la cuenta.">
          <Input value={user.email} readOnly disabled />
        </Field>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <CardHeader
          title="Contraseña"
          subtitle="Dejá los campos vacíos si no querés cambiarla."
          className="px-0 pt-0"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Contraseña actual"
            error={state && !state.ok ? state.fieldErrors?.current_password : undefined}
          >
            <Input name="current_password" type="password" autoComplete="current-password" />
          </Field>
          <Field
            label="Contraseña nueva"
            hint="Mínimo 8 caracteres."
            error={state && !state.ok ? state.fieldErrors?.new_password : undefined}
          >
            <Input name="new_password" type="password" autoComplete="new-password" />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={pending} icon="check">
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}

function BusinessForm({
  workspace,
}: {
  workspace: {
    name: string;
    slug: string;
    country: string;
    currency: string;
    taxId: string | null;
  };
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction, pending] = useActionState(updateWorkspaceAction, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Guardado.");
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}

      <Card className="flex flex-col gap-4 p-5">
        <CardHeader title="Tu negocio" className="px-0 pt-0" />

        <Field label="Nombre del negocio" required>
          <Input name="name" defaultValue={workspace.name} required />
        </Field>

        <Field label="Identificador" hint="Se usa en tu subdominio por defecto.">
          <Input value={`${workspace.slug}.tiendaflow.app`} readOnly disabled />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="País">
            <Select name="country" defaultValue={workspace.country}>
              <option value="AR">Argentina</option>
              <option value="MX">México</option>
              <option value="CO">Colombia</option>
              <option value="CL">Chile</option>
              <option value="PE">Perú</option>
              <option value="UY">Uruguay</option>
              <option value="ES">España</option>
              <option value="US">Estados Unidos</option>
              <option value="BR">Brasil</option>
            </Select>
          </Field>
          <Field label="Moneda" hint="Se usa en ofertas, checkout y reportes.">
            <Select name="currency" defaultValue={workspace.currency}>
              <option value="ARS">Peso argentino (ARS)</option>
              <option value="MXN">Peso mexicano (MXN)</option>
              <option value="COP">Peso colombiano (COP)</option>
              <option value="CLP">Peso chileno (CLP)</option>
              <option value="PEN">Sol peruano (PEN)</option>
              <option value="USD">Dólar (USD)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="BRL">Real (BRL)</option>
            </Select>
          </Field>
        </div>

        <Field label="Datos fiscales" hint="CUIT, RFC, NIF o el que corresponda en tu país.">
          <Input name="tax_id" defaultValue={workspace.taxId ?? ""} />
        </Field>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={pending} icon="check">
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}

function NotificationsPanel() {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <CardHeader
        title="Notificaciones"
        subtitle="Qué te avisamos y por dónde."
        className="px-0 pt-0"
      />

      <Alert tone="warning">
        Las notificaciones por email necesitan un proveedor conectado. Por ahora todo aparece en el
        centro de notificaciones dentro de la app.
      </Alert>

      <div className="flex flex-col gap-2.5">
        <Checkbox
          defaultChecked
          disabled
          label="Notificaciones en la app"
          description="Siempre activas: ventas, publicaciones y alertas de integraciones."
        />
        <Checkbox
          disabled
          label="Email de ventas"
          description="Un mail por cada venta. Requiere proveedor de email."
        />
        <Checkbox
          disabled
          label="Alertas de funnel"
          description="Te avisamos si la conversión cae fuerte. Requiere proveedor de email."
        />
        <Checkbox
          disabled
          label="Alertas de IA"
          description="Insights semanales sobre tu funnel. Requiere proveedor de email."
        />
      </div>

      <div>
        <LinkButton href="/app/integraciones" variant="secondary" size="sm">
          Ir a Integraciones
        </LinkButton>
      </div>
    </Card>
  );
}

function PlanPanel({
  subscription,
}: {
  subscription: { plan: string; status: string; periodEnd: string | null };
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">
            Plan actual
          </p>
          <p className="mt-1 flex items-center gap-2 text-[20px] font-semibold capitalize tracking-tight text-ink-900">
            {subscription.plan}
            <Badge tone={subscription.status === "active" ? "success" : "brand"}>
              {subscription.status === "trialing" ? "Período de prueba" : subscription.status}
            </Badge>
          </p>
          {subscription.periodEnd ? (
            <p className="mt-1 text-[13px] text-ink-500">
              Renovación: {formatDate(subscription.periodEnd)}
            </p>
          ) : null}
        </div>
      </Card>

      <Alert tone="warning" title="La facturación todavía no está conectada">
        Podés cambiar de plan para probar los límites, pero no se cobra nada: falta conectar el
        proveedor de facturación. Los precios finales tampoco están definidos.
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => {
          const current = plan.id === subscription.plan;
          return (
            <Card
              key={plan.id}
              className={cn(
                "flex flex-col p-5",
                current && "border-brand-400 ring-4 ring-brand-500/10",
              )}
            >
              <p className="text-[16px] font-semibold text-ink-900">{plan.name}</p>
              <p className="mt-1 text-[13px] text-ink-500">{plan.blurb}</p>
              <p className="mt-4 text-[13px] font-medium text-ink-400">Precio a definir</p>

              <ul className="mt-4 flex flex-1 flex-col gap-1.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-[13px] text-ink-700">
                    <Icon name="check" size={14} className="mt-0.5 shrink-0 text-accent-600" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant={current ? "secondary" : "primary"}
                size="sm"
                full
                className="mt-5"
                disabled={current}
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await changePlanAction(plan.id);
                    if (result.ok) {
                      toast.toast({
                        title: "Plan actualizado",
                        description: result.message,
                        tone: "info",
                      });
                      router.refresh();
                    } else {
                      toast.error("No pudimos cambiar el plan", result.error);
                    }
                  })
                }
              >
                {current ? "Tu plan actual" : `Cambiar a ${plan.name}`}
              </Button>
            </Card>
          );
        })}
      </div>

      <Card className="p-5">
        <CardHeader title="Historial de facturación" className="px-0 pt-0" />
        <p className="mt-3 text-[13.5px] text-ink-500">
          No hay facturas: todavía no se cobró nada porque falta conectar el proveedor de
          facturación.
        </p>
      </Card>
    </div>
  );
}

function DataPanel({ hasDemo }: { hasDemo: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <>
      <Card className="flex flex-col gap-4 p-5">
        <CardHeader
          title="Datos de demostración"
          subtitle="Para ver cómo se comporta la app con información cargada."
          className="px-0 pt-0"
        />

        <Alert tone="info">
          Los datos de demostración son claramente ficticios y aparecen marcados con la etiqueta
          <strong className="mx-1">Demo</strong> en toda la interfaz. Nunca se mezclan con tus datos
          reales en los cálculos que dependen de integraciones externas.
        </Alert>

        <div className="flex flex-wrap gap-2">
          <Button
            icon="sparkles"
            loading={pending}
            disabled={hasDemo}
            onClick={() =>
              startTransition(async () => {
                const result = await loadDemoDataAction();
                if (result.ok) {
                  toast.success("Datos cargados", result.message);
                  router.refresh();
                } else {
                  toast.error("No pudimos cargar la demo", result.error);
                }
              })
            }
          >
            {hasDemo ? "Datos de demo ya cargados" : "Cargar datos de demostración"}
          </Button>

          {hasDemo ? (
            <Button variant="danger" icon="trash" onClick={() => setConfirmClear(true)}>
              Borrar datos de demostración
            </Button>
          ) : null}
        </div>
      </Card>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Borrar datos de demostración"
        description="Se eliminan solo los registros marcados como demo. Tus datos reales quedan intactos."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmClear(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await clearDemoDataAction();
                  setConfirmClear(false);
                  if (result.ok) {
                    toast.success(result.message ?? "Borrado.");
                    router.refresh();
                  } else {
                    toast.error("No pudimos borrarlos", result.error);
                  }
                })
              }
            >
              Sí, borrar
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-ink-600">
          Vas a borrar los productos, ofertas, funnels, clientes, ventas y eventos de demostración.
        </p>
      </Modal>
    </>
  );
}
