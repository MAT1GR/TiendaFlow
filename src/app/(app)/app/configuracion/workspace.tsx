"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";

import {
  clearDemoDataAction,
  loadDemoDataAction,
  updateAccountAction,
} from "@/app/actions/auth";
import {
  cancelSubscriptionAction,
  openBillingPortalAction,
  startStripeCheckoutAction,
  startSubscriptionAction,
  syncStripeSubscriptionAction,
} from "@/app/actions/billing";
import { updateWorkspaceAction } from "@/app/actions/settings";
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
  Spinner,
  Tabs,
  useToast,
} from "@/components/ui/primitives";
import {
  bestPlanFor,
  commissionLabel,
  formatQuota,
  PLAN_IDS,
  planBenefits,
  PLANS,
  planOf,
  planPriceLabel,
  usd,
  UNLIMITED,
} from "@/lib/plans";
import { cn, formatDate, formatMoney } from "@/lib/utils";


export function SettingsWorkspace({
  user,
  workspace,
  subscription,
  cobro,
  uso,
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
  cobro: EstadoDelCobro;
  /** Lo que el workspace consumió de su plan. */
  uso: { ia: number; publicados: number };
  hasDemo: boolean;
}) {
  const [tab, setTab] = useState("cuenta");

  /*
   * Configuración se lee en una columna angosta —son formularios—, salvo la
   * pestaña de planes, que necesita todo el ancho para mostrar los cuatro
   * planes en una fila. Por eso la restricción de ancho vive acá adentro y no
   * en la página: cada pestaña pide lo suyo.
   */
  const angosto = "mx-auto w-full max-w-3xl";

  return (
    <div className="flex flex-col gap-5">
      <div className={angosto}>
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
      </div>

      {tab === "cuenta" ? (
        <div className={angosto}>
          <AccountForm user={user} />
        </div>
      ) : null}
      {tab === "negocio" ? (
        <div className={angosto}>
          <BusinessForm workspace={workspace} />
        </div>
      ) : null}
      {tab === "notificaciones" ? (
        <div className={angosto}>
          <NotificationsPanel />
        </div>
      ) : null}
      {tab === "plan" ? <PlanPanel subscription={subscription} uso={uso} cobro={cobro} /> : null}
      {tab === "datos" ? (
        <div className={angosto}>
          <DataPanel hasDemo={hasDemo} />
        </div>
      ) : null}
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

/**
 * Cuánto queda de un tope.
 *
 * Muestra el número crudo además de la barra: "4 de 5" se entiende sin
 * interpretar un dibujo, y es lo que la persona necesita para decidir si le
 * alcanza para terminar lo que estaba haciendo.
 */
function Consumo({
  emoji,
  label,
  usado,
  tope,
  nota,
}: {
  emoji: string;
  label: string;
  usado: number;
  tope: number;
  nota: string;
}) {
  const sinTope = tope === UNLIMITED;
  const proporcion = sinTope ? 0 : Math.min(1, usado / Math.max(1, tope));
  const lleno = !sinTope && usado >= tope;

  return (
    <div className="rounded-2xl border border-ink-200 p-4">
      <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-900">
        <span className="tf-emoji text-[15px]" aria-hidden="true">
          {emoji}
        </span>
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-[19px] font-semibold tracking-tight tabular-nums",
          lleno ? "text-amber-600" : "text-ink-900",
        )}
      >
        {usado}
        <span className="text-[13px] font-medium text-ink-400">
          {sinTope ? " usados · sin tope" : ` de ${formatQuota({ amount: tope, period: "total" })}`}
        </span>
      </p>
      {sinTope ? null : (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
          <div
            className={cn("h-full rounded-full", lleno ? "bg-amber-500" : "bg-brand-600")}
            style={{ width: `${Math.round(proporcion * 100)}%` }}
          />
        </div>
      )}
      <p className="mt-2 text-[11.5px] text-ink-400">{nota}</p>
    </div>
  );
}

