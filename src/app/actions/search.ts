"use server";

import { requireSession } from "@/lib/auth";
import { all } from "@/lib/db";

export interface SearchHit {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  group: "Productos" | "Ofertas" | "Funnels" | "Ventas" | "Clientes";
}

/**
 * Búsqueda global. Siempre acotada al workspace de la sesión: ningún término
 * puede traer filas de otro tenant.
 */
export async function searchAction(query: string): Promise<SearchHit[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const { workspace } = await requireSession();
  const like = `%${term.toLowerCase()}%`;
  const hits: SearchHit[] = [];

  for (const row of all<{ id: string; name: string; type: string; status: string }>(
    `SELECT id, name, type, status FROM products
     WHERE workspace_id = ? AND lower(name) LIKE ? ORDER BY updated_at DESC LIMIT 5`,
    workspace.id,
    like,
  )) {
    hits.push({
      id: row.id,
      title: row.name,
      subtitle: `Producto · ${row.type}`,
      href: `/app/productos/${row.id}`,
      group: "Productos",
    });
  }

  for (const row of all<{ id: string; name: string; price: number }>(
    `SELECT id, name, price FROM offers
     WHERE workspace_id = ? AND lower(name) LIKE ? ORDER BY updated_at DESC LIMIT 5`,
    workspace.id,
    like,
  )) {
    hits.push({
      id: row.id,
      title: row.name,
      subtitle: "Oferta",
      href: `/app/ofertas/${row.id}`,
      group: "Ofertas",
    });
  }

  for (const row of all<{ id: string; name: string; status: string }>(
    `SELECT id, name, status FROM funnels
     WHERE workspace_id = ? AND lower(name) LIKE ? ORDER BY updated_at DESC LIMIT 5`,
    workspace.id,
    like,
  )) {
    hits.push({
      id: row.id,
      title: row.name,
      subtitle: `Funnel · ${row.status}`,
      href: `/app/funnels/${row.id}`,
      group: "Funnels",
    });
  }

  for (const row of all<{ id: string; reference: string; total: number; status: string }>(
    `SELECT id, reference, total, status FROM orders
     WHERE workspace_id = ? AND lower(reference) LIKE ? ORDER BY created_at DESC LIMIT 5`,
    workspace.id,
    like,
  )) {
    hits.push({
      id: row.id,
      title: row.reference,
      subtitle: `Venta · ${row.status}`,
      href: `/app/ventas/${row.id}`,
      group: "Ventas",
    });
  }

  for (const row of all<{ id: string; full_name: string; email: string }>(
    `SELECT id, full_name, email FROM customers
     WHERE workspace_id = ? AND (lower(full_name) LIKE ? OR lower(email) LIKE ?)
     ORDER BY updated_at DESC LIMIT 5`,
    workspace.id,
    like,
    like,
  )) {
    hits.push({
      id: row.id,
      title: row.full_name,
      subtitle: row.email,
      href: `/app/clientes/${row.id}`,
      group: "Clientes",
    });
  }

  return hits;
}
