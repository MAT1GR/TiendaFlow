import "server-only";

import crypto from "node:crypto";

import { all, get, nowIso, run, transaction } from "@/lib/db";
import { readTheme, type LandingTheme } from "@/components/landing/theme";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { commissionFor } from "@/lib/plans";
import { parseJson, slugify } from "@/lib/utils";
import type {
  Affiliate,
  AffiliateLink,
  AiGeneration,
  Bonus,
  Campaign,
  Commission,
  Customer,
  Domain,
  Downsell,
  Funnel,
  FunnelStep,
  FunnelStepType,
  Integration,
  IntegrationProvider,
  LandingPage,
  LandingSection,
  Notification,
  Offer,
  Order,
  OrderBump,
  OrderItem,
  Payment,
  Product,
  ProductFile,
  Subscription,
  Upsell,
} from "@/lib/types";

/**
 * Capa de acceso a datos.
 *
 * REGLA DE MULTI-TENANCY: toda función recibe `workspaceId` como primer
 * argumento y lo incluye en el WHERE. Ninguna consulta de este archivo puede
 * devolver filas de otro workspace. En el schema Postgres/Supabase la misma
 * garantía la aplican las policies RLS (ver supabase/schema.sql).
 */

export function id() {
  return crypto.randomUUID();
}

function ts() {
  return nowIso();
}

/* -------------------------------------------------------------------------- */
/* Productos                                                                   */
/* -------------------------------------------------------------------------- */

export function listProducts(workspaceId: string, includeArchived = true) {
  return all<Product>(
    `SELECT * FROM products WHERE workspace_id = ?
     ${includeArchived ? "" : "AND status != 'archived'"}
     ORDER BY created_at DESC`,
    workspaceId,
  );
}

export function getProduct(workspaceId: string, productId: string) {
  return get<Product>(
    `SELECT * FROM products WHERE workspace_id = ? AND id = ?`,
    workspaceId,
    productId,
  );
}

export interface ProductInput {
  name: string;
  subtitle?: string | null;
  description?: string | null;
  short_description?: string | null;
  type?: string;
  status?: string;
  category?: string | null;
  audience?: string | null;
  main_problem?: string | null;
  transformation?: string | null;
  benefits?: string[] | null;
  cover_url?: string | null;
  cover_style?: string | null;
  base_price?: number;
  currency?: string;
  delivery_type?: string;
  delivery_message?: string | null;
  source?: string;
  outline?: unknown;
}

export function createProduct(workspaceId: string, input: ProductInput): Product {
  const productId = id();
  const now = ts();
  run(
    `INSERT INTO products (
       id, workspace_id, name, subtitle, description, short_description, type, status,
       category, audience, main_problem, transformation, benefits, cover_url, cover_style,
       base_price, currency, delivery_type, delivery_message, source, outline, is_demo,
       created_at, updated_at
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)`,
    productId,
    workspaceId,
    input.name,
    input.subtitle ?? null,
    input.description ?? null,
    input.short_description ?? null,
    input.type ?? "ebook",
    input.status ?? "draft",
    input.category ?? null,
    input.audience ?? null,
    input.main_problem ?? null,
    input.transformation ?? null,
    input.benefits ? JSON.stringify(input.benefits) : null,
    input.cover_url ?? null,
    input.cover_style ?? null,
    input.base_price ?? 0,
    input.currency ?? "ARS",
    input.delivery_type ?? "download",
    input.delivery_message ?? null,
    input.source ?? "manual",
    input.outline ? JSON.stringify(input.outline) : null,
    now,
    now,
  );
  return getProduct(workspaceId, productId)!;
}

const PRODUCT_FIELDS = [
  "name",
  "subtitle",
  "description",
  "short_description",
  "type",
  "status",
  "category",
  "audience",
  "main_problem",
  "transformation",
  "benefits",
  "cover_url",
  "cover_style",
  "base_price",
  "currency",
  "delivery_type",
  "delivery_message",
  "outline",
] as const;

export function updateProduct(
  workspaceId: string,
  productId: string,
  patch: Record<string, unknown>,
) {
  const entries = Object.entries(patch).filter(([key]) =>
    (PRODUCT_FIELDS as readonly string[]).includes(key),
  );
  if (!entries.length) return getProduct(workspaceId, productId);
  const setSql = entries.map(([key]) => `${key} = ?`).join(", ");
  run(
    `UPDATE products SET ${setSql}, updated_at = ? WHERE workspace_id = ? AND id = ?`,
    ...entries.map(([, value]) =>
      Array.isArray(value) || (value && typeof value === "object")
        ? JSON.stringify(value)
        : value,
    ),
    ts(),
    workspaceId,
    productId,
  );
  return getProduct(workspaceId, productId);
}

export function deleteProduct(workspaceId: string, productId: string) {
  run(`DELETE FROM products WHERE workspace_id = ? AND id = ?`, workspaceId, productId);
}

export function duplicateProduct(workspaceId: string, productId: string) {
  const source = getProduct(workspaceId, productId);
  if (!source) return null;
  const copy = createProduct(workspaceId, {
    ...source,
    name: `${source.name} (copia)`,
    status: "draft",
    benefits: null,
  });
  if (source.benefits) {
    run(`UPDATE products SET benefits = ? WHERE id = ?`, source.benefits, copy.id);
  }
  return copy;
}

export function listProductFiles(workspaceId: string, productId: string) {
  return all<ProductFile>(
    `SELECT * FROM product_files WHERE workspace_id = ? AND product_id = ? ORDER BY position, created_at`,
    workspaceId,
    productId,
  );
}

