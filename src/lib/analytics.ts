import "server-only";

import { all, get } from "@/lib/db";
import { delta } from "@/lib/utils";

/**
 * Métricas derivadas de datos reales del workspace.
 *
 * Todo lo que se muestra acá sale de las tablas `orders`, `analytics_events` y
 * `campaigns`. Si una métrica depende de una integración que no está conectada
 * (por ejemplo la inversión publicitaria de Meta), se devuelve `null` en lugar
 * de un número inventado, y la UI lo muestra como "sin datos".
 */

export type RangeKey = "today" | "7d" | "30d" | "90d" | "custom";

export interface DateRange {
  from: Date;
  to: Date;
  key: RangeKey;
  label: string;
}

export const RANGE_OPTIONS: Array<{ key: RangeKey; label: string; days: number }> = [
  { key: "today", label: "Hoy", days: 1 },
  { key: "7d", label: "7 días", days: 7 },
  { key: "30d", label: "30 días", days: 30 },
  { key: "90d", label: "90 días", days: 90 },
];

export function resolveRange(key: string | undefined, from?: string, to?: string): DateRange {
  if (key === "custom" && from && to) {
    return {
      from: new Date(`${from}T00:00:00.000Z`),
      to: new Date(`${to}T23:59:59.999Z`),
      key: "custom",
      label: "Personalizado",
    };
  }
  const option = RANGE_OPTIONS.find((o) => o.key === key) ?? RANGE_OPTIONS[2];
  const to_ = new Date();
  const from_ = new Date(to_.getTime() - (option.days - (option.days === 1 ? 1 : 0)) * 86400_000);
  if (option.days === 1) from_.setHours(0, 0, 0, 0);
  return { from: from_, to: to_, key: option.key, label: option.label };
}

export function previousRange(range: DateRange): DateRange {
  const span = range.to.getTime() - range.from.getTime();
  return {
    from: new Date(range.from.getTime() - span),
    to: new Date(range.from.getTime()),
    key: range.key,
    label: "Período anterior",
  };
}

export interface Totals {
  revenue: number;
  orders: number;
  visitors: number;
  checkouts: number;
  conversionRate: number;
  averageOrderValue: number;
  refunds: number;
  refundRate: number;
  adSpend: number | null;
  roas: number | null;
  cpa: number | null;
}

function eventCount(workspaceId: string, name: string, range: DateRange) {
  return (
    get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM analytics_events
       WHERE workspace_id = ? AND name = ? AND created_at >= ? AND created_at <= ?`,
      workspaceId,
      name,
      range.from.toISOString(),
      range.to.toISOString(),
    )?.n ?? 0
  );
}

function uniqueSessions(workspaceId: string, name: string, range: DateRange) {
  return (
    get<{ n: number }>(
      `SELECT COUNT(DISTINCT session_key) AS n FROM analytics_events
       WHERE workspace_id = ? AND name = ? AND session_key IS NOT NULL
         AND created_at >= ? AND created_at <= ?`,
      workspaceId,
      name,
      range.from.toISOString(),
      range.to.toISOString(),
    )?.n ?? 0
  );
}

export function getTotals(workspaceId: string, range: DateRange): Totals {
  const sales = get<{ revenue: number; orders: number }>(
    `SELECT COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS orders FROM orders
     WHERE workspace_id = ? AND status = 'paid' AND created_at >= ? AND created_at <= ?`,
    workspaceId,
    range.from.toISOString(),
    range.to.toISOString(),
  ) ?? { revenue: 0, orders: 0 };

  const refunds =
    get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM orders
       WHERE workspace_id = ? AND status = 'refunded' AND created_at >= ? AND created_at <= ?`,
      workspaceId,
      range.from.toISOString(),
      range.to.toISOString(),
    )?.n ?? 0;

  const visitors = uniqueSessions(workspaceId, "page_view", range);
  const checkouts = eventCount(workspaceId, "initiate_checkout", range);

  const spendRow = get<{ spend: number; tracked: number }>(
    `SELECT COALESCE(SUM(spend), 0) AS spend, COUNT(*) AS tracked FROM campaigns
     WHERE workspace_id = ? AND spend > 0`,
    workspaceId,
  );
  const adSpend = spendRow && spendRow.tracked > 0 ? spendRow.spend : null;

  return {
    revenue: sales.revenue,
    orders: sales.orders,
    visitors,
    checkouts,
    conversionRate: visitors > 0 ? (sales.orders / visitors) * 100 : 0,
    averageOrderValue: sales.orders > 0 ? sales.revenue / sales.orders : 0,
    refunds,
    refundRate: sales.orders > 0 ? (refunds / sales.orders) * 100 : 0,
    adSpend,
    roas: adSpend && adSpend > 0 ? sales.revenue / adSpend : null,
    cpa: adSpend && sales.orders > 0 ? adSpend / sales.orders : null,
  };
}