/**
 * Precios.
 *
 * La grilla vive sobre un panel violeta oscuro por una razón concreta: es el
 * único lugar de la app donde el vendedor decide gastar plata, y separarlo del
 * fondo blanco del resto hace que se lea como una decisión y no como otra
 * sección más de configuración.
 *
 * Los cuatro planes van en una sola fila —por eso el panel se sale del ancho de
 * lectura del resto de Configuración—: la escalera de precios solo se entiende
 * si se ve entera de un vistazo. Si el contenedor se angosta, caen a dos y a
 * una columna solos.
 *
 * El interruptor de arriba no es "mensual / anual" —no vendemos anual— sino
 * "abono suelto" contra "lo que te sale de verdad con tus ventas". Es la misma
 * calculadora de antes, movida adentro del panel: tener el número acá arriba y
 * las tarjetas recalculándose debajo evita que el vendedor compare abonos, que
 * sin la comisión al lado no dicen nada.
 */
/**
 * Qué caminos de cobro hay disponibles ahora mismo.
 *
 * Sale del servidor porque depende de variables de entorno. Los botones se
 * dibujan según esto y no según lo que nos gustaría tener: ofrecer "Pagar con
 * Mercado Pago" cuando Mercado Pago no está configurado es prometer algo que
 * va a fallar recién cuando la persona lo apriete.
 */
export interface EstadoDelCobro {
  stripe: boolean;
  mercadopago: boolean;
  /** Hay un abono vivo en Stripe cuyo portal se puede abrir. */
  portal: boolean;
}

