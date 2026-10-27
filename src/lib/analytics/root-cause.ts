import type { MetricId, PerformanceRecord, PlatformId } from "@/types/analytics";

import { sumMetricById } from "./calculations";

/**
 * Root-cause analysis as a driver tree.
 *
 * A metric is split into drivers that multiply to it exactly:
 *   Gross Sales = Sessions × Conversion × Sales per order
 *   ROAS        = Sales per ad click ÷ Cost per click
 * The period-over-period change is then shared between the drivers with the
 * log-mean (LMDI) method, so the driver contributions always add up to the
 * total change — no unexplained remainder. The biggest driver is then traced
 * to platforms and products, which also add up exactly.
 */
export type RcaMetricId = "gross_sales" | "roas";

export interface RcaDriver {
  id: string;
  label: string;
  current: number;
  previous: number;
  changePct: number;
  /** Signed share of the metric change in the metric's own units. */
  contribution: number;
  /** Share of the push in the direction the metric moved (0–100); negative = offset. */
  sharePct: number;
  format: "integer" | "percentage" | "currency" | "decimal";
}

export interface RcaBreakdownRow {
  id: string;
  contribution: number;
  sharePct: number;
}

export type RcaConfidence = "high" | "medium" | "low";

export interface RootCauseResult {
  metricId: RcaMetricId;
  current: number;
  previous: number;
  change: number;
  changePct: number;
  drivers: RcaDriver[];
  topDriver: RcaDriver | null;
  platforms: Array<RcaBreakdownRow & { platformId: PlatformId }>;
  products: Array<RcaBreakdownRow & { productId: string; platformId: PlatformId }>;
  /** Drivers and signals checked and found not to explain the change. */
  ruledOut: string[];
  /** Signals outside the formula that moved and may matter. */
  otherSignals: string[];
  confidence: RcaConfidence;
  confidenceReason: string;
}

/** Below this, a change is treated as noise and the RCA says so. */
const MATERIAL_PCT = 1;
/** Drivers explaining less than this share are reported as ruled out. */
const MINOR_SHARE_PCT = 10;
/** Stock or Buy Box moves smaller than this (percentage points) are ruled out. */
const SIGNAL_POINTS = 2;

const sum = (records: PerformanceRecord[], id: MetricId) => sumMetricById(records, id);
const safeDiv = (a: number, b: number) => (b === 0 ? 0 : a / b);
const pct = (cur: number, prev: number) => (prev === 0 ? 0 : ((cur - prev) / prev) * 100);

/** Logarithmic mean, the weight that makes LMDI contributions add up exactly. */
function logMean(a: number, b: number): number {
  if (a <= 0 || b <= 0) return 0;
  if (Math.abs(a - b) < 1e-9) return a;
  return (a - b) / (Math.log(a) - Math.log(b));
}

interface DriverDef {
  id: string;
  label: string;
  format: RcaDriver["format"];
  value: (records: PerformanceRecord[]) => number;
  /** +1 if the metric rises with the driver, -1 if it falls (e.g. CPC). */
  direction: 1 | -1;
}

const DRIVERS: Record<RcaMetricId, DriverDef[]> = {
  gross_sales: [
    { id: "sessions", label: "Sessions", format: "integer", direction: 1, value: (r) => sum(r, "sessions") },
    {
      id: "conversion",
      label: "Conversion rate",
      format: "percentage",
      direction: 1,
      value: (r) => safeDiv(sum(r, "orders"), sum(r, "sessions")) * 100,
    },
    {
      id: "sales_per_order",
      label: "Sales per order",
      format: "currency",
      direction: 1,
      value: (r) => safeDiv(sum(r, "gross_sales"), sum(r, "orders")),
    },
  ],
  roas: [
    {
      id: "sales_per_click",
      label: "Ad sales per click",
      format: "currency",
      direction: 1,
      value: (r) => safeDiv(sum(r, "ad_sales"), sum(r, "ad_clicks")),
    },
    {
      id: "cpc",
      label: "Cost per click",
      format: "currency",
      direction: -1,
      value: (r) => safeDiv(sum(r, "ad_spend"), sum(r, "ad_clicks")),
    },
  ],
};

function metricValue(metricId: RcaMetricId, records: PerformanceRecord[]): number {
  return metricId === "roas"
    ? safeDiv(sum(records, "ad_sales"), sum(records, "ad_spend"))
    : sum(records, "gross_sales");
}

/**
 * Additive contribution of each group (platform or product) to the change.
 * Gross Sales: each group's own change. ROAS: each group's spend-weighted
 * ROAS term, since total ROAS = Σ (spend share × group ROAS).
 */
export function groupContributions(
  metricId: RcaMetricId,
  current: PerformanceRecord[],
  previous: PerformanceRecord[],
  key: (record: PerformanceRecord) => string,
): Map<string, number> {
  const groups = new Set([...current, ...previous].map(key));
  const totalSpendNow = sum(current, "ad_spend");
  const totalSpendBefore = sum(previous, "ad_spend");
  const result = new Map<string, number>();
  for (const group of groups) {
    const now = current.filter((r) => key(r) === group);
    const before = previous.filter((r) => key(r) === group);
    result.set(
      group,
      metricId === "roas"
        ? safeDiv(sum(now, "ad_sales"), totalSpendNow) -
            safeDiv(sum(before, "ad_sales"), totalSpendBefore)
        : sum(now, "gross_sales") - sum(before, "gross_sales"),
    );
  }
  return result;
}

