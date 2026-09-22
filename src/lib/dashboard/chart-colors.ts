import type { MetricId, PlatformId } from "@/types/analytics";

import { METRICS } from "@/data/metrics";
import { getRegistryPlatformIds } from "@/lib/dashboard/consolidated-platforms";

/** Pastel categorical palette for charts (portfolio demo). */
export const CHART_PASTEL_PALETTE = [
  "#A8BFA3",
  "#A9C3D6",
  "#E8B7A6",
  "#E5D39A",
  "#C5BDD8",
  "#9FC7C1",
  "#D9A7A0",
] as const;

/** Stable platform → color (Amazon sage, Flipkart blue, etc.). */
export const PLATFORM_COLORS: Record<PlatformId, string> = {
  amazon: "#A8BFA3",
  flipkart: "#A9C3D6",
  myntra: "#E8B7A6",
  ajio: "#E5D39A",
  tata_cliq: "#C5BDD8",
  indiamart: "#9FC7C1",
  nykaa: "#D9A7A0",
  purple: "#B8C9E0",
  bigbasket: "#B8D4C8",
  blinkit: "#E8D5B7",
  zepto: "#E8A8B8",
  swiggy_instamart: "#A8B5C4",
};

function buildPlatformChartColorMap(): Record<PlatformId, string> {
  const ids = getRegistryPlatformIds();
  const map = {} as Record<PlatformId, string>;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    map[id] =
      PLATFORM_COLORS[id] ??
      CHART_PASTEL_PALETTE[i % CHART_PASTEL_PALETTE.length];
  }
  return map;
}

/** @deprecated Prefer PLATFORM_COLORS — kept for existing chart imports. */
export const PLATFORM_CHART_COLOR: Record<PlatformId, string> =
  buildPlatformChartColorMap();

export function platformChartColor(platformId: PlatformId): string {
  return PLATFORM_CHART_COLOR[platformId];
}

/** Metric-level colors — distinct from platform palette. */
const METRIC_COLOR_OVERRIDES: Partial<Record<MetricId, string>> = {
  gross_sales: "#A9C3D6",
  net_sales: "#9BB8D0",
  revenue: "#8FAEC8",
  orders: "#A8BFA3",
  units_sold: "#B5C9B0",
  average_order_value: "#C4D4BF",
  sales_growth: "#D4A574",
  revenue_contribution: "#C9B896",
  impressions: "#C5BDD8",
  product_views: "#B8C9E0",
  clicks: "#A8B5C4",
  click_through_rate: "#E8B7A6",
  search_impressions: "#D1C4E0",
  search_clicks: "#B0BEC5",
  organic_traffic: "#9FC7C1",
  paid_traffic: "#A9C3D6",
  conversion_rate: "#E8B7A6",
  add_to_cart_rate: "#E5C39A",
  cart_to_order_rate: "#E8A8B8",
  product_page_conversion: "#E8C4A8",
  checkout_conversion: "#D9A7A0",
  sessions: "#E5D39A",
  orders_per_session: "#A8BFA3",
  repeat_purchase_rate: "#B8D4C8",
  ad_spend: "#D9A7A0",
  ad_sales: "#A9C3D6",
  ad_impressions: "#C5BDD8",
  ad_clicks: "#A8B5C4",
  ad_ctr: "#E8B7A6",
  cpc: "#E8D5B7",
  acos: "#D9A7A0",
  roas: "#A8BFA3",
  sku_sales: "#A9C3D6",
  sku_units_sold: "#B5C9B0",
  sku_conversion_rate: "#E8B7A6",
  sku_revenue_share: "#C9B896",
  sku_product_views: "#B8C9E0",
  product_rank: "#C5BDD8",
  buy_box_share: "#9FC7C1",
  product_rating: "#E5D39A",
  current_stock: "#A8B5C4",
  stock_availability: "#B8D4C8",
  days_of_inventory: "#E8D5B7",
  out_of_stock_rate: "#E8A8B8",
  low_stock_skus: "#D9A7A0",
  stock_turnover: "#9FC7C1",
  inventory_value: "#A9C3D6",
  lost_sales_from_oos: "#D9A7A0",
  platform_revenue: "#A9C3D6",
  platform_growth: "#D4A574",
  platform_orders: "#A8BFA3",
  platform_aov: "#C4D4BF",
  platform_conversion: "#E8B7A6",
  platform_roas: "#A8BFA3",
  platform_market_share: "#9FC7C1",
  platform_contribution: "#C9B896",
  competitor_price: "#A8B5C4",
  price_difference: "#E8D5B7",
  competitor_rating: "#E5D39A",
  competitor_review_count: "#C5BDD8",
  competitor_rank: "#B8C9E0",
  category_rank: "#C5BDD8",
  buy_box_loss_rate: "#E8A8B8",
  competitor_availability: "#B8D4C8",
};

const METRIC_FALLBACK_PALETTE = [
  "#A9C3D6",
  "#A8BFA3",
  "#E8B7A6",
  "#E5D39A",
  "#9FC7C1",
  "#D9A7A0",
  "#C5BDD8",
  "#B8D4C8",
] as const;

function buildMetricChartColorMap(): Record<MetricId, string> {
  const map = {} as Record<MetricId, string>;
  for (let i = 0; i < METRICS.length; i++) {
    const metric = METRICS[i];
    map[metric.id] =
      METRIC_COLOR_OVERRIDES[metric.id] ??
      METRIC_FALLBACK_PALETTE[i % METRIC_FALLBACK_PALETTE.length];
  }
  return map;
}

export const METRIC_COLORS: Record<MetricId, string> = buildMetricChartColorMap();

export function metricChartColor(metricId: MetricId): string {
  return METRIC_COLORS[metricId];
}

export function metricSeriesColor(index: number): string {
  return METRIC_FALLBACK_PALETTE[index % METRIC_FALLBACK_PALETTE.length];
}

/** Neutral base for period legend swatches (not tied to a single series). */
export const METRIC_COMPARISON_BASE = "#A8BFA3";

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return null;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return { r, g, b };
}

/** Same hue for current vs comparison — comparison is lighter / softer. */
export function chartPeriodPair(baseHex: string): {
  current: string;
  comparison: string;
} {
  const rgb = parseHex(baseHex);
  if (!rgb) {
    return { current: baseHex, comparison: "rgba(168, 191, 163, 0.45)" };
  }
  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * 0.42);
  const comparison = `rgb(${mix(rgb.r)}, ${mix(rgb.g)}, ${mix(rgb.b)})`;
  return { current: baseHex, comparison };
}
