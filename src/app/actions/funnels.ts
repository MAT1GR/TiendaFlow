"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { funnelPublishBlockers } from "@/lib/launch";
import * as repo from "@/lib/repo";
import { parseJson } from "@/lib/utils";
import type { FunnelStepType, LandingSectionType } from "@/lib/types";
import {
  fail,
  guarded,
  ok,
  optionalText,
  requiredText,
  type ActionResult,
} from "@/app/actions/shared";

/* -------------------------------------------------------------------------- */
/* Funnels                                                                     */
/* -------------------------------------------------------------------------- */

export async function createFunnelAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    const { workspace } = await requireSession();

    const name = requiredText(formData.get("name"), "El nombre del funnel");
    const offerId = optionalText(formData.get("offer_id"));
    const productId = optionalText(formData.get("product_id"));

    if (offerId && !repo.getOffer(workspace.id, offerId)) {
      return fail("La oferta seleccionada no existe en tu workspace.");
    }

    const funnel = repo.createFunnel(workspace.id, {
      name,
      offer_id: offerId,
      product_id: productId,
      traffic_source: String(formData.get("traffic_source") ?? "meta_ads"),
    });

    // La landing del funnel arranca con una página vinculada al primer paso.
    const steps = repo.listFunnelSteps(workspace.id, funnel.id);
    const landingStep = steps.find((step) => step.type === "landing");
    if (landingStep) {
      repo.createLandingPage(workspace.id, {
        name: `Landing ${name}`,
        offer_id: offerId,
        funnel_step_id: landingStep.id,
      });
    }

    repo.createNotification(workspace.id, {
      title: `Creaste el funnel "${funnel.name}"`,
      body: "Editá los pasos y generá la landing con IA.",
      href: `/app/funnels/${funnel.id}`,
      type: "success",
    });

    revalidatePath("/app/funnels");
    revalidatePath("/app");
    return ok({ id: funnel.id }, "Funnel creado.");
  });
}

export async function renameFunnelAction(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const funnelId = requiredText(formData.get("id"), "El funnel");
    if (!repo.getFunnel(workspace.id, funnelId)) return fail("No encontramos ese funnel.");

    repo.updateFunnel(workspace.id, funnelId, {
      name: requiredText(formData.get("name"), "El nombre del funnel"),
      offer_id: optionalText(formData.get("offer_id")),
      traffic_source: String(formData.get("traffic_source") ?? "meta_ads"),
    });

    revalidatePath(`/app/funnels/${funnelId}`);
    revalidatePath("/app/funnels");
    return ok(null, "Guardamos el funnel.");
  });
}

export async function addFunnelStepAction(
  funnelId: string,
  type: FunnelStepType,
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const funnel = repo.getFunnel(workspace.id, funnelId);
    if (!funnel) return fail("No encontramos ese funnel.");

    const labels: Record<FunnelStepType, string> = {
      landing: "Landing page",
      checkout: "Checkout",
      upsell: "Upsell",
      downsell: "Downsell",
      thankyou: "Gracias",
      custom: "Paso personalizado",
    };

    const existing = repo.listFunnelSteps(workspace.id, funnelId);
    const sameType = existing.filter((step) => step.type === type).length;
    const name = sameType > 0 ? `${labels[type]} ${sameType + 1}` : labels[type];

    const stepId = repo.createFunnelStep(workspace.id, funnelId, type, name);

    if (type === "landing") {
      repo.createLandingPage(workspace.id, {
        name: `Landing ${funnel.name} ${sameType + 1}`,
        offer_id: funnel.offer_id,
        funnel_step_id: stepId,
      });
    }

    revalidatePath(`/app/funnels/${funnelId}`);
    return ok(null, `Agregamos el paso "${name}".`);
  });
}

export async function duplicateFunnelStepAction(
  funnelId: string,
  stepId: string,
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const steps = repo.listFunnelSteps(workspace.id, funnelId);
    const source = steps.find((step) => step.id === stepId);
    if (!source) return fail("No encontramos ese paso.");

    const newId = repo.createFunnelStep(
      workspace.id,
      funnelId,
      source.type,
      `${source.name} (copia)`,
    );
    repo.updateFunnelStep(workspace.id, newId, { config: source.config ?? "{}" });

    revalidatePath(`/app/funnels/${funnelId}`);
    return ok(null, "Duplicamos el paso.");
  });
}

export async function deleteFunnelStepAction(
  funnelId: string,
  stepId: string,
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const steps = repo.listFunnelSteps(workspace.id, funnelId);
    if (!steps.some((step) => step.id === stepId)) return fail("No encontramos ese paso.");
    if (steps.length <= 1) return fail("El funnel necesita al menos un paso.");

    repo.deleteFunnelStep(workspace.id, stepId);
    repo.reorderFunnelSteps(
      workspace.id,
      funnelId,
      steps.filter((step) => step.id !== stepId).map((step) => step.id),
    );

    revalidatePath(`/app/funnels/${funnelId}`);
    return ok(null, "Eliminamos el paso.");
  });
}

