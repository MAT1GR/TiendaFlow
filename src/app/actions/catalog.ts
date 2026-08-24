"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import * as repo from "@/lib/repo";
import { createNotification } from "@/lib/repo";
import {
  fail,
  guarded,
  listField,
  numberField,
  ok,
  optionalText,
  requiredText,
  type ActionResult,
} from "@/app/actions/shared";
import type { Product } from "@/lib/types";
import { parseJson } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Productos                                                                   */
/* -------------------------------------------------------------------------- */

export async function createProductAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    const { workspace } = await requireSession();

    const name = requiredText(formData.get("name"), "El nombre del producto");
    const price = numberField(formData.get("base_price"));
    if (price < 0) return fail("El precio no puede ser negativo.", { base_price: "Precio inválido" });

    const product = repo.createProduct(workspace.id, {
      name,
      subtitle: optionalText(formData.get("subtitle")),
      description: optionalText(formData.get("description")),
      short_description: optionalText(formData.get("short_description")),
      type: String(formData.get("type") ?? "ebook"),
      status: String(formData.get("status") ?? "draft"),
      category: optionalText(formData.get("category")),
      audience: optionalText(formData.get("audience")),
      main_problem: optionalText(formData.get("main_problem")),
      transformation: optionalText(formData.get("transformation")),
      benefits: listField(formData.get("benefits")),
      cover_url: optionalText(formData.get("cover_url")),
      base_price: price,
      currency: workspace.currency,
      delivery_type: String(formData.get("delivery_type") ?? "download"),
      delivery_message: optionalText(formData.get("delivery_message")),
      source: String(formData.get("source") ?? "manual"),
      outline: formData.get("outline") ? JSON.parse(String(formData.get("outline"))) : null,
      cover_style: JSON.stringify({ from: "#6D5DFB", to: "#22D3EE" }),
    });

    const files = formData.getAll("file_name").filter((value) => typeof value === "string" && value);
    for (const file of files) {
      repo.addProductFile(workspace.id, product.id, { file_name: String(file) });
    }

    createNotification(workspace.id, {
      title: `Creaste "${product.name}"`,
      body: "El siguiente paso es armar la oferta.",
      href: `/app/ofertas/nueva?producto=${product.id}`,
      type: "success",
    });

    revalidatePath("/app/productos");
    revalidatePath("/app");
    return ok({ id: product.id }, "Producto creado.");
  });
}

export async function updateProductAction(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const productId = requiredText(formData.get("id"), "El producto");

    const existing = repo.getProduct(workspace.id, productId);
    if (!existing) return fail("No encontramos ese producto en tu workspace.");

    const patch: Record<string, unknown> = {
      name: requiredText(formData.get("name"), "El nombre del producto"),
      subtitle: optionalText(formData.get("subtitle")),
      description: optionalText(formData.get("description")),
      short_description: optionalText(formData.get("short_description")),
      type: String(formData.get("type") ?? existing.type),
      status: String(formData.get("status") ?? existing.status),
      category: optionalText(formData.get("category")),
      audience: optionalText(formData.get("audience")),
      main_problem: optionalText(formData.get("main_problem")),
      transformation: optionalText(formData.get("transformation")),
      benefits: listField(formData.get("benefits")),
      // La portada alimenta la página de venta: si cambia acá, se regenera allá.
      cover_url: optionalText(formData.get("cover_url")),
      base_price: numberField(formData.get("base_price"), existing.base_price),
      delivery_type: String(formData.get("delivery_type") ?? existing.delivery_type),
      delivery_message: optionalText(formData.get("delivery_message")),
    };

    repo.updateProduct(workspace.id, productId, patch);

    if (patch.cover_url !== existing.cover_url) {
      syncCoverIntoLanding(workspace.id, productId, {
        anterior: existing.cover_url,
        nueva: (patch.cover_url as string | null) ?? null,
      });
    }

    revalidatePath("/app/productos");
    revalidatePath(`/app/productos/${productId}`);
    revalidatePath(`/app/productos/${productId}/pagina`);
    return ok(null, "Guardamos los cambios.");
  });
}

/**
 * La portada nueva baja sola a la página de venta.
 *
 * La página se escribe una vez, cuando se crea el funnel, y después vive por su
 * cuenta. Sin esto, alguien que carga su portada después de haber armado la
 * página la sube, va a mirar y no ve nada: la única forma de que apareciera
 * sería volver a generar la página entera con IA y perder todo lo que escribió.
 *
 * Solo se pisan los campos que siguen apuntando a la portada anterior (o que
 * están vacíos). Si en un bloque puso otra imagen a mano, esa queda: la decisión
 * manual siempre le gana a la automática.
 */
