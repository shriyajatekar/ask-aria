import type { MetricId, PerformanceRecord, PlatformId } from "@/types/analytics";

import { calculatePercentageChange } from "./calculations";
import { aggregateMetric } from "./comparisons";

/**
 * "Did it work?" — a before/after check on a confirmed action. Compares the
 * 7 days before the action with the days after it (up to 7). It is a
 * comparison, not proof: other things change at the same time, and the demo's
 * synthetic data does not react to actions at all. Every result says so.
 */
export interface TrackedAction {
  id: string;
  label: string;
  platformId: PlatformId;
  /** The metric the action was meant to move. */
  metric: MetricId;
  /** Whether the action should push the metric up (most) or down (ACOS, CPC). */
  goal: "increase" | "decrease";
  /** UTC date the action took effect (YYYY-MM-DD). */
  date: string;
  /** True for the built-in example, which the user did not do. */
  example?: boolean;
}

export type OutcomeVerdict = "too_early" | "improved" | "worse" | "no_clear_change";

export interface OutcomeResult {
  action: TrackedAction;
  verdict: OutcomeVerdict;
  before: number;
  after: number;
  changePct: number;
  /** Days of data after the action that the check used. */
  daysMeasured: number;
  /** When there is enough data to judge (3 days after the action). */
  firstCheckOn: string;
}

const WINDOW = 7;
const MIN_DAYS_AFTER = 3;
/** Moves smaller than this are reported as no clear change. */
const CLEAR_CHANGE_PCT = 2;

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00.000Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export function evaluateOutcome(
  action: TrackedAction,
  records: PerformanceRecord[],
  dataEnd: string,
): OutcomeResult {
  const scoped = records.filter((r) => r.platformId === action.platformId);
  const between = (start: string, end: string) =>
    scoped.filter((r) => r.date >= start && r.date <= end);

  const beforeRecords = between(addDays(action.date, -WINDOW), addDays(action.date, -1));
  const afterEnd = [addDays(action.date, WINDOW - 1), dataEnd].sort()[0];
  const afterRecords = afterEnd >= action.date ? between(action.date, afterEnd) : [];
  const daysMeasured = new Set(afterRecords.map((r) => r.date)).size;

  const before = aggregateMetric(beforeRecords, action.metric, "sum");
  const after = aggregateMetric(afterRecords, action.metric, "sum");
  const changePct = daysMeasured ? calculatePercentageChange(after, before) : 0;

  let verdict: OutcomeVerdict;
  if (daysMeasured < MIN_DAYS_AFTER) verdict = "too_early";
  else if (Math.abs(changePct) < CLEAR_CHANGE_PCT) verdict = "no_clear_change";
  else {
    const wentUp = changePct > 0;
    verdict = wentUp === (action.goal === "increase") ? "improved" : "worse";
  }

  return {
    action,
    verdict,
    before,
    after,
    changePct,
    daysMeasured,
    firstCheckOn: addDays(action.date, MIN_DAYS_AFTER),
  };
}

/** The demo's built-in example: a bid cut on Amazon 10 days before the data ends. */
export function exampleTrackedAction(dataEnd: string): TrackedAction {
  return {
    id: "example-amazon-bid-cut",
    label: "Lowered Amazon bids 10% on the highest-spend campaigns",
    platformId: "amazon",
    metric: "roas",
    goal: "increase",
    date: addDays(dataEnd, -9),
    example: true,
  };
}