export async function reorderFunnelStepsAction(
  funnelId: string,
  orderedIds: string[],
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const steps = repo.listFunnelSteps(workspace.id, funnelId);
    const known = new Set(steps.map((step) => step.id));
    if (orderedIds.length !== steps.length || orderedIds.some((stepId) => !known.has(stepId))) {
      return fail("El orden enviado no coincide con los pasos del funnel.");
    }
    repo.reorderFunnelSteps(workspace.id, funnelId, orderedIds);
    revalidatePath(`/app/funnels/${funnelId}`);
    return ok(null, "Reordenamos los pasos.");
  });
}

export async function renameFunnelStepAction(
  funnelId: string,
  stepId: string,
  name: string,
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const trimmed = name.trim();
    if (!trimmed) return fail("El paso necesita un nombre.");
    repo.updateFunnelStep(workspace.id, stepId, { name: trimmed });
    revalidatePath(`/app/funnels/${funnelId}`);
    return ok(null, "Renombramos el paso.");
  });
}

export async function publishFunnelAction(funnelId: string): Promise<ActionResult<{ url: string }>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const funnel = repo.getFunnel(workspace.id, funnelId);
    if (!funnel) return fail("No encontramos ese funnel.");

    const blockers = funnelPublishBlockers(workspace.id, funnelId);
    if (blockers.length) {
      return fail(`No podemos publicar todavía:\n· ${blockers.join("\n· ")}`);
    }

    const url = `/f/${repo.publicSlug(funnel)}`;
    repo.updateFunnel(workspace.id, funnelId, { status: "published", published_url: url });
    for (const step of repo.listFunnelSteps(workspace.id, funnelId)) {
      repo.updateFunnelStep(workspace.id, step.id, { published: 1 });
    }

    repo.createNotification(workspace.id, {
      title: `Publicaste "${funnel.name}"`,
      body: `Ya podés mandar tráfico a ${url}`,
      href: url,
      type: "success",
    });

    revalidatePath(`/app/funnels/${funnelId}`);
    revalidatePath("/app/funnels");
    revalidatePath("/app/lanzamiento");
    return ok({ url }, "Funnel publicado.");
  });
}

export async function setFunnelStatusAction(
  funnelId: string,
  status: "draft" | "published" | "paused",
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    if (!repo.getFunnel(workspace.id, funnelId)) return fail("No encontramos ese funnel.");
    if (status === "published") {
      const blockers = funnelPublishBlockers(workspace.id, funnelId);
      if (blockers.length) return fail(`No podemos publicar todavía:\n· ${blockers.join("\n· ")}`);
    }
    repo.updateFunnel(workspace.id, funnelId, { status });
    revalidatePath(`/app/funnels/${funnelId}`);
    revalidatePath("/app/funnels");
    return ok(null, status === "paused" ? "Funnel pausado." : "Funnel actualizado.");
  });
}

export async function deleteFunnelAction(funnelId: string): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    if (!repo.getFunnel(workspace.id, funnelId)) return fail("No encontramos ese funnel.");
    repo.deleteFunnel(workspace.id, funnelId);
    revalidatePath("/app/funnels");
    return ok(null, "Eliminamos el funnel.");
  });
}

/* -------------------------------------------------------------------------- */
/* Landing pages                                                               */
/* -------------------------------------------------------------------------- */

export interface EditorSection {
  id: string;
  type: LandingSectionType;
  content: Record<string, unknown>;
}

export async function saveLandingSectionsAction(
  pageId: string,
  sections: EditorSection[],
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const page = repo.getLandingPage(workspace.id, pageId);
    if (!page) return fail("No encontramos esa landing en tu workspace.");
    if (!sections.length) return fail("La landing necesita al menos una sección.");

    repo.replaceLandingSections(
      workspace.id,
      pageId,
      sections.map((section) => ({ type: section.type, content: section.content })),
    );

    revalidatePath(`/app/landings/${pageId}`);
    return ok(null, "Guardamos la landing.");
  });
}

export async function updateLandingMetaAction(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const pageId = requiredText(formData.get("id"), "La landing");
    if (!repo.getLandingPage(workspace.id, pageId)) return fail("No encontramos esa landing.");

    repo.updateLandingPage(workspace.id, pageId, {
      name: requiredText(formData.get("name"), "El nombre"),
      seo_title: optionalText(formData.get("seo_title")),
      seo_description: optionalText(formData.get("seo_description")),
      theme: { accent: String(formData.get("accent") || "#6D5DFB") },
    });

    revalidatePath(`/app/landings/${pageId}`);
    return ok(null, "Guardamos los datos de la página.");
  });
}

export async function publishLandingAction(pageId: string): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const page = repo.getLandingPage(workspace.id, pageId);
    if (!page) return fail("No encontramos esa landing.");

    const sections = repo.listLandingSections(workspace.id, pageId);
    if (!sections.length) {
      return fail("La landing no tiene secciones todavía. Agregá al menos un hero y un CTA.");
    }
    const hasCta = sections.some((section) => {
      const content = parseJson<Record<string, unknown>>(section.content, {});
      return section.type === "cta" || section.type === "pricing" || Boolean(content.cta);
    });
    if (!hasCta) return fail("Agregá al menos un llamado a la acción antes de publicar.");

    repo.updateLandingPage(workspace.id, pageId, { status: "published" });
    revalidatePath(`/app/landings/${pageId}`);
    return ok(null, "Landing publicada.");
  });
}
