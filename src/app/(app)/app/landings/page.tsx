import Link from "next/link";
import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/data";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
} from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { all } from "@/lib/db";
import { listLandingPages } from "@/lib/repo";
import { formatDate, STATUS_LABEL, statusTone } from "@/lib/utils";

export const metadata: Metadata = { title: "Landings" };

export default async function LandingsPage() {
  const { workspace } = await requireSession();
  const pages = listLandingPages(workspace.id);

  const counts = all<{ landing_page_id: string; n: number }>(
    `SELECT landing_page_id, COUNT(*) AS n FROM landing_sections WHERE workspace_id = ? GROUP BY landing_page_id`,
    workspace.id,
  );
  const countMap = Object.fromEntries(counts.map((row) => [row.landing_page_id, row.n]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Landings"
        subtitle="Las páginas de venta de tus funnels."
        actions={
          <LinkButton href="/app/funnels/nuevo" icon="plus">
            Crear funnel con landing
          </LinkButton>
        }
      />

      {pages.length === 0 ? (
        <EmptyState
          icon="layers"
          title="Todavía no tenés landings"
          description="Cada funnel crea su landing automáticamente. Armá un funnel y generá la página con IA en un clic."
          action={
            <LinkButton href="/app/funnels/nuevo" icon="plus">
              Crear funnel
            </LinkButton>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pages.map((page) => (
            <Card key={page.id} hover as="article" className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/app/landings/${page.id}`}
                  className="truncate text-[15px] font-semibold text-ink-900 hover:text-brand-700"
                >
                  {page.name}
                </Link>
                <Badge tone={statusTone(page.status)}>
                  {STATUS_LABEL[page.status] ?? page.status}
                </Badge>
              </div>
              <p className="mt-1.5 text-[12.5px] text-ink-500">
                {countMap[page.id] ?? 0} secciones · actualizada {formatDate(page.updated_at)}
              </p>
              <div className="mt-4">
                <LinkButton href={`/app/landings/${page.id}`} variant="secondary" size="sm" full>
                  Abrir editor
                </LinkButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