export function addProductFile(
  workspaceId: string,
  productId: string,
  file: { file_name: string; file_type?: string; file_size?: number; storage_key?: string },
) {
  const fileId = id();
  run(
    `INSERT INTO product_files (id, workspace_id, product_id, file_name, file_type, file_size, storage_key, position, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    fileId,
    workspaceId,
    productId,
    file.file_name,
    file.file_type ?? null,
    file.file_size ?? 0,
    file.storage_key ?? null,
    0,
    ts(),
  );
  return fileId;
}

export function deleteProductFile(workspaceId: string, fileId: string) {
  run(`DELETE FROM product_files WHERE workspace_id = ? AND id = ?`, workspaceId, fileId);
}

/* -------------------------------------------------------------------------- */
/* Ofertas                                                                     */
/* -------------------------------------------------------------------------- */

export function listOffers(workspaceId: string) {
  return all<Offer>(
    `SELECT * FROM offers WHERE workspace_id = ? ORDER BY created_at DESC`,
    workspaceId,
  );
}

export function getOffer(workspaceId: string, offerId: string) {
  return get<Offer>(
    `SELECT * FROM offers WHERE workspace_id = ? AND id = ?`,
    workspaceId,
    offerId,
  );
}

export function getOfferBySlug(workspaceId: string, slug: string) {
  return get<Offer>(
    `SELECT * FROM offers WHERE workspace_id = ? AND slug = ?`,
    workspaceId,
    slug,
  );
}

export function uniqueSlug(
  workspaceId: string,
  table: "offers" | "funnels" | "landing_pages",
  base: string,
) {
  const root = slugify(base) || "sin-titulo";
  let candidate = root;
  let counter = 2;
  while (
    get(`SELECT id FROM ${table} WHERE workspace_id = ? AND slug = ?`, workspaceId, candidate)
  ) {
    candidate = `${root}-${counter++}`;
  }
  return candidate;
}

export interface OfferInput {
  name: string;
  product_id?: string | null;
  headline?: string | null;
  promise?: string | null;
  benefits?: string[] | null;
  cta_text?: string;
  guarantee?: string | null;
  price?: number;
  compare_at_price?: number | null;
  currency?: string;
  status?: string;
}

export function createOffer(workspaceId: string, input: OfferInput): Offer {
  const offerId = id();
  const now = ts();
  run(
    `INSERT INTO offers (
       id, workspace_id, product_id, name, slug, headline, promise, benefits, cta_text,
       guarantee, price, compare_at_price, currency, status, is_demo, created_at, updated_at
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)`,
    offerId,
    workspaceId,
    input.product_id ?? null,
    input.name,
    uniqueSlug(workspaceId, "offers", input.name),
    input.headline ?? null,
    input.promise ?? null,
    input.benefits ? JSON.stringify(input.benefits) : null,
    input.cta_text ?? "Quiero mi acceso",
    input.guarantee ?? null,
    input.price ?? 0,
    input.compare_at_price ?? null,
    input.currency ?? "ARS",
    input.status ?? "draft",
    now,
    now,
  );
  return getOffer(workspaceId, offerId)!;
}

const OFFER_FIELDS = [
  "product_id",
  "name",
  "headline",
  "promise",
  "benefits",
  "cta_text",
  "guarantee",
  "price",
  "compare_at_price",
  "currency",
  "status",
] as const;

export function updateOffer(
  workspaceId: string,
  offerId: string,
  patch: Record<string, unknown>,
) {
  const entries = Object.entries(patch).filter(([key]) =>
    (OFFER_FIELDS as readonly string[]).includes(key),
  );
  if (!entries.length) return getOffer(workspaceId, offerId);
  const setSql = entries.map(([key]) => `${key} = ?`).join(", ");
  run(
    `UPDATE offers SET ${setSql}, updated_at = ? WHERE workspace_id = ? AND id = ?`,
    ...entries.map(([, value]) =>
      Array.isArray(value) || (value && typeof value === "object")
        ? JSON.stringify(value)
        : value,
    ),
    ts(),
    workspaceId,
    offerId,
  );
  return getOffer(workspaceId, offerId);
}

export function deleteOffer(workspaceId: string, offerId: string) {
  run(`DELETE FROM offers WHERE workspace_id = ? AND id = ?`, workspaceId, offerId);
}

/* -------------------------------------------------------------------------- */
/* Bonos, order bumps, upsells, downsells                                      */
/* -------------------------------------------------------------------------- */

export function listBonuses(workspaceId: string, offerId?: string) {
  return offerId
    ? all<Bonus>(
        `SELECT * FROM bonuses WHERE workspace_id = ? AND offer_id = ? ORDER BY position, created_at`,
        workspaceId,
        offerId,
      )
    : all<Bonus>(
        `SELECT * FROM bonuses WHERE workspace_id = ? ORDER BY created_at DESC`,
        workspaceId,
      );
}

export function createBonus(
  workspaceId: string,
  input: {
    offer_id?: string | null;
    product_id?: string | null;
    name: string;
    description?: string | null;
    value?: number;
    image_url?: string | null;
    file_name?: string | null;
  },
) {
  const bonusId = id();
  const now = ts();
  const position =
    (get<{ n: number }>(
      `SELECT COALESCE(MAX(position), 0) + 1 AS n FROM bonuses WHERE workspace_id = ? AND offer_id IS ?`,
      workspaceId,
      input.offer_id ?? null,
    )?.n ?? 1) | 0;
  run(
    `INSERT INTO bonuses (id, workspace_id, offer_id, product_id, name, description, value,
       image_url, file_name, status, position, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,'active',?,?,?)`,
    bonusId,
    workspaceId,
    input.offer_id ?? null,
    input.product_id ?? null,
    input.name,
    input.description ?? null,
    input.value ?? 0,
    input.image_url ?? null,
    input.file_name ?? null,
    position,
    now,
    now,
  );
  return bonusId;
}

export function updateBonus(workspaceId: string, bonusId: string, patch: Record<string, unknown>) {
  const allowed = ["name", "description", "value", "image_url", "file_name", "status", "position"];
  const entries = Object.entries(patch).filter(([k]) => allowed.includes(k));
  if (!entries.length) return;
  run(
    `UPDATE bonuses SET ${entries.map(([k]) => `${k} = ?`).join(", ")}, updated_at = ?
     WHERE workspace_id = ? AND id = ?`,
    ...entries.map(([, v]) => v),
    ts(),
    workspaceId,
    bonusId,
  );
}

export function deleteBonus(workspaceId: string, bonusId: string) {
  run(`DELETE FROM bonuses WHERE workspace_id = ? AND id = ?`, workspaceId, bonusId);
}

export function listOrderBumps(workspaceId: string, offerId?: string) {
  return offerId
    ? all<OrderBump>(
        `SELECT * FROM order_bumps WHERE workspace_id = ? AND offer_id = ? ORDER BY created_at`,
        workspaceId,
        offerId,
      )
    : all<OrderBump>(
        `SELECT * FROM order_bumps WHERE workspace_id = ? ORDER BY created_at DESC`,
        workspaceId,
      );
}

export function createOrderBump(
  workspaceId: string,
  input: {
    offer_id?: string | null;
    product_id?: string | null;
    name: string;
    description?: string | null;
    checkbox_label?: string;
    price?: number;
    image_url?: string | null;
  },
) {
  const bumpId = id();
  const now = ts();
  run(
    `INSERT INTO order_bumps (id, workspace_id, offer_id, product_id, name, description,
       checkbox_label, price, image_url, active, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,1,?,?)`,
    bumpId,
    workspaceId,
    input.offer_id ?? null,
    input.product_id ?? null,
    input.name,
    input.description ?? null,
    input.checkbox_label ?? "Sí, quiero agregar este complemento",
    input.price ?? 0,
    input.image_url ?? null,
    now,
    now,
  );
  return bumpId;
}

export function updateOrderBump(
  workspaceId: string,
  bumpId: string,
  patch: Record<string, unknown>,
) {
  const allowed = ["name", "description", "checkbox_label", "price", "image_url", "active", "product_id"];
  const entries = Object.entries(patch).filter(([k]) => allowed.includes(k));
  if (!entries.length) return;
  run(
    `UPDATE order_bumps SET ${entries.map(([k]) => `${k} = ?`).join(", ")}, updated_at = ?
     WHERE workspace_id = ? AND id = ?`,
    ...entries.map(([, v]) => v),
    ts(),
    workspaceId,
    bumpId,
  );
}

export function deleteOrderBump(workspaceId: string, bumpId: string) {
  run(`DELETE FROM order_bumps WHERE workspace_id = ? AND id = ?`, workspaceId, bumpId);
}

export function listUpsells(workspaceId: string, offerId?: string) {
  return offerId
    ? all<Upsell>(
        `SELECT * FROM upsells WHERE workspace_id = ? AND offer_id = ? ORDER BY position`,
        workspaceId,
        offerId,
      )
    : all<Upsell>(`SELECT * FROM upsells WHERE workspace_id = ? ORDER BY created_at DESC`, workspaceId);
}

export function createUpsell(
  workspaceId: string,
  input: {
    offer_id?: string | null;
    product_id?: string | null;
    name: string;
    headline?: string | null;
    description?: string | null;
    price?: number;
    compare_at_price?: number | null;
    accept_label?: string;
    decline_label?: string;
  },
) {
  const upsellId = id();
  const now = ts();
  const position =
    get<{ n: number }>(
      `SELECT COALESCE(MAX(position), 0) + 1 AS n FROM upsells WHERE workspace_id = ? AND offer_id IS ?`,
      workspaceId,
      input.offer_id ?? null,
    )?.n ?? 1;
  run(
    `INSERT INTO upsells (id, workspace_id, offer_id, product_id, name, headline, description,
       price, compare_at_price, accept_label, decline_label, position, active, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`,
    upsellId,
    workspaceId,
    input.offer_id ?? null,
    input.product_id ?? null,
    input.name,
    input.headline ?? null,
    input.description ?? null,
    input.price ?? 0,
    input.compare_at_price ?? null,
    input.accept_label ?? "Sí, lo quiero agregar",
    input.decline_label ?? "No gracias, seguir sin esto",
    position,
    now,
    now,
  );
  return upsellId;
}

export function updateUpsell(workspaceId: string, upsellId: string, patch: Record<string, unknown>) {
  const allowed = [
    "name",
    "headline",
    "description",
    "price",
    "compare_at_price",
    "accept_label",
    "decline_label",
    "position",
    "active",
    "product_id",
  ];
  const entries = Object.entries(patch).filter(([k]) => allowed.includes(k));
  if (!entries.length) return;
  run(
    `UPDATE upsells SET ${entries.map(([k]) => `${k} = ?`).join(", ")}, updated_at = ?
     WHERE workspace_id = ? AND id = ?`,
    ...entries.map(([, v]) => v),
    ts(),
    workspaceId,
    upsellId,
  );
}

export function deleteUpsell(workspaceId: string, upsellId: string) {
  run(`DELETE FROM upsells WHERE workspace_id = ? AND id = ?`, workspaceId, upsellId);
}

export function listDownsells(workspaceId: string, upsellId?: string) {
  return upsellId
    ? all<Downsell>(
        `SELECT * FROM downsells WHERE workspace_id = ? AND upsell_id = ? ORDER BY created_at`,
        workspaceId,
        upsellId,
      )
    : all<Downsell>(`SELECT * FROM downsells WHERE workspace_id = ? ORDER BY created_at DESC`, workspaceId);
}

export function createDownsell(
  workspaceId: string,
  input: {
    upsell_id?: string | null;
    product_id?: string | null;
    name: string;
    headline?: string | null;
    description?: string | null;
    price?: number;
    compare_at_price?: number | null;
  },
) {
  const downsellId = id();
  const now = ts();
  run(
    `INSERT INTO downsells (id, workspace_id, upsell_id, product_id, name, headline, description,
       price, compare_at_price, accept_label, decline_label, active, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,'Dale, lo quiero así','No, gracias',1,?,?)`,
    downsellId,
    workspaceId,
    input.upsell_id ?? null,
    input.product_id ?? null,
    input.name,
    input.headline ?? null,
    input.description ?? null,
    input.price ?? 0,
    input.compare_at_price ?? null,
    now,
    now,
  );
  return downsellId;
}

export function updateDownsell(
  workspaceId: string,
  downsellId: string,
  patch: Record<string, unknown>,
) {
  const allowed = ["name", "headline", "description", "price", "compare_at_price", "active", "product_id"];
  const entries = Object.entries(patch).filter(([k]) => allowed.includes(k));
  if (!entries.length) return;
  run(
    `UPDATE downsells SET ${entries.map(([k]) => `${k} = ?`).join(", ")}, updated_at = ?
     WHERE workspace_id = ? AND id = ?`,
    ...entries.map(([, v]) => v),
    ts(),
    workspaceId,
    downsellId,
  );
}

export function deleteDownsell(workspaceId: string, downsellId: string) {
  run(`DELETE FROM downsells WHERE workspace_id = ? AND id = ?`, workspaceId, downsellId);
}

/* -------------------------------------------------------------------------- */
/* Funnels                                                                     */
/* -------------------------------------------------------------------------- */

export function listFunnels(workspaceId: string) {
  return all<Funnel>(
    `SELECT * FROM funnels WHERE workspace_id = ? ORDER BY created_at DESC`,
    workspaceId,
  );
}

export function getFunnel(workspaceId: string, funnelId: string) {
  return get<Funnel>(`SELECT * FROM funnels WHERE workspace_id = ? AND id = ?`, workspaceId, funnelId);
}

/**
 * Slug público del funnel. Los slugs son únicos por workspace, así que el
 * público incorpora un sufijo derivado del id para ser único globalmente.
 */
export function publicSlug(funnel: { slug: string; id: string }) {
  return `${funnel.slug}--${funnel.id.slice(0, 6)}`;
}

export function getFunnelByPublicSlug(slug: string) {
  const separator = slug.lastIndexOf("--");
  if (separator === -1) return null;
  const base = slug.slice(0, separator);
  const suffix = slug.slice(separator + 2);
  return get<Funnel>(
    `SELECT * FROM funnels WHERE slug = ? AND substr(id, 1, 6) = ? LIMIT 1`,
    base,
    suffix,
  );
}

export function listFunnelSteps(workspaceId: string, funnelId: string) {
  return all<FunnelStep>(
    `SELECT * FROM funnel_steps WHERE workspace_id = ? AND funnel_id = ? ORDER BY position`,
    workspaceId,
    funnelId,
  );
}

export function createFunnel(
  workspaceId: string,
  input: {
    name: string;
    product_id?: string | null;
    offer_id?: string | null;
    traffic_source?: string;
    withDefaultSteps?: boolean;
  },
): Funnel {
  const funnelId = id();
  const now = ts();
  const slug = uniqueSlug(workspaceId, "funnels", input.name);
  return transaction(() => {
    run(
      `INSERT INTO funnels (id, workspace_id, product_id, offer_id, name, slug, status,
         traffic_source, published_url, is_demo, created_at, updated_at)
       VALUES (?,?,?,?,?,?,'draft',?,NULL,0,?,?)`,
      funnelId,
      workspaceId,
      input.product_id ?? null,
      input.offer_id ?? null,
      input.name,
      slug,
      input.traffic_source ?? "meta_ads",
      now,
      now,
    );

    if (input.withDefaultSteps !== false) {
      const defaults: Array<{ type: FunnelStepType; name: string }> = [
        { type: "landing", name: "Landing page" },
        { type: "checkout", name: "Checkout" },
        { type: "upsell", name: "Upsell 1" },
        { type: "thankyou", name: "Gracias" },
      ];
      defaults.forEach((step, index) => {
        createFunnelStep(workspaceId, funnelId, step.type, step.name, index);
      });
    }
    return getFunnel(workspaceId, funnelId)!;
  });
}

export function createFunnelStep(
  workspaceId: string,
  funnelId: string,
  type: FunnelStepType,
  name: string,
  position?: number,
) {
  const stepId = id();
  const now = ts();
  const pos =
    position ??
    (get<{ n: number }>(
      `SELECT COALESCE(MAX(position), -1) + 1 AS n FROM funnel_steps WHERE workspace_id = ? AND funnel_id = ?`,
      workspaceId,
      funnelId,
    )?.n ??
      0);
  run(
    `INSERT INTO funnel_steps (id, workspace_id, funnel_id, type, name, position, config, published, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,0,?,?)`,
    stepId,
    workspaceId,
    funnelId,
    type,
    name,
    pos,
    JSON.stringify({}),
    now,
    now,
  );
  return stepId;
}

export function updateFunnel(workspaceId: string, funnelId: string, patch: Record<string, unknown>) {
  const allowed = ["name", "status", "product_id", "offer_id", "traffic_source", "published_url"];
  const entries = Object.entries(patch).filter(([k]) => allowed.includes(k));
  if (!entries.length) return getFunnel(workspaceId, funnelId);
  run(
    `UPDATE funnels SET ${entries.map(([k]) => `${k} = ?`).join(", ")}, updated_at = ?
     WHERE workspace_id = ? AND id = ?`,
    ...entries.map(([, v]) => v),
    ts(),
    workspaceId,
    funnelId,
  );
  return getFunnel(workspaceId, funnelId);
}

export function deleteFunnel(workspaceId: string, funnelId: string) {
  run(`DELETE FROM funnels WHERE workspace_id = ? AND id = ?`, workspaceId, funnelId);
}

export function updateFunnelStep(
  workspaceId: string,
  stepId: string,
  patch: Record<string, unknown>,
) {
  const allowed = ["name", "type", "position", "config", "published"];
  const entries = Object.entries(patch).filter(([k]) => allowed.includes(k));
  if (!entries.length) return;
  run(
    `UPDATE funnel_steps SET ${entries.map(([k]) => `${k} = ?`).join(", ")}, updated_at = ?
     WHERE workspace_id = ? AND id = ?`,
    ...entries.map(([, v]) =>
      v && typeof v === "object" ? JSON.stringify(v) : v,
    ),
    ts(),
    workspaceId,
    stepId,
  );
}

export function deleteFunnelStep(workspaceId: string, stepId: string) {
  run(`DELETE FROM funnel_steps WHERE workspace_id = ? AND id = ?`, workspaceId, stepId);
}

export function reorderFunnelSteps(workspaceId: string, funnelId: string, orderedIds: string[]) {
  transaction(() => {
    orderedIds.forEach((stepId, index) => {
      run(
        `UPDATE funnel_steps SET position = ?, updated_at = ?
         WHERE workspace_id = ? AND funnel_id = ? AND id = ?`,
        index,
        ts(),
        workspaceId,
        funnelId,
        stepId,
      );
    });
  });
}

/* -------------------------------------------------------------------------- */
/* Landing pages                                                               */
/* -------------------------------------------------------------------------- */

export function listLandingPages(workspaceId: string) {
  return all<LandingPage>(
    `SELECT * FROM landing_pages WHERE workspace_id = ? ORDER BY created_at DESC`,
    workspaceId,
  );
}

export function getLandingPage(workspaceId: string, pageId: string) {
  return get<LandingPage>(
    `SELECT * FROM landing_pages WHERE workspace_id = ? AND id = ?`,
    workspaceId,
    pageId,
  );
}

export function getLandingPageByStep(workspaceId: string, stepId: string) {
  return get<LandingPage>(
    `SELECT * FROM landing_pages WHERE workspace_id = ? AND funnel_step_id = ?`,
    workspaceId,
    stepId,
  );
}

export function listLandingSections(workspaceId: string, pageId: string) {
  return all<LandingSection>(
    `SELECT * FROM landing_sections WHERE workspace_id = ? AND landing_page_id = ? ORDER BY position`,
    workspaceId,
    pageId,
  );
}

export function createLandingPage(
  workspaceId: string,
  input: { name: string; offer_id?: string | null; funnel_step_id?: string | null },
) {
  const pageId = id();
  const now = ts();
  run(
    `INSERT INTO landing_pages (id, workspace_id, funnel_step_id, offer_id, name, slug, status,
       theme, seo_title, seo_description, created_at, updated_at)
     VALUES (?,?,?,?,?,?,'draft',?,NULL,NULL,?,?)`,
    pageId,
    workspaceId,
    input.funnel_step_id ?? null,
    input.offer_id ?? null,
    input.name,
    uniqueSlug(workspaceId, "landing_pages", input.name),
    // Los colores de la tienda, los que eligió el vendedor al crear la cuenta.
    // Se guardan enteros —y no solo el acento— para que la página nazca con el
    // estilo completo y solo tenga que retocar lo que no le guste.
    JSON.stringify(workspaceTheme(workspaceId)),
    now,
    now,
  );
  return pageId;
}

export function replaceLandingSections(
  workspaceId: string,
  pageId: string,
  sections: Array<{ type: string; content: unknown }>,
) {
  transaction(() => {
    run(
      `DELETE FROM landing_sections WHERE workspace_id = ? AND landing_page_id = ?`,
      workspaceId,
      pageId,
    );
    sections.forEach((section, index) => {
      run(
        `INSERT INTO landing_sections (id, workspace_id, landing_page_id, type, position, content, visible, created_at, updated_at)
         VALUES (?,?,?,?,?,?,1,?,?)`,
        id(),
        workspaceId,
        pageId,
        section.type,
        index,
        JSON.stringify(section.content ?? {}),
        ts(),
        ts(),
      );
    });
    run(`UPDATE landing_pages SET updated_at = ? WHERE id = ?`, ts(), pageId);
  });
}

export function updateLandingPage(
  workspaceId: string,
  pageId: string,
  patch: Record<string, unknown>,
) {
  const allowed = ["name", "status", "theme", "seo_title", "seo_description", "offer_id"];
  const entries = Object.entries(patch).filter(([k]) => allowed.includes(k));
  if (!entries.length) return;
  run(
    `UPDATE landing_pages SET ${entries.map(([k]) => `${k} = ?`).join(", ")}, updated_at = ?
     WHERE workspace_id = ? AND id = ?`,
    ...entries.map(([, v]) => (v && typeof v === "object" ? JSON.stringify(v) : v)),
    ts(),
    workspaceId,
    pageId,
  );
}

/* -------------------------------------------------------------------------- */
/* Clientes, órdenes, pagos                                                    */
/* -------------------------------------------------------------------------- */

export function listCustomers(workspaceId: string) {
  return all<Customer>(
    `SELECT * FROM customers WHERE workspace_id = ? ORDER BY last_purchase_at DESC, created_at DESC`,
    workspaceId,
  );
}

export function getCustomer(workspaceId: string, customerId: string) {
  return get<Customer>(
    `SELECT * FROM customers WHERE workspace_id = ? AND id = ?`,
    workspaceId,
    customerId,
  );
}

export function upsertCustomer(
  workspaceId: string,
  input: { email: string; full_name: string; phone?: string | null; country?: string | null },
) {
  const existing = get<Customer>(
    `SELECT * FROM customers WHERE workspace_id = ? AND email = ?`,
    workspaceId,
    input.email.toLowerCase(),
  );
  if (existing) return existing;
  const customerId = id();
  const now = ts();
  run(
    `INSERT INTO customers (id, workspace_id, email, full_name, phone, country, status,
       total_spent, orders_count, last_purchase_at, is_demo, created_at, updated_at)
     VALUES (?,?,?,?,?,?,'new',0,0,NULL,0,?,?)`,
    customerId,
    workspaceId,
    input.email.toLowerCase(),
    input.full_name,
    input.phone ?? null,
    input.country ?? null,
    now,
    now,
  );
  return getCustomer(workspaceId, customerId)!;
}

export function listOrders(workspaceId: string, limit = 200) {
  return all<Order>(
    `SELECT * FROM orders WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?`,
    workspaceId,
    limit,
  );
}

export function getOrder(workspaceId: string, orderId: string) {
  return get<Order>(`SELECT * FROM orders WHERE workspace_id = ? AND id = ?`, workspaceId, orderId);
}


export function listOrderItems(workspaceId: string, orderId: string) {
  return all<OrderItem>(
    `SELECT * FROM order_items WHERE workspace_id = ? AND order_id = ? ORDER BY created_at`,
    workspaceId,
    orderId,
  );
}

export function listOrdersByCustomer(workspaceId: string, customerId: string) {
  return all<Order>(
    `SELECT * FROM orders WHERE workspace_id = ? AND customer_id = ? ORDER BY created_at DESC`,
    workspaceId,
    customerId,
  );
}

export function listPayments(workspaceId: string, orderId: string) {
  return all<Payment>(
    `SELECT * FROM payments WHERE workspace_id = ? AND order_id = ? ORDER BY created_at DESC`,
    workspaceId,
    orderId,
  );
}

export interface CreateOrderInput {
  customer_id: string | null;
  offer_id: string | null;
  funnel_id: string | null;
  status?: string;
  subtotal: number;
  bump_total?: number;
  upsell_total?: number;
  currency: string;
  items: Array<{
    product_id?: string | null;
    kind: OrderItem["kind"];
    name: string;
    unit_price: number;
    quantity?: number;
  }>;
  utm?: Record<string, string | null>;
}

export function createOrder(workspaceId: string, input: CreateOrderInput): Order {
  const orderId = id();
  const now = ts();
  const reference = `TF-${Date.now().toString(36).toUpperCase()}-${Math.floor(
    Math.random() * 900 + 100,
  )}`;
  const total = input.subtotal + (input.bump_total ?? 0) + (input.upsell_total ?? 0);

  return transaction(() => {
    run(
      `INSERT INTO orders (id, workspace_id, customer_id, offer_id, funnel_id, affiliate_id,
         reference, status, subtotal, bump_total, upsell_total, total, currency, access_token,
         utm_source, utm_medium, utm_campaign, utm_content, utm_term, is_demo, created_at, updated_at)
       VALUES (?,?,?,?,?,NULL,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)`,
      orderId,
      workspaceId,
      input.customer_id,
      input.offer_id,
      input.funnel_id,
      reference,
      input.status ?? "pending",
      input.subtotal,
      input.bump_total ?? 0,
      input.upsell_total ?? 0,
      total,
      input.currency,
      crypto.randomBytes(18).toString("base64url"),
      input.utm?.utm_source ?? null,
      input.utm?.utm_medium ?? null,
      input.utm?.utm_campaign ?? null,
      input.utm?.utm_content ?? null,
      input.utm?.utm_term ?? null,
      now,
      now,
    );

    for (const item of input.items) {
      run(
        `INSERT INTO order_items (id, workspace_id, order_id, product_id, kind, name, quantity, unit_price, downloads_count, created_at)
         VALUES (?,?,?,?,?,?,?,?,0,?)`,
        id(),
        workspaceId,
        orderId,
        item.product_id ?? null,
        item.kind,
        item.name,
        item.quantity ?? 1,
        item.unit_price,
        now,
      );
    }

    return getOrder(workspaceId, orderId)!;
  });
}

export function addOrderItem(
  workspaceId: string,
  orderId: string,
  item: { product_id?: string | null; kind: OrderItem["kind"]; name: string; unit_price: number },
) {
  transaction(() => {
    run(
      `INSERT INTO order_items (id, workspace_id, order_id, product_id, kind, name, quantity, unit_price, downloads_count, created_at)
       VALUES (?,?,?,?,?,?,1,?,0,?)`,
      id(),
      workspaceId,
      orderId,
      item.product_id ?? null,
      item.kind,
      item.name,
      item.unit_price,
      ts(),
    );
    run(
      `UPDATE orders SET upsell_total = upsell_total + ?, total = total + ?, updated_at = ?
       WHERE workspace_id = ? AND id = ?`,
      item.unit_price,
      item.unit_price,
      ts(),
      workspaceId,
      orderId,
    );
  });
}

export interface SettleOptions {
  provider?: string;
  /** Id del pago en el proveedor. Es la llave de idempotencia del webhook. */
  providerPaymentId?: string | null;
  /** Payload crudo del proveedor, para poder auditar después. */
  rawPayload?: unknown;
  /**
   * `false` cuando la comisión no se cobró de verdad en esta venta.
   *
   * Anotar una comisión que nunca entró convierte el reporte de facturación en
   * ficción: los números dirían que TiendaFlow ganó una plata que nadie le
   * depositó. Solo se cobra cuando el vendedor conectó por OAuth y Mercado Pago
   * retuvo la parte con `marketplace_fee`.
   */
  collectsCommission?: boolean;
}

export interface SettleResult {
  order: Order | null;
  /** `true` si la orden ya estaba paga: el webhook llegó repetido. */
  alreadyPaid: boolean;
}

/**
 * Acredita una orden.
 *
 * Es idempotente por partida doble: no hace nada si la orden ya está paga, y
 * tampoco si ya existe un pago registrado con el mismo `provider_payment_id`.
 * Los proveedores reintentan sus webhooks, así que esto se va a llamar más de
 * una vez con los mismos datos y tiene que ser seguro.
 *
 * La comisión de TiendaFlow se congela acá con la tasa del plan vigente al
 * momento del cobro: si el workspace cambia de plan mañana, las ventas viejas
 * conservan la comisión con la que se liquidaron.
 */
export function markOrderPaid(
  workspaceId: string,
  orderId: string,
  options: SettleOptions = {},
): SettleResult {
  const order = getOrder(workspaceId, orderId);
  if (!order) return { order: null, alreadyPaid: false };
  if (order.status === "paid") return { order, alreadyPaid: true };

  const provider = options.provider ?? "manual";

  if (options.providerPaymentId) {
    const duplicate = get<{ id: string }>(
      `SELECT id FROM payments
       WHERE workspace_id = ? AND provider = ? AND provider_payment_id = ?`,
      workspaceId,
      provider,
      options.providerPaymentId,
    );
    if (duplicate) return { order, alreadyPaid: true };
  }

  const plan = getSubscription(workspaceId)?.plan ?? "free";
  const commission =
    options.collectsCommission === false
      ? { rate: 0, amount: 0 }
      : commissionFor(plan, order.total);
  const now = ts();

  transaction(() => {
    run(
      `UPDATE orders SET status = 'paid', commission_rate = ?, commission_amount = ?,
         paid_at = ?, updated_at = ?
       WHERE workspace_id = ? AND id = ?`,
      commission.rate,
      commission.amount,
      now,
      now,
      workspaceId,
      orderId,
    );
    run(
      `INSERT INTO payments (id, workspace_id, order_id, provider, provider_payment_id, status,
         amount, currency, error_message, raw_payload, created_at, updated_at)
       VALUES (?,?,?,?,?,'approved',?,?,NULL,?,?,?)`,
      id(),
      workspaceId,
      orderId,
      provider,
      options.providerPaymentId ?? null,
      order.total,
      order.currency,
      options.rawPayload ? JSON.stringify(options.rawPayload).slice(0, 8000) : null,
      now,
      now,
    );
    if (order.customer_id) {
      run(
        `UPDATE customers SET
           total_spent = total_spent + ?,
           orders_count = orders_count + 1,
           last_purchase_at = ?,
           status = CASE
             WHEN total_spent + ? >= 50000 THEN 'high_value'
             WHEN orders_count + 1 > 1 THEN 'returning'
             ELSE 'active'
           END,
           updated_at = ?
         WHERE workspace_id = ? AND id = ?`,
        order.total,
        now,
        order.total,
        now,
        workspaceId,
        order.customer_id,
      );
    }
  });

  return { order: getOrder(workspaceId, orderId), alreadyPaid: false };
}

/** Registra un intento de cobro fallido, para poder mostrarlo en la venta. */
export function recordFailedPayment(
  workspaceId: string,
  orderId: string,
  provider: string,
  reason: string,
  providerPaymentId?: string | null,
) {
  const now = ts();
  run(
    `INSERT INTO payments (id, workspace_id, order_id, provider, provider_payment_id, status,
       amount, currency, error_message, raw_payload, created_at, updated_at)
     VALUES (?,?,?,?,?,'failed',0,'',?,NULL,?,?)`,
    id(),
    workspaceId,
    orderId,
    provider,
    providerPaymentId ?? null,
    reason.slice(0, 500),
    now,
    now,
  );
}

/** Busca una orden por su referencia pública, la que viaja al proveedor de pago. */
export function getOrderByReference(workspaceId: string, reference: string) {
  return get<Order>(
    `SELECT * FROM orders WHERE workspace_id = ? AND reference = ?`,
    workspaceId,
    reference,
  );
}

export function updateOrderStatus(workspaceId: string, orderId: string, status: string) {
  run(
    `UPDATE orders SET status = ?, updated_at = ? WHERE workspace_id = ? AND id = ?`,
    status,
    ts(),
    workspaceId,
    orderId,
  );
}

/* -------------------------------------------------------------------------- */
/* Eventos y atribución                                                        */
/* -------------------------------------------------------------------------- */

export function trackEvent(
  workspaceId: string,
  event: {
    name: string;
    funnel_id?: string | null;
    funnel_step_id?: string | null;
    order_id?: string | null;
    session_key?: string | null;
    value?: number;
    metadata?: unknown;
  },
) {
  run(
    `INSERT INTO analytics_events (id, workspace_id, funnel_id, funnel_step_id, order_id,
       session_key, name, value, metadata, is_demo, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,0,?)`,
    id(),
    workspaceId,
    event.funnel_id ?? null,
    event.funnel_step_id ?? null,
    event.order_id ?? null,
    event.session_key ?? null,
    event.name,
    event.value ?? 0,
    event.metadata ? JSON.stringify(event.metadata) : null,
    ts(),
  );
}

export function recordAttribution(
  workspaceId: string,
  input: {
    funnel_id?: string | null;
    order_id?: string | null;
    session_key: string;
    utm?: Record<string, string | null>;
    referrer?: string | null;
    landing_path?: string | null;
  },
) {
  run(
    `INSERT INTO attribution_events (id, workspace_id, funnel_id, order_id, session_key,
       utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer, landing_path, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id(),
    workspaceId,
    input.funnel_id ?? null,
    input.order_id ?? null,
    input.session_key,
    input.utm?.utm_source ?? null,
    input.utm?.utm_medium ?? null,
    input.utm?.utm_campaign ?? null,
    input.utm?.utm_content ?? null,
    input.utm?.utm_term ?? null,
    input.referrer ?? null,
    input.landing_path ?? null,
    ts(),
  );
}

/* -------------------------------------------------------------------------- */
/* Campañas                                                                    */
/* -------------------------------------------------------------------------- */

export function listCampaigns(workspaceId: string) {
  return all<Campaign>(
    `SELECT * FROM campaigns WHERE workspace_id = ? ORDER BY created_at DESC`,
    workspaceId,
  );
}

export function createCampaign(
  workspaceId: string,
  input: {
    name: string;
    funnel_id?: string | null;
    platform?: string;
    objective?: string | null;
    utm_campaign?: string | null;
    daily_budget?: number;
  },
) {
  const campaignId = id();
  const now = ts();
  run(
    `INSERT INTO campaigns (id, workspace_id, funnel_id, name, platform, objective, status,
       utm_source, utm_medium, utm_campaign, daily_budget, spend, impressions, clicks, is_demo, created_at, updated_at)
     VALUES (?,?,?,?,?,?,'draft',?,?,?,?,0,0,0,0,?,?)`,
    campaignId,
    workspaceId,
    input.funnel_id ?? null,
    input.name,
    input.platform ?? "meta",
    input.objective ?? null,
    input.platform === "meta" || !input.platform ? "facebook" : input.platform,
    "cpc",
    input.utm_campaign ?? slugify(input.name),
    input.daily_budget ?? 0,
    now,
    now,
  );
  return campaignId;
}

/* -------------------------------------------------------------------------- */
/* Integraciones                                                               */
/* -------------------------------------------------------------------------- */

export function listIntegrations(workspaceId: string) {
  return all<Integration>(`SELECT * FROM integrations WHERE workspace_id = ?`, workspaceId);
}

export function getIntegration(workspaceId: string, provider: IntegrationProvider) {
  return get<Integration>(
    `SELECT * FROM integrations WHERE workspace_id = ? AND provider = ?`,
    workspaceId,
    provider,
  );
}

/**
 * Credenciales privadas de una integración, ya descifradas.
 *
 * Es el ÚNICO camino para leer `secret_config`. Nadie más debería parsear esa
 * columna: viene cifrada, y el valor que devuelve esta función no puede
 * serializarse jamás hacia un Client Component.
 */
export function readIntegrationSecret<T extends Record<string, unknown>>(
  workspaceId: string,
  provider: IntegrationProvider,
): Partial<T> {
  const integration = getIntegration(workspaceId, provider);
  if (!integration) return {};
  return parseJson<Partial<T>>(decryptSecret(integration.secret_config), {});
}

/** `true` si la integración tiene alguna credencial guardada. */
export function hasIntegrationSecret(
  workspaceId: string,
  provider: IntegrationProvider,
): boolean {
  return Object.keys(readIntegrationSecret(workspaceId, provider)).length > 0;
}

export function saveIntegration(
  workspaceId: string,
  provider: IntegrationProvider,
  input: {
    status: Integration["status"];
    public_config?: unknown;
    secret_config?: unknown;
    last_error?: string | null;
  },
) {
  const existing = getIntegration(workspaceId, provider);
  const now = ts();
  if (existing) {
    run(
      `UPDATE integrations SET status = ?, public_config = ?, secret_config = COALESCE(?, secret_config),
         last_error = ?, last_checked_at = ?, updated_at = ?
       WHERE workspace_id = ? AND provider = ?`,
      input.status,
      input.public_config ? JSON.stringify(input.public_config) : existing.public_config,
      input.secret_config ? encryptSecret(JSON.stringify(input.secret_config)) : null,
      input.last_error ?? null,
      now,
      now,
      workspaceId,
      provider,
    );
  } else {
    run(
      `INSERT INTO integrations (id, workspace_id, provider, status, public_config, secret_config,
         last_checked_at, last_error, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      id(),
      workspaceId,
      provider,
      input.status,
      input.public_config ? JSON.stringify(input.public_config) : null,
      input.secret_config ? encryptSecret(JSON.stringify(input.secret_config)) : null,
      now,
      input.last_error ?? null,
      now,
      now,
    );
  }
  return getIntegration(workspaceId, provider)!;
}

/* -------------------------------------------------------------------------- */
/* Dominios                                                                    */
/* -------------------------------------------------------------------------- */

export function listDomains(workspaceId: string) {
  return all<Domain>(
    `SELECT * FROM domains WHERE workspace_id = ? ORDER BY is_default DESC, created_at DESC`,
    workspaceId,
  );
}

export function createDomain(workspaceId: string, hostname: string, type = "custom") {
  const domainId = id();
  const now = ts();
  run(
    `INSERT INTO domains (id, workspace_id, hostname, type, status, ssl_status, is_default,
       verification_token, last_checked_at, created_at, updated_at)
     VALUES (?,?,?,?,'pending','pending',0,?,NULL,?,?)`,
    domainId,
    workspaceId,
    hostname.toLowerCase(),
    type,
    `tiendaflow-verify=${crypto.randomBytes(12).toString("hex")}`,
    now,
    now,
  );
  return domainId;
}

export function deleteDomain(workspaceId: string, domainId: string) {
  run(`DELETE FROM domains WHERE workspace_id = ? AND id = ?`, workspaceId, domainId);
}

/* -------------------------------------------------------------------------- */
/* Afiliados                                                                   */
/* -------------------------------------------------------------------------- */

export function listAffiliates(workspaceId: string) {
  return all<Affiliate>(
    `SELECT * FROM affiliates WHERE workspace_id = ? ORDER BY created_at DESC`,
    workspaceId,
  );
}

export function listAffiliateLinks(workspaceId: string) {
  return all<AffiliateLink>(
    `SELECT * FROM affiliate_links WHERE workspace_id = ? ORDER BY created_at DESC`,
    workspaceId,
  );
}

export function listCommissions(workspaceId: string) {
  return all<Commission>(
    `SELECT * FROM commissions WHERE workspace_id = ? ORDER BY created_at DESC`,
    workspaceId,
  );
}

export function createAffiliate(
  workspaceId: string,
  input: { full_name: string; email: string; commission_rate?: number; funnel_id?: string | null },
) {
  const affiliateId = id();
  const now = ts();
  run(
    `INSERT INTO affiliates (id, workspace_id, full_name, email, status, commission_rate, is_demo, created_at, updated_at)
     VALUES (?,?,?,?,'active',?,0,?,?)`,
    affiliateId,
    workspaceId,
    input.full_name,
    input.email.toLowerCase(),
    input.commission_rate ?? 30,
    now,
    now,
  );
  run(
    `INSERT INTO affiliate_links (id, workspace_id, affiliate_id, funnel_id, code, clicks, conversions, revenue, created_at)
     VALUES (?,?,?,?,?,0,0,0,?)`,
    id(),
    workspaceId,
    affiliateId,
    input.funnel_id ?? null,
    `${slugify(input.full_name).slice(0, 12)}-${crypto.randomBytes(3).toString("hex")}`,
    now,
  );
  return affiliateId;
}

/* -------------------------------------------------------------------------- */
/* Notificaciones                                                              */
/* -------------------------------------------------------------------------- */

export function listNotifications(workspaceId: string, limit = 30) {
  return all<Notification>(
    `SELECT * FROM notifications WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?`,
    workspaceId,
    limit,
  );
}

export function createNotification(
  workspaceId: string,
  input: { title: string; body?: string | null; type?: string; href?: string | null; user_id?: string | null },
) {
  run(
    `INSERT INTO notifications (id, workspace_id, user_id, type, title, body, href, read_at, created_at)
     VALUES (?,?,?,?,?,?,?,NULL,?)`,
    id(),
    workspaceId,
    input.user_id ?? null,
    input.type ?? "info",
    input.title,
    input.body ?? null,
    input.href ?? null,
    ts(),
  );
}

export function markNotificationsRead(workspaceId: string) {
  run(
    `UPDATE notifications SET read_at = ? WHERE workspace_id = ? AND read_at IS NULL`,
    ts(),
    workspaceId,
  );
}

/* -------------------------------------------------------------------------- */
/* IA y suscripción                                                            */
/* -------------------------------------------------------------------------- */

export function logAiGeneration(
  workspaceId: string,
  input: {
    user_id?: string | null;
    task: string;
    provider: string;
    model?: string | null;
    input?: unknown;
    output?: unknown;
    status?: string;
    entity_type?: string | null;
    entity_id?: string | null;
  },
) {
  const genId = id();
  run(
    `INSERT INTO ai_generations (id, workspace_id, user_id, task, provider, model, input, output,
       status, entity_type, entity_id, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    genId,
    workspaceId,
    input.user_id ?? null,
    input.task,
    input.provider,
    input.model ?? null,
    input.input ? JSON.stringify(input.input) : null,
    input.output ? JSON.stringify(input.output) : null,
    input.status ?? "ok",
    input.entity_type ?? null,
    input.entity_id ?? null,
    ts(),
  );
  return genId;
}

export function listAiGenerations(workspaceId: string, limit = 20) {
  return all<AiGeneration>(
    `SELECT * FROM ai_generations WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?`,
    workspaceId,
    limit,
  );
}

export function getSubscription(workspaceId: string) {
  return get<Subscription>(`SELECT * FROM subscriptions WHERE workspace_id = ?`, workspaceId);
}

export function ensureSubscription(workspaceId: string) {
  const existing = getSubscription(workspaceId);
  if (existing) return existing;
  const now = ts();
  run(
    `INSERT INTO subscriptions (id, workspace_id, plan, status, provider, provider_subscription_id,
       current_period_end, cancel_at_period_end, created_at, updated_at)
     VALUES (?,?,'free','active',NULL,NULL,?,0,?,?)`,
    id(),
    workspaceId,
    new Date(Date.now() + 14 * 86400_000).toISOString(),
    now,
    now,
  );
  return getSubscription(workspaceId)!;
}

export function setPlan(workspaceId: string, plan: string) {
  run(
    `UPDATE subscriptions SET plan = ?, updated_at = ? WHERE workspace_id = ?`,
    plan,
    ts(),
    workspaceId,
  );
}

/* -------------------------------------------------------------------------- */
/* Resolución de páginas públicas                                              */
/* -------------------------------------------------------------------------- */

/**
 * Encuentra la página pública a partir de la URL, venga por donde venga.
 *
 * Hay dos formas de llegar a la misma página:
 *
 *  · `tienda.tiendaflow.com/guia` — la linda, la que comparte el vendedor. El
 *    subdominio identifica al workspace y el slug al producto.
 *  · `/f/guia--a1b2c3` — la de respaldo, que funciona sin subdominio. Lleva el
 *    sufijo del id porque dos vendedores distintos pueden llamar igual a su
 *    producto y sin el sufijo colisionarían.
 *
 * Las dos tienen que seguir funcionando: los links que ya se compartieron no se
 * pueden romper porque después hayamos agregado subdominios.
 */
export function resolvePublicFunnel(slug: string, tienda?: string | null) {
  if (tienda) {
    const workspace = get<{ id: string }>(
      `SELECT id FROM workspaces WHERE slug = ?`,
      tienda,
    );
    if (!workspace) return null;

    const funnel = get<Funnel>(
      `SELECT * FROM funnels WHERE workspace_id = ? AND slug = ? LIMIT 1`,
      workspace.id,
      slug,
    );
    if (funnel) return funnel;

    // Puede llegar el slug largo por subdominio: lo aceptamos igual.
  }

  return getFunnelByPublicSlug(slug);
}

/** El workspace de una tienda, por su slug de subdominio. */
export function getWorkspaceBySlug(slug: string) {
  return get<{ id: string; name: string; slug: string; theme: string | null }>(
    `SELECT id, name, slug, theme FROM workspaces WHERE slug = ?`,
    slug,
  );
}

/**
 * Los colores de la tienda.
 *
 * Los elige el vendedor cuando crea la cuenta y son el punto de partida de
 * todo lo que la app dibuja después: la portada de la tienda y cada página de
 * venta nueva. Si todavía no eligió nada, cae al preset por defecto.
 */
export function workspaceTheme(workspaceId: string): LandingTheme {
  const row = get<{ theme: string | null }>(
    `SELECT theme FROM workspaces WHERE id = ?`,
    workspaceId,
  );
  return readTheme(parseJson<unknown>(row?.theme ?? null, {}));
}

/** Guarda los colores de la tienda, normalizados. */
export function saveWorkspaceTheme(workspaceId: string, theme: unknown) {
  run(
    `UPDATE workspaces SET theme = ?, updated_at = ? WHERE id = ?`,
    JSON.stringify(readTheme(theme)),
    ts(),
    workspaceId,
  );
}
