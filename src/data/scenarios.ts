import type { ScenarioDefinition } from "@/types/analytics";

export const SCENARIO_DEFINITIONS: ScenarioDefinition[] = [
  {
    id: "roas-decline-amazon",
    name: "ROAS Decline on Amazon",
    description:
      "Amazon portfolio experiences rising ad spend with falling ROAS, conversion and buy box share in the recent period.",
    platformIds: ["amazon"],
    metricIds: ["roas", "ad_spend", "conversion_rate", "buy_box_share"],
  },
  {
    id: "inventory-constraints",
    name: "Inventory Stockout Pressure",
    description:
      "Selected SKUs show declining stock availability, rising OOS rate and lost sales from stockouts.",
    productTags: ["inventory_stress"],
    metricIds: [
      "stock_availability",
      "out_of_stock_rate",
      "lost_sales_from_oos",
      "current_stock",
    ],
  },
  {
    id: "competitor-movement",
    name: "Competitor Pricing & Rank Shifts",
    description:
      "Competitor price reductions and rank improvements coincide with buy box loss and softer conversion.",
    productTags: ["competitive_pressure"],
    metricIds: [
      "competitor_price",
      "competitor_rank",
      "buy_box_loss_rate",
      "price_difference",
    ],
  },
  {
    id: "platform-differentiation",
    name: "Platform Performance Differentiation",
    description:
      "Platforms diverge on traffic, conversion, ROAS and inventory constraints.",
    metricIds: [
      "platform_conversion",
      "platform_roas",
      "sessions",
      "platform_revenue",
    ],
  },
  {
    id: "top-performers",
    name: "High-Performing Products",
    description:
      "A small cluster of SKUs maintains strong conversion, ROAS, ratings and buy box share.",
    productTags: ["top_performer"],
    metricIds: ["sku_conversion_rate", "roas", "product_rating", "buy_box_share"],
  },
  {
    id: "bottom-performers",
    name: "Underperforming Products",
    description:
      "Several SKUs show declining sales, weak conversion and inefficient ad spend.",
    productTags: ["underperformer"],
    metricIds: ["sku_sales", "conversion_rate", "ad_spend", "roas"],
  },
];

export const PERFORMANCE_DATE_RANGE = {
  start: "2025-12-02",
  end: "2026-02-15",
} as const;

/** Recent window used for scenario emphasis and comparisons */
export const CURRENT_PERIOD = {
  start: "2026-01-17",
  end: "2026-02-15",
} as const;

export const COMPARISON_PERIOD = {
  start: "2025-12-19",
  end: "2026-01-16",
} as const;

/** Amazon ROAS decline intensifies in this window */
export const ROAS_DECLINE_WINDOW = {
  start: "2026-01-24",
  end: "2026-02-15",
} as const;