function syncCoverIntoLanding(
  workspaceId: string,
  productId: string,
  { anterior, nueva }: { anterior: string | null; nueva: string | null },
) {
  const offerIds = new Set(
    repo
      .listOffers(workspaceId)
      .filter((offer) => offer.product_id === productId)
      .map((offer) => offer.id),
  );
  if (!offerIds.size) return;

  const pages = repo
    .listLandingPages(workspaceId)
    .filter((page) => page.offer_id && offerIds.has(page.offer_id));

  const reemplazable = (valor: unknown) =>
    typeof valor === "string" && (!valor.trim() || valor === anterior);

  for (const page of pages) {
    for (const section of repo.listLandingSections(workspaceId, page.id)) {
      const content = parseJson<Record<string, unknown>>(section.content, {});
      let tocado = false;

      for (const campo of ["image", "featured_url"]) {
        if (campo in content && reemplazable(content[campo])) {
          content[campo] = nueva ?? "";
          tocado = true;
        }
      }

      if (tocado) repo.updateLandingSectionContent(workspaceId, section.id, content);
    }
  }
}

export async function productStatusAction(
  productId: string,
  status: Product["status"],
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    if (!repo.getProduct(workspace.id, productId)) {
      return fail("No encontramos ese producto en tu workspace.");
    }
    repo.updateProduct(workspace.id, productId, { status });
    revalidatePath("/app/productos");
    return ok(null, status === "archived" ? "Producto archivado." : "Producto actualizado.");
  });
}

export async function duplicateProductAction(productId: string): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const copy = repo.duplicateProduct(workspace.id, productId);
    if (!copy) return fail("No encontramos ese producto en tu workspace.");
    revalidatePath("/app/productos");
    return ok({ id: copy.id }, "Duplicamos el producto.");
  });
}

export async function deleteProductAction(productId: string): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    if (!repo.getProduct(workspace.id, productId)) {
      return fail("No encontramos ese producto en tu workspace.");
    }
    repo.deleteProduct(workspace.id, productId);
    revalidatePath("/app/productos");
    return ok(null, "Eliminamos el producto.");
  });
}

export async function addProductFileAction(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const productId = requiredText(formData.get("product_id"), "El producto");
    const fileName = requiredText(formData.get("file_name"), "El nombre del archivo");
    const fileSize = numberField(formData.get("file_size"));
    const fileType = optionalText(formData.get("file_type"));

    if (!repo.getProduct(workspace.id, productId)) {
      return fail("No encontramos ese producto en tu workspace.");
    }

    repo.addProductFile(workspace.id, productId, {
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType ?? undefined,
    });

    revalidatePath(`/app/productos/${productId}`);
    return ok(
      null,
      "Registramos el archivo. El almacenamiento de archivos todavía no está conectado: se guarda la referencia, no el binario.",
    );
  });
}

export async function deleteProductFileAction(
  fileId: string,
  productId: string,
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    repo.deleteProductFile(workspace.id, fileId);
    revalidatePath(`/app/productos/${productId}`);
    return ok(null, "Quitamos el archivo.");
  });
}

/* -------------------------------------------------------------------------- */
/* Ofertas                                                                     */
/* -------------------------------------------------------------------------- */

export async function createOfferAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    const { workspace } = await requireSession();

    const name = requiredText(formData.get("name"), "El nombre de la oferta");
    const productId = optionalText(formData.get("product_id"));
    const price = numberField(formData.get("price"));

    if (price <= 0) {
      return fail("Poné un precio mayor a cero para poder cobrar.", { price: "Precio inválido" });
    }
    if (productId && !repo.getProduct(workspace.id, productId)) {
      return fail("El producto seleccionado no existe en tu workspace.");
    }

    const compareAt = numberField(formData.get("compare_at_price"));

    const offer = repo.createOffer(workspace.id, {
      name,
      product_id: productId,
      headline: optionalText(formData.get("headline")),
      promise: optionalText(formData.get("promise")),
      benefits: listField(formData.get("benefits")),
      cta_text: String(formData.get("cta_text") || "Quiero mi acceso"),
      guarantee: optionalText(formData.get("guarantee")),
      price,
      compare_at_price: compareAt > price ? compareAt : null,
      currency: workspace.currency,
      status: String(formData.get("status") ?? "draft"),
    });

    createNotification(workspace.id, {
      title: `Creaste la oferta "${offer.name}"`,
      body: "Sumale bonos y un order bump antes de armar el funnel.",
      href: `/app/ofertas/${offer.id}`,
      type: "success",
    });

    revalidatePath("/app/ofertas");
    revalidatePath("/app");
    return ok({ id: offer.id }, "Oferta creada.");
  });
}

