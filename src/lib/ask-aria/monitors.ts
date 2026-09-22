import { PERFORMANCE_RECORDS } from "@/data/performance";
import { PLATFORM_BY_ID } from "@/data/platforms";
import { METRIC_BY_ID } from "@/data/metrics";
import { aggregateMetric } from "@/lib/analytics/comparisons";
import { calculatePercentageChange } from "@/lib/analytics/calculations";
import {
  filterPerformanceRecords,
  getMetricAggregationType,
} from "@/lib/dashboard/filter-records";
import type { MetricId, PlatformId } from "@/types/analytics";

import type { AskAriaFullContext } from "@/components/dashboard/ask-aria/ask-aria-types";
import {
  monitorsStorageKey,
  resolveAskAriaWorkspaceId,
} from "@/components/dashboard/ask-aria/ask-aria-user-scope";

export { monitorsStorageKey };

export type MonitorOperator =
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "change_gt_pct"
  | "change_lt_pct";

export type MonitorFrequency = "daily" | "weekly" | "business_day";

export type MonitorStatus = "active" | "paused" | "triggered";

export type MonitorNotificationChannel = "aria";

export interface AriaMonitor {
  id: string;
  userId: string;
  workspaceId: string;
  metric: MetricId;
  platformId?: PlatformId;
  operator: MonitorOperator;
  threshold: number;
  comparisonPeriod?: "previous_period" | "previous_week";
  frequency: MonitorFrequency;
  notificationChannel: MonitorNotificationChannel;
  status: MonitorStatus;
  createdAt: number;
  lastCheckedAt?: number;
  lastTriggeredAt?: number;
  label?: string;
}

const MAX_MONITORS = 24;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeMonitor(raw: unknown, fallbackUserId: string): AriaMonitor | null {
  if (!isRecord(raw) || typeof raw.id !== "string") return null;
  const userId =
    typeof raw.userId === "string" && raw.userId.trim()
      ? raw.userId
      : fallbackUserId;
  const metric = raw.metric;
  if (typeof metric !== "string") return null;
  const operator = raw.operator;
  if (
    operator !== "gt" &&
    operator !== "lt" &&
    operator !== "gte" &&
    operator !== "lte" &&
    operator !== "change_gt_pct" &&
    operator !== "change_lt_pct"
  ) {
    return null;
  }
  if (typeof raw.threshold !== "number" || Number.isNaN(raw.threshold)) {
    return null;
  }
  const frequency = raw.frequency;
  if (
    frequency !== "daily" &&
    frequency !== "weekly" &&
    frequency !== "business_day"
  ) {
    return null;
  }
  const status = raw.status;
  if (status !== "active" && status !== "paused" && status !== "triggered") {
    return null;
  }

  return {
    id: raw.id,
    userId,
    workspaceId:
      typeof raw.workspaceId === "string"
        ? raw.workspaceId
        : resolveAskAriaWorkspaceId(),
    metric: metric as MetricId,
    platformId:
      typeof raw.platformId === "string"
        ? (raw.platformId as PlatformId)
        : undefined,
    operator,
    threshold: raw.threshold,
    comparisonPeriod:
      raw.comparisonPeriod === "previous_week"
        ? "previous_week"
        : "previous_period",
    frequency,
    notificationChannel: "aria",
    status,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
    lastCheckedAt:
      typeof raw.lastCheckedAt === "number" ? raw.lastCheckedAt : undefined,
    lastTriggeredAt:
      typeof raw.lastTriggeredAt === "number" ? raw.lastTriggeredAt : undefined,
    label: typeof raw.label === "string" ? raw.label : undefined,
  };
}

export function loadMonitors(userId: string): AriaMonitor[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = window.localStorage.getItem(monitorsStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeMonitor(item, userId))
      .filter((item): item is AriaMonitor => item !== null && item.userId === userId)
      .slice(0, MAX_MONITORS);
  } catch {
    return [];
  }
}

export function saveMonitors(userId: string, monitors: AriaMonitor[]): void {
  if (typeof window === "undefined" || !userId) return;
  const workspaceId = resolveAskAriaWorkspaceId();
  const trimmed = monitors
    .filter((m) => m.userId === userId)
    .map((m) => ({ ...m, workspaceId: m.workspaceId || workspaceId }))
    .slice(0, MAX_MONITORS);
  try {
    window.localStorage.setItem(
      monitorsStorageKey(userId),
      JSON.stringify(trimmed),
    );
  } catch {
    /* ignore quota */
  }
}

