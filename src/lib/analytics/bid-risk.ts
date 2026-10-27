import type { PerformanceRecord, PlatformId } from "@/types/analytics";

import { calculatePercentageChange } from "./calculations";
import { aggregateMetric } from "./comparisons";

/**
 * Checks a bid change against the latest trend before it runs. Compares the
 * last 7 days with the 7 before them on the same platform (or product), and
 * the new bid with what clicks actually cost there. Only uses daily data —
 * it makes no claims about time-of-day traffic.
 */
export interface BidRisk {
  level: "high" | "medium" | "none";
  /** Plain-language reasons, most important first. */
  reasons: string[];
  suggestion: string | null;
  /** Average cost per click over the last 7 days, for context. */
  recentCpc: number;
  roasTrendPct: number;
  cpcTrendPct: number;
  salesTrendPct: number;
}

const DAY = 86_400_000;
/** A weekly move at least this big counts as a trend change. */
const TREND_PCT = 5;

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + days * DAY).toISOString().slice(0, 10);
}

const fmt = (v: number) => `₹${v.toFixed(2)}`;
const pct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`;

export function assessBidRisk(
  records: PerformanceRecord[],
  options: {
    platformId: PlatformId;
    productId?: string;
    newBid: number;
    currentBid?: number;
    /** Last day of data to judge the trend from. */
    asOf: string;
  },
): BidRisk {
  const scoped = records.filter(
    (r) =>
      r.platformId === options.platformId &&
      (!options.productId || r.productId === options.productId),
  );
  const within = (start: string, end: string) =>
    scoped.filter((r) => r.date >= start && r.date <= end);
  const recent = within(addDays(options.asOf, -6), options.asOf);
  const prior = within(addDays(options.asOf, -13), addDays(options.asOf, -7));

  const trend = (metric: "roas" | "cpc" | "gross_sales") =>
    calculatePercentageChange(
      aggregateMetric(recent, metric, "sum"),
      aggregateMetric(prior, metric, "sum"),
    );
  const recentCpc = aggregateMetric(recent, "cpc", "sum");
  const roasTrendPct = trend("roas");
  const cpcTrendPct = trend("cpc");
  const salesTrendPct = trend("gross_sales");

  const raising =
    options.currentBid !== undefined
      ? options.newBid > options.currentBid
      : options.newBid > recentCpc;
  const reasons: string[] = [];
  let level: BidRisk["level"] = "none";
  let suggestion: string | null = null;
  const flag = (next: "high" | "medium", reason: string, tip: string) => {
    reasons.push(reason);
    if (level !== "high") level = next;
    suggestion ??= tip;
  };

  if (recentCpc > 0 && options.newBid < recentCpc * 0.5) {
    flag(
      "high",
      `${fmt(options.newBid)} is well below what clicks cost here (${fmt(recentCpc)} on average over the last 7 days), so the ads may stop showing.`,
      `Lower gradually instead, e.g. to ${fmt(recentCpc * 0.85)}, and review after a few days.`,
    );
  }
  if (recentCpc > 0 && options.newBid > recentCpc * 1.5) {
    flag(
      "medium",
      `${fmt(options.newBid)} is more than 1.5× the recent cost per click (${fmt(recentCpc)}), so you may overpay for the same clicks.`,
      `Raise in smaller steps, e.g. to ${fmt(recentCpc * 1.15)}.`,
    );
  }
  if (raising && roasTrendPct <= -TREND_PCT) {
    flag(
      "high",
      `ROAS has fallen ${pct(roasTrendPct)} this week, so each extra rupee of bid is returning less.`,
      "Hold the bid and run a root-cause analysis on ROAS first.",
    );
  }
  if (raising && cpcTrendPct >= TREND_PCT) {
    flag(
      "medium",
      `Clicks are already getting more expensive (cost per click ${pct(cpcTrendPct)} this week); a higher bid adds to that.`,
      "Cap the bid near the current cost per click until it settles.",
    );
  }
  if (!raising && salesTrendPct >= TREND_PCT) {
    flag(
      "medium",
      `Sales are rising (${pct(salesTrendPct)} this week); cutting the bid now may give up traffic while demand is strong.`,
      "Wait for the trend to settle before lowering the bid.",
    );
  }

  return { level, reasons, suggestion, recentCpc, roasTrendPct, cpcTrendPct, salesTrendPct };
}
