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

/**
 * The demo timeline rolls forward: the synthetic dataset always ends
 * yesterday (UTC) and covers the 76 days up to it, so the dashboard
 * opens on the real last 30 days. Each day's numbers depend on its position
 * in the timeline, not its calendar date, so the story (and the golden path)
 * is the same every day; only the dates move.
 */
export const DATASET_DAYS = 76;

const DAY_MS = 86_400_000;

function isoDaysBefore(endIso: string, days: number): string {
  return new Date(Date.parse(`${endIso}T00:00:00.000Z`) - days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** Yesterday in UTC, the last full day of data. */
export function datasetEndFor(now: number = Date.now()): string {
  return new Date(now - DAY_MS).toISOString().slice(0, 10);
}

const DATASET_END = datasetEndFor();

export const PERFORMANCE_DATE_RANGE = {
  start: isoDaysBefore(DATASET_END, DATASET_DAYS - 1),
  end: DATASET_END,
};

/** Recent window used for scenario emphasis and comparisons: last 30 days. */
export const CURRENT_PERIOD = {
  start: isoDaysBefore(DATASET_END, 29),
  end: DATASET_END,
};

/** The 29 days before the current period. */
export const COMPARISON_PERIOD = {
  start: isoDaysBefore(DATASET_END, 58),
  end: isoDaysBefore(DATASET_END, 30),
};

/** Amazon ROAS decline intensifies over the last 23 days. */
export const ROAS_DECLINE_WINDOW = {
  start: isoDaysBefore(DATASET_END, 22),
  end: DATASET_END,
};
