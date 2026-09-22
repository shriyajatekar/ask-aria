import { PERFORMANCE_RECORDS } from "@/data/performance";
import { PLATFORM_BY_ID } from "@/data/platforms";
import { PRODUCT_BY_ID, PRODUCTS } from "@/data/products";
import { aggregateMetric } from "@/lib/analytics/comparisons";
import { rankProducts } from "@/lib/analytics/rankings";
import {
  filterPerformanceRecords,
  getPlatformBreakdown,
  type DashboardRecordFilters,
} from "@/lib/dashboard/filter-records";
import type { DateRange, PlatformId } from "@/types/analytics";

export type SpreadsheetDataset =
  | "underperforming_products"
  | "platform_comparison"
  | "export_performance"
  | "roas_below";

export interface SpreadsheetContentInput {
  title: string;
  periodLabel?: string;
  platformId?: PlatformId | "all";
  dateRange?: DateRange;
  comparisonRange?: DateRange;
  brandId?: string | null;
  productId?: string | null;
  dataset: SpreadsheetDataset;
  roasMax?: number;
}

export interface SpreadsheetBuildResult {
  headers: string[];
  rows: string[][];
  rowCount: number;
}

function baseFilters(input: SpreadsheetContentInput): DashboardRecordFilters {
  return {
    platformId: input.platformId ?? "all",
    brandId: input.brandId,
    productId: input.productId,
    dateRange: input.dateRange,
  };
}

function productName(productId: string): string {
  return PRODUCT_BY_ID[productId]?.name ?? productId;
}

function platformName(platformId: string): string {
  return PLATFORM_BY_ID[platformId as PlatformId]?.name ?? platformId;
}

export function buildSpreadsheetData(
  input: SpreadsheetContentInput,
): SpreadsheetBuildResult {
  const filters = baseFilters(input);
  const current = filterPerformanceRecords(PERFORMANCE_RECORDS, filters);
  const comparisonFilters: DashboardRecordFilters = {
    ...filters,
    dateRange: input.comparisonRange,
  };
  const previous = input.comparisonRange
    ? filterPerformanceRecords(PERFORMANCE_RECORDS, comparisonFilters)
    : [];

  switch (input.dataset) {
    case "platform_comparison": {
      const headers = [
        "Platform",
        "Revenue",
        "Orders",
        "ROAS",
        "Conversion rate",
        "Revenue growth %",
      ];
      const breakdown = getPlatformBreakdown(current, previous);
      const rows = breakdown.map((row) => [
        platformName(row.platformId),
        String(Math.round(row.revenue)),
        String(Math.round(row.orders)),
        row.roas.toFixed(2),
        row.conversion.toFixed(2),
        row.growth.toFixed(1),
      ]);
      return { headers, rows, rowCount: rows.length };
    }
    case "underperforming_products": {
      const headers = [
        "Product",
        "Platform",
        "Revenue",
        "ROAS",
        "Conversion rate",
        "Rating",
      ];
      const underIds = new Set(
        PRODUCTS.filter((p) => p.scenarioTags.includes("underperformer")).map(
          (p) => p.id,
        ),
      );
      const scoped = current.filter((r) => underIds.has(r.productId));
      const ranked = rankProducts(scoped).sort((a, b) => a.roas - b.roas);
      const rows = ranked.map((row) => [
        productName(row.productId),
        platformName(row.platformId),
        String(Math.round(row.revenue)),
        row.roas.toFixed(2),
        row.conversionRate.toFixed(2),
        row.rating.toFixed(2),
      ]);
      return { headers, rows, rowCount: rows.length };
    }
    case "roas_below": {
      const maxRoas = input.roasMax ?? 3;
      const headers = [
        "Product",
        "Platform",
        "ROAS",
        "Revenue",
        "Ad spend",
        "Orders",
      ];
      const ranked = rankProducts(current).filter((row) => row.roas < maxRoas);
      const rows = ranked
        .sort((a, b) => a.roas - b.roas)
        .map((row) => {
          const productRecords = current.filter(
            (r) => r.productId === row.productId,
          );
          return [
            productName(row.productId),
            platformName(row.platformId),
            row.roas.toFixed(2),
            String(Math.round(row.revenue)),
            String(Math.round(aggregateMetric(productRecords, "ad_spend"))),
            String(Math.round(aggregateMetric(productRecords, "orders"))),
          ];
        });
      return { headers, rows, rowCount: rows.length };
    }
    case "export_performance":
    default: {
      const headers = [
        "Product",
        "Platform",
        "Revenue",
        "Orders",
        "ROAS",
        "Conversion rate",
        "Ad spend",
      ];
      const ranked = rankProducts(current);
      const rows = ranked.map((row) => {
        const productRecords = current.filter(
          (r) => r.productId === row.productId,
        );
        return [
          productName(row.productId),
          platformName(row.platformId),
          String(Math.round(row.revenue)),
          String(Math.round(aggregateMetric(productRecords, "orders"))),
          row.roas.toFixed(2),
          row.conversionRate.toFixed(2),
          String(Math.round(aggregateMetric(productRecords, "ad_spend"))),
        ];
      });
      return { headers, rows, rowCount: rows.length };
    }
  }
}

export function countSpreadsheetRows(input: SpreadsheetContentInput): number {
  return buildSpreadsheetData(input).rowCount;
}

export function defaultSpreadsheetTitle(dataset: SpreadsheetDataset): string {
  switch (dataset) {
    case "underperforming_products":
      return "Underperforming products — workspace export";
    case "platform_comparison":
      return "Platform comparison — workspace export";
    case "roas_below":
      return "Low ROAS products — workspace export";
    case "export_performance":
    default:
      return "Performance export — workspace analytics";
  }
}