export function createMonitorId(): string {
  return `mon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function upsertMonitor(userId: string, monitor: AriaMonitor): AriaMonitor[] {
  const list = loadMonitors(userId);
  const idx = list.findIndex((m) => m.id === monitor.id);
  const next =
    idx >= 0
      ? list.map((m, i) => (i === idx ? monitor : m))
      : [monitor, ...list];
  saveMonitors(userId, next);
  return next;
}

export function deleteMonitor(userId: string, monitorId: string): AriaMonitor[] {
  const next = loadMonitors(userId).filter((m) => m.id !== monitorId);
  saveMonitors(userId, next);
  return next;
}

export function pauseMonitor(userId: string, monitorId: string): AriaMonitor[] {
  const found = loadMonitors(userId).find((m) => m.id === monitorId);
  if (!found) return loadMonitors(userId);
  return upsertMonitor(userId, { ...found, status: "paused" });
}

export function resumeMonitor(userId: string, monitorId: string): AriaMonitor[] {
  const found = loadMonitors(userId).find((m) => m.id === monitorId);
  if (!found) return loadMonitors(userId);
  return upsertMonitor(userId, { ...found, status: "active" });
}

export function setMonitorStatus(
  userId: string,
  monitorId: string,
  status: MonitorStatus,
): AriaMonitor[] {
  const found = loadMonitors(userId).find((m) => m.id === monitorId);
  if (!found) return loadMonitors(userId);
  const updated: AriaMonitor = {
    ...found,
    status,
    lastTriggeredAt:
      status === "triggered" ? Date.now() : found.lastTriggeredAt,
    lastCheckedAt: Date.now(),
  };
  return upsertMonitor(userId, updated);
}

export function formatMonitorThreshold(
  metric: MetricId,
  threshold: number,
  operator: MonitorOperator,
): string {
  const def = METRIC_BY_ID[metric];
  const isPctOp =
    operator === "change_gt_pct" || operator === "change_lt_pct";
  if (isPctOp) {
    return `${threshold > 0 ? "+" : ""}${threshold}%`;
  }
  if (def?.format === "currency") {
    if (threshold >= 100000) {
      return `₹${(threshold / 100000).toFixed(1)}L`;
    }
    return `₹${threshold.toLocaleString("en-IN")}`;
  }
  if (def?.format === "percentage") {
    return `${threshold}%`;
  }
  return String(threshold);
}

export function formatMonitorCondition(monitor: AriaMonitor): string {
  const metricName = METRIC_BY_ID[monitor.metric]?.name ?? monitor.metric;
  const threshold = formatMonitorThreshold(
    monitor.metric,
    monitor.threshold,
    monitor.operator,
  );
  switch (monitor.operator) {
    case "gt":
      return `${metricName} > ${threshold}`;
    case "gte":
      return `${metricName} ≥ ${threshold}`;
    case "lt":
      return `${metricName} < ${threshold}`;
    case "lte":
      return `${metricName} ≤ ${threshold}`;
    case "change_gt_pct":
      return `${metricName} change > ${threshold}`;
    case "change_lt_pct":
      return `${metricName} change < ${threshold}`;
    default:
      return `${metricName} ${threshold}`;
  }
}

export function formatMonitorFrequency(frequency: MonitorFrequency): string {
  switch (frequency) {
    case "daily":
      return "Daily (simulated — no background cron in this prototype)";
    case "weekly":
      return "Weekly (simulated)";
    case "business_day":
      return "Each business day (simulated)";
    default:
      return frequency;
  }
}

export function metricValuesForMonitor(
  context: AskAriaFullContext,
  monitor: Pick<AriaMonitor, "metric" | "platformId">,
): { current: number; previous: number; changePct: number } {
  const catalog = {
    brandId: context.brandId,
    category: context.category,
    subcategory: context.subcategory,
    productId: context.productId,
  };
  const platformId = monitor.platformId;
  const current = filterPerformanceRecords(PERFORMANCE_RECORDS, {
    ...catalog,
    platformId,
    dateRange: context.dateRange,
  });
  const comparison = filterPerformanceRecords(PERFORMANCE_RECORDS, {
    ...catalog,
    platformId,
    dateRange: context.comparisonPeriod,
  });
  const aggregation = getMetricAggregationType(monitor.metric);
  const cur = aggregateMetric(current, monitor.metric, aggregation);
  const prev = aggregateMetric(comparison, monitor.metric, aggregation);
  const changePct = calculatePercentageChange(prev, cur);
  return { current: cur, previous: prev, changePct };
}

export function formatMetricValue(metric: MetricId, value: number): string {
  if (!Number.isFinite(value)) return "—";
  const def = METRIC_BY_ID[metric];
  if (def?.format === "currency") {
    const abs = Math.abs(value);
    if (abs >= 1_00_00_000) {
      return `₹${(value / 1_00_00_000).toFixed(2)}Cr`;
    }
    if (abs >= 10_00_000) {
      return `₹${(value / 10_00_000).toFixed(2)}M`;
    }
    if (abs >= 100_000) {
      return `₹${(value / 100_000).toFixed(2)}L`;
    }
    return `₹${Math.round(value).toLocaleString("en-IN")}`;
  }
  if (def?.format === "percentage") {
    return `${value.toFixed(1)}%`;
  }
  if (def?.format === "integer") {
    return Math.round(value).toLocaleString("en-IN");
  }
  if (def?.format === "ratio" || def?.format === "decimal") {
    return value.toFixed(2);
  }
  return value.toFixed(2);
}

export function monitorWouldTrigger(
  monitor: AriaMonitor,
  context: AskAriaFullContext,
): boolean {
  const { current, changePct } = metricValuesForMonitor(context, monitor);
  switch (monitor.operator) {
    case "gt":
      return current > monitor.threshold;
    case "gte":
      return current >= monitor.threshold;
    case "lt":
      return current < monitor.threshold;
    case "lte":
      return current <= monitor.threshold;
    case "change_gt_pct":
      return changePct > monitor.threshold;
    case "change_lt_pct":
      return changePct < monitor.threshold;
    default:
      return false;
  }
}

export function buildMonitorAlertTitle(
  monitor: AriaMonitor,
  context: AskAriaFullContext,
): string {
  const platformName = monitor.platformId
    ? PLATFORM_BY_ID[monitor.platformId]?.name ?? "Workspace"
    : "All platforms";
  const metricName = METRIC_BY_ID[monitor.metric]?.name ?? monitor.metric;
  const { current } = metricValuesForMonitor(context, monitor);
  const valueLabel = formatMetricValue(monitor.metric, current);
  const threshold = formatMonitorThreshold(
    monitor.metric,
    monitor.threshold,
    monitor.operator,
  );

  if (monitor.operator === "lt" || monitor.operator === "lte") {
    return `${platformName} ${metricName} dropped below your threshold`;
  }
  if (monitor.operator === "gt" || monitor.operator === "gte") {
    return `${platformName} ${metricName} exceeded your threshold`;
  }
  return `${platformName} ${metricName} alert (${valueLabel} vs ${threshold})`;
}

export function buildMonitorAlertBody(
  monitor: AriaMonitor,
  context: AskAriaFullContext,
): string[] {
  const { current, previous, changePct } = metricValuesForMonitor(
    context,
    monitor,
  );
  const platformName = monitor.platformId
    ? PLATFORM_BY_ID[monitor.platformId]?.name ?? "All platforms"
    : "All platforms";
  const metricName = METRIC_BY_ID[monitor.metric]?.name ?? monitor.metric;
  const sign = changePct > 0 ? "+" : "";
  return [
    `Condition: ${formatMonitorCondition(monitor)}`,
    `Current ${metricName} on ${platformName}: ${formatMetricValue(monitor.metric, current)} (comparison period: ${formatMetricValue(monitor.metric, previous)}, ${sign}${changePct.toFixed(1)}%)`,
    "Simulated alert — background checks are not running in this prototype.",
  ];
}

export function investigatePromptForMonitor(monitor: AriaMonitor): string {
  const platformName = monitor.platformId
    ? PLATFORM_BY_ID[monitor.platformId]?.name ?? "Amazon"
    : "Amazon";
  const metricName = METRIC_BY_ID[monitor.metric]?.name ?? monitor.metric;
  if (monitor.metric === "roas" && monitor.operator === "lt") {
    return `Why did ${platformName} ROAS fall below ${monitor.threshold}?`;
  }
  return `Why did ${platformName} ${metricName} breach the monitor threshold?`;
}

export function draftEmailPromptForMonitor(monitor: AriaMonitor): string {
  const platformName = monitor.platformId
    ? PLATFORM_BY_ID[monitor.platformId]?.name ?? "the platform"
    : "the portfolio";
  return `Draft an email to the KAM team about ${platformName} ${METRIC_BY_ID[monitor.metric]?.name ?? monitor.metric} crossing the monitor threshold`;
}
