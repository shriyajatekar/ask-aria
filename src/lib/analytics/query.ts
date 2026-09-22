import type {
  AnalyticsQueryFilters,
  DateRange,
  MetricId,
  PerformanceRecord,
} from "@/types/analytics";

function isWithinRange(date: string, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

export function queryPerformanceRecords(
  records: PerformanceRecord[],
  filters: AnalyticsQueryFilters = {},
): PerformanceRecord[] {
  return records.filter((record) => {
    if (filters.platformIds?.length && !filters.platformIds.includes(record.platformId)) {
      return false;
    }
    if (filters.brandIds?.length && !filters.brandIds.includes(record.brandId)) {
      return false;
    }
    if (filters.productIds?.length && !filters.productIds.includes(record.productId)) {
      return false;
    }
    if (
      filters.dateRange &&
      !isWithinRange(record.date, filters.dateRange)
    ) {
      return false;
    }
    if (filters.category) {
      // Category filtering is resolved at product join time by callers.
      return true;
    }
    return true;
  });
}

export function extractMetricSeries(
  records: PerformanceRecord[],
  metricId: MetricId,
): Array<{ date: string; value: number }> {
  return records
    .map((record) => ({
      date: record.date,
      value: record.metrics[metricId],
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface AnalyticsEvidenceBundle {
  filters: AnalyticsQueryFilters;
  records: PerformanceRecord[];
  metricSeries: Partial<Record<MetricId, Array<{ date: string; value: number }>>>;
}

export function buildEvidenceBundle(
  records: PerformanceRecord[],
  filters: AnalyticsQueryFilters,
  metricIds: MetricId[],
): AnalyticsEvidenceBundle {
  const filtered = queryPerformanceRecords(records, filters);
  const metricSeries: AnalyticsEvidenceBundle["metricSeries"] = {};

  for (const metricId of metricIds) {
    metricSeries[metricId] = extractMetricSeries(filtered, metricId);
  }

  return {
    filters,
    records: filtered,
    metricSeries,
  };
}
