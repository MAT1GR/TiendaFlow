"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { aiStatus } from "@/lib/ai/provider";
import * as tasks from "@/lib/ai/tasks";
import { getFunnelMetrics, getTakeRates, resolveRange } from "@/lib/analytics";
import { findLayout } from "@/components/landing/estructuras";
import { readTheme } from "@/components/landing/theme";
import { landingTemplate, mergeLandingDraft } from "@/lib/landing-template";
import * as repo from "@/lib/repo";
import { parseJson, toLines } from "@/lib/utils";
import { checkAiQuota } from "@/lib/quota";
import { readIdealClient } from "@/lib/ai/research";
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

    // El cupo del plan se mira antes de gastar un pedido al proveedor.
    const cupo = checkAiQuota(workspace.id);
    if (!cupo.ok) return fail(cupo.reason!);
    if (!input.topic?.trim()) {
      return fail("Contanos qué es tu producto y a quién ayuda.", { topic: "Requerido" });
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

    // El cupo del plan se mira antes de gastar un pedido al proveedor.
    const cupo = checkAiQuota(workspace.id);
    if (!cupo.ok) return fail(cupo.reason!);
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

/**
 * Lo que el vendedor contesta antes de generar: a quién le habla, de qué lo
 * salva y en qué lo convierte. Viene del formulario del editor y pisa lo que
 * haya cargado en el producto — si se tomó el trabajo de escribirlo ahí, es
 * más fresco que lo que quedó guardado.
 */
export interface LandingBriefOverride {
  audience?: string;
  problem?: string;
  transformation?: string;
}

export async function generateLandingDraftAction(
  pageId: string,
  tone?: string,
  brief?: LandingBriefOverride,
): Promise<ActionResult<AiResponse<tasks.LandingDraft>>> {
  return guarded(async () => {
    const { workspace, user } = await requireSession();

    // El cupo del plan se mira antes de gastar un pedido al proveedor.
    const cupo = checkAiQuota(workspace.id);
    if (!cupo.ok) return fail(cupo.reason!);
    const page = repo.getLandingPage(workspace.id, pageId);
    if (!page) return fail("No encontramos esa landing en tu workspace.");

    const offer = page.offer_id ? repo.getOffer(workspace.id, page.offer_id) : null;
    const product = offer?.product_id ? repo.getProduct(workspace.id, offer.product_id) : null;
    const bonuses = offer ? repo.listBonuses(workspace.id, offer.id) : [];

    // El estilo que el vendedor eligió para ESTA página manda: la IA escribe
    // los bloques que la página tiene, no los de una estructura fija.
    const layout = findLayout(readTheme(parseJson<unknown>(page.theme, {})).layout);

    const result = await tasks.generateLandingDraft({
      productName: product?.name ?? page.name,
      offerName: offer?.name,
      audience: limpio(brief?.audience) ?? product?.audience ?? undefined,
      problem: limpio(brief?.problem) ?? product?.main_problem ?? undefined,
      transformation: limpio(brief?.transformation) ?? product?.transformation ?? undefined,
      price: offer?.price ?? product?.base_price ?? 9900,
      currency: offer?.currency ?? workspace.currency,
      benefits: toLines(offer?.benefits ?? product?.benefits ?? null),
      guarantee: offer?.guarantee ?? null,
      bonuses: bonuses.map((bonus) => ({ name: bonus.name, description: bonus.description })),
      /*
       * Todo lo que el vendedor ya cargó de su producto viaja al modelo.
       *
       * La página salía escrita a partir de tres campos —audiencia, problema,
       * transformación— cuando en la ficha del producto había una descripción
       * entera, una promesa y una categoría. El modelo llenaba ese vacío con
       * relleno: más párrafos, más adjetivos, menos producto.
       */
      subtitle: product?.subtitle ?? null,
      description: product?.description ?? null,
      category: product?.category ?? null,
      hasCover: Boolean(product?.cover_url?.trim()),
      tone,
      layout,
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
        layout,
      }),
    );

    repo.logAiGeneration(workspace.id, {
      user_id: user.id,
      task: "landing_draft",
      provider: result.provider,
      model: result.model,
      input: { pageId, tone, brief },
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

    // El cupo del plan se mira antes de gastar un pedido al proveedor.
    const cupo = checkAiQuota(workspace.id);
    if (!cupo.ok) return fail(cupo.reason!);
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

    // El cupo del plan se mira antes de gastar un pedido al proveedor.
    const cupo = checkAiQuota(workspace.id);
    if (!cupo.ok) return fail(cupo.reason!);
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

    // El cupo del plan se mira antes de gastar un pedido al proveedor.
    const cupo = checkAiQuota(workspace.id);
    if (!cupo.ok) return fail(cupo.reason!);
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

/** Lo visual que eligió en el alta: la portada y el color de su página. */
export interface ProductLook {
  coverUrl?: string;
  preset?: string;
}

export async function applyProductDraftAction(
  draft: tasks.ProductDraft,
  chosenTitle: string,
  brief: tasks.ProductBriefInput,
  look?: ProductLook,
): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    const { workspace } = await requireSession();

    /*
     * El avatar, el dolor y la transformación salen del borrador, no del brief.
     *
     * Ahora es la IA la que los deduce de la descripción que escribió el
     * vendedor, y en la pantalla de revisión él puede corregirlos: lo que llega
     * acá en `draft` ya pasó por sus manos. El `brief` queda como respaldo para
     * las llamadas que todavía mandan esos campos por separado.
     */
    const product = repo.createProduct(workspace.id, {
      name: chosenTitle || draft.titles?.[0] || brief.productName || "Producto sin nombre",
      subtitle: draft.subtitle ?? null,
      description: draft.description ?? null,
      short_description: draft.short_description ?? null,
      type: "ebook",
      status: "draft",
      audience: draft.audience?.trim() || brief.audience || null,
      main_problem: draft.main_problem?.trim() || brief.problem || null,
      transformation: draft.transformation?.trim() || brief.outcome || null,
      benefits: draft.benefits ?? [],
      outline: { chapters: draft.outline ?? [], faq: draft.faq ?? [] },
      source: "ai",
      cover_style: JSON.stringify({ from: "#6D5DFB", to: "#22D3EE" }),
      /*
       * La portada y el color se eligen en el alta, no después.
       *
       * Los dos se cargaban recién en la ficha del producto, tres pantallas más
       * adelante. El resultado era que la página de venta nacía sin una sola
       * imagen y con los colores de la tienda, y el vendedor la veía por
       * primera vez así: igual a la de todos los demás.
       */
      cover_url: limpio(look?.coverUrl) ?? null,
      landing_preset: limpio(look?.preset) ?? null,
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

/** Un campo del brief, o `undefined` si vino vacío o solo con espacios. */
function limpio(valor: string | undefined): string | undefined {
  const texto = valor?.trim();
  return texto ? texto : undefined;
}

/* -------------------------------------------------------------------------- */
/* Investigación de mercado                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Todo lo que la app sabe de un producto, listo para un prompt.
 *
 * Las cuatro tareas de investigación arrancan igual: buscar el producto, su
 * oferta y sus bonos, y chequear el cupo. Estaba escrito cuatro veces y las
 * cuatro copias ya se habían separado entre sí.
 */
async function contextoDeProducto(productId: string) {
  const { workspace, user } = await requireSession();

  const cupo = checkAiQuota(workspace.id);
  if (!cupo.ok) {
    return { ok: false as const, error: cupo.reason ?? "No te quedan pedidos de IA este mes." };
  }

  const product = repo.getProduct(workspace.id, productId);
  if (!product) {
    return { ok: false as const, error: "No encontramos ese producto en tu workspace." };
  }

  const offer = repo.listOffers(workspace.id).find((item) => item.product_id === product.id) ?? null;
  const bonuses = offer ? repo.listBonuses(workspace.id, offer.id) : [];

  return { ok: true as const, workspace, user, product, offer, bonuses };
}

export async function generateIdealClientAction(
  productId: string,
): Promise<ActionResult<AiResponse<tasks.IdealClientResearch>>> {
  return guarded(async () => {
    const contexto = await contextoDeProducto(productId);
    if (!contexto.ok) return fail(contexto.error);
    const { workspace, user, product, offer } = contexto;

    const result = await tasks.generateIdealClient({
      productName: product.name,
      description: product.description,
      niche: product.category,
      audience: product.audience,
      problem: product.main_problem,
      transformation: product.transformation,
      price: offer?.price ?? product.base_price ?? 9900,
      currency: offer?.currency ?? workspace.currency,
    });

    repo.logAiGeneration(workspace.id, {
      user_id: user.id,
      task: "ideal_client",
      provider: result.provider,
      model: result.model,
      input: { productId },
      output: result.data,
      entity_type: "product",
      entity_id: productId,
    });

    revalidatePath(`/app/productos/${productId}/cliente`);

    return ok({
      data: result.data,
      isTemplate: result.isTemplate,
      provider: result.provider,
      warning: result.warning,
    });
  });
}

export async function generateAnglesAction(
  productId: string,
  tone?: string,
): Promise<ActionResult<AiResponse<tasks.AnglesDraft>>> {
  return guarded(async () => {
    const contexto = await contextoDeProducto(productId);
    if (!contexto.ok) return fail(contexto.error);
    const { workspace, user, product, offer, bonuses } = contexto;

    const result = await tasks.generateAngles({
      productName: product.name,
      description: product.description,
      audience: product.audience,
      problem: product.main_problem,
      transformation: product.transformation,
      price: offer?.price ?? product.base_price ?? 9900,
      currency: offer?.currency ?? workspace.currency,
      tone,
      // La investigación del avatar, si ya la hizo. Cambia por completo el resultado.
      research: readIdealClient(workspace.id, productId),
      benefits: toLines(offer?.benefits ?? product.benefits ?? null),
      bonuses: bonuses.map((bonus) => ({ name: bonus.name, description: bonus.description })),
    });

    repo.logAiGeneration(workspace.id, {
      user_id: user.id,
      task: "sales_angles",
      provider: result.provider,
      model: result.model,
      input: { productId, tone },
      output: result.data,
      entity_type: "product",
      entity_id: productId,
    });

    return ok({
      data: result.data,
      isTemplate: result.isTemplate,
      provider: result.provider,
      warning: result.warning,
    });
  });
}

export async function generateHeadlinesAction(
  productId: string,
  tone?: string,
): Promise<ActionResult<AiResponse<tasks.HeadlinesDraft>>> {
  return guarded(async () => {
    const contexto = await contextoDeProducto(productId);
    if (!contexto.ok) return fail(contexto.error);
    const { workspace, user, product, offer } = contexto;

    const result = await tasks.generateHeadlines({
      productName: product.name,
      description: product.description,
      audience: product.audience,
      problem: product.main_problem,
      transformation: product.transformation,
      tone,
      research: readIdealClient(workspace.id, productId),
    });

    repo.logAiGeneration(workspace.id, {
      user_id: user.id,
      task: "headlines",
      provider: result.provider,
      model: result.model,
      input: { productId, tone },
      output: result.data,
      entity_type: "product",
      entity_id: productId,
    });

    return ok({
      data: result.data,
      isTemplate: result.isTemplate,
      provider: result.provider,
      warning: result.warning,
    });
  });
}

export async function generateObjectionsAction(
  productId: string,
): Promise<ActionResult<AiResponse<tasks.ObjectionsDraft>>> {
  return guarded(async () => {
    const contexto = await contextoDeProducto(productId);
    if (!contexto.ok) return fail(contexto.error);
    const { workspace, user, product, offer } = contexto;

    const result = await tasks.generateObjections({
      productName: product.name,
      description: product.description,
      audience: product.audience,
      price: offer?.price ?? product.base_price ?? 9900,
      currency: offer?.currency ?? workspace.currency,
      guarantee: offer?.guarantee ?? null,
      research: readIdealClient(workspace.id, productId),
    });

    repo.logAiGeneration(workspace.id, {
      user_id: user.id,
      task: "objections",
      provider: result.provider,
      model: result.model,
      input: { productId },
      output: result.data,
      entity_type: "product",
      entity_id: productId,
    });

    return ok({
      data: result.data,
      isTemplate: result.isTemplate,
      provider: result.provider,
      warning: result.warning,
    });
  });
}
