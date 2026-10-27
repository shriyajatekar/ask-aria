import type { MetricId, PlatformId } from "@/types/analytics";

import { METRICS } from "@/data/metrics";

/**
 * Chart colours for the graphite and copper palette. All meet 3:1 against
 * white (WCAG 1.4.11 for graphics); values mirror --color-chart-* in
 * globals.css. No green, blue or purple.
 *
 * Platform bars are labelled on the axis, so they share one neutral colour
 * and the hovered bar turns copper (focus + context), instead of 12 colours
 * nobody can tell apart.
 */
export const CHART_PALETTE = [
  "#8a5a2b", // copper
  "#3d3d3b", // graphite
  "#b0603f", // clay
  "#93650f", // ochre
  "#7a7873", // stone
  "#a3804f", // sand
] as const;

export const CHART_ACCENT = CHART_PALETTE[0];
export const CHART_NEUTRAL = "#86847f";

export function platformChartColor(platformId: PlatformId): string {
  void platformId;
  return CHART_NEUTRAL;
}

/** Stable colour per metric, from its position in the metric catalogue. */
export function metricChartColor(metricId: MetricId): string {
  const index = Math.max(0, METRICS.findIndex((metric) => metric.id === metricId));
  return CHART_PALETTE[index % CHART_PALETTE.length];
}

/** Colour by position, so metrics shown together never share a colour. */
export function metricSeriesColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}

/** Neutral base for period legend swatches (not tied to a single series). */
export const METRIC_COMPARISON_BASE = CHART_NEUTRAL;

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return null;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((value) => Number.isNaN(value))) return null;
  return { r, g, b };
}

/** Current period in full colour, comparison period as a lighter tint. */
export function chartPeriodPair(baseHex: string): {
  current: string;
  comparison: string;
} {
  const rgb = parseHex(baseHex);
  if (!rgb) {
    return { current: baseHex, comparison: "rgba(134, 132, 127, 0.45)" };
  }
  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * 0.5);
  const comparison = `rgb(${mix(rgb.r)}, ${mix(rgb.g)}, ${mix(rgb.b)})`;
  return { current: baseHex, comparison };
}