export async function updateOfferAction(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const offerId = requiredText(formData.get("id"), "La oferta");
    const existing = repo.getOffer(workspace.id, offerId);
    if (!existing) return fail("No encontramos esa oferta en tu workspace.");

    const price = numberField(formData.get("price"), existing.price);
    if (price <= 0) return fail("Poné un precio mayor a cero.", { price: "Precio inválido" });
    const compareAt = numberField(formData.get("compare_at_price"));

    repo.updateOffer(workspace.id, offerId, {
      name: requiredText(formData.get("name"), "El nombre de la oferta"),
      product_id: optionalText(formData.get("product_id")),
      headline: optionalText(formData.get("headline")),
      promise: optionalText(formData.get("promise")),
      benefits: listField(formData.get("benefits")),
      cta_text: String(formData.get("cta_text") || existing.cta_text),
      guarantee: optionalText(formData.get("guarantee")),
      price,
      compare_at_price: compareAt > price ? compareAt : null,
      status: String(formData.get("status") ?? existing.status),
    });

    revalidatePath("/app/ofertas");
    revalidatePath(`/app/ofertas/${offerId}`);
    return ok(null, "Guardamos la oferta.");
  });
}

export async function publishOfferAction(offerId: string): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const offer = repo.getOffer(workspace.id, offerId);
    if (!offer) return fail("No encontramos esa oferta en tu workspace.");

    const missing: string[] = [];
    if (!offer.product_id) missing.push("un producto asociado");
    if (offer.price <= 0) missing.push("un precio");
    if (!offer.headline) missing.push("un headline");
    if (missing.length) {
      return fail(`Para publicar la oferta falta: ${missing.join(", ")}.`);
    }

    repo.updateOffer(workspace.id, offerId, { status: "active" });
    revalidatePath("/app/ofertas");
    revalidatePath(`/app/ofertas/${offerId}`);
    return ok(null, "Oferta publicada.");
  });
}

export async function deleteOfferAction(offerId: string): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    if (!repo.getOffer(workspace.id, offerId)) return fail("No encontramos esa oferta.");
    repo.deleteOffer(workspace.id, offerId);
    revalidatePath("/app/ofertas");
    return ok(null, "Eliminamos la oferta.");
  });
}

/* -------------------------------------------------------------------------- */
/* Bonos                                                                       */
/* -------------------------------------------------------------------------- */

export async function saveBonusAction(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const offerId = requiredText(formData.get("offer_id"), "La oferta");
    if (!repo.getOffer(workspace.id, offerId)) return fail("No encontramos esa oferta.");

    const bonusId = optionalText(formData.get("id"));
    const payload = {
      name: requiredText(formData.get("name"), "El nombre del bono"),
      description: optionalText(formData.get("description")),
      value: numberField(formData.get("value")),
      file_name: optionalText(formData.get("file_name")),
      product_id: optionalText(formData.get("product_id")),
    };

    if (bonusId) {
      repo.updateBonus(workspace.id, bonusId, payload);
    } else {
      repo.createBonus(workspace.id, { ...payload, offer_id: offerId });
    }

    revalidatePath(`/app/ofertas/${offerId}`);
    return ok(null, bonusId ? "Bono actualizado." : "Bono agregado.");
  });
}

export async function deleteBonusAction(bonusId: string, offerId: string): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    repo.deleteBonus(workspace.id, bonusId);
    revalidatePath(`/app/ofertas/${offerId}`);
    return ok(null, "Quitamos el bono.");
  });
}

/* -------------------------------------------------------------------------- */
/* Order bump                                                                  */
/* -------------------------------------------------------------------------- */

