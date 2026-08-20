/** Constantes de analytics compartidas con componentes de cliente. */

export const RANGE_OPTIONS: Array<{ key: string; label: string; days: number }> = [
  { key: "today", label: "Hoy", days: 1 },
  { key: "7d", label: "7 días", days: 7 },
  { key: "30d", label: "30 días", days: 30 },
  { key: "90d", label: "90 días", days: 90 },
];

export const CHART_METRICS = [
  { key: "revenue", label: "Facturación", format: "money" as const, color: "#6D5DFB" },
  { key: "orders", label: "Ventas", format: "number" as const, color: "#22C55E" },
  { key: "visitors", label: "Visitantes", format: "number" as const, color: "#22D3EE" },
  { key: "conversion", label: "Conversión", format: "percent" as const, color: "#F59E0B" },
  { key: "spend", label: "Inversión", format: "money" as const, color: "#EF4444" },
  { key: "roas", label: "ROAS", format: "number" as const, color: "#8B5CF6" },
];
