import type {
  DateRange,
  MetricId,
  PerformanceRecord,
  PlatformId,
} from "@/types/analytics";

import { PRODUCTS } from "@/data/products";
import { PLATFORMS } from "@/data/platforms";
import { aggregateMetric } from "@/lib/analytics/comparisons";

const SUM_METRICS = new Set<MetricId>([
  "gross_sales",
  "net_sales",
  "revenue",
  "orders",
  "units_sold",
  "impressions",
  "product_views",
  "clicks",
  "search_impressions",
  "search_clicks",
  "organic_traffic",
  "paid_traffic",
  "sessions",
  "ad_spend",
  "ad_sales",
  "ad_impressions",
  "ad_clicks",
  "sku_sales",
  "sku_units_sold",
  "sku_product_views",
  "current_stock",
  "inventory_value",
  "lost_sales_from_oos",
  "platform_revenue",
  "platform_orders",
  "competitor_review_count",
  "low_stock_skus",
]);

function isWithinRange(date: string, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

export interface DashboardRecordFilters {
  platformId?: PlatformId | "all";
  brandId?: string | null;
  category?: string | null;
  subcategory?: string | null;
  productId?: string | null;
  dateRange?: DateRange;
}

const productById = Object.fromEntries(
  PRODUCTS.map((product) => [product.id, product]),
);

export function filterPerformanceRecords(
  records: PerformanceRecord[],
  filters: DashboardRecordFilters,
): PerformanceRecord[] {
  return records.filter((record) => {
    if (filters.dateRange && !isWithinRange(record.date, filters.dateRange)) {
      return false;
    }
    if (filters.platformId && filters.platformId !== "all") {
      if (record.platformId !== filters.platformId) return false;
    }
    if (filters.brandId && record.brandId !== filters.brandId) return false;
    if (filters.productId && record.productId !== filters.productId) return false;
    if (filters.category) {
      const product = productById[record.productId];
      if (!product || product.category !== filters.category) return false;
    }
    if (filters.subcategory) {
      const product = productById[record.productId];
      if (!product || product.subcategory !== filters.subcategory) return false;
    }
    return true;
  });
}

export function getMetricAggregationType(metricId: MetricId): "sum" | "average" {
  return SUM_METRICS.has(metricId) ? "sum" : "average";
}

export function aggregateMetricSeriesByDate(
  records: PerformanceRecord[],
  metricId: MetricId,
): Array<{ date: string; value: number }> {
  const byDate = new Map<string, PerformanceRecord[]>();

  for (const record of records) {
    const bucket = byDate.get(record.date) ?? [];
    bucket.push(record);
    byDate.set(record.date, bucket);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayRecords]) => ({
      date,
      value: aggregateMetric(
        dayRecords,
        metricId,
        getMetricAggregationType(metricId),
      ),
    }));
}

export function aggregateMetricSeriesWeekly(
  records: PerformanceRecord[],
  metricId: MetricId,
): Array<{ date: string; value: number }> {
  const daily = aggregateMetricSeriesByDate(records, metricId);
  const weekly = new Map<string, PerformanceRecord[]>();

  for (const record of records) {
    const date = parseDate(record.date);
    const weekStart = getWeekStart(date);
    const key = formatDate(weekStart);
    const bucket = weekly.get(key) ?? [];
    bucket.push(record);
    weekly.set(key, bucket);
  }

  return [...weekly.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, weekRecords]) => ({
      date,
      value: aggregateMetric(
        weekRecords,
        metricId,
        getMetricAggregationType(metricId),
      ),
    }));
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getWeekStart(date: Date): Date {
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(date.getTime() + diff * 86400000);
}

export function getPlatformBreakdown(
  records: PerformanceRecord[],
  comparisonRecords: PerformanceRecord[],
) {
  return PLATFORMS.map((platform) => {
    const platformId = platform.id;
    const current = records.filter((record) => record.platformId === platformId);
    const previous = comparisonRecords.filter(
      (record) => record.platformId === platformId,
    );
    const revenue = aggregateMetric(current, "revenue", "sum");
    const previousRevenue = aggregateMetric(previous, "revenue", "sum");
    const growth =
      previousRevenue === 0
        ? 0
        : Number(
            (((revenue - previousRevenue) / previousRevenue) * 100).toFixed(2),
          );

    return {
      platformId,
      revenue,
      orders: aggregateMetric(current, "orders", "sum"),
      conversion: aggregateMetric(current, "conversion_rate", "average"),
      roas: aggregateMetric(current, "roas", "average"),
      growth,
    };
  });
}