export interface KpiComparison {
  current: number | null;
  previous: number | null;
  deltaPercent: number | null;
}

export function compare(current: number | null, previous: number | null): KpiComparison {
  if (current === null || previous === null) {
    return { current, previous, deltaPercent: null };
  }
  return { current, previous, deltaPercent: delta(current, previous) };
}

export interface SeriesPoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
  visitors: number;
}

export function getSeries(workspaceId: string, range: DateRange): SeriesPoint[] {
  const days = Math.max(
    1,
    Math.ceil((range.to.getTime() - range.from.getTime()) / 86400_000),
  );
  const buckets = new Map<string, SeriesPoint>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(range.to.getTime() - i * 86400_000);
    const key = day.toISOString().slice(0, 10);
    buckets.set(key, {
      date: key,
      label: new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(day),
      revenue: 0,
      orders: 0,
      visitors: 0,
    });
  }

  const orderRows = all<{ day: string; revenue: number; orders: number }>(
    `SELECT substr(created_at, 1, 10) AS day, COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS orders
     FROM orders
     WHERE workspace_id = ? AND status = 'paid' AND created_at >= ? AND created_at <= ?
     GROUP BY day`,
    workspaceId,
    range.from.toISOString(),
    range.to.toISOString(),
  );
  for (const row of orderRows) {
    const bucket = buckets.get(row.day);
    if (bucket) {
      bucket.revenue = row.revenue;
      bucket.orders = row.orders;
    }
  }

  const visitRows = all<{ day: string; visitors: number }>(
    `SELECT substr(created_at, 1, 10) AS day, COUNT(DISTINCT session_key) AS visitors
     FROM analytics_events
     WHERE workspace_id = ? AND name = 'page_view' AND created_at >= ? AND created_at <= ?
     GROUP BY day`,
    workspaceId,
    range.from.toISOString(),
    range.to.toISOString(),
  );
  for (const row of visitRows) {
    const bucket = buckets.get(row.day);
    if (bucket) bucket.visitors = row.visitors;
  }

  return [...buckets.values()];
}

export interface FunnelStepMetrics {
  stepId: string;
  name: string;
  type: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
}

export interface FunnelMetrics {
  funnelId: string;
  name: string;
  status: string;
  visitors: number;
  checkouts: number;
  orders: number;
  revenue: number;
  checkoutRate: number;
  conversionRate: number;
  roas: number | null;
  steps: FunnelStepMetrics[];
}

