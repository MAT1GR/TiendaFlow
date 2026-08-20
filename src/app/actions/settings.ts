"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { nowIso, run } from "@/lib/db";
import * as repo from "@/lib/repo";
import { parseJson } from "@/lib/utils";
import {
  fail,
  guarded,
  numberField,
  ok,
  optionalText,
  requiredText,
  type ActionResult,
} from "@/app/actions/shared";

/* -------------------------------------------------------------------------- */
/* Workspace                                                                   */
/* -------------------------------------------------------------------------- */

export async function updateWorkspaceAction(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();

    run(
      `UPDATE workspaces SET name = ?, country = ?, currency = ?, tax_id = ?, updated_at = ? WHERE id = ?`,
      requiredText(formData.get("name"), "El nombre del negocio"),
      String(formData.get("country") ?? workspace.country),
      String(formData.get("currency") ?? workspace.currency),
      optionalText(formData.get("tax_id")),
      nowIso(),
      workspace.id,
    );

    revalidatePath("/app", "layout");
    return ok(null, "Guardamos los datos del negocio.");
  });
}

/* -------------------------------------------------------------------------- */
/* Meta (Pixel + Conversions API)                                              */
/* -------------------------------------------------------------------------- */

export async function saveMetaIntegrationAction(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();

    const pixelId = requiredText(formData.get("pixel_id"), "El ID del Pixel");
    if (!/^\d{8,20}$/.test(pixelId)) {
      return fail("El ID del Pixel son solo números (entre 8 y 20 dígitos).", {
        pixel_id: "Formato inválido",
      });
    }

    const accessToken = optionalText(formData.get("access_token"));
    const datasetId = optionalText(formData.get("dataset_id"));
    const events = formData.getAll("events").map(String);
    const testEventCode = optionalText(formData.get("test_event_code"));

    const existing = repo.getIntegration(workspace.id, "meta");
    const hadToken = Boolean(
      parseJson<{ access_token?: string }>(existing?.secret_config ?? null, {}).access_token,
    );

    // El Pixel es público (va en el navegador); el token de la API de Conversiones
    // se guarda aparte en `secret_config` y nunca se serializa al cliente.
    repo.saveIntegration(workspace.id, "meta", {
      status: accessToken || hadToken ? "connected" : "error",
      public_config: { pixel_id: pixelId, events, dataset_id: datasetId },
      secret_config: accessToken ? { access_token: accessToken, test_event_code: testEventCode } : undefined,
      last_error:
        accessToken || hadToken
          ? null
          : "Falta el token de la API de Conversiones: los eventos del servidor no se van a enviar.",
    });

    revalidatePath("/app/integraciones/meta");
    revalidatePath("/app/lanzamiento");
    revalidatePath("/app");

    return ok(
      null,
      accessToken || hadToken
        ? "Guardamos la configuración de Meta. El Pixel ya se dispara en tus páginas públicas."
        : "Guardamos el Pixel. Sin el token de la API de Conversiones solo vas a medir eventos del navegador.",
    );
  });
}

export async function disconnectIntegrationAction(
  provider: "meta" | "stripe" | "mercadopago" | "google_analytics" | "email",
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    run(
      `UPDATE integrations SET status = 'disconnected', secret_config = NULL, last_error = NULL, updated_at = ?
       WHERE workspace_id = ? AND provider = ?`,
      nowIso(),
      workspace.id,
      provider,
    );
    revalidatePath("/app/integraciones");
    revalidatePath("/app/pagos");
    return ok(null, "Desconectamos la integración y borramos las credenciales guardadas.");
  });
}

/* -------------------------------------------------------------------------- */
/* Proveedores de pago                                                         */
/* -------------------------------------------------------------------------- */

export async function savePaymentProviderAction(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const provider = String(formData.get("provider"));

    if (provider !== "stripe" && provider !== "mercadopago") {
      return fail("Ese proveedor de pago todavía no está soportado.");
    }

    const publicKey = requiredText(formData.get("public_key"), "La clave pública");
    const secretKey = optionalText(formData.get("secret_key"));

    if (provider === "stripe" && !publicKey.startsWith("pk_")) {
      return fail("La clave pública de Stripe empieza con pk_.", { public_key: "Formato inválido" });
    }
    if (provider === "mercadopago" && !publicKey.startsWith("APP_USR")) {
      return fail("La public key de Mercado Pago empieza con APP_USR.", {
        public_key: "Formato inválido",
      });
    }

    const existing = repo.getIntegration(workspace.id, provider);
    const hadSecret = Boolean(
      parseJson<{ secret_key?: string }>(existing?.secret_config ?? null, {}).secret_key,
    );

    if (!secretKey && !hadSecret) {
      return fail(
        "Necesitamos la clave secreta para poder cobrar. Se guarda solo en el servidor.",
        { secret_key: "Requerida" },
      );
    }

    repo.saveIntegration(workspace.id, provider, {
      status: "connected",
      public_config: {
        public_key: publicKey,
        mode: String(formData.get("mode") ?? "test"),
      },
      secret_config: secretKey ? { secret_key: secretKey } : undefined,
      last_error: null,
    });

    revalidatePath("/app/pagos");
    revalidatePath("/app/lanzamiento");

    return ok(
      null,
      "Guardamos las credenciales. Todavía no verificamos la conexión contra el proveedor: eso ocurre en el primer cobro real.",
    );
  });
}

