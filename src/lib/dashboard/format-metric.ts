import { METRIC_BY_ID } from "@/data/metrics";
import type { MetricId } from "@/types/analytics";

export function formatMetricValue(metricId: MetricId, value: number): string {
  const definition = METRIC_BY_ID[metricId];
  if (!definition) return value.toLocaleString("en-IN");

  switch (definition.format) {
    case "currency":
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(value);
    case "percentage":
      return `${value.toFixed(1)}%`;
    case "ratio":
    case "decimal":
      return value.toFixed(2);
    case "integer":
      return new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 0,
      }).format(Math.round(value));
    case "rating":
      return value.toFixed(1);
    case "rank":
      return `#${Math.round(value)}`;
    case "days":
      return `${value.toFixed(1)} days`;
    default:
      return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }
}

export function formatPercentChange(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

export function getMetricCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    sales_revenue: "Sales & Revenue",
    traffic_discovery: "Traffic & Discovery",
    conversion: "Conversion",
    advertising: "Advertising",
    product_sku: "Product & SKU Performance",
    inventory: "Inventory & Availability",
    marketplace_channel: "Marketplace / Channel Performance",
    competitive: "Competitive / Market Intelligence",
  };
  return labels[category] ?? category;
}