export function getFunnelMetrics(workspaceId: string, range: DateRange): FunnelMetrics[] {
  const funnels = all<{ id: string; name: string; status: string }>(
    `SELECT id, name, status FROM funnels WHERE workspace_id = ? ORDER BY created_at DESC`,
    workspaceId,
  );

  return funnels.map((funnel) => {
    const steps = all<{ id: string; name: string; type: string }>(
      `SELECT id, name, type FROM funnel_steps WHERE workspace_id = ? AND funnel_id = ? ORDER BY position`,
      workspaceId,
      funnel.id,
    );

    const stepMetrics: FunnelStepMetrics[] = steps.map((step) => {
      const visitors =
        get<{ n: number }>(
          `SELECT COUNT(DISTINCT session_key) AS n FROM analytics_events
           WHERE workspace_id = ? AND funnel_step_id = ? AND name = 'page_view'
             AND created_at >= ? AND created_at <= ?`,
          workspaceId,
          step.id,
          range.from.toISOString(),
          range.to.toISOString(),
        )?.n ?? 0;
      return {
        stepId: step.id,
        name: step.name,
        type: step.type,
        visitors,
        conversions: 0,
        conversionRate: 0,
      };
    });

    for (let i = 0; i < stepMetrics.length; i += 1) {
      const next = stepMetrics[i + 1];
      stepMetrics[i].conversions = next ? next.visitors : 0;
      stepMetrics[i].conversionRate =
        stepMetrics[i].visitors > 0
          ? (stepMetrics[i].conversions / stepMetrics[i].visitors) * 100
          : 0;
    }

    const sales = get<{ revenue: number; orders: number }>(
      `SELECT COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS orders FROM orders
       WHERE workspace_id = ? AND funnel_id = ? AND status = 'paid'
         AND created_at >= ? AND created_at <= ?`,
      workspaceId,
      funnel.id,
      range.from.toISOString(),
      range.to.toISOString(),
    ) ?? { revenue: 0, orders: 0 };

    const visitors = stepMetrics[0]?.visitors ?? 0;
    const checkouts =
      stepMetrics.find((s) => s.type === "checkout")?.visitors ?? 0;

    const spend =
      get<{ spend: number }>(
        `SELECT COALESCE(SUM(spend), 0) AS spend FROM campaigns WHERE workspace_id = ? AND funnel_id = ?`,
        workspaceId,
        funnel.id,
      )?.spend ?? 0;

    return {
      funnelId: funnel.id,
      name: funnel.name,
      status: funnel.status,
      visitors,
      checkouts,
      orders: sales.orders,
      revenue: sales.revenue,
      checkoutRate: visitors > 0 ? (checkouts / visitors) * 100 : 0,
      conversionRate: visitors > 0 ? (sales.orders / visitors) * 100 : 0,
      roas: spend > 0 ? sales.revenue / spend : null,
      steps: stepMetrics,
    };
  });
}

export interface TakeRates {
  bumpTakeRate: number | null;
  upsellTakeRate: number | null;
}