/* -------------------------------------------------------------------------- */
/* Dominios                                                                    */
/* -------------------------------------------------------------------------- */

export async function addDomainAction(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const hostname = requiredText(formData.get("hostname"), "El dominio")
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");

    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(hostname)) {
      return fail("Ingresá un dominio válido, por ejemplo: ofertas.tumarca.com", {
        hostname: "Dominio inválido",
      });
    }

    const existing = repo.listDomains(workspace.id);
    if (existing.some((domain) => domain.hostname === hostname)) {
      return fail("Ese dominio ya está cargado.");
    }

    repo.createDomain(workspace.id, hostname);
    revalidatePath("/app/dominios");

    return ok(
      null,
      "Cargamos el dominio como pendiente. Va a quedar activo recién cuando verifiquemos los registros DNS.",
    );
  });
}

export async function verifyDomainAction(domainId: string): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const domain = repo.listDomains(workspace.id).find((item) => item.id === domainId);
    if (!domain) return fail("No encontramos ese dominio.");

    // La verificación real necesita infraestructura de DNS/SSL que todavía no
    // está conectada. En vez de marcarlo como activo, dejamos constancia del
    // intento y explicamos qué falta.
    run(
      `UPDATE domains SET status = 'verifying', last_checked_at = ?, updated_at = ? WHERE workspace_id = ? AND id = ?`,
      nowIso(),
      nowIso(),
      workspace.id,
      domainId,
    );

    revalidatePath("/app/dominios");
    return ok(
      null,
      "Marcamos el dominio como 'verificando'. La verificación automática de DNS y el SSL todavía no están conectados, así que no podemos confirmarlo desde acá.",
    );
  });
}

export async function deleteDomainAction(domainId: string): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    repo.deleteDomain(workspace.id, domainId);
    revalidatePath("/app/dominios");
    return ok(null, "Eliminamos el dominio.");
  });
}

/* -------------------------------------------------------------------------- */
/* Campañas                                                                    */
/* -------------------------------------------------------------------------- */

export async function createCampaignAction(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    repo.createCampaign(workspace.id, {
      name: requiredText(formData.get("name"), "El nombre de la campaña"),
      funnel_id: optionalText(formData.get("funnel_id")),
      objective: optionalText(formData.get("objective")),
      utm_campaign: optionalText(formData.get("utm_campaign")),
      daily_budget: numberField(formData.get("daily_budget")),
    });
    revalidatePath("/app/marketing");
    return ok(
      null,
      "Creamos la campaña en TiendaFlow para poder atribuir ventas. No se creó nada en tu cuenta de Meta: eso lo hacés desde el Administrador de Anuncios.",
    );
  });
}

/* -------------------------------------------------------------------------- */
/* Afiliados                                                                   */
/* -------------------------------------------------------------------------- */

export async function createAffiliateAction(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const email = requiredText(formData.get("email"), "El email").toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return fail("Ingresá un email válido.", { email: "Email inválido" });
    }
    const rate = numberField(formData.get("commission_rate"), 30);
    if (rate <= 0 || rate > 90) {
      return fail("La comisión tiene que estar entre 1% y 90%.", {
        commission_rate: "Valor fuera de rango",
      });
    }

    repo.createAffiliate(workspace.id, {
      full_name: requiredText(formData.get("full_name"), "El nombre"),
      email,
      commission_rate: rate,
      funnel_id: optionalText(formData.get("funnel_id")),
    });

    revalidatePath("/app/afiliados");
    return ok(null, "Sumamos el afiliado y generamos su link.");
  });
}

/* -------------------------------------------------------------------------- */
/* Notificaciones y plan                                                       */
/* -------------------------------------------------------------------------- */

export async function markNotificationsReadAction(): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    repo.markNotificationsRead(workspace.id);
    revalidatePath("/app", "layout");
    return ok(null);
  });
}

export async function changePlanAction(plan: string): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    if (!["starter", "pro", "scale"].includes(plan)) return fail("Ese plan no existe.");

    repo.ensureSubscription(workspace.id);
    repo.setPlan(workspace.id, plan);
    revalidatePath("/app/configuracion");

    return ok(
      null,
      "Actualizamos el plan en tu workspace. No se cobró nada: todavía no hay un proveedor de facturación conectado.",
    );
  });
}
