import type { MetricId, PerformanceRecord, Product } from "@/types/analytics";

import { averageMetricById, sumMetricById } from "./calculations";

export interface ProductRankingScore {
  productId: string;
  platformId: PerformanceRecord["platformId"];
  brandId: string;
  score: number;
  revenue: number;
  conversionRate: number;
  roas: number;
  rating: number;
}

function scoreProductRecords(records: PerformanceRecord[]): ProductRankingScore[] {
  const grouped = new Map<string, PerformanceRecord[]>();

  for (const record of records) {
    const existing = grouped.get(record.productId) ?? [];
    existing.push(record);
    grouped.set(record.productId, existing);
  }

  return [...grouped.entries()].map(([productId, productRecords]) => {
    const sample = productRecords[0];
    const revenue = sumMetricById(productRecords, "revenue");
    const conversionRate = averageMetricById(productRecords, "conversion_rate");
    const roas = averageMetricById(productRecords, "roas");
    const rating = averageMetricById(productRecords, "product_rating");
    const buyBoxShare = averageMetricById(productRecords, "buy_box_share");

    const score = Number(
      (
        revenue * 0.00008 +
        conversionRate * 12 +
        roas * 8 +
        rating * 15 +
        buyBoxShare * 0.35
      ).toFixed(4),
    );

    return {
      productId,
      platformId: sample.platformId,
      brandId: sample.brandId,
      score,
      revenue,
      conversionRate,
      roas,
      rating,
    };
  });
}

export function rankProducts(
  records: PerformanceRecord[],
  limit?: number,
): ProductRankingScore[] {
  const ranked = scoreProductRecords(records).sort((a, b) => b.score - a.score);
  return typeof limit === "number" ? ranked.slice(0, limit) : ranked;
}

export function getTopPerformers(
  records: PerformanceRecord[],
  products: Product[],
  limit = 10,
): ProductRankingScore[] {
  const tagged = new Set(
    products
      .filter((product) => product.scenarioTags.includes("top_performer"))
      .map((product) => product.id),
  );

  const filteredRecords = records.filter((record) =>
    tagged.has(record.productId),
  );

  const ranked = rankProducts(filteredRecords);
  return ranked.slice(0, limit);
}

export function getBottomPerformers(
  records: PerformanceRecord[],
  products: Product[],
  limit = 10,
): ProductRankingScore[] {
  const tagged = new Set(
    products
      .filter((product) => product.scenarioTags.includes("underperformer"))
      .map((product) => product.id),
  );

  const filteredRecords = records.filter((record) =>
    tagged.has(record.productId),
  );

  const ranked = scoreProductRecords(filteredRecords).sort(
    (a, b) => a.score - b.score,
  );
  return ranked.slice(0, limit);
}

export function getInventoryAtRiskProducts(
  records: PerformanceRecord[],
  limit = 10,
): Array<{
  productId: string;
  lostSalesFromOos: number;
  stockAvailability: number;
  outOfStockRate: number;
}> {
  const grouped = new Map<string, PerformanceRecord[]>();
  for (const record of records) {
    const list = grouped.get(record.productId) ?? [];
    list.push(record);
    grouped.set(record.productId, list);
  }

  return [...grouped.entries()]
    .map(([productId, productRecords]) => ({
      productId,
      lostSalesFromOos: sumMetricById(productRecords, "lost_sales_from_oos"),
      stockAvailability: averageMetricById(productRecords, "stock_availability"),
      outOfStockRate: averageMetricById(productRecords, "out_of_stock_rate"),
    }))
    .sort((a, b) => b.lostSalesFromOos - a.lostSalesFromOos)
    .slice(0, limit);
}
