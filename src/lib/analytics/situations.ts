import type { DateRange, MetricId, PerformanceRecord, PlatformId } from "@/types/analytics";

import { calculatePercentageChange } from "./calculations";
import { aggregateMetric } from "./comparisons";
import { analyzeRootCause, type RcaMetricId } from "./root-cause";

/**
 * Situation alerts: material drops in the current period, each paired with
 * what happened the last time the same thing happened in the history (did it
 * recover, how fast, and which driver moved during the recovery) and a
 * suggested next step. When the history has no comparable episode, the alert
 * says so instead of inventing a precedent.
 */
export type SituationMetric = "gross_sales" | "roas" | "conversion_rate";

/** A drop at or beyond this % raises a situation. */
export const SITUATION_THRESHOLDS: Record<SituationMetric, number> = {
  gross_sales: -10,
  roas: -8,
  conversion_rate: -8,
};

export interface PastEpisode {
  platformId: PlatformId;
  /** True when the episode is on the same platform as the situation. */
  samePlatform: boolean;
  dropWindow: DateRange;
  dropPct: number;
  /** End of the first week back within 2% of the pre-drop level, if any. */
  recoveredBy: string | null;
  daysToRecover: number | null;
  /** Driver that moved most during the recovery, from the RCA engine. */
  recoveryDriver: { label: string; changePct: number } | null;
}

export interface Situation {
  id: string;
  platformId: PlatformId;
  metric: SituationMetric;
  current: number;
  previous: number;
  changePct: number;
  /** Rupee impact for sales; spend-weighted for ROAS and conversion. */
  impact: number;
  severity: "high" | "medium";
  /** The RCA driver behind the drop, used to pick the suggestion. */
  driver: { id: string; label: string; changePct: number } | null;
  pastEpisode: PastEpisode | null;
  suggestion: string;
}

const WEEK = 7;
const RECOVERY_TOLERANCE = 0.98;
const RECOVERY_SEARCH_DAYS = 28;

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function inRange(records: PerformanceRecord[], range: DateRange): PerformanceRecord[] {
  return records.filter((r) => r.date >= range.start && r.date <= range.end);
}

function value(records: PerformanceRecord[], metric: MetricId): number {
  return aggregateMetric(records, metric, "sum");
}

/** RCA has two trees; conversion sits inside the Gross Sales tree. */
function rcaTreeFor(metric: SituationMetric): RcaMetricId {
  return metric === "roas" ? "roas" : "gross_sales";
}

/** Suggestions keyed by the driver that explains the drop. */
const SUGGESTIONS: Record<string, string> = {
  cpc: "Cost per click rose: review bids on the highest-spend campaigns before raising budgets.",
  sales_per_click:
    "Ads convert to fewer sales per click: check prices, listings and stock on the top advertised products.",
  conversion:
    "Fewer visitors buy: check price against competitors, stock availability and Buy Box share on the top products.",
  sessions: "Traffic fell: check sponsored placements and search visibility for the top products.",
  sales_per_order: "Orders got smaller: check discounts and whether lower-priced products are selling instead.",
};

/**
 * Most recent earlier week where `metric` dropped at least half the
 * threshold vs the week before, ending before `before`. Same platform first,
 * then any platform.
 */
