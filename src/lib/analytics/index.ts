import { PERFORMANCE_RECORDS } from "@/data/performance";
import { PRODUCTS } from "@/data/products";

export * from "./calculations";
export * from "./comparisons";
export * from "./rankings";
export * from "./anomalies";
export * from "./insights";
export * from "./query";

import { detectAnomalies } from "./anomalies";
import { buildInsights } from "./insights";
import { getBottomPerformers, getTopPerformers } from "./rankings";

export const SYNTHETIC_ANOMALIES = detectAnomalies(PERFORMANCE_RECORDS);
export const SYNTHETIC_INSIGHTS = buildInsights(PERFORMANCE_RECORDS);
export const SYNTHETIC_TOP_PERFORMERS = getTopPerformers(
  PERFORMANCE_RECORDS,
  PRODUCTS,
);
export const SYNTHETIC_BOTTOM_PERFORMERS = getBottomPerformers(
  PERFORMANCE_RECORDS,
  PRODUCTS,
);
