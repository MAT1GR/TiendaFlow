"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { aiStatus } from "@/lib/ai/provider";
import * as tasks from "@/lib/ai/tasks";
import { getFunnelMetrics, getTakeRates, resolveRange } from "@/lib/analytics";
import { landingTemplate, mergeLandingDraft } from "@/lib/landing-template";
import * as repo from "@/lib/repo";
import { toLines } from "@/lib/utils";
import { fail, guarded, ok, type ActionResult } from "@/app/actions/shared";

/**
 * Todas las llamadas a IA pasan por acá: se ejecutan en el servidor, se
 * registran en `ai_generations` y devuelven `isTemplate` para que la UI diga
 * con claridad si el contenido lo generó un modelo o el borrador local.
 */

export interface AiResponse<T> {
  data: T;
  isTemplate: boolean;
  provider: string;
  warning?: string;
  /** Campos que hubo que limpiar por afirmar algo que nadie puede comprobar. */
  cleaned?: number;
}

export async function getAiStatusAction() {
  return aiStatus();
}

export async function generateProductDraftAction(
  input: tasks.ProductBriefInput,
): Promise<ActionResult<AiResponse<tasks.ProductDraft>>> {
  return guarded(async () => {
    const { workspace, user } = await requireSession();
    if (!input.topic?.trim()) {
      return fail("Contanos sobre qué querés crear tu producto.", { topic: "Requerido" });
    }

    const result = await tasks.generateProductDraft(input);
    repo.logAiGeneration(workspace.id, {
      user_id: user.id,
      task: "product_draft",
      provider: result.provider,
      model: result.model,
      input,
      output: result.data,
      entity_type: "product",
    });

    return ok({
      data: result.data,
      isTemplate: result.isTemplate,
      provider: result.provider,
      warning: result.warning,
    });
  });
}

export async function generateOfferDraftAction(
  productId: string,
  tone?: string,
): Promise<ActionResult<AiResponse<tasks.OfferDraft>>> {
  return guarded(async () => {
    const { workspace, user } = await requireSession();
    const product = repo.getProduct(workspace.id, productId);
    if (!product) return fail("No encontramos ese producto en tu workspace.");

    const result = await tasks.generateOfferDraft({
      productName: product.name,
      audience: product.audience ?? undefined,
      problem: product.main_problem ?? undefined,
      transformation: product.transformation ?? undefined,
      price: product.base_price || 9900,
      currency: product.currency,
      tone,
    });

    repo.logAiGeneration(workspace.id, {
      user_id: user.id,
      task: "offer_draft",
      provider: result.provider,
      model: result.model,
      input: { productId, tone },
      output: result.data,
      entity_type: "offer",
    });

    return ok({
      data: result.data,
      isTemplate: result.isTemplate,
      provider: result.provider,
      warning: result.warning,
    });
  });
}

export async function generateLandingDraftAction(
  pageId: string,
  tone?: string,
): Promise<ActionResult<AiResponse<tasks.LandingDraft>>> {
  return guarded(async () => {
    const { workspace, user } = await requireSession();
    const page = repo.getLandingPage(workspace.id, pageId);
    if (!page) return fail("No encontramos esa landing en tu workspace.");

    const offer = page.offer_id ? repo.getOffer(workspace.id, page.offer_id) : null;
    const product = offer?.product_id ? repo.getProduct(workspace.id, offer.product_id) : null;
    const bonuses = offer ? repo.listBonuses(workspace.id, offer.id) : [];

    const result = await tasks.generateLandingDraft({
      productName: product?.name ?? page.name,
      offerName: offer?.name,
      audience: product?.audience ?? undefined,
      problem: product?.main_problem ?? undefined,
      transformation: product?.transformation ?? undefined,
      price: offer?.price ?? product?.base_price ?? 9900,
      currency: offer?.currency ?? workspace.currency,
      benefits: toLines(offer?.benefits ?? product?.benefits ?? null),
      guarantee: offer?.guarantee ?? null,
      bonuses: bonuses.map((bonus) => ({ name: bonus.name, description: bonus.description })),
      tone,
    });

    // Lo que devuelve el modelo NO se usa tal cual: se fusiona sobre la
    // estructura base. Esto corre acá y no al guardar porque el editor muestra
    // la vista previa apenas termina de generar, y ahí ya tiene que estar sano.
    const { sections, cleaned } = mergeLandingDraft(
      result.data,
      landingTemplate({
        product: product ?? null,
        offer: offer ?? null,
        bonuses,
        workspaceName: workspace.name,
      }),
    );

    repo.logAiGeneration(workspace.id, {
      user_id: user.id,
      task: "landing_draft",
      provider: result.provider,
      model: result.model,
      input: { pageId, tone },
      output: { sections },
      entity_type: "landing_page",
      entity_id: pageId,
    });

    return ok({
      data: { sections },
      isTemplate: result.isTemplate,
      provider: result.provider,
      warning: result.warning,
      cleaned,
    });
  });
}