function PlanPanel({
  subscription,
  cobro,
  uso,
}: {
  subscription: { plan: string; status: string; periodEnd: string | null };
  cobro: EstadoDelCobro;
  uso: { ia: number; publicados: number };
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const actual = planOf(subscription.plan);

  const [modo, setModo] = useState<"abono" | "ventas">("abono");
  /*
   * La calculadora arranca vacía a propósito.
   *
   * Podríamos estimar la facturación con las ventas que ya tiene cargadas,
   * pero el vendedor cobra en su moneda y el abono está en dólares: para
   * prellenar el campo habría que aplicarle un tipo de cambio y presentarlo
   * como si fuera un dato suyo. Es más honesto que el número lo ponga él.
   */
  const [facturacion, setFacturacion] = useState("");
  const facturacionNum = Number(facturacion);
  const facturacionValida =
    facturacion.trim() !== "" && Number.isFinite(facturacionNum) && facturacionNum >= 0;
  const conVentas = modo === "ventas" && facturacionValida;
  const recomendado = conVentas ? bestPlanFor(facturacionNum) : null;

  /**
   * Elegir un plan.
   *
   * Free se aplica en el momento —nadie tiene que esperar un webhook para
   * dejar de pagar— y los planes pagos salen a Stripe. El plan **no** se
   * cambia acá: lo cambia el webhook cuando el cobro se confirma. Si lo
   * cambiara este botón, alcanzaría con abrir el checkout y cerrar la pestaña
   * para tener Pro gratis.
   */
  function elegirPlan(planId: string) {
    startTransition(async () => {
      if (PLANS[planId as keyof typeof PLANS]?.priceUsd === 0) {
        const result = await cancelSubscriptionAction();
        if (result.ok) {
          toast.toast({ title: "Volviste a Free", description: result.message, tone: "info" });
          router.refresh();
        } else {
          toast.error("No pudimos cambiar el plan", result.error);
        }
        return;
      }

      const result = await startStripeCheckoutAction(planId);
      if (result.ok) {
        window.location.href = result.data.url;
      } else {
        toast.error("No pudimos abrir el pago", result.error);
      }
    });
  }

  /** El camino alternativo, para quien no puede pagar en dólares con tarjeta. */
  function elegirPlanConMercadoPago(planId: string) {
    startTransition(async () => {
      const result = await startSubscriptionAction(planId);
      if (result.ok) {
        window.location.href = result.data.url;
      } else {
        toast.error("No pudimos abrir Mercado Pago", result.error);
      }
    });
  }

  /** Cambiar la tarjeta, ver las facturas o cancelar: todo eso vive en Stripe. */
  function abrirPortal() {
    startTransition(async () => {
      const result = await openBillingPortalAction();
      if (result.ok) {
        window.location.href = result.data.url;
      } else {
        toast.error("No pudimos abrir el portal", result.error);
      }
    });
  }

  /*
   * Al volver del checkout, el webhook puede tardar unos segundos.
   *
   * Ver "Free" después de haber pagado es la peor primera impresión posible,
   * así que le preguntamos a Stripe directamente. No alcanza con que la URL
   * diga `abono=listo`: eso lo puede escribir cualquiera. La activación sale
   * de consultar la API, no del parámetro.
   */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("abono") !== "listo") return;
    let cancelado = false;

    void (async () => {
      const result = await syncStripeSubscriptionAction();
      if (cancelado) return;
      if (result.ok) {
        toast.success("Listo, tu abono quedó activo.");
        router.refresh();
      }
      window.history.replaceState({}, "", window.location.pathname);
    })();

    return () => {
      cancelado = true;
    };
    // Corre una sola vez, al volver de pagar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Con qué tarjeta se queda la cinta de arriba: la más elegida, o la más barata. */
  const destacadoId = recomendado ? recomendado.id : "pro";
  /* Lo que le sale hoy su plan actual, para poder mostrar cuánto ahorraría. */
  const costoActual = actual.priceUsd + facturacionNum * actual.commissionRate;

  return (
    <div className="flex flex-col gap-5">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
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

            {subscription.status === "past_due" ? (
              <p className="mt-2 text-[12.5px] leading-relaxed text-amber-600">
                No pudimos cobrarte el último débito. Tu plan sigue activo mientras se reintenta:
                actualizá la tarjeta para no perderlo.
              </p>
            ) : null}
          </div>

          {/* Cambiar la tarjeta, ver las facturas y cancelar viven en el portal
              de Stripe. Rehacer esas pantallas acá significaría manipular datos
              de tarjeta sin ninguna ventaja para el usuario. */}
          {cobro.portal ? (
            <Button variant="secondary" size="sm" loading={pending} onClick={abrirPortal}>
              Administrar mi abono
            </Button>
          ) : null}
        </Card>

        <Card className="p-5">
          <CardHeader title="Lo que usaste este mes" className="px-0 pt-0" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Consumo
              emoji="✨"
              label="Usos de IA"
              usado={uso.ia}
              tope={actual.limits.aiGenerations.amount}
              nota="Se reinician el 1° de cada mes. Los borradores locales no cuentan."
            />
            <Consumo
              emoji="🛍️"
              label="Productos publicados"
              usado={uso.publicados}
              tope={actual.limits.publishedProducts.amount}
              nota="Despublicar uno libera el lugar al instante."
            />
          </div>
        </Card>
      </div>

      <section className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(140deg,var(--color-brand-900)_0%,var(--color-brand-700)_48%,var(--color-brand-600)_100%)] px-4 py-8 sm:px-7 sm:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(620px_circle_at_18%_-15%,rgba(34,211,238,.30),transparent_62%),radial-gradient(520px_circle_at_92%_5%,rgba(139,131,252,.42),transparent_58%)]"
        />

        <div className="relative">
          <div className="flex flex-col items-center text-center">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-glow ring-1 ring-white/15">
              <Icon name="rocket" size={12} />
              Subí de plan cuando vendas más
            </p>
            <h3 className="mt-3 text-[24px] font-semibold tracking-tight text-white sm:text-[30px]">
              Cuanto más vendés, menos comisión pagás
            </h3>
            <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-white/70">
              Todos los planes traen las mismas herramientas para vender. Lo que cambia es cuánto
              te queda de cada venta y cuánto podés publicar.
            </p>

            <div className="mt-5 inline-flex items-center gap-1 rounded-full bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur">
              {(
                [
                  { value: "abono", label: "Abono mensual" },
                  { value: "ventas", label: "Con mis ventas" },
                ] as const
              ).map((opcion) => (
                <button
                  key={opcion.value}
                  type="button"
                  aria-pressed={modo === opcion.value}
                  onClick={() => setModo(opcion.value)}
                  className={cn(
                    "h-9 rounded-full px-4 text-[13px] font-semibold transition-colors",
                    modo === opcion.value
                      ? "bg-white text-brand-700 shadow-[0_2px_12px_rgba(15,23,42,.25)]"
                      : "text-white/70 hover:text-white",
                  )}
                >
                  {opcion.label}
                </button>
              ))}
            </div>

            {modo === "ventas" ? (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[13px] text-white/75">
                <label htmlFor="facturacion-mensual">Si facturás</label>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 ring-1 ring-white/20 focus-within:ring-white/60">
                  <span className="text-[12.5px] text-white/60">US$</span>
                  <input
                    id="facturacion-mensual"
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={facturacion}
                    onChange={(event) => setFacturacion(event.target.value)}
                    placeholder="1200"
                    className="h-9 w-24 bg-transparent text-[14px] font-semibold text-white outline-none placeholder:font-normal placeholder:text-white/40"
                  />
                </span>
                <span>por mes, esto es lo que pagarías en total con cada plan.</span>
              </div>
            ) : (
              <p className="mt-4 text-[12.5px] text-white/55">
                Sin tarjeta para empezar · cambiás de plan cuando quieras
              </p>
            )}
          </div>

          <div className="@container mt-8">
            <div className="grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-4">
              {PLAN_IDS.map((planId) => {
                const plan = PLANS[planId];
                const current = plan.id === subscription.plan;
                const destacado = plan.id === destacadoId;
                const total = plan.priceUsd + facturacionNum * plan.commissionRate;
                /* Solo tiene sentido gritar el ahorro si de verdad ahorra algo. */
                const ahorro = conVentas && !current ? costoActual - total : 0;
                const beneficios = planBenefits(plan.id);

                return (
                  <div key={plan.id} className={cn("flex flex-col", destacado && "@4xl:-mt-6")}>
                    {destacado ? (
                      <p className="rounded-t-2xl bg-[linear-gradient(90deg,var(--color-cyan-glow),var(--color-brand-300))] px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-brand-900">
                        {recomendado ? "El que te conviene" : "Más elegido"}
                      </p>
                    ) : null}

                    <div
                      className={cn(
                        "flex flex-1 flex-col rounded-2xl bg-white p-4",
                        destacado
                          ? "rounded-t-none shadow-[0_28px_60px_-24px_rgba(15,23,42,.75)]"
                          : "ring-1 ring-white/15",
                        current && !destacado && "ring-2 ring-white/55",
                      )}
                    >
                      <p className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">
                        {plan.name}
                        {current ? (
                          <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold tracking-normal text-ink-500">
                            Tu plan
                          </span>
                        ) : null}
                      </p>

                      <p className="mt-2.5 text-[27px] font-semibold leading-none tracking-tight text-ink-900">
                        {conVentas ? usd(Math.round(total)) : planPriceLabel(plan)}
                        {conVentas || plan.priceUsd > 0 ? (
                          <span className="text-[12.5px] font-medium text-ink-400"> /mes</span>
                        ) : null}
                      </p>

                      <p className="mt-1.5 min-h-[30px] text-[11.5px] leading-snug text-ink-400">
                        {conVentas
                          ? `${plan.priceUsd === 0 ? "Sin abono" : `Abono ${usd(plan.priceUsd)}`} + ${commissionLabel(plan)} de tus ventas`
                          : plan.worthItFromUsd
                            ? `Conviene si facturás más de ${usd(plan.worthItFromUsd)} por mes`
                            : "Sin tarjeta y sin vencimiento"}
                      </p>

                      {/*
                        El renglón del ahorro se reserva aunque la tarjeta no
                        tenga nada que mostrar: si apareciera y desapareciera,
                        las listas de las cuatro tarjetas dejarían de arrancar a
                        la misma altura y la comparación se vuelve incómoda.
                      */}
                      {conVentas ? (
                        <div className="mt-2.5 min-h-[26px]">
                          {ahorro > 0.5 ? (
                            <p className="inline-flex w-fit items-center gap-1 rounded-full bg-accent-50 px-2 py-1 text-[11.5px] font-semibold text-accent-700">
                              <Icon name="trendDown" size={12} />
                              Ahorrás {usd(Math.round(ahorro))} por mes
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <p className="mt-2.5 min-h-[51px] text-[12.5px] leading-snug text-ink-500">
                        {plan.blurb}
                      </p>

                      <ul className="mt-3.5 flex flex-1 flex-col gap-2 border-t border-ink-100 pt-3.5">
                        {beneficios.map((beneficio, index) => (
                          <li
                            key={beneficio}
                            className={cn(
                              "flex gap-2 text-[12.5px] leading-snug",
                              index === 0 && plan.id !== "free"
                                ? "font-semibold text-ink-900"
                                : "text-ink-700",
                            )}
                          >
                            <span className="mt-px grid size-[17px] shrink-0 place-items-center rounded-full bg-accent-100 text-accent-700">
                              <Icon name="check" size={11} />
                            </span>
                            {beneficio}
                          </li>
                        ))}
                      </ul>

                      <button
                        type="button"
                        disabled={current || pending}
                        onClick={() => elegirPlan(plan.id)}
                        className={cn(
                          "mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full px-3 text-[13px] font-semibold transition-colors",
                          current
                            ? "cursor-default bg-ink-100 text-ink-500"
                            : destacado
                              ? "bg-brand-600 text-white shadow-[0_10px_24px_-10px_rgba(109,93,251,.9)] hover:bg-brand-700 disabled:bg-brand-300"
                              : "border border-ink-300 text-ink-800 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-60",
                        )}
                      >
                        {pending && !current ? <Spinner size={14} /> : null}
                        {current
                          ? "Tu plan actual"
                          : plan.priceUsd === 0
                            ? "Volver a Free"
                            : `Pasar a ${plan.name}`}
                      </button>

                      {/* El camino alternativo, para quien no tiene una tarjeta
                          que pueda pagar en dólares. Solo aparece si el cobro
                          por Mercado Pago está configurado. */}
                      {!current && plan.priceUsd > 0 && cobro.mercadopago ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => elegirPlanConMercadoPago(plan.id)}
                          className="mt-2 text-center text-[11.5px] font-medium text-white/55 underline-offset-2 transition-colors hover:text-white/85 hover:underline disabled:opacity-50"
                        >
                          Pagar con Mercado Pago
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mt-6 text-center text-[12px] text-white/50">
            Cambiás o cancelás cuando quieras · La comisión se descuenta de cada venta cobrada · El
            abono todavía no se debita
          </p>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <Alert tone="warning" title="El abono todavía no se cobra">
          Podés cambiar de plan y la comisión por venta se aplica de verdad desde la próxima venta,
          pero el abono mensual no se debita: falta conectar el proveedor de facturación.
        </Alert>

        <Card className="p-5">
          <CardHeader title="Historial de facturación" className="px-0 pt-0" />
          <p className="mt-3 text-[13.5px] text-ink-500">
            No hay facturas: todavía no se cobró nada porque falta conectar el proveedor de
            facturación.
          </p>
        </Card>
      </div>
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