export function getTakeRates(workspaceId: string, range: DateRange): TakeRates {
  const paid =
    get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM orders WHERE workspace_id = ? AND status = 'paid'
        AND created_at >= ? AND created_at <= ?`,
      workspaceId,
      range.from.toISOString(),
      range.to.toISOString(),
    )?.n ?? 0;

  if (paid === 0) return { bumpTakeRate: null, upsellTakeRate: null };

  const withBump =
    get<{ n: number }>(
      `SELECT COUNT(DISTINCT o.id) AS n FROM orders o
       JOIN order_items i ON i.order_id = o.id AND i.kind = 'bump'
       WHERE o.workspace_id = ? AND o.status = 'paid' AND o.created_at >= ? AND o.created_at <= ?`,
      workspaceId,
      range.from.toISOString(),
      range.to.toISOString(),
    )?.n ?? 0;

  const withUpsell =
    get<{ n: number }>(
      `SELECT COUNT(DISTINCT o.id) AS n FROM orders o
       JOIN order_items i ON i.order_id = o.id AND i.kind IN ('upsell','downsell')
       WHERE o.workspace_id = ? AND o.status = 'paid' AND o.created_at >= ? AND o.created_at <= ?`,
      workspaceId,
      range.from.toISOString(),
      range.to.toISOString(),
    )?.n ?? 0;

  return {
    bumpTakeRate: (withBump / paid) * 100,
    upsellTakeRate: (withUpsell / paid) * 100,
  };
}

export interface SourceRow {
  source: string;
  visitors: number;
  orders: number;
  revenue: number;
}

export function getTrafficSources(workspaceId: string, range: DateRange): SourceRow[] {
  const rows = all<{ source: string | null; orders: number; revenue: number }>(
    `SELECT COALESCE(utm_source, 'directo') AS source, COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
     FROM orders
     WHERE workspace_id = ? AND status = 'paid' AND created_at >= ? AND created_at <= ?
     GROUP BY source ORDER BY revenue DESC`,
    workspaceId,
    range.from.toISOString(),
    range.to.toISOString(),
  );

  const visitorRows = all<{ source: string | null; visitors: number }>(
    `SELECT COALESCE(utm_source, 'directo') AS source, COUNT(DISTINCT session_key) AS visitors
     FROM attribution_events
     WHERE workspace_id = ? AND created_at >= ? AND created_at <= ?
     GROUP BY source`,
    workspaceId,
    range.from.toISOString(),
    range.to.toISOString(),
  );
  const visitorMap = new Map(visitorRows.map((r) => [r.source ?? "directo", r.visitors]));

  const merged = new Map<string, SourceRow>();
  for (const row of rows) {
    const key = row.source ?? "directo";
    merged.set(key, {
      source: key,
      orders: row.orders,
      revenue: row.revenue,
      visitors: visitorMap.get(key) ?? 0,
    });
  }
  for (const [key, visitors] of visitorMap) {
    if (!merged.has(key)) merged.set(key, { source: key, visitors, orders: 0, revenue: 0 });
  }
  return [...merged.values()].sort((a, b) => b.revenue - a.revenue || b.visitors - a.visitors);
}

export interface EntityPerformance {
  id: string;
  name: string;
  orders: number;
  revenue: number;
}

export function getProductPerformance(workspaceId: string, range: DateRange): EntityPerformance[] {
  return all<EntityPerformance>(
    `SELECT p.id AS id, p.name AS name, COUNT(DISTINCT o.id) AS orders,
            COALESCE(SUM(i.unit_price * i.quantity), 0) AS revenue
     FROM order_items i
     JOIN orders o ON o.id = i.order_id AND o.status = 'paid'
     JOIN products p ON p.id = i.product_id
     WHERE i.workspace_id = ? AND o.created_at >= ? AND o.created_at <= ?
     GROUP BY p.id, p.name
     ORDER BY revenue DESC LIMIT 10`,
    workspaceId,
    range.from.toISOString(),
    range.to.toISOString(),
  );
}

export function getOfferPerformance(workspaceId: string, range: DateRange): EntityPerformance[] {
  return all<EntityPerformance>(
    `SELECT f.id AS id, f.name AS name, COUNT(o.id) AS orders, COALESCE(SUM(o.total), 0) AS revenue
     FROM offers f
     LEFT JOIN orders o ON o.offer_id = f.id AND o.status = 'paid'
       AND o.created_at >= ? AND o.created_at <= ?
     WHERE f.workspace_id = ?
     GROUP BY f.id, f.name
     ORDER BY revenue DESC LIMIT 10`,
    range.from.toISOString(),
    range.to.toISOString(),
    workspaceId,
  );
}

export interface CampaignPerformance {
  id: string;
  name: string;
  platform: string;
  status: string;
  spend: number;
  clicks: number;
  impressions: number;
  orders: number;
  revenue: number;
  roas: number | null;
  cpa: number | null;
}

export function getCampaignPerformance(
  workspaceId: string,
  range: DateRange,
): CampaignPerformance[] {
  const campaigns = all<{
    id: string;
    name: string;
    platform: string;
    status: string;
    spend: number;
    clicks: number;
    impressions: number;
    utm_campaign: string | null;
  }>(`SELECT id, name, platform, status, spend, clicks, impressions, utm_campaign
      FROM campaigns WHERE workspace_id = ? ORDER BY spend DESC`, workspaceId);

  return campaigns.map((campaign) => {
    const sales = get<{ orders: number; revenue: number }>(
      `SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenue FROM orders
       WHERE workspace_id = ? AND status = 'paid' AND utm_campaign = ?
         AND created_at >= ? AND created_at <= ?`,
      workspaceId,
      campaign.utm_campaign ?? "",
      range.from.toISOString(),
      range.to.toISOString(),
    ) ?? { orders: 0, revenue: 0 };

    return {
      ...campaign,
      orders: sales.orders,
      revenue: sales.revenue,
      roas: campaign.spend > 0 ? sales.revenue / campaign.spend : null,
      cpa: campaign.spend > 0 && sales.orders > 0 ? campaign.spend / sales.orders : null,
    };
  });
}
