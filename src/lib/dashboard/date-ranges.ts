import type { DateRange } from "@/types/analytics";

import { PERFORMANCE_DATE_RANGE } from "@/data/scenarios";

export type DateRangePreset = "7" | "30" | "60" | "custom";

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function diffDays(start: string, end: string): number {
  const startMs = parseDate(start).getTime();
  const endMs = parseDate(end).getTime();
  return Math.max(1, Math.round((endMs - startMs) / 86400000) + 1);
}

export function clampRangeToDataset(range: DateRange): DateRange {
  const start =
    range.start < PERFORMANCE_DATE_RANGE.start
      ? PERFORMANCE_DATE_RANGE.start
      : range.start;
  const end =
    range.end > PERFORMANCE_DATE_RANGE.end
      ? PERFORMANCE_DATE_RANGE.end
      : range.end;
  return { start, end };
}

export function resolvePresetRange(
  preset: DateRangePreset,
  customRange?: DateRange,
): DateRange {
  if (preset === "custom" && customRange) {
    return clampRangeToDataset(customRange);
  }

  const end = PERFORMANCE_DATE_RANGE.end;
  const endDate = parseDate(end);
  const days = preset === "7" ? 7 : preset === "60" ? 60 : 30;
  const startDate = addDays(endDate, -(days - 1));

  return clampRangeToDataset({
    start: formatDate(startDate),
    end,
  });
}

export function resolvePreviousPeriod(range: DateRange): DateRange {
  const days = diffDays(range.start, range.end);
  const startDate = addDays(parseDate(range.start), -days);
  const endDate = addDays(parseDate(range.start), -1);

  return clampRangeToDataset({
    start: formatDate(startDate),
    end: formatDate(endDate),
  });
}

export const DEFAULT_DATE_PRESET: DateRangePreset = "30";

export function getDefaultDashboardRanges() {
  const dateRange = resolvePresetRange(DEFAULT_DATE_PRESET);
  const comparisonPeriod = resolvePreviousPeriod(dateRange);
  return { dateRange, comparisonPeriod };
}
