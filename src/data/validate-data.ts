import { BRANDS } from "./brands";
import { METRICS, METRIC_BY_ID, METRIC_IDS } from "./metrics";
import { PLATFORMS, PLATFORM_BY_ID } from "./platforms";
import { PRODUCTS, PRODUCT_BY_ID } from "./products";
import {
  ANALYTICS_PERIODS,
  PERFORMANCE_DATES,
  PERFORMANCE_RECORDS,
} from "./performance";
import { SCENARIO_DEFINITIONS } from "./scenarios";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  summary: {
    platforms: number;
    metrics: number;
    products: number;
    performanceRecords: number;
    dateRange: { start: string; end: string; days: number };
  };
}

function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function validateAnalyticsDataset(): ValidationResult {
  const errors: string[] = [];

  if (PLATFORMS.length !== 9) {
    errors.push(`Expected 9 platforms, found ${PLATFORMS.length}.`);
  }

  if (METRICS.length !== 64) {
    errors.push(`Expected 64 metrics, found ${METRICS.length}.`);
  }

  const metricIdSet = new Set(METRIC_IDS);
  if (metricIdSet.size !== METRICS.length) {
    errors.push("Metric IDs must be unique.");
  }

  for (const metric of METRICS) {
    if (!METRIC_BY_ID[metric.id]) {
      errors.push(`Missing metric registry entry for ${metric.id}.`);
    }
  }

  if (PRODUCTS.length < 40 || PRODUCTS.length > 60) {
    errors.push(
      `Expected 40-60 products, found ${PRODUCTS.length}.`,
    );
  }

  for (const product of PRODUCTS) {
    if (!BRANDS.find((brand) => brand.id === product.brandId)) {
      errors.push(`Product ${product.id} references invalid brand ${product.brandId}.`);
    }
    if (!PLATFORM_BY_ID[product.platformId]) {
      errors.push(
        `Product ${product.id} references invalid platform ${product.platformId}.`,
      );
    }
    if (!PRODUCT_BY_ID[product.id]) {
      errors.push(`Product map missing ${product.id}.`);
    }
  }

  for (const record of PERFORMANCE_RECORDS) {
    if (!isValidIsoDate(record.date)) {
      errors.push(`Invalid date on performance record: ${record.date}.`);
    }
    if (!PRODUCT_BY_ID[record.productId]) {
      errors.push(
        `Performance record references invalid product ${record.productId}.`,
      );
    }
    if (!PLATFORM_BY_ID[record.platformId]) {
      errors.push(
        `Performance record references invalid platform ${record.platformId}.`,
      );
    }
    for (const metricId of METRIC_IDS) {
      const value = record.metrics[metricId];
      if (typeof value !== "number" || Number.isNaN(value)) {
        errors.push(
          `Record ${record.productId} ${record.date} missing metric ${metricId}.`,
        );
        break;
      }
    }
  }

  const amazonEarly = PERFORMANCE_RECORDS.filter(
    (record) =>
      record.platformId === "amazon" &&
      record.date >= "2025-12-19" &&
      record.date <= "2026-01-16",
  );
  const amazonLate = PERFORMANCE_RECORDS.filter(
    (record) =>
      record.platformId === "amazon" &&
      record.date >= "2026-01-24" &&
      record.date <= "2026-02-15",
  );
  const avg = (values: number[]) =>
    values.length === 0
      ? 0
      : values.reduce((sum, value) => sum + value, 0) / values.length;
  const earlyRoas = avg(amazonEarly.map((record) => record.metrics.roas));
  const lateRoas = avg(amazonLate.map((record) => record.metrics.roas));

  const scenarioChecks = {
    roasDeclineAmazon: lateRoas > 0 && lateRoas < earlyRoas * 0.92,
    inventoryStress: PRODUCTS.some((product) =>
      product.scenarioTags.includes("inventory_stress"),
    ),
    competitivePressure: PRODUCTS.some((product) =>
      product.scenarioTags.includes("competitive_pressure"),
    ),
    topPerformers: PRODUCTS.some((product) =>
      product.scenarioTags.includes("top_performer"),
    ),
    underperformers: PRODUCTS.some((product) =>
      product.scenarioTags.includes("underperformer"),
    ),
  };

  if (!scenarioChecks.roasDeclineAmazon) {
    errors.push("ROAS decline scenario was not detected in Amazon records.");
  }
  if (!scenarioChecks.inventoryStress) {
    errors.push("Inventory stress scenario products are missing.");
  }
  if (!scenarioChecks.competitivePressure) {
    errors.push("Competitive pressure scenario products are missing.");
  }
  if (!scenarioChecks.topPerformers || !scenarioChecks.underperformers) {
    errors.push("Top/bottom performer scenario products are missing.");
  }

  if (SCENARIO_DEFINITIONS.length < 6) {
    errors.push("Expected at least 6 documented scenario definitions.");
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: {
      platforms: PLATFORMS.length,
      metrics: METRICS.length,
      products: PRODUCTS.length,
      performanceRecords: PERFORMANCE_RECORDS.length,
      dateRange: {
        start: ANALYTICS_PERIODS.fullRange.start,
        end: ANALYTICS_PERIODS.fullRange.end,
        days: PERFORMANCE_DATES.length,
      },
    },
  };
}

export {
  BRANDS,
  METRICS,
  METRIC_BY_ID,
  METRIC_IDS,
  PLATFORMS,
  PLATFORM_BY_ID,
  PRODUCTS,
  PRODUCT_BY_ID,
  PERFORMANCE_RECORDS,
  PERFORMANCE_DATES,
  ANALYTICS_PERIODS,
  SCENARIO_DEFINITIONS,
};
