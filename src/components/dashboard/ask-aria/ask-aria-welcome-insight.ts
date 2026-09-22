import { PERFORMANCE_RECORDS } from "@/data/performance";
import { METRIC_BY_ID } from "@/data/metrics";
import { calculatePercentageChange } from "@/lib/analytics/calculations";
import { aggregateMetric } from "@/lib/analytics/comparisons";
import {
  areAllPlatformsSelected,
  normalizeSelectedPlatformIds,
} from "@/lib/dashboard/consolidated-platforms";
import {
  filterPerformanceRecords,
  getMetricAggregationType,
} from "@/lib/dashboard/filter-records";
import type { MetricId } from "@/types/analytics";

import type { AskAriaDashboardView } from "./ask-aria-prompts";

export interface WelcomeInsightSnapshot {
  headline: string;
  subline: string;
}

function scopeRecords(view: AskAriaDashboardView) {
  const base = {
    brandId: view.brandId,
    category: view.category,
    subcategory: view.subcategory,
    productId: view.productId,
  };

  if (view.platform !== "all") {
    return {
      current: filterPerformanceRecords(PERFORMANCE_RECORDS, {
        ...base,
        platformId: view.platform,
        dateRange: view.dateRange,
      }),
      comparison: filterPerformanceRecords(PERFORMANCE_RECORDS, {
        ...base,
        platformId: view.platform,
        dateRange: view.comparisonPeriod,
      }),
    };
  }

  const selected = normalizeSelectedPlatformIds(
    view.consolidatedSelectedPlatformIds,
  );
  const filterPlatforms = (records: typeof PERFORMANCE_RECORDS) => {
    if (areAllPlatformsSelected(view.consolidatedSelectedPlatformIds)) {
      return records;
    }
    const allowed = new Set(selected);
    return records.filter((record) => allowed.has(record.platformId));
  };

  const current = filterPlatforms(
    filterPerformanceRecords(PERFORMANCE_RECORDS, {
      ...base,
      dateRange: view.dateRange,
    }),
  );
  const comparison = filterPlatforms(
    filterPerformanceRecords(PERFORMANCE_RECORDS, {
      ...base,
      dateRange: view.comparisonPeriod,
    }),
  );

  return { current, comparison };
}

function metricChangePhrase(
  metricId: MetricId,
  current: number,
  previous: number,
): string {
  const name = METRIC_BY_ID[metricId]?.name ?? metricId;
  const pct = calculatePercentageChange(current, previous);
  if (Math.abs(pct) <= 0.05) {
    return `${name} is unchanged`;
  }
  const plural = metricId === "gross_sales" || metricId === "orders";
  const verb =
    pct > 0
      ? plural
        ? "are up"
        : "is up"
      : plural
        ? "are down"
        : "is down";
  return `${name} ${verb} ${Math.abs(pct).toFixed(1)}%`;
}

export function buildWelcomeInsight(
  view: AskAriaDashboardView,
): WelcomeInsightSnapshot {
  const { current, comparison } = scopeRecords(view);

  const salesAgg = getMetricAggregationType("gross_sales");
  const roasAgg = getMetricAggregationType("roas");

  const salesCurrent = aggregateMetric(current, "gross_sales", salesAgg);
  const salesPrevious = aggregateMetric(comparison, "gross_sales", salesAgg);
  const roasCurrent = aggregateMetric(current, "roas", roasAgg);
  const roasPrevious = aggregateMetric(comparison, "roas", roasAgg);

  const salesPct = calculatePercentageChange(salesCurrent, salesPrevious);
  const roasPct = calculatePercentageChange(roasCurrent, roasPrevious);

  const salesPhrase = metricChangePhrase(
    "gross_sales",
    salesCurrent,
    salesPrevious,
  );
  const roasPhrase = metricChangePhrase("roas", roasCurrent, roasPrevious);

  const headline = `${salesPhrase}, but ${roasPhrase} across your current selection.`;

  let subline = "There's a potential efficiency issue worth investigating.";
  const salesDown = salesPct < -0.5;
  const roasDown = roasPct < -0.5;
  const salesUp = salesPct > 0.5;
  const roasUp = roasPct > 0.5;

  if (salesDown && roasDown) {
    subline = "Both revenue and efficiency moved lower — worth a closer look.";
  } else if (salesUp && roasUp) {
    subline = "Momentum is positive; confirm where to scale next.";
  } else if (salesUp && roasDown) {
    subline = "There's a potential efficiency issue worth investigating.";
  } else if (salesDown && roasUp) {
    subline = "Efficiency improved while revenue softened — check volume drivers.";
  } else {
    subline = "One thing stands out in your current view.";
  }

  if (view.role === "ANALYST") {
    subline = `${subline} Aria can help you investigate drivers and evidence.`;
  } else if (view.role === "KAM") {
    subline = `${subline} Aria can help you prepare account follow-ups and client-ready updates.`;
  } else {
    subline = `${subline} Aria can summarize what matters for leadership focus.`;
  }

  return { headline, subline };
}
