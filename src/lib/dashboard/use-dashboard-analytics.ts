"use client";

import { useMemo } from "react";

import { PERFORMANCE_RECORDS } from "@/data/performance";
import { PRODUCTS } from "@/data/products";
import {
  calculateChange,
  calculatePercentageChange,
  getTrendDirection,
} from "@/lib/analytics/calculations";
import { aggregateMetric } from "@/lib/analytics/comparisons";
import {
  getBottomPerformers,
  getTopPerformers,
} from "@/lib/analytics/rankings";
import { useDashboard } from "@/contexts/dashboard-context";
import {
  filterPerformanceRecords,
  getMetricAggregationType,
  getPlatformBreakdown,
} from "@/lib/dashboard/filter-records";
import type { MetricId, PeriodComparisonResult } from "@/types/analytics";

export function useDashboardAnalytics() {
  const dashboard = useDashboard();

  const recordFilters = useMemo(
    () => ({
      platformId: dashboard.platform,
      brandId: dashboard.brandId,
      category: dashboard.category,
      subcategory: dashboard.subcategory,
      productId: dashboard.productId,
    }),
    [
      dashboard.platform,
      dashboard.brandId,
      dashboard.category,
      dashboard.subcategory,
      dashboard.productId,
    ],
  );

  const currentRecords = useMemo(
    () =>
      filterPerformanceRecords(PERFORMANCE_RECORDS, {
        ...recordFilters,
        dateRange: dashboard.dateRange,
      }),
    [recordFilters, dashboard.dateRange],
  );

  const comparisonRecords = useMemo(
    () =>
      filterPerformanceRecords(PERFORMANCE_RECORDS, {
        ...recordFilters,
        dateRange: dashboard.comparisonPeriod,
      }),
    [recordFilters, dashboard.comparisonPeriod],
  );

  const metricComparisons = useMemo(() => {
    return dashboard.selectedMetrics.reduce(
      (accumulator, metricId) => {
        const aggregation = getMetricAggregationType(metricId);
        const current = aggregateMetric(currentRecords, metricId, aggregation);
        const previous = aggregateMetric(
          comparisonRecords,
          metricId,
          aggregation,
        );
        accumulator[metricId] = {
          metricId,
          current,
          previous,
          absoluteChange: calculateChange(current, previous),
          percentageChange: calculatePercentageChange(current, previous),
          direction: getTrendDirection(current, previous),
        };
        return accumulator;
      },
      {} as Record<MetricId, PeriodComparisonResult>,
    );
  }, [
    comparisonRecords,
    currentRecords,
    dashboard.selectedMetrics,
  ]);

  const chartComparisonPlatform =
    dashboard.platform === "all" ? undefined : dashboard.platform;

  const platformBreakdown = useMemo(
    () => getPlatformBreakdown(currentRecords, comparisonRecords),
    [currentRecords, comparisonRecords],
  );

  const topPerformers = useMemo(
    () => getTopPerformers(currentRecords, PRODUCTS, 8),
    [currentRecords],
  );

  const bottomPerformers = useMemo(
    () => getBottomPerformers(currentRecords, PRODUCTS, 8),
    [currentRecords],
  );

  return {
    currentRecords,
    comparisonRecords,
    metricComparisons,
    platformBreakdown,
    topPerformers,
    bottomPerformers,
    chartComparisonPlatform,
  };
}
