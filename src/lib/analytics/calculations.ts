import type { MetricId, TrendDirection } from "@/types/analytics";

export function calculateChange(current: number, previous: number): number {
  return current - previous;
}

export function calculatePercentageChange(
  current: number,
  previous: number,
): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

export function getTrendDirection(
  current: number,
  previous: number,
  epsilon = 0.0001,
): TrendDirection {
  const delta = current - previous;
  if (Math.abs(delta) <= epsilon) return "flat";
  return delta > 0 ? "up" : "down";
}

export function aggregateMetricValues(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0);
}

export function averageMetricValues(values: number[]): number {
  if (values.length === 0) return 0;
  return aggregateMetricValues(values) / values.length;
}

export function weightedAverage(values: number[], weights: number[]): number {
  if (values.length === 0 || values.length !== weights.length) return 0;
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightSum === 0) return 0;
  const total = values.reduce(
    (sum, value, index) => sum + value * weights[index],
    0,
  );
  return Number((total / weightSum).toFixed(4));
}

export function ratioMetric(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Number((numerator / denominator).toFixed(4));
}

export function sumMetricById(
  records: { metrics: Record<MetricId, number> }[],
  metricId: MetricId,
): number {
  return aggregateMetricValues(records.map((record) => record.metrics[metricId]));
}

export function averageMetricById(
  records: { metrics: Record<MetricId, number> }[],
  metricId: MetricId,
): number {
  return averageMetricValues(records.map((record) => record.metrics[metricId]));
}
