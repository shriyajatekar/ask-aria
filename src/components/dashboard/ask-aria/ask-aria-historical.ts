import { calculatePercentageChange } from "@/lib/analytics/calculations";
import { aggregateMetric } from "@/lib/analytics/comparisons";
import { PERFORMANCE_RECORDS } from "@/data/performance";
import { PERFORMANCE_DATE_RANGE } from "@/data/scenarios";
import {
  filterPerformanceRecords,
  getMetricAggregationType,
} from "@/lib/dashboard/filter-records";
import type { MetricId } from "@/types/analytics";

import type { AskAriaFullContext } from "./ask-aria-types";
import type { ResolvedQueryScope } from "./ask-aria-scope";

const MIN_DECLINE_PCT = 4;
const WINDOW_DAYS = 14;
const MAX_EVENTS = 5;

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDateLabel(value: string): string {
  return parseDate(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function addDays(date: string, days: number): string {
  const next = parseDate(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function filterForScopeRecords(
  context: AskAriaFullContext,
  scope: ResolvedQueryScope,
  range: { start: string; end: string },
) {
  let records = filterPerformanceRecords(PERFORMANCE_RECORDS, {
    brandId: context.brandId,
    category: context.category,
    subcategory: context.subcategory,
    productId: context.productId,
    dateRange: range,
  });

  if (scope.platformIds.length > 0 && scope.mode !== "workspace_brands") {
    const allowed = new Set(scope.platformIds);
    records = records.filter((record) => allowed.has(record.platformId));
  }

  return records;
}

function metricValue(
  records: ReturnType<typeof filterPerformanceRecords>,
  metricId: MetricId,
): number {
  return aggregateMetric(records, metricId, getMetricAggregationType(metricId));
}

export interface HistoricalDeclineEvent {
  windowStart: string;
  windowEnd: string;
  changePct: number;
  conversionChangePct: number | null;
}

export function findHistoricalMetricDeclines(
  context: AskAriaFullContext,
  scope: ResolvedQueryScope,
  metricId: MetricId,
): HistoricalDeclineEvent[] {
  const datasetEnd = PERFORMANCE_DATE_RANGE.end;
  const currentStart = context.dateRange.start;
  const events: HistoricalDeclineEvent[] = [];

  let windowEnd = addDays(currentStart, -1);
  const datasetStart = PERFORMANCE_DATE_RANGE.start;

  while (windowEnd >= datasetStart && events.length < MAX_EVENTS + 3) {
    const windowStart = addDays(windowEnd, -(WINDOW_DAYS - 1));
    if (windowStart < datasetStart) break;

    const priorEnd = addDays(windowStart, -1);
    const priorStart = addDays(priorEnd, -(WINDOW_DAYS - 1));
    if (priorStart < datasetStart) break;

    const currentWindow = filterForScopeRecords(context, scope, {
      start: windowStart,
      end: windowEnd,
    });
    const priorWindow = filterForScopeRecords(context, scope, {
      start: priorStart,
      end: priorEnd,
    });

    const current = metricValue(currentWindow, metricId);
    const prior = metricValue(priorWindow, metricId);
    const changePct = calculatePercentageChange(current, prior);

    if (changePct <= -MIN_DECLINE_PCT) {
      const curConv = metricValue(currentWindow, "conversion_rate");
      const prevConv = metricValue(priorWindow, "conversion_rate");
      events.push({
        windowStart,
        windowEnd,
        changePct,
        conversionChangePct: calculatePercentageChange(curConv, prevConv),
      });
    }

    windowEnd = addDays(windowStart, -1);
  }

  return events.slice(0, MAX_EVENTS);
}

export function buildHistoricalSectionLines(
  events: HistoricalDeclineEvent[],
  metricLabel: string,
): string[] {
  if (!events.length) {
    return [
      "No comparable decline was found in the available historical data.",
    ];
  }

  const lines = events.map(
    (event) =>
      `${formatDateLabel(event.windowStart)} → ${formatDateLabel(event.windowEnd)}: ${metricLabel} ${event.changePct.toFixed(1)}%`,
  );

  const withConversion = events.filter(
    (event) =>
      event.conversionChangePct !== null &&
      event.conversionChangePct <= -MIN_DECLINE_PCT,
  );
  if (withConversion.length >= 2) {
    lines.push(
      `Conversion decline appeared in ${withConversion.length} of these periods in the available data.`,
    );
  }

  return lines;
}

export function isHistoricalPatternQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("happened before") ||
    lower.includes("like this before") ||
    lower.includes("seen this pattern") ||
    lower.includes("pattern before") ||
    lower.includes("last time") ||
    lower.includes("down in the past") ||
    lower.includes("declined like this") ||
    (lower.includes("when was") && lower.includes("down"))
  );
}
