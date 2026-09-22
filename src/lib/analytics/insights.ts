import type { DataCitation, Insight, PerformanceRecord } from "@/types/analytics";

import { PLATFORM_BY_ID } from "@/data/platforms";
import { PRODUCTS } from "@/data/products";
import { COMPARISON_PERIOD, CURRENT_PERIOD } from "@/data/scenarios";
import { compareMultipleMetrics, comparePeriods } from "./comparisons";
import { detectAnomalies } from "./anomalies";

export function buildInsights(records: PerformanceRecord[]): Insight[] {
  const insights: Insight[] = [];

  const amazonRoas = comparePeriods(
    records,
    "roas",
    CURRENT_PERIOD,
    COMPARISON_PERIOD,
    { platformId: "amazon" },
  );

  if (amazonRoas.percentageChange <= -10) {
    const contributors = compareMultipleMetrics(
      records,
      ["ad_spend", "conversion_rate", "buy_box_share"],
      CURRENT_PERIOD,
      COMPARISON_PERIOD,
      { platformId: "amazon" },
    ).map((result) => ({
      metric: result.metricId,
      change: result.percentageChange,
    }));

    insights.push({
      id: "insight-001",
      type: "performance_decline",
      title: "ROAS declined on Amazon",
      platformId: "amazon",
      metric: "roas",
      change: amazonRoas.percentageChange,
      severity: "high",
      contributors,
      period: CURRENT_PERIOD,
      comparisonPeriod: COMPARISON_PERIOD,
    });
  }

  const inventoryProductIds = new Set(
    PRODUCTS.filter((product) =>
      product.scenarioTags.includes("inventory_stress"),
    ).map((product) => product.id),
  );

  const inventoryMetrics = compareMultipleMetrics(
    records.filter((record) => inventoryProductIds.has(record.productId)),
    ["lost_sales_from_oos", "stock_availability", "out_of_stock_rate"],
    CURRENT_PERIOD,
    COMPARISON_PERIOD,
  );

  const lostSales = inventoryMetrics.find(
    (metric) => metric.metricId === "lost_sales_from_oos",
  );

  if (lostSales && lostSales.percentageChange >= 12) {
    insights.push({
      id: "insight-002",
      type: "inventory_risk",
      title: "Inventory constraints are increasing lost sales",
      platformId: inventoryProductIds.size
        ? records.find((record) => inventoryProductIds.has(record.productId))
            ?.platformId ?? "blinkit"
        : "blinkit",
      productId: [...inventoryProductIds][0],
      metric: "lost_sales_from_oos",
      change: lostSales.percentageChange,
      severity: "high",
      contributors: inventoryMetrics
        .filter((metric) => metric.metricId !== "lost_sales_from_oos")
        .map((metric) => ({
          metric: metric.metricId,
          change: metric.percentageChange,
        })),
      period: CURRENT_PERIOD,
      comparisonPeriod: COMPARISON_PERIOD,
    });
  }

  const competitiveProductIds = new Set(
    PRODUCTS.filter((product) =>
      product.scenarioTags.includes("competitive_pressure"),
    ).map((product) => product.id),
  );

  const competitiveRecords = records.filter((record) =>
    competitiveProductIds.has(record.productId),
  );

  const competitiveMetrics = compareMultipleMetrics(
    competitiveRecords,
    ["competitor_price", "buy_box_loss_rate", "conversion_rate"],
    CURRENT_PERIOD,
    COMPARISON_PERIOD,
  );

  const buyBoxLoss = competitiveMetrics.find(
    (metric) => metric.metricId === "buy_box_loss_rate",
  );

  if (buyBoxLoss && buyBoxLoss.percentageChange >= 8) {
    insights.push({
      id: "insight-003",
      type: "competitive_pressure",
      title: "Competitor movement is affecting conversion",
      platformId:
        competitiveRecords[0]?.platformId ?? "amazon",
      productId: competitiveRecords[0]?.productId,
      metric: "buy_box_loss_rate",
      change: buyBoxLoss.percentageChange,
      severity: "medium",
      contributors: competitiveMetrics
        .filter((metric) => metric.metricId !== "buy_box_loss_rate")
        .map((metric) => ({
          metric: metric.metricId,
          change: metric.percentageChange,
        })),
      period: CURRENT_PERIOD,
      comparisonPeriod: COMPARISON_PERIOD,
    });
  }

  const zeptoRoas = comparePeriods(
    records,
    "platform_roas",
    CURRENT_PERIOD,
    COMPARISON_PERIOD,
    { platformId: "zepto" },
  );
  const flipkartConversion = comparePeriods(
    records,
    "platform_conversion",
    CURRENT_PERIOD,
    COMPARISON_PERIOD,
    { platformId: "flipkart" },
  );

  if (zeptoRoas.current > flipkartConversion.current) {
    insights.push({
      id: "insight-004",
      type: "platform_shift",
      title: "Platform performance diverges across traffic and efficiency",
      platformId: "zepto",
      metric: "platform_roas",
      change: zeptoRoas.percentageChange,
      severity: "medium",
      contributors: [
        { metric: "platform_roas", change: zeptoRoas.percentageChange },
        {
          metric: "platform_conversion",
          change: flipkartConversion.percentageChange,
        },
      ],
      period: CURRENT_PERIOD,
      comparisonPeriod: COMPARISON_PERIOD,
    });
  }

  return insights;
}

export function buildCitation(input: {
  platformId: PerformanceRecord["platformId"];
  period: { start: string; end: string };
  dataType: string;
  brandId?: string;
  productId?: string;
  metricIds?: Insight["metric"][];
}): DataCitation {
  return {
    platform: PLATFORM_BY_ID[input.platformId].name,
    platformId: input.platformId,
    dataType: input.dataType,
    periodStart: input.period.start,
    periodEnd: input.period.end,
    brandId: input.brandId,
    productId: input.productId,
    metricIds: input.metricIds,
  };
}

export const GENERATED_ANOMALIES = detectAnomalies;
export const GENERATED_INSIGHTS = buildInsights;