export async function analyzeFunnelAction(
  funnelId: string,
  rangeKey = "30d",
): Promise<ActionResult<AiResponse<tasks.FunnelDiagnosis>>> {
  return guarded(async () => {
    const { workspace, user } = await requireSession();
    const funnel = repo.getFunnel(workspace.id, funnelId);
    if (!funnel) return fail("No encontramos ese funnel en tu workspace.");

    const range = resolveRange(rangeKey);
    const metrics = getFunnelMetrics(workspace.id, range).find((m) => m.funnelId === funnelId);
    const takeRates = getTakeRates(workspace.id, range);

    const result = await tasks.analyzeFunnel({
      funnelName: funnel.name,
      steps:
        metrics?.steps.map((step) => ({
          name: step.name,
          type: step.type,
          visitors: step.visitors,
          conversionRate: step.conversionRate,
        })) ?? [],
      orders: metrics?.orders ?? 0,
      revenue: metrics?.revenue ?? 0,
      currency: workspace.currency,
      bumpTakeRate: takeRates.bumpTakeRate,
      upsellTakeRate: takeRates.upsellTakeRate,
    });

    repo.logAiGeneration(workspace.id, {
      user_id: user.id,
      task: "funnel_analysis",
      provider: result.provider,
      model: result.model,
      input: { funnelId, rangeKey },
      output: result.data,
      entity_type: "funnel",
      entity_id: funnelId,
    });

    return ok({
      data: result.data,
      isTemplate: result.isTemplate,
      provider: result.provider,
      warning: result.warning,
    });
  });
}

export async function generateAdCopyAction(
  offerId: string,
  tone?: string,
): Promise<ActionResult<AiResponse<tasks.AdCopyDraft>>> {
  return guarded(async () => {
    const { workspace, user } = await requireSession();
    const offer = repo.getOffer(workspace.id, offerId);
    if (!offer) return fail("No encontramos esa oferta en tu workspace.");
    const product = offer.product_id ? repo.getProduct(workspace.id, offer.product_id) : null;

    const result = await tasks.generateAdCopy({
      productName: product?.name ?? offer.name,
      audience: product?.audience ?? undefined,
      problem: product?.main_problem ?? undefined,
      transformation: product?.transformation ?? offer.promise ?? undefined,
      price: offer.price,
      currency: offer.currency,
      tone,
    });

    repo.logAiGeneration(workspace.id, {
      user_id: user.id,
      task: "ad_copy",
      provider: result.provider,
      model: result.model,
      input: { offerId, tone },
      output: result.data,
      entity_type: "offer",
      entity_id: offerId,
    });

    return ok({
      data: result.data,
      isTemplate: result.isTemplate,
      provider: result.provider,
      warning: result.warning,
    });
  });
}

export async function rewriteTextAction(input: {
  text: string;
  action: tasks.RewriteAction;
  tone?: string;
  context?: string;
}): Promise<ActionResult<AiResponse<{ text: string }>>> {
  return guarded(async () => {
    const { workspace, user } = await requireSession();
    if (!input.text?.trim()) return fail("No hay texto para reescribir.");

    const result = await tasks.rewriteText(input);
    repo.logAiGeneration(workspace.id, {
      user_id: user.id,
      task: `rewrite_${input.action}`,
      provider: result.provider,
      model: result.model,
      input,
      output: result.data,
    });

    return ok({
      data: result.data,
      isTemplate: result.isTemplate,
      provider: result.provider,
      warning: result.warning,
    });
  });
}

/* -------------------------------------------------------------------------- */
/* Aplicar resultados de IA sobre entidades reales                             */
/* -------------------------------------------------------------------------- */