export async function saveOrderBumpAction(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const offerId = requiredText(formData.get("offer_id"), "La oferta");
    if (!repo.getOffer(workspace.id, offerId)) return fail("No encontramos esa oferta.");

    const bumpId = optionalText(formData.get("id"));
    const price = numberField(formData.get("price"));
    if (price <= 0) return fail("El order bump necesita un precio mayor a cero.", { price: "Precio inválido" });

    const payload = {
      name: requiredText(formData.get("name"), "El nombre del complemento"),
      description: optionalText(formData.get("description")),
      checkbox_label: String(formData.get("checkbox_label") || "Sí, quiero agregar este complemento"),
      price,
      product_id: optionalText(formData.get("product_id")),
      active: formData.get("active") === "on" || formData.get("active") === "1" ? 1 : 0,
    };

    if (bumpId) {
      repo.updateOrderBump(workspace.id, bumpId, payload);
    } else {
      repo.createOrderBump(workspace.id, { ...payload, offer_id: offerId });
    }

    revalidatePath(`/app/ofertas/${offerId}`);
    return ok(null, bumpId ? "Order bump actualizado." : "Order bump creado.");
  });
}

export async function deleteOrderBumpAction(bumpId: string, offerId: string): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    repo.deleteOrderBump(workspace.id, bumpId);
    revalidatePath(`/app/ofertas/${offerId}`);
    return ok(null, "Quitamos el order bump.");
  });
}

/* -------------------------------------------------------------------------- */
/* Upsells y downsells                                                         */
/* -------------------------------------------------------------------------- */

export async function saveUpsellAction(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const offerId = requiredText(formData.get("offer_id"), "La oferta");
    if (!repo.getOffer(workspace.id, offerId)) return fail("No encontramos esa oferta.");

    const upsellId = optionalText(formData.get("id"));
    const price = numberField(formData.get("price"));
    if (price <= 0) return fail("El upsell necesita un precio mayor a cero.", { price: "Precio inválido" });
    const compareAt = numberField(formData.get("compare_at_price"));

    const payload = {
      name: requiredText(formData.get("name"), "El nombre del upsell"),
      headline: optionalText(formData.get("headline")),
      description: optionalText(formData.get("description")),
      price,
      compare_at_price: compareAt > price ? compareAt : null,
      accept_label: String(formData.get("accept_label") || "Sí, lo quiero agregar"),
      decline_label: String(formData.get("decline_label") || "No gracias, seguir sin esto"),
      product_id: optionalText(formData.get("product_id")),
    };

    if (upsellId) {
      repo.updateUpsell(workspace.id, upsellId, payload);
    } else {
      repo.createUpsell(workspace.id, { ...payload, offer_id: offerId });
    }

    revalidatePath(`/app/ofertas/${offerId}`);
    return ok(null, upsellId ? "Upsell actualizado." : "Upsell creado.");
  });
}

export async function deleteUpsellAction(upsellId: string, offerId: string): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    repo.deleteUpsell(workspace.id, upsellId);
    revalidatePath(`/app/ofertas/${offerId}`);
    return ok(null, "Quitamos el upsell.");
  });
}

export async function saveDownsellAction(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    const upsellId = requiredText(formData.get("upsell_id"), "El upsell");
    const offerId = requiredText(formData.get("offer_id"), "La oferta");

    const price = numberField(formData.get("price"));
    if (price <= 0) return fail("El downsell necesita un precio mayor a cero.", { price: "Precio inválido" });

    const downsellId = optionalText(formData.get("id"));
    const payload = {
      name: requiredText(formData.get("name"), "El nombre del downsell"),
      headline: optionalText(formData.get("headline")),
      description: optionalText(formData.get("description")),
      price,
      compare_at_price: numberField(formData.get("compare_at_price")) || null,
      product_id: optionalText(formData.get("product_id")),
    };

    if (downsellId) {
      repo.updateDownsell(workspace.id, downsellId, payload);
    } else {
      repo.createDownsell(workspace.id, { ...payload, upsell_id: upsellId });
    }

    revalidatePath(`/app/ofertas/${offerId}`);
    return ok(null, downsellId ? "Downsell actualizado." : "Downsell creado.");
  });
}

export async function deleteDownsellAction(
  downsellId: string,
  offerId: string,
): Promise<ActionResult<null>> {
  return guarded(async () => {
    const { workspace } = await requireSession();
    repo.deleteDownsell(workspace.id, downsellId);
    revalidatePath(`/app/ofertas/${offerId}`);
    return ok(null, "Quitamos el downsell.");
  });
}
