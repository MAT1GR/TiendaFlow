"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  consumePasswordResetToken,
  createPasswordResetToken,
  createSession,
  currentUser,
  currentWorkspace,
  destroySession,
  hashPassword,
  requireSession,
  verifyPassword,
} from "@/lib/auth";
import { DEFAULT_PRESET, PRESETS, readTheme } from "@/components/landing/theme";
import { get, nowIso, run, transaction } from "@/lib/db";
import { isPlanId } from "@/lib/plans";
import { ensureSubscription, id as newId, setPlan } from "@/lib/repo";
import { seedDemoWorkspace } from "@/lib/seed";
import { slugify } from "@/lib/utils";
import type { User } from "@/lib/types";
import {
  fail,
  guarded,
  ok,
  requiredText,
  ValidationError,
  type ActionResult,
} from "@/app/actions/shared";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizeEmail(value: FormDataEntryValue | null) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) {
    throw new ValidationError("Ingresá un email válido.", { email: "Email inválido" });
  }
  return email;
}

export async function registerAction(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const result = await guarded<null>(async () => {
    const fullName = requiredText(formData.get("full_name"), "Tu nombre");
    const email = normalizeEmail(formData.get("email"));
    const password =
      typeof formData.get("password") === "string" ? String(formData.get("password")) : "";

    if (password.length < 8) {
      return fail("La contraseña tiene que tener al menos 8 caracteres.", {
        password: "Mínimo 8 caracteres",
      });
    }

    const existing = get<{ id: string }>(`SELECT id FROM users WHERE email = ?`, email);
    if (existing) {
      return fail("Ya existe una cuenta con ese email. Probá iniciar sesión.", {
        email: "Email en uso",
      });
    }

    const userId = newId();
    const workspaceId = newId();
    const now = nowIso();

    transaction(() => {
      run(
        `INSERT INTO users (id, email, password_hash, full_name, avatar_url, provider,
           onboarding_completed, onboarding_answers, created_at, updated_at)
         VALUES (?,?,?,?,NULL,'password',0,NULL,?,?)`,
        userId,
        email,
        hashPassword(password),
        fullName,
        now,
        now,
      );

      const baseSlug = slugify(fullName) || "workspace";
      let slug = baseSlug;
      let counter = 2;
      while (get(`SELECT id FROM workspaces WHERE slug = ?`, slug)) {
        slug = `${baseSlug}-${counter++}`;
      }

      run(
        `INSERT INTO workspaces (id, owner_id, name, slug, country, currency, tax_id, is_demo, created_at, updated_at)
         VALUES (?,?,?,?,'AR','ARS',NULL,0,?,?)`,
        workspaceId,
        userId,
        `Negocio de ${fullName.split(" ")[0]}`,
        slug,
        now,
        now,
      );

      run(
        `INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at)
         VALUES (?,?,?,'owner',?)`,
        newId(),
        workspaceId,
        userId,
        now,
      );
    });

    ensureSubscription(workspaceId);
    await createSession(userId);
    return ok(null);
  });

  if (result.ok) redirect("/bienvenida");
  return result;
}

