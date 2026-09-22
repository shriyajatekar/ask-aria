export const PLATFORM_IDS = [
  "amazon",
  "flipkart",
  "myntra",
  "nykaa",
  "purple",
  "ajio",
  "zepto",
  "swiggy_instamart",
  "blinkit",
  "indiamart",
  "bigbasket",
  "tata_cliq",
] as const;

export type PlatformId = (typeof PLATFORM_IDS)[number];

export const METRIC_CATEGORIES = [
  "sales_revenue",
  "traffic_discovery",
  "conversion",
  "advertising",
  "product_sku",
  "inventory",
  "marketplace_channel",
  "competitive",
] as const;

export type MetricCategory = (typeof METRIC_CATEGORIES)[number];

export const METRIC_FORMATS = [
  "number",
  "currency",
  "percentage",
  "ratio",
  "decimal",
  "integer",
  "rating",
  "rank",
  "days",
] as const;

export type MetricFormat = (typeof METRIC_FORMATS)[number];

export const METRIC_DIRECTIONS = [
  "higher_is_better",
  "lower_is_better",
  "neutral",
] as const;

export type MetricDirection = (typeof METRIC_DIRECTIONS)[number];

export type MetricId =
  | "gross_sales"
  | "net_sales"
  | "revenue"
  | "orders"
  | "units_sold"
  | "average_order_value"
  | "sales_growth"
  | "revenue_contribution"
  | "impressions"
  | "product_views"
  | "clicks"
  | "click_through_rate"
  | "search_impressions"
  | "search_clicks"
  | "organic_traffic"
  | "paid_traffic"
  | "conversion_rate"
  | "add_to_cart_rate"
  | "cart_to_order_rate"
  | "product_page_conversion"
  | "checkout_conversion"
  | "sessions"
  | "orders_per_session"
  | "repeat_purchase_rate"
  | "ad_spend"
  | "ad_sales"
  | "ad_impressions"
  | "ad_clicks"
  | "ad_ctr"
  | "cpc"
  | "acos"
  | "roas"
  | "sku_sales"
  | "sku_units_sold"
  | "sku_conversion_rate"
  | "sku_revenue_share"
  | "sku_product_views"
  | "product_rank"
  | "buy_box_share"
  | "product_rating"
  | "current_stock"
  | "stock_availability"
  | "days_of_inventory"
  | "out_of_stock_rate"
  | "low_stock_skus"
  | "stock_turnover"
  | "inventory_value"
  | "lost_sales_from_oos"
  | "platform_revenue"
  | "platform_growth"
  | "platform_orders"
  | "platform_aov"
  | "platform_conversion"
  | "platform_roas"
  | "platform_market_share"
  | "platform_contribution"
  | "competitor_price"
  | "price_difference"
  | "competitor_rating"
  | "competitor_review_count"
  | "competitor_rank"
  | "category_rank"
  | "buy_box_loss_rate"
  | "competitor_availability";

export interface Platform {
  id: PlatformId;
  name: string;
  channelType: "marketplace" | "quick_commerce" | "beauty_specialty";
  country: string;
  status: "active" | "inactive";
}

export interface Brand {
  id: string;
  name: string;
  category: string;
  status: "active" | "inactive";
}

export type ProductStatus = "active" | "discontinued" | "launch";

export interface Product {
  id: string;
  sku: string;
  name: string;
  brandId: string;
  category: string;
  subcategory: string;
  platformId: PlatformId;
  price: number;
  cost: number;
  rating: number;
  reviewCount: number;
  status: ProductStatus;
  /** Internal scenario tags for synthetic storytelling */
  scenarioTags: string[];
}

export interface MetricDefinition {
  id: MetricId;
  name: string;
  category: MetricCategory;
  description: string;
  unit: string;
  format: MetricFormat;
  direction: MetricDirection;
  availablePlatforms: PlatformId[];
}

export interface PerformanceRecord {
  date: string;
  platformId: PlatformId;
  brandId: string;
  productId: string;
  metrics: Record<MetricId, number>;
}

export interface DateRange {
  start: string;
  end: string;
}

export type TrendDirection = "up" | "down" | "flat";

export interface PeriodComparisonResult {
  metricId: MetricId;
  current: number;
  previous: number;
  absoluteChange: number;
  percentageChange: number;
  direction: TrendDirection;
}

export type AnomalySeverity = "low" | "medium" | "high";

export interface Anomaly {
  id: string;
  metric: MetricId;
  platformId: PlatformId;
  productId?: string;
  date: string;
  direction: "positive" | "negative";
  magnitude: number;
  severity: AnomalySeverity;
  relatedMetrics: MetricId[];
  description: string;
}

export type InsightType =
  | "performance_decline"
  | "performance_improvement"
  | "inventory_risk"
  | "competitive_pressure"
  | "platform_shift";

export interface InsightContributor {
  metric: MetricId;
  change: number;
}

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  platformId: PlatformId;
  brandId?: string;
  productId?: string;
  metric: MetricId;
  change: number;
  severity: AnomalySeverity;
  contributors: InsightContributor[];
  period: DateRange;
  comparisonPeriod: DateRange;
}

export interface DataCitation {
  platform: string;
  platformId: PlatformId;
  dataType: string;
  periodStart: string;
  periodEnd: string;
  brandId?: string;
  productId?: string;
  metricIds?: MetricId[];
}

export interface AnalyticsQueryFilters {
  metricIds?: MetricId[];
  platformIds?: PlatformId[];
  brandIds?: string[];
  productIds?: string[];
  category?: string;
  dateRange?: DateRange;
  comparisonRange?: DateRange;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  platformIds?: PlatformId[];
  productTags?: string[];
  metricIds: MetricId[];
}