export async function applyOfferDraftAction(
  offerId: string,
  draft: tasks.OfferDraft,
  options: { bonuses: boolean; bump: boolean; upsell: boolean },
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const offer = repo.getOffer(workspace.id, offerId);
    if (!offer) return fail("No encontramos esa oferta en tu workspace.");

    repo.updateOffer(workspace.id, offerId, {
      headline: draft.headline,
      promise: draft.promise,
      benefits: draft.benefits,
      cta_text: draft.cta_text,
      guarantee: draft.guarantee,
    });

    if (options.bonuses) {
      for (const bonus of draft.bonuses ?? []) {
        repo.createBonus(workspace.id, {
          offer_id: offerId,
          name: bonus.name,
          description: bonus.description,
          value: bonus.value,
        });
      }
    }

    if (options.bump && draft.order_bump) {
      repo.createOrderBump(workspace.id, {
        offer_id: offerId,
        name: draft.order_bump.name,
        description: draft.order_bump.description,
        price: draft.order_bump.price,
        checkbox_label: draft.order_bump.checkbox_label,
      });
    }

    if (options.upsell && draft.upsell) {
      const upsellId = repo.createUpsell(workspace.id, {
        offer_id: offerId,
        name: draft.upsell.name,
        headline: draft.upsell.headline,
        description: draft.upsell.description,
        price: draft.upsell.price,
      });
      if (draft.downsell) {
        repo.createDownsell(workspace.id, {
          upsell_id: upsellId,
          name: draft.downsell.name,
          headline: draft.downsell.headline,
          description: draft.downsell.description,
          price: draft.downsell.price,
        });
      }
    }

    revalidatePath(`/app/ofertas/${offerId}`);
    return ok(null, "Aplicamos la propuesta a tu oferta. Revisá y editá antes de publicar.");
  });
}

export async function applyProductDraftAction(
  draft: tasks.ProductDraft,
  chosenTitle: string,
  brief: tasks.ProductBriefInput,
): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    const { workspace } = await requireSession();

    const product = repo.createProduct(workspace.id, {
      name: chosenTitle || draft.titles?.[0] || brief.topic,
      subtitle: draft.subtitle ?? null,
      description: draft.description ?? null,
      short_description: draft.short_description ?? null,
      type: "ebook",
      status: "draft",
      audience: brief.audience ?? null,
      main_problem: brief.problem ?? null,
      transformation: brief.outcome ?? null,
      benefits: draft.benefits ?? [],
      outline: { chapters: draft.outline ?? [], faq: draft.faq ?? [] },
      source: "ai",
      cover_style: JSON.stringify({ from: "#6D5DFB", to: "#22D3EE" }),
    });

    repo.createNotification(workspace.id, {
      title: `Creaste "${product.name}" con IA`,
      body: "Revisá el contenido generado antes de publicarlo.",
      href: `/app/productos/${product.id}`,
      type: "success",
    });

    revalidatePath("/app/productos");
    return ok({ id: product.id }, "Creamos el producto con el borrador generado.");
  });
}

/* -------------------------------------------------------------------------- */
/* Copiloto contextual                                                         */
/* -------------------------------------------------------------------------- */

export interface CopilotContext {
  module: string;
  entityId?: string;
}

export interface CopilotReply {
  answer: string;
  bullets: string[];
  isTemplate: boolean;
  links: Array<{ label: string; href: string }>;
}