export async function loginAction(
  _prev: ActionResult<{ next: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ next: string }>> {
  const result = await guarded<{ next: string }>(async () => {
    const email = normalizeEmail(formData.get("email"));
    const password =
      typeof formData.get("password") === "string" ? String(formData.get("password")) : "";

    const user = get<User & { password_hash: string }>(`SELECT * FROM users WHERE email = ?`, email);

    // Mensaje idéntico exista o no el usuario, para no filtrar qué emails están registrados.
    if (!user || !verifyPassword(password, user.password_hash)) {
      return fail("Email o contraseña incorrectos.");
    }

    await createSession(user.id);
    return ok({ next: user.onboarding_completed ? "/app" : "/bienvenida" });
  });

  if (result.ok) redirect(result.data.next);
  return result;
}

export async function logoutAction() {
  await destroySession();
  redirect("/ingresar");
}

export async function requestPasswordResetAction(
  _prev: ActionResult<{ devLink?: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ devLink?: string }>> {
  return guarded(async () => {
    const email = normalizeEmail(formData.get("email"));
    const user = get<{ id: string }>(`SELECT id FROM users WHERE email = ?`, email);

    if (!user) {
      // Respuesta idéntica exista o no la cuenta.
      return ok(
        {},
        "Si hay una cuenta con ese email, te mandamos el link para restablecer la contraseña.",
      );
    }

    const token = createPasswordResetToken(user.id);

    // No hay proveedor de email configurado: en vez de simular un envío exitoso,
    // devolvemos el link en desarrollo y lo decimos explícitamente.
    if (process.env.NODE_ENV !== "production") {
      return ok(
        { devLink: `/restablecer?token=${token}` },
        "Todavía no hay proveedor de email conectado, así que no se envió ningún mail. Como estás en desarrollo, te dejamos el link acá.",
      );
    }

    return ok(
      {},
      "Si hay una cuenta con ese email, te vamos a mandar el link. Necesitás conectar un proveedor de email en Integraciones para que el envío funcione.",
    );
  });
}

export async function resetPasswordAction(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const result = await guarded<null>(async () => {
    const token = requiredText(formData.get("token"), "El token");
    const password = String(formData.get("password") ?? "");
    if (password.length < 8) {
      return fail("La contraseña tiene que tener al menos 8 caracteres.", {
        password: "Mínimo 8 caracteres",
      });
    }

    const userId = consumePasswordResetToken(token);
    if (!userId) {
      return fail("El link expiró o ya se usó. Pedí uno nuevo.");
    }

    run(
      `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`,
      hashPassword(password),
      nowIso(),
      userId,
    );

    await createSession(userId);
    return ok(null);
  });

  if (result.ok) redirect("/app");
  return result;
}

/**
 * Cierra el alta: bautiza la tienda, le guarda los colores y anota por dónde
 * quiere empezar el vendedor.
 *
 * El nombre y los colores no son metadatos del formulario: el nombre pasa a
 * ser el del workspace (y con él la dirección pública de la tienda), y los
 * colores quedan como punto de partida de cada página de venta que arme
 * después. Por eso se escriben acá y no en una pantalla de configuración.
 */
export async function completeOnboardingAction(
  _prev: ActionResult<{ next: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ next: string }>> {
  const result = await guarded<{ next: string }>(async () => {
    const user = await currentUser();
    if (!user) return fail("Tu sesión expiró. Volvé a iniciar sesión.");

    const workspace = await currentWorkspace();
    if (!workspace) return fail("No encontramos tu tienda. Volvé a iniciar sesión.");

    const storeName = requiredText(formData.get("store_name"), "El nombre de tu tienda");

    const productSource = String(formData.get("product_source") ?? "");
    const answers = { productSource };

    // El plan elegido en el alta. Cualquier valor raro cae en `free`: nadie
    // termina con un plan inexistente por mandar el formulario a mano.
    const planElegido = String(formData.get("plan") ?? "");
    const plan = isPlanId(planElegido) ? planElegido : "free";

    const preset =
      PRESETS.find((item) => item.preset === String(formData.get("theme_preset") ?? "")) ??
      DEFAULT_PRESET;

    // El slug es la dirección pública de la tienda. Se regenera acá porque en
    // el alta todavía no hay nada publicado: más adelante cambiarlo rompería
    // los links que el vendedor ya compartió.
    const baseSlug = slugify(storeName) || workspace.slug;
    let slug = baseSlug;
    let counter = 2;
    while (get(`SELECT id FROM workspaces WHERE slug = ? AND id != ?`, slug, workspace.id)) {
      slug = `${baseSlug}-${counter++}`;
    }

    run(
      `UPDATE users SET onboarding_completed = 1, onboarding_answers = ?, updated_at = ? WHERE id = ?`,
      JSON.stringify(answers),
      nowIso(),
      user.id,
    );

    run(
      `UPDATE workspaces SET name = ?, slug = ?, theme = ?, updated_at = ? WHERE id = ?`,
      storeName,
      slug,
      JSON.stringify(readTheme(preset)),
      nowIso(),
      workspace.id,
    );

    ensureSubscription(workspace.id);
    setPlan(workspace.id, plan);

    revalidatePath("/app", "layout");

    /*
     * El alta termina siempre en la creación del producto.
     *
     * Antes preguntábamos qué quería hacer primero y lo mandábamos ahí, pero
     * no era una elección real: sin producto no hay oferta que armar, ni
     * página que publicar, ni nada que cobrar. Quien elegía "configurar
     * ventas" caía en una pantalla que no podía completar.
     *
     * Lo único que se arrastra del alta es qué tipo de producto tiene, para
     * que el flujo arranque en el paso que le corresponde y no le vuelva a
     * preguntar lo mismo.
     */
    const fuente =
      productSource === "ia" ? "ia" : productSource === "cero" ? "cero" : "propio";

    return ok({ next: `/app/productos/nuevo?fuente=${fuente}` });
  });

  if (result.ok) redirect(result.data.next);
  return result;
}

export async function loadDemoDataAction(): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    seedDemoWorkspace(workspace.id);
    revalidatePath("/app", "layout");
    return ok(null, "Cargamos datos de demostración. Están marcados como demo en toda la app.");
  });
}

export async function clearDemoDataAction(): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    transaction(() => {
      for (const table of [
        "analytics_events",
        "attribution_events",
        "commissions",
        "affiliate_links",
        "affiliates",
        "order_items",
        "payments",
        "orders",
        "customers",
        "campaigns",
        "landing_sections",
        "landing_pages",
        "funnel_steps",
        "funnels",
        "downsells",
        "upsells",
        "order_bumps",
        "bonuses",
        "offers",
        "product_files",
        "products",
      ]) {
        run(`DELETE FROM ${table} WHERE workspace_id = ? AND is_demo = 1`, workspace.id);
      }
    });
    revalidatePath("/app", "layout");
    return ok(null, "Borramos todos los datos de demostración.");
  });
}

export async function updateAccountAction(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { user } = await requireSession();
    const fullName = requiredText(formData.get("full_name"), "Tu nombre");
    const newPassword = String(formData.get("new_password") ?? "");

    if (newPassword) {
      const currentPassword = String(formData.get("current_password") ?? "");
      const row = get<{ password_hash: string }>(
        `SELECT password_hash FROM users WHERE id = ?`,
        user.id,
      );
      if (!row || !verifyPassword(currentPassword, row.password_hash)) {
        return fail("La contraseña actual no coincide.", {
          current_password: "Contraseña incorrecta",
        });
      }
      if (newPassword.length < 8) {
        return fail("La contraseña nueva tiene que tener al menos 8 caracteres.", {
          new_password: "Mínimo 8 caracteres",
        });
      }
      run(
        `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`,
        hashPassword(newPassword),
        nowIso(),
        user.id,
      );
    }

    run(
      `UPDATE users SET full_name = ?, updated_at = ? WHERE id = ?`,
      fullName,
      nowIso(),
      user.id,
    );

    revalidatePath("/app", "layout");
    return ok(null, "Guardamos los cambios de tu cuenta.");
  });
}