function averagePoints(records: PerformanceRecord[], id: MetricId): number {
  if (!records.length) return 0;
  return records.reduce((total, r) => total + r.metrics[id], 0) / records.length;
}

export function analyzeRootCause(
  metricId: RcaMetricId,
  current: PerformanceRecord[],
  previous: PerformanceRecord[],
): RootCauseResult {
  const curValue = metricValue(metricId, current);
  const prevValue = metricValue(metricId, previous);
  const change = curValue - prevValue;
  const changePct = pct(curValue, prevValue);
  const weight = logMean(curValue, prevValue);

  // 1. Split the change between drivers (contributions sum to `change`).
  const drivers: RcaDriver[] = DRIVERS[metricId]
    .map((def) => {
      const cur = def.value(current);
      const prev = def.value(previous);
      const contribution =
        cur > 0 && prev > 0 ? def.direction * weight * Math.log(cur / prev) : 0;
      return {
        id: def.id,
        label: def.label,
        current: cur,
        previous: prev,
        changePct: pct(cur, prev),
        contribution,
        sharePct: 0,
        format: def.format,
      };
    })
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  // Drivers can pull in opposite directions (more sessions, but much lower
  // conversion). Shares are measured against the total push in the
  // direction the metric moved, so they read 0–100%; drivers pushing the
  // other way are reported as offsets, never as the cause.
  const direction = Math.sign(change);
  const pushing = drivers.filter((d) => Math.sign(d.contribution) === direction && direction !== 0);
  const offsets = drivers.filter((d) => Math.sign(d.contribution) === -direction && direction !== 0);
  const push = pushing.reduce((total, d) => total + Math.abs(d.contribution), 0);
  const offsetTotal = offsets.reduce((total, d) => total + Math.abs(d.contribution), 0);
  for (const d of drivers) {
    d.sharePct = push === 0 ? 0 : (Math.sign(d.contribution) * direction * Math.abs(d.contribution) / push) * 100;
  }

  const topDriver = pushing[0] ?? null;

  // 2. Trace the change to platforms and products, in the direction it moved.
  const toRows = (contributions: Map<string, number>) =>
    [...contributions.entries()]
      .map(([id, contribution]) => ({
        id,
        contribution,
        sharePct: change === 0 ? 0 : (contribution / change) * 100,
      }))
      .filter((row) => Math.sign(row.contribution) === Math.sign(change))
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const platforms = toRows(
    groupContributions(metricId, current, previous, (r) => r.platformId),
  )
    .slice(0, 5)
    .map((row) => ({ ...row, platformId: row.id as PlatformId }));

  const productPlatform = new Map(
    [...current, ...previous].map((r) => [r.productId, r.platformId]),
  );
  const products = toRows(
    groupContributions(metricId, current, previous, (r) => r.productId),
  )
    .slice(0, 3)
    .map((row) => ({
      ...row,
      productId: row.id,
      platformId: productPlatform.get(row.id) as PlatformId,
    }));

  // 3. What we checked and ruled out, and signals outside the formula.
  const ruledOut = drivers
    .filter((d) => d !== topDriver && Math.abs(d.sharePct) < MINOR_SHARE_PCT)
    .map((d) => `${d.label} (moved ${d.changePct >= 0 ? "+" : ""}${d.changePct.toFixed(1)}%, too little to matter)`);
  const otherSignals: string[] = [];
  for (const [id, label] of [
    ["stock_availability", "Stock availability"],
    ["buy_box_share", "Buy Box share"],
  ] as const) {
    const moved = averagePoints(current, id) - averagePoints(previous, id);
    if (Math.abs(moved) < SIGNAL_POINTS) {
      ruledOut.push(`${label} (moved ${moved >= 0 ? "+" : ""}${moved.toFixed(1)} pts)`);
    } else {
      otherSignals.push(
        `${label} moved ${moved >= 0 ? "+" : ""}${moved.toFixed(1)} pts, which may also play a part.`,
      );
    }
  }

  // 4. How sure we are, in plain terms.
  let confidence: RcaConfidence;
  let confidenceReason: string;
  const topShare = Math.abs(topDriver?.sharePct ?? 0);
  const bigOffset = push > 0 && offsetTotal / push >= 0.5;
  const offsetNote = offsets[0]
    ? `, partly offset by ${offsets[0].label.toLowerCase()} (${offsets[0].changePct >= 0 ? "+" : ""}${offsets[0].changePct.toFixed(1)}%)`
    : "";
  if (Math.abs(changePct) < MATERIAL_PCT || !topDriver) {
    confidence = "low";
    confidenceReason = "The change is under 1%, too small to attribute with confidence.";
  } else if (topShare >= 60 && !bigOffset) {
    confidence = "high";
    confidenceReason = `${topDriver.label} drives ${topShare.toFixed(0)}% of the change${offsetNote}.`;
  } else if (topShare >= 40) {
    confidence = "medium";
    confidenceReason = `${topDriver.label} drives ${topShare.toFixed(0)}% of the change${offsetNote}; other drivers moved too.`;
  } else {
    confidence = "low";
    confidenceReason = "Several drivers moved together, so no single cause stands out.";
  }

  return {
    metricId,
    current: curValue,
    previous: prevValue,
    change,
    changePct,
    drivers,
    topDriver,
    platforms,
    products,
    ruledOut,
    otherSignals,
    confidence,
    confidenceReason,
  };
}
