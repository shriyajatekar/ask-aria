import type { MetricId, PerformanceRecord, PlatformId, Product } from "@/types/analytics";

import { PRODUCTS } from "./products";
import {
  COMPARISON_PERIOD,
  CURRENT_PERIOD,
  PERFORMANCE_DATE_RANGE,
  ROAS_DECLINE_WINDOW,
} from "./scenarios";

interface PlatformProfile {
  trafficMultiplier: number;
  conversionBase: number;
  roasBase: number;
  adSpendBase: number;
  organicShare: number;
  marketShareBase: number;
}

const PLATFORM_PROFILES: Record<PlatformId, PlatformProfile> = {
  amazon: {
    trafficMultiplier: 1.35,
    conversionBase: 2.75,
    roasBase: 3.4,
    adSpendBase: 4200,
    organicShare: 0.42,
    marketShareBase: 14.5,
  },
  flipkart: {
    trafficMultiplier: 1.55,
    conversionBase: 1.65,
    roasBase: 2.6,
    adSpendBase: 3600,
    organicShare: 0.38,
    marketShareBase: 16.2,
  },
  myntra: {
    trafficMultiplier: 1.05,
    conversionBase: 2.35,
    roasBase: 3.0,
    adSpendBase: 2800,
    organicShare: 0.45,
    marketShareBase: 9.8,
  },
  nykaa: {
    trafficMultiplier: 0.95,
    conversionBase: 2.9,
    roasBase: 3.2,
    adSpendBase: 2500,
    organicShare: 0.48,
    marketShareBase: 11.4,
  },
  purple: {
    trafficMultiplier: 0.72,
    conversionBase: 2.5,
    roasBase: 2.9,
    adSpendBase: 1800,
    organicShare: 0.52,
    marketShareBase: 6.1,
  },
  ajio: {
    trafficMultiplier: 0.88,
    conversionBase: 2.1,
    roasBase: 2.7,
    adSpendBase: 2100,
    organicShare: 0.4,
    marketShareBase: 7.5,
  },
  zepto: {
    trafficMultiplier: 0.68,
    conversionBase: 3.05,
    roasBase: 4.2,
    adSpendBase: 1900,
    organicShare: 0.35,
    marketShareBase: 5.4,
  },
  swiggy_instamart: {
    trafficMultiplier: 0.74,
    conversionBase: 2.85,
    roasBase: 3.6,
    adSpendBase: 1700,
    organicShare: 0.33,
    marketShareBase: 6.8,
  },
  blinkit: {
    trafficMultiplier: 0.82,
    conversionBase: 2.95,
    roasBase: 3.1,
    adSpendBase: 2000,
    organicShare: 0.31,
    marketShareBase: 7.9,
  },
  indiamart: {
    trafficMultiplier: 0.58,
    conversionBase: 1.45,
    roasBase: 2.2,
    adSpendBase: 1400,
    organicShare: 0.55,
    marketShareBase: 4.2,
  },
  bigbasket: {
    trafficMultiplier: 0.76,
    conversionBase: 2.4,
    roasBase: 2.8,
    adSpendBase: 1650,
    organicShare: 0.36,
    marketShareBase: 5.8,
  },
  tata_cliq: {
    trafficMultiplier: 0.84,
    conversionBase: 2.05,
    roasBase: 2.65,
    adSpendBase: 1950,
    organicShare: 0.41,
    marketShareBase: 6.4,
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hashSeed(...parts: string[]): number {
  let hash = 2166136261;
  for (const part of parts) {
    for (let i = 0; i < part.length; i += 1) {
      hash ^= part.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
  }
  return (hash >>> 0) / 4294967295;
}

function enumerateDates(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);
  while (cursor <= endDate) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function isWithinRange(date: string, range: { start: string; end: string }): boolean {
  return date >= range.start && date <= range.end;
}

function emptyMetrics(): Record<MetricId, number> {
  return {
    gross_sales: 0,
    net_sales: 0,
    revenue: 0,
    orders: 0,
    units_sold: 0,
    average_order_value: 0,
    sales_growth: 0,
    revenue_contribution: 0,
    impressions: 0,
    product_views: 0,
    clicks: 0,
    click_through_rate: 0,
    search_impressions: 0,
    search_clicks: 0,
    organic_traffic: 0,
    paid_traffic: 0,
    conversion_rate: 0,
    add_to_cart_rate: 0,
    cart_to_order_rate: 0,
    product_page_conversion: 0,
    checkout_conversion: 0,
    sessions: 0,
    orders_per_session: 0,
    repeat_purchase_rate: 0,
    ad_spend: 0,
    ad_sales: 0,
    ad_impressions: 0,
    ad_clicks: 0,
    ad_ctr: 0,
    cpc: 0,
    acos: 0,
    roas: 0,
    sku_sales: 0,
    sku_units_sold: 0,
    sku_conversion_rate: 0,
    sku_revenue_share: 0,
    sku_product_views: 0,
    product_rank: 0,
    buy_box_share: 0,
    product_rating: 0,
    current_stock: 0,
    stock_availability: 0,
    days_of_inventory: 0,
    out_of_stock_rate: 0,
    low_stock_skus: 0,
    stock_turnover: 0,
    inventory_value: 0,
    lost_sales_from_oos: 0,
    platform_revenue: 0,
    platform_growth: 0,
    platform_orders: 0,
    platform_aov: 0,
    platform_conversion: 0,
    platform_roas: 0,
    platform_market_share: 0,
    platform_contribution: 0,
    competitor_price: 0,
    price_difference: 0,
    competitor_rating: 0,
    competitor_review_count: 0,
    competitor_rank: 0,
    category_rank: 0,
    buy_box_loss_rate: 0,
    competitor_availability: 0,
  };
}

function applyScenarioModifiers(
  product: Product,
  date: string,
  dayIndex: number,
  profile: PlatformProfile,
  base: {
    conversionRate: number;
    roas: number;
    adSpend: number;
    buyBoxShare: number;
    stockAvailability: number;
    competitorPriceDelta: number;
    trafficMultiplier: number;
  },
) {
  const next = { ...base };

  if (product.scenarioTags.includes("top_performer")) {
    next.conversionRate += 1.1;
    next.roas += 0.8;
    next.buyBoxShare += 8;
  }

  if (product.scenarioTags.includes("underperformer")) {
    const decline = dayIndex * 0.015;
    next.conversionRate -= 0.35 + decline;
    next.roas -= 0.25 + decline * 0.08;
    next.adSpend += 350 + dayIndex * 4;
  }

  if (product.scenarioTags.includes("inventory_stress")) {
    const stressProgress = clamp((dayIndex - 20) / 40, 0, 1);
    next.stockAvailability = clamp(96 - stressProgress * 38, 52, 96);
  }

  if (product.scenarioTags.includes("competitive_pressure")) {
    const pressureProgress = clamp((dayIndex - 25) / 30, 0, 1);
    next.competitorPriceDelta -= 35 * pressureProgress;
    next.buyBoxShare -= 10 * pressureProgress;
    next.conversionRate -= 0.45 * pressureProgress;
  }

  if (
    product.platformId === "amazon" &&
    product.scenarioTags.includes("amazon_portfolio") &&
    isWithinRange(date, ROAS_DECLINE_WINDOW)
  ) {
    const windowStart = new Date(`${ROAS_DECLINE_WINDOW.start}T00:00:00.000Z`).getTime();
    const windowEnd = new Date(`${ROAS_DECLINE_WINDOW.end}T00:00:00.000Z`).getTime();
    const current = new Date(`${date}T00:00:00.000Z`).getTime();
    const declineProgress = clamp(
      (current - windowStart) / Math.max(windowEnd - windowStart, 1),
      0,
      1,
    );
    next.adSpend *= 1 + 0.35 * declineProgress;
    next.roas *= 1 - 0.28 * declineProgress;
    next.conversionRate -= 0.55 * declineProgress;
    next.buyBoxShare -= 12 * declineProgress;
  }

  if (product.platformId === "flipkart") {
    next.trafficMultiplier *= 1.08;
    next.conversionRate -= 0.25;
  }

  if (product.platformId === "zepto") {
    next.trafficMultiplier *= 0.92;
    next.roas += 0.45;
  }

  if (product.platformId === "blinkit") {
    next.stockAvailability = clamp(next.stockAvailability - 6, 58, 100);
  }

  next.conversionRate = clamp(next.conversionRate, 0.6, 6.5);
  next.roas = clamp(next.roas, 0.8, 6.5);
  next.buyBoxShare = clamp(next.buyBoxShare, 18, 98);
  next.stockAvailability = clamp(next.stockAvailability, 45, 100);

  return next;
}

function buildRecord(
  product: Product,
  date: string,
  dayIndex: number,
  previousRevenue: number,
): PerformanceRecord {
  const profile = PLATFORM_PROFILES[product.platformId];
  const noise = hashSeed(product.id, date);
  const weekendBoost = [0, 6].includes(new Date(`${date}T00:00:00.000Z`).getUTCDay())
    ? 1.08
    : 1;

  const scenario = applyScenarioModifiers(product, date, dayIndex, profile, {
    conversionRate: profile.conversionBase + (noise - 0.5) * 0.35,
    roas: profile.roasBase + (noise - 0.5) * 0.25,
    adSpend: profile.adSpendBase * (0.85 + noise * 0.35),
    buyBoxShare: 62 + noise * 20,
    stockAvailability: 92 - (noise > 0.82 ? 18 : 0),
    competitorPriceDelta: (noise - 0.5) * 20,
    trafficMultiplier: profile.trafficMultiplier * weekendBoost,
  });

  const sessions = Math.round(
    (180 + noise * 260) * scenario.trafficMultiplier * (0.95 + dayIndex * 0.002),
  );
  const conversionRate = scenario.conversionRate;
  const orders = Math.max(1, Math.round((sessions * conversionRate) / 100));
  const unitsSold = Math.max(orders, Math.round(orders * (1.02 + noise * 0.12)));
  const averageOrderValue = Math.round(product.price * (0.92 + noise * 0.16));
  const revenue = orders * averageOrderValue;
  const grossSales = Math.round(revenue * 1.025);
  const netSales = Math.round(revenue * 0.975);

  const productViews = Math.round(sessions * (1.35 + noise * 0.45));
  const impressions = Math.round(productViews * (2.4 + noise * 0.8));
  const clickThroughRate = clamp((productViews / Math.max(impressions, 1)) * 100, 1.2, 9.5);
  const clicks = Math.max(1, Math.round((impressions * clickThroughRate) / 100));
  const searchImpressions = Math.round(impressions * 0.58);
  const searchClicks = Math.round(clicks * 0.52);
  const organicTraffic = Math.round(sessions * profile.organicShare);
  const paidTraffic = Math.max(0, sessions - organicTraffic);

  const addToCartRate = clamp(conversionRate * (2.2 + noise * 0.5), 3, 18);
  const addToCartEvents = Math.max(orders + 1, Math.round((productViews * addToCartRate) / 100));
  const cartToOrderRate = clamp((orders / addToCartEvents) * 100, 18, 72);
  const productPageConversion = clamp((orders / Math.max(productViews, 1)) * 100, 0.8, 8.5);
  const checkoutConversion = clamp(cartToOrderRate * 0.92, 16, 68);
  const ordersPerSession = Number((orders / Math.max(sessions, 1)).toFixed(3));
  const repeatPurchaseRate = clamp(18 + noise * 22, 12, 48);

  const adSpend = Math.round(scenario.adSpend * (0.75 + noise * 0.35));
  const roas = scenario.roas;
  const adSales = Math.round(adSpend * roas);
  const adImpressions = Math.round(adSpend * (2.1 + noise * 0.6));
  const adCtr = clamp(0.35 + noise * 0.55, 0.25, 1.8);
  const adClicks = Math.max(1, Math.round((adImpressions * adCtr) / 100));
  const cpc = Number((adSpend / Math.max(adClicks, 1)).toFixed(2));
  const acos = Number(((adSpend / Math.max(adSales, 1)) * 100).toFixed(2));

  const competitorPrice = Math.max(
    99,
    Math.round(product.price + scenario.competitorPriceDelta),
  );
  const priceDifference = Number((product.price - competitorPrice).toFixed(2));
  const competitorRating = clamp(product.rating - 0.2 + noise * 0.35, 3.2, 4.8);
  const competitorReviewCount = Math.round(product.reviewCount * (0.8 + noise * 0.6));
  const categoryRank = Math.max(1, Math.round(8 + noise * 40 + dayIndex * 0.05));
  const competitorRank = Math.max(1, categoryRank - Math.round(noise * 6));
  const buyBoxShare = scenario.buyBoxShare;
  const buyBoxLossRate = clamp(100 - buyBoxShare, 2, 45);

  const stockAvailability = scenario.stockAvailability;
  const outOfStockRate = clamp(100 - stockAvailability, 0, 55);
  const currentStock = Math.max(
    0,
    Math.round((120 + noise * 180) * (stockAvailability / 100)),
  );
  const dailyDemand = Math.max(unitsSold, 1);
  const daysOfInventory = Number(
    (currentStock / Math.max(dailyDemand * 0.85, 1)).toFixed(1),
  );
  const inventoryValue = Math.round(currentStock * product.cost);
  const lostSalesFromOos = Math.round(
    (outOfStockRate / 100) * netSales * (1.2 + noise * 0.4),
  );
  const stockTurnover = Number(
    (netSales / Math.max(inventoryValue, 1)).toFixed(2),
  );
  const lowStockSkus = currentStock < 35 ? 1 : 0;

  const salesGrowth =
    previousRevenue > 0
      ? Number((((revenue - previousRevenue) / previousRevenue) * 100).toFixed(2))
      : 0;

  const metrics = emptyMetrics();
  metrics.gross_sales = grossSales;
  metrics.net_sales = netSales;
  metrics.revenue = revenue;
  metrics.orders = orders;
  metrics.units_sold = unitsSold;
  metrics.average_order_value = averageOrderValue;
  metrics.sales_growth = salesGrowth;
  metrics.impressions = impressions;
  metrics.product_views = productViews;
  metrics.clicks = clicks;
  metrics.click_through_rate = Number(clickThroughRate.toFixed(2));
  metrics.search_impressions = searchImpressions;
  metrics.search_clicks = searchClicks;
  metrics.organic_traffic = organicTraffic;
  metrics.paid_traffic = paidTraffic;
  metrics.conversion_rate = Number(conversionRate.toFixed(2));
  metrics.add_to_cart_rate = Number(addToCartRate.toFixed(2));
  metrics.cart_to_order_rate = Number(cartToOrderRate.toFixed(2));
  metrics.product_page_conversion = Number(productPageConversion.toFixed(2));
  metrics.checkout_conversion = Number(checkoutConversion.toFixed(2));
  metrics.sessions = sessions;
  metrics.orders_per_session = ordersPerSession;
  metrics.repeat_purchase_rate = Number(repeatPurchaseRate.toFixed(2));
  metrics.ad_spend = adSpend;
  metrics.ad_sales = adSales;
  metrics.ad_impressions = adImpressions;
  metrics.ad_clicks = adClicks;
  metrics.ad_ctr = Number(adCtr.toFixed(2));
  metrics.cpc = cpc;
  metrics.acos = acos;
  metrics.roas = Number(roas.toFixed(2));
  metrics.sku_sales = netSales;
  metrics.sku_units_sold = unitsSold;
  metrics.sku_conversion_rate = Number(conversionRate.toFixed(2));
  metrics.sku_product_views = productViews;
  metrics.product_rank = categoryRank;
  metrics.buy_box_share = Number(buyBoxShare.toFixed(2));
  metrics.product_rating = product.rating;
  metrics.current_stock = currentStock;
  metrics.stock_availability = Number(stockAvailability.toFixed(2));
  metrics.days_of_inventory = daysOfInventory;
  metrics.out_of_stock_rate = Number(outOfStockRate.toFixed(2));
  metrics.low_stock_skus = lowStockSkus;
  metrics.stock_turnover = stockTurnover;
  metrics.inventory_value = inventoryValue;
  metrics.lost_sales_from_oos = lostSalesFromOos;
  metrics.platform_revenue = revenue;
  metrics.platform_growth = salesGrowth;
  metrics.platform_orders = orders;
  metrics.platform_aov = averageOrderValue;
  metrics.platform_conversion = Number(conversionRate.toFixed(2));
  metrics.platform_roas = Number(roas.toFixed(2));
  metrics.platform_market_share = Number(
    (profile.marketShareBase + (noise - 0.5) * 1.5).toFixed(2),
  );
  metrics.competitor_price = competitorPrice;
  metrics.price_difference = priceDifference;
  metrics.competitor_rating = Number(competitorRating.toFixed(1));
  metrics.competitor_review_count = competitorReviewCount;
  metrics.competitor_rank = competitorRank;
  metrics.category_rank = categoryRank;
  metrics.buy_box_loss_rate = Number(buyBoxLossRate.toFixed(2));
  metrics.competitor_availability = Number(
    clamp(88 + noise * 10 - (product.scenarioTags.includes("competitive_pressure") ? 8 : 0), 65, 99).toFixed(2),
  );

  return {
    date,
    platformId: product.platformId,
    brandId: product.brandId,
    productId: product.id,
    metrics,
  };
}

function applyShareMetrics(records: PerformanceRecord[]): void {
  const totalsByDate = new Map<string, number>();

  for (const record of records) {
    const key = record.date;
    totalsByDate.set(key, (totalsByDate.get(key) ?? 0) + record.metrics.revenue);
  }

  const totalsByDatePlatform = new Map<string, number>();
  const totalsByDateBrandPlatform = new Map<string, number>();

  for (const record of records) {
    const platformKey = `${record.date}|${record.platformId}`;
    totalsByDatePlatform.set(
      platformKey,
      (totalsByDatePlatform.get(platformKey) ?? 0) + record.metrics.revenue,
    );
    const brandPlatformKey = `${record.date}|${record.platformId}|${record.brandId}`;
    totalsByDateBrandPlatform.set(
      brandPlatformKey,
      (totalsByDateBrandPlatform.get(brandPlatformKey) ?? 0) + record.metrics.revenue,
    );
  }

  for (const record of records) {
    const dayTotal = totalsByDate.get(record.date) ?? 1;
    const platformTotal =
      totalsByDatePlatform.get(`${record.date}|${record.platformId}`) ?? 1;
    const brandPlatformTotal =
      totalsByDateBrandPlatform.get(
        `${record.date}|${record.platformId}|${record.brandId}`,
      ) ?? 1;

    record.metrics.revenue_contribution = Number(
      ((record.metrics.revenue / dayTotal) * 100).toFixed(2),
    );
    record.metrics.platform_contribution = record.metrics.revenue_contribution;
    record.metrics.sku_revenue_share = Number(
      ((record.metrics.revenue / brandPlatformTotal) * 100).toFixed(2),
    );
    record.metrics.platform_revenue = platformTotal;
  }
}

export function generatePerformanceData(): PerformanceRecord[] {
  const dates = enumerateDates(
    PERFORMANCE_DATE_RANGE.start,
    PERFORMANCE_DATE_RANGE.end,
  );
  const records: PerformanceRecord[] = [];
  const previousRevenueByProduct = new Map<string, number>();

  for (const date of dates) {
    const dayIndex = dates.indexOf(date);
    for (const product of PRODUCTS) {
      const previousRevenue = previousRevenueByProduct.get(product.id) ?? 0;
      const record = buildRecord(product, date, dayIndex, previousRevenue);
      records.push(record);
      previousRevenueByProduct.set(product.id, record.metrics.revenue);
    }
  }

  applyShareMetrics(records);
  return records;
}

export const PERFORMANCE_RECORDS = generatePerformanceData();

export const PERFORMANCE_DATES = enumerateDates(
  PERFORMANCE_DATE_RANGE.start,
  PERFORMANCE_DATE_RANGE.end,
);

export const ANALYTICS_PERIODS = {
  fullRange: PERFORMANCE_DATE_RANGE,
  currentPeriod: CURRENT_PERIOD,
  comparisonPeriod: COMPARISON_PERIOD,
  roasDeclineWindow: ROAS_DECLINE_WINDOW,
};
