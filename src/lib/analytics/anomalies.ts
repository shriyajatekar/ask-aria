import type { Anomaly, MetricId, PerformanceRecord } from "@/types/analytics";

import { PRODUCTS } from "@/data/products";
import { COMPARISON_PERIOD, CURRENT_PERIOD } from "@/data/scenarios";
import { comparePeriods } from "./comparisons";

function severityFromMagnitude(magnitude: number): Anomaly["severity"] {
  const absolute = Math.abs(magnitude);
  if (absolute >= 20) return "high";
  if (absolute >= 10) return "medium";
  return "low";
}

function buildAnomaly(
  partial: Omit<Anomaly, "severity"> & { severity?: Anomaly["severity"] },
): Anomaly {
  return {
    ...partial,
    severity:
      partial.severity ?? severityFromMagnitude(partial.magnitude),
  };
}

export function detectAnomalies(records: PerformanceRecord[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  const amazonRoas = comparePeriods(
    records,
    "roas",
    CURRENT_PERIOD,
    COMPARISON_PERIOD,
    { platformId: "amazon" },
  );

  if (amazonRoas.percentageChange <= -10) {
    anomalies.push(
      buildAnomaly({
        id: "anomaly-amazon-roas-decline",
        metric: "roas",
        platformId: "amazon",
        date: CURRENT_PERIOD.end,
        direction: "negative",
        magnitude: Math.abs(amazonRoas.percentageChange),
        relatedMetrics: ["ad_spend", "conversion_rate", "buy_box_share"],
        description:
          "Amazon ROAS declined in the current period while supporting conversion and buy box signals weakened.",
      }),
    );
  }

  const inventoryProductIds = PRODUCTS.filter((product) =>
    product.scenarioTags.includes("inventory_stress"),
  ).map((product) => product.id);

  const inventoryRecords = records.filter((record) =>
    inventoryProductIds.includes(record.productId),
  );

  const inventoryComparison = comparePeriods(
    inventoryRecords,
    "lost_sales_from_oos",
    CURRENT_PERIOD,
    COMPARISON_PERIOD,
  );

  if (inventoryComparison.percentageChange >= 15) {
    anomalies.push(
      buildAnomaly({
        id: "anomaly-inventory-lost-sales",
        metric: "lost_sales_from_oos",
        platformId: inventoryRecords[0]?.platformId ?? "blinkit",
        productId: inventoryRecords[0]?.productId,
        date: CURRENT_PERIOD.end,
        direction: "negative",
        magnitude: inventoryComparison.percentageChange,
        relatedMetrics: [
          "stock_availability",
          "out_of_stock_rate",
          "current_stock",
        ],
        description:
          "Lost sales from out-of-stock events increased for inventory-stressed SKUs.",
      }),
    );
  }

  const competitiveProductIds = PRODUCTS.filter((product) =>
    product.scenarioTags.includes("competitive_pressure"),
  ).map((product) => product.id);

  const competitiveRecords = records.filter((record) =>
    competitiveProductIds.includes(record.productId),
  );

  const buyBoxLoss = comparePeriods(
    competitiveRecords,
    "buy_box_loss_rate",
    CURRENT_PERIOD,
    COMPARISON_PERIOD,
  );

  if (buyBoxLoss.percentageChange >= 8) {
    anomalies.push(
      buildAnomaly({
        id: "anomaly-competitive-buy-box-loss",
        metric: "buy_box_loss_rate",
        platformId: competitiveRecords[0]?.platformId ?? "amazon",
        date: CURRENT_PERIOD.end,
        direction: "negative",
        magnitude: buyBoxLoss.percentageChange,
        relatedMetrics: [
          "competitor_price",
          "competitor_rank",
          "price_difference",
        ],
        description:
          "Buy box loss increased alongside competitor pricing and rank movement.",
      }),
    );
  }

  const flipkartConversion = comparePeriods(
    records,
    "platform_conversion",
    CURRENT_PERIOD,
    COMPARISON_PERIOD,
    { platformId: "flipkart" },
  );

  if (flipkartConversion.direction === "down") {
    anomalies.push(
      buildAnomaly({
        id: "anomaly-flipkart-conversion-gap",
        metric: "platform_conversion",
        platformId: "flipkart",
        date: CURRENT_PERIOD.end,
        direction: "negative",
        magnitude: Math.abs(flipkartConversion.percentageChange),
        relatedMetrics: ["sessions", "conversion_rate", "paid_traffic"],
        description:
          "Flipkart shows high traffic but weaker conversion relative to the comparison period.",
        severity: "medium",
      }),
    );
  }

  return anomalies;
}

export function detectMetricAnomaly(
  records: PerformanceRecord[],
  metricId: MetricId,
  platformId: PerformanceRecord["platformId"],
): Anomaly | null {
  const comparison = comparePeriods(
    records,
    metricId,
    CURRENT_PERIOD,
    COMPARISON_PERIOD,
    { platformId },
  );

  if (Math.abs(comparison.percentageChange) < 8) return null;

  return buildAnomaly({
    id: `anomaly-${platformId}-${metricId}`,
    metric: metricId,
    platformId,
    date: CURRENT_PERIOD.end,
    direction: comparison.percentageChange >= 0 ? "positive" : "negative",
    magnitude: Math.abs(comparison.percentageChange),
    relatedMetrics: [],
    description: `${metricId} moved ${comparison.percentageChange}% versus the comparison period on ${platformId}.`,
  });
}
