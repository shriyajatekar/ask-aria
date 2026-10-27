import type {
  DateRange,
  MetricId,
  PerformanceRecord,
  PeriodComparisonResult,
} from "@/types/analytics";

import {
  averageMetricById,
  calculateChange,
  calculatePercentageChange,
  getTrendDirection,
  sumMetricById,
} from "./calculations";

function isWithinRange(date: string, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

function filterRecordsByRange(
  records: PerformanceRecord[],
  range: DateRange,
): PerformanceRecord[] {
  return records.filter((record) => isWithinRange(record.date, range));
}

/**
 * Ratio metrics are recomputed from their totals (total ad sales ÷ total ad
 * spend), never as an average of daily ratios — averaging ratios gives a
 * small day the same weight as a big one, and breaks driver breakdowns.
 */
const RATIO_METRICS: Partial<
  Record<MetricId, { numerator: MetricId; denominator: MetricId; scale: number }>
> = {
  roas: { numerator: "ad_sales", denominator: "ad_spend", scale: 1 },
  acos: { numerator: "ad_spend", denominator: "ad_sales", scale: 100 },
  conversion_rate: { numerator: "orders", denominator: "sessions", scale: 100 },
  average_order_value: { numerator: "revenue", denominator: "orders", scale: 1 },
  cpc: { numerator: "ad_spend", denominator: "ad_clicks", scale: 1 },
  ad_ctr: { numerator: "ad_clicks", denominator: "ad_impressions", scale: 100 },
};

export function isRatioMetric(metricId: MetricId): boolean {
  return metricId in RATIO_METRICS;
}

function aggregateMetricForRange(
  records: PerformanceRecord[],
  metricId: MetricId,
  aggregation: "sum" | "average",
): number {
  const ratio = RATIO_METRICS[metricId];
  if (ratio) {
    const denominator = sumMetricById(records, ratio.denominator);
    if (denominator === 0) return 0;
    return (sumMetricById(records, ratio.numerator) / denominator) * ratio.scale;
  }
  if (aggregation === "sum") return sumMetricById(records, metricId);
  return averageMetricById(records, metricId);
}

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

export function comparePeriods(
  records: PerformanceRecord[],
  metricId: MetricId,
  currentPeriod: DateRange,
  comparisonPeriod: DateRange,
  filters?: {
    platformId?: PerformanceRecord["platformId"];
    brandId?: string;
    productId?: string;
  },
): PeriodComparisonResult {
  const applyFilters = (input: PerformanceRecord[]) =>
    input.filter((record) => {
      if (filters?.platformId && record.platformId !== filters.platformId) {
        return false;
      }
      if (filters?.brandId && record.brandId !== filters.brandId) return false;
      if (filters?.productId && record.productId !== filters.productId) {
        return false;
      }
      return true;
    });

  const currentRecords = applyFilters(filterRecordsByRange(records, currentPeriod));
  const previousRecords = applyFilters(
    filterRecordsByRange(records, comparisonPeriod),
  );

  const aggregation = SUM_METRICS.has(metricId) ? "sum" : "average";
  const current = aggregateMetricForRange(currentRecords, metricId, aggregation);
  const previous = aggregateMetricForRange(previousRecords, metricId, aggregation);

  return {
    metricId,
    current,
    previous,
    absoluteChange: calculateChange(current, previous),
    percentageChange: calculatePercentageChange(current, previous),
    direction: getTrendDirection(current, previous),
  };
}

export function compareMultipleMetrics(
  records: PerformanceRecord[],
  metricIds: MetricId[],
  currentPeriod: DateRange,
  comparisonPeriod: DateRange,
  filters?: Parameters<typeof comparePeriods>[4],
): PeriodComparisonResult[] {
  return metricIds.map((metricId) =>
    comparePeriods(records, metricId, currentPeriod, comparisonPeriod, filters),
  );
}

export function aggregateMetric(
  records: PerformanceRecord[],
  metricId: MetricId,
  aggregation: "sum" | "average" = "sum",
): number {
  return aggregateMetricForRange(records, metricId, aggregation);
}