export function findPastEpisode(
  allRecords: PerformanceRecord[],
  platformId: PlatformId,
  metric: SituationMetric,
  before: string,
  datasetStart: string,
): PastEpisode | null {
  const threshold = SITUATION_THRESHOLDS[metric] / 2;
  const platforms = [
    platformId,
    ...new Set(allRecords.map((r) => r.platformId).filter((p) => p !== platformId)),
  ];

  for (const candidate of platforms) {
    const records = allRecords.filter((r) => r.platformId === candidate);
    // Walk back one day at a time from the latest week that ends before `before`.
    for (let end = addDays(before, -1); addDays(end, -(2 * WEEK - 1)) >= datasetStart; end = addDays(end, -1)) {
      const dropWindow = { start: addDays(end, -(WEEK - 1)), end };
      const priorWindow = { start: addDays(end, -(2 * WEEK - 1)), end: addDays(end, -WEEK) };
      const drop = value(inRange(records, dropWindow), metric);
      const prior = value(inRange(records, priorWindow), metric);
      const dropPct = calculatePercentageChange(drop, prior);
      if (prior === 0 || dropPct > threshold) continue;

      // Did a later week (before `before`) get back to the pre-drop level?
      let recoveredBy: string | null = null;
      let recoveryWindow: DateRange | null = null;
      for (let offset = 1; offset <= RECOVERY_SEARCH_DAYS; offset += 1) {
        const window = { start: addDays(end, offset), end: addDays(end, offset + WEEK - 1) };
        if (window.end >= before) break;
        if (value(inRange(records, window), metric) >= prior * RECOVERY_TOLERANCE) {
          recoveredBy = window.end;
          recoveryWindow = window;
          break;
        }
      }

      let recoveryDriver: PastEpisode["recoveryDriver"] = null;
      if (recoveryWindow) {
        const rca = analyzeRootCause(
          rcaTreeFor(metric),
          inRange(records, recoveryWindow),
          inRange(records, dropWindow),
        );
        if (rca.topDriver) {
          recoveryDriver = { label: rca.topDriver.label, changePct: rca.topDriver.changePct };
        }
      }

      return {
        platformId: candidate,
        samePlatform: candidate === platformId,
        dropWindow,
        dropPct,
        recoveredBy,
        daysToRecover: recoveredBy
          ? Math.round(
              (Date.parse(recoveredBy) - Date.parse(dropWindow.end)) / 86_400_000,
            )
          : null,
        recoveryDriver,
      };
    }
  }
  return null;
}

export function detectSituations(
  allRecords: PerformanceRecord[],
  period: DateRange,
  comparison: DateRange,
  datasetStart: string,
  limit = 3,
): Situation[] {
  const platforms = [...new Set(allRecords.map((r) => r.platformId))];
  const situations: Situation[] = [];

  for (const platformId of platforms) {
    const records = allRecords.filter((r) => r.platformId === platformId);
    const current = inRange(records, period);
    const previous = inRange(records, comparison);
    const salesDrop = value(previous, "gross_sales") - value(current, "gross_sales");
    const spend = value(current, "ad_spend");

    for (const metric of Object.keys(SITUATION_THRESHOLDS) as SituationMetric[]) {
      const cur = value(current, metric);
      const prev = value(previous, metric);
      const changePct = calculatePercentageChange(cur, prev);
      if (prev === 0 || changePct > SITUATION_THRESHOLDS[metric]) continue;

      const rca = analyzeRootCause(rcaTreeFor(metric), current, previous);
      // For conversion, the driver is conversion itself by definition.
      const driver =
        metric === "conversion_rate"
          ? rca.drivers.find((d) => d.id === "conversion") ?? null
          : rca.topDriver;

      const impact =
        metric === "gross_sales" ? salesDrop : spend * Math.abs(changePct) / 100;
      situations.push({
        id: `${platformId}-${metric}`,
        platformId,
        metric,
        current: cur,
        previous: prev,
        changePct,
        impact,
        severity: changePct <= SITUATION_THRESHOLDS[metric] * 2 ? "high" : "medium",
        driver: driver
          ? { id: driver.id, label: driver.label, changePct: driver.changePct }
          : null,
        pastEpisode: findPastEpisode(allRecords, platformId, metric, period.start, datasetStart),
        suggestion:
          (driver && SUGGESTIONS[driver.id]) ??
          "Run a root-cause analysis to see which driver moved.",
      });
    }
  }

  // One alert per platform (its biggest), highest impact first.
  const best = new Map<PlatformId, Situation>();
  for (const s of situations.sort((a, b) => b.impact - a.impact)) {
    if (!best.has(s.platformId)) best.set(s.platformId, s);
  }
  return [...best.values()].slice(0, limit);
}