export async function askCopilotAction(
  question: string,
  context: CopilotContext,
): Promise<ActionResult<CopilotReply>> {
  return guarded(async () => {
    const { workspace, user } = await requireSession();
    if (!question.trim()) return fail("Escribí una pregunta.");

    // Contexto real del workspace para que la respuesta no sea genérica.
    const range = resolveRange("30d");
    const funnels = getFunnelMetrics(workspace.id, range);
    const takeRates = getTakeRates(workspace.id, range);
    const products = repo.listProducts(workspace.id).slice(0, 5);
    const offers = repo.listOffers(workspace.id).slice(0, 5);

    const snapshot = {
      modulo: context.module,
      productos: products.map((p) => ({ nombre: p.name, precio: p.base_price, estado: p.status })),
      ofertas: offers.map((o) => ({ nombre: o.name, precio: o.price, estado: o.status })),
      funnels: funnels.map((f) => ({
        nombre: f.name,
        visitantes: f.visitors,
        ventas: f.orders,
        conversion: f.conversionRate,
      })),
      take_rates: takeRates,
    };

    const result = await tasks.rewriteText({
      text: question,
      action: "improve",
      context: `PREGUNTA DEL USUARIO EN EL MÓDULO "${context.module}". Datos del workspace: ${JSON.stringify(
        snapshot,
      )}`,
    });

    // El backend local no responde preguntas abiertas: devolvemos el contexto
    // real y lo decimos, en vez de inventar una respuesta.
    const isTemplate = result.isTemplate;

    const answer = isTemplate
      ? buildLocalAnswer(question, context, snapshot)
      : (result.data as { text: string }).text;

    repo.logAiGeneration(workspace.id, {
      user_id: user.id,
      task: "copilot",
      provider: result.provider,
      model: result.model,
      input: { question, context },
      output: { answer },
    });

    return ok({
      answer,
      bullets: buildContextBullets(snapshot),
      isTemplate,
      links: contextLinks(context.module),
    });
  });
}

function buildLocalAnswer(
  question: string,
  context: CopilotContext,
  snapshot: Record<string, unknown>,
): string {
  const funnels = (snapshot.funnels as Array<{ nombre: string; visitantes: number; ventas: number; conversion: number }>) ?? [];
  const total = funnels.reduce((acc, f) => acc + f.visitantes, 0);

  return [
    "Todavía no hay un proveedor de IA conectado, así que no puedo redactar una respuesta abierta.",
    "",
    `Lo que sí puedo darte son los datos reales de tu workspace en los últimos 30 días${
      context.module ? ` (estás en ${context.module})` : ""
    }:`,
    total > 0
      ? `· ${total} visitantes y ${funnels.reduce((acc, f) => acc + f.ventas, 0)} ventas entre tus funnels.`
      : "· Todavía no registramos visitantes en tus funnels.",
    "",
    "Para respuestas escritas, agregá ANTHROPIC_API_KEY en las variables de entorno del servidor.",
  ].join("\n");
}

function buildContextBullets(snapshot: Record<string, unknown>): string[] {
  const funnels =
    (snapshot.funnels as Array<{ nombre: string; visitantes: number; ventas: number; conversion: number }>) ?? [];
  const bullets: string[] = [];
  for (const funnel of funnels.slice(0, 3)) {
    bullets.push(
      `${funnel.nombre}: ${funnel.visitantes} visitantes · ${funnel.ventas} ventas · ${funnel.conversion
        .toFixed(1)
        .replace(".", ",")}% conversión`,
    );
  }
  const takeRates = snapshot.take_rates as { bumpTakeRate: number | null; upsellTakeRate: number | null };
  if (takeRates?.bumpTakeRate !== null && takeRates?.bumpTakeRate !== undefined) {
    bullets.push(`Order bump: ${takeRates.bumpTakeRate.toFixed(1).replace(".", ",")}% de take rate`);
  }
  if (takeRates?.upsellTakeRate !== null && takeRates?.upsellTakeRate !== undefined) {
    bullets.push(`Upsell: ${takeRates.upsellTakeRate.toFixed(1).replace(".", ",")}% de take rate`);
  }
  return bullets;
}

function contextLinks(module: string): Array<{ label: string; href: string }> {
  switch (module) {
    case "productos":
      return [
        { label: "Crear producto con IA", href: "/app/productos/nuevo?fuente=ia" },
        { label: "Ver productos", href: "/app/productos" },
      ];
    case "ofertas":
      return [
        { label: "Crear oferta", href: "/app/ofertas/nueva" },
        { label: "Ver ofertas", href: "/app/ofertas" },
      ];
    case "funnels":
      return [
        { label: "Ver funnels", href: "/app/funnels" },
        { label: "Mis productos", href: "/app/productos" },
      ];
    case "analytics":
      return [
        { label: "Ver analytics", href: "/app/analytics" },
        { label: "Configurar Meta", href: "/app/integraciones/meta" },
      ];
    default:
      return [
        { label: "Mis productos", href: "/app/productos" },
        { label: "Panel de IA", href: "/app/ia" },
      ];
  }
}
