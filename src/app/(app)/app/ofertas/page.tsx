import Link from "next/link";
import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/data";
import { DemoTag } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/icon";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
} from "@/components/ui/primitives";
import { requireSession } from "@/lib/auth";
import { all } from "@/lib/db";
import { listOffers } from "@/lib/repo";
import { formatMoney, formatNumber, STATUS_LABEL, statusTone, toLines } from "@/lib/utils";

export const metadata: Metadata = { title: "Ofertas" };

export default async function OffersPage() {
  const { workspace } = await requireSession();
  const offers = listOffers(workspace.id);

  const counts = all<{ offer_id: string; bonuses: number }>(
    `SELECT offer_id, COUNT(*) AS bonuses FROM bonuses WHERE workspace_id = ? GROUP BY offer_id`,
    workspace.id,
  );
  const bumps = all<{ offer_id: string; n: number }>(
    `SELECT offer_id, COUNT(*) AS n FROM order_bumps WHERE workspace_id = ? AND active = 1 GROUP BY offer_id`,
    workspace.id,
  );
  const upsells = all<{ offer_id: string; n: number }>(
    `SELECT offer_id, COUNT(*) AS n FROM upsells WHERE workspace_id = ? AND active = 1 GROUP BY offer_id`,
    workspace.id,
  );
  const sales = all<{ offer_id: string; orders: number; revenue: number }>(
    `SELECT offer_id, COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue FROM orders
     WHERE workspace_id = ? AND status = 'paid' AND offer_id IS NOT NULL GROUP BY offer_id`,
    workspace.id,
  );

  const bonusMap = Object.fromEntries(counts.map((row) => [row.offer_id, row.bonuses]));
  const bumpMap = Object.fromEntries(bumps.map((row) => [row.offer_id, row.n]));
  const upsellMap = Object.fromEntries(upsells.map((row) => [row.offer_id, row.n]));
  const salesMap = Object.fromEntries(sales.map((row) => [row.offer_id, row]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ofertas"
        subtitle="Precio, promesa, bonos y todo lo que hace que digan que sí."
        actions={
          <LinkButton href="/app/ofertas/nueva" icon="plus">
            Crear oferta
          </LinkButton>
        }
      />

      {offers.length === 0 ? (
        <EmptyState
          icon="tag"
          title="Todavía no armaste ninguna oferta"
          description="Una oferta es tu producto más el precio, la promesa, los bonos y el order bump. Es lo que realmente compra la gente."
          action={
            <LinkButton href="/app/ofertas/nueva" icon="plus">
              Crear oferta
            </LinkButton>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {offers.map((offer) => {
            const benefits = toLines(offer.benefits);
            const stat = salesMap[offer.id];
            return (
              <Card key={offer.id} hover as="article" className="flex flex-col">
                <div className="flex items-start justify-between gap-3 p-5 pb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/app/ofertas/${offer.id}`}
                        className="truncate text-[15px] font-semibold text-ink-900 hover:text-brand-700"
                      >
                        {offer.name}
                      </Link>
                      {offer.is_demo ? <DemoTag /> : null}
                    </div>
                    {offer.headline ? (
                      <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-500">
                        {offer.headline}
                      </p>
                    ) : (
                      <p className="mt-1 text-[13px] text-amber-600">Falta el headline</p>
                    )}
                  </div>
                  <Badge tone={statusTone(offer.status)}>
                    {STATUS_LABEL[offer.status] ?? offer.status}
                  </Badge>
                </div>

                <div className="flex items-baseline gap-2 px-5">
                  <span className="text-[24px] font-semibold tracking-tight text-ink-900">
                    {formatMoney(offer.price, offer.currency)}
                  </span>
                  {offer.compare_at_price ? (
                    <span className="text-[14px] text-ink-400 line-through">
                      {formatMoney(offer.compare_at_price, offer.currency)}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5 px-5">
                  <Chip icon="gift" label={`${bonusMap[offer.id] ?? 0} bonos`} />
                  <Chip icon="plus" label={`${bumpMap[offer.id] ?? 0} bump`} />
                  <Chip icon="trendUp" label={`${upsellMap[offer.id] ?? 0} upsell`} />
                  <Chip icon="check" label={`${benefits.length} beneficios`} />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 px-5">
                  <div>
                    <dt className="text-[11px] text-ink-400">Ventas</dt>
                    <dd className="text-[14px] font-semibold text-ink-900">
                      {formatNumber(stat?.orders ?? 0)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-ink-400">Facturación</dt>
                    <dd className="text-[14px] font-semibold text-ink-900">
                      {formatMoney(stat?.revenue ?? 0, offer.currency, true)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-auto p-5 pt-4">
                  <LinkButton href={`/app/ofertas/${offer.id}`} variant="secondary" full size="sm">
                    Editar oferta
                  </LinkButton>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chip({ icon, label }: { icon: Parameters<typeof Icon>[0]["name"]; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-ink-100 px-2 py-1 text-[11.5px] font-medium text-ink-600">
      <Icon name={icon} size={12} />
      {label}
    </span>
  );
}
