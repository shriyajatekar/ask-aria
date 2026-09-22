import { METRIC_BY_ID } from "@/data/metrics";
import { PLATFORM_BY_ID } from "@/data/platforms";
import type { MetricId, PlatformId } from "@/types/analytics";
import type {
  AriaMonitor,
  MonitorFrequency,
  MonitorOperator,
} from "@/lib/ask-aria/monitors";
import {
  createMonitorId,
  formatMonitorCondition,
  formatMonitorFrequency,
} from "@/lib/ask-aria/monitors";

import { extractPlatformIdsFromText } from "./ask-aria-scope";
import type { AskAriaActionDraft, AskAriaFullContext } from "./ask-aria-types";

const PLATFORM_ALIASES: Array<{ pattern: RegExp; id: PlatformId }> = [
  { pattern: /\bamazon\b/i, id: "amazon" },
  { pattern: /\bflipkart\b/i, id: "flipkart" },
  { pattern: /\bmyntra\b/i, id: "myntra" },
];

function resolvePlatform(text: string): PlatformId | undefined {
  const lower = text.toLowerCase();
  for (const alias of PLATFORM_ALIASES) {
    if (alias.pattern.test(lower)) return alias.id;
  }
  const ids = extractPlatformIdsFromText(text);
  return ids[0];
}

function parseIndianAmount(text: string): number | undefined {
  const lakh = text.match(/(\d+(?:\.\d+)?)\s*l(?:akh)?\b/i);
  if (lakh) return Number(lakh[1]) * 100000;
  const rupee = text.match(/₹\s*([\d,]+(?:\.\d+)?)/);
  if (rupee) return Number(rupee[1].replace(/,/g, ""));
  return undefined;
}

function detectMetric(text: string): MetricId | undefined {
  const lower = text.toLowerCase();
  if (lower.includes("roas")) return "roas";
  if (lower.includes("acos")) return "acos";
  if (lower.includes("conversion")) return "conversion_rate";
  if (lower.includes("order")) return "orders";
  if (lower.includes("sales") || lower.includes("revenue")) {
    return lower.includes("gross") ? "gross_sales" : "gross_sales";
  }
  return undefined;
}

function detectFrequency(text: string): MonitorFrequency | undefined {
  const lower = text.toLowerCase();
  if (lower.includes("twice a day") || lower.includes("twice daily")) {
    return "daily";
  }
  if (lower.includes("weekly") || lower.includes("every week")) {
    return "weekly";
  }
  if (lower.includes("business day") || lower.includes("weekday")) {
    return "business_day";
  }
  if (lower.includes("daily") || lower.includes("every day")) {
    return "daily";
  }
  return undefined;
}

export function isCompetitorPricingMonitor(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("competitor") &&
    (lower.includes("pric") || lower.includes("pricing")) &&
    (lower.includes("monitor") ||
      lower.includes("alert") ||
      lower.includes("watch"))
  );
}

export function isMonitorIntent(text: string): boolean {
  const lower = text.toLowerCase();
  if (isCompetitorPricingMonitor(text)) return true;
  return (
    lower.includes("monitor") ||
    (lower.includes("alert") && lower.includes("if")) ||
    (lower.includes("watch") &&
      (lower.includes("roas") ||
        lower.includes("sales") ||
        lower.includes("flipkart") ||
        lower.includes("amazon"))) ||
    (lower.includes("let me know") &&
      (lower.includes("falls") || lower.includes("drops")))
  );
}

function isVaguePerformanceMonitor(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("monitor") &&
    (lower.includes("performance") ||
      lower.includes("gets bad") ||
      lower.includes("goes bad")) &&
    !detectMetric(text)
  );
}

function isPlatformOnlyMonitor(text: string): boolean {
  const lower = text.toLowerCase();
  if (!lower.includes("monitor") && !lower.includes("watch")) return false;
  const platform = resolvePlatform(text);
  if (!platform) return false;
  return !detectMetric(text) && !/\d/.test(text);
}

function isMetricWithoutThreshold(text: string, metric: MetricId): boolean {
  const lower = text.toLowerCase();
  if (!lower.includes("monitor") && !lower.includes("watch")) return false;
  if (detectMetric(text) !== metric) return false;
  return (
    !lower.includes("below") &&
    !lower.includes("above") &&
    !lower.includes(">") &&
    !lower.includes("<") &&
    !/\d/.test(text)
  );
}

function isSalesMonitorAmbiguous(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    (lower.includes("monitor") || lower.includes("alert")) &&
    lower.includes("sales") &&
    !parseIndianAmount(text) &&
    !/\d/.test(lower.replace("sales", ""))
  );
}

export type MonitorParseResult =
  | { kind: "none" }
  | {
      kind: "clarification";
      message: string;
      unresolved: string[];
      partial: Partial<AskAriaActionDraft>;
    }
  | { kind: "ready"; partial: Partial<AskAriaActionDraft> };

export function parseMonitorAction(
  text: string,
  context?: AskAriaFullContext,
): MonitorParseResult {
  if (!isMonitorIntent(text)) return { kind: "none" };

  const lower = text.toLowerCase();

  if (
    (lower.includes("declining") || lower.includes("decline")) &&
    lower.includes("product") &&
    (lower.includes("monitor") || lower.includes("watch"))
  ) {
    const platformId =
      resolvePlatform(text) ??
      (context && context.platform !== "all" ? context.platform : undefined);
    return {
      kind: "ready",
      partial: enrichMonitorDraft(
        {
          type: "create_monitor",
          alertMetric: "orders",
          monitorOperator: "change_lt_pct",
          alertThreshold: -10,
          platformId,
          monitorFrequency: "daily",
        },
        context,
      ),
    };
  }

  if (isCompetitorPricingMonitor(text)) {
    return {
      kind: "clarification",
      message:
        "I can't monitor competitor pricing from the data connected to this workspace.\n\nI have sales, advertising, and platform performance data, but competitor pricing isn't available.",
      unresolved: ["competitor pricing data"],
      partial: { type: "create_monitor" },
    };
  }

  if (isVaguePerformanceMonitor(text)) {
    return {
      kind: "clarification",
      message:
        "Which metric should I watch?\n\nFor example: ROAS, gross sales, conversion rate, ACOS, or orders.",
      unresolved: ["metric"],
      partial: { type: "create_monitor" },
    };
  }

  if (isPlatformOnlyMonitor(text)) {
    const platformId = resolvePlatform(text)!;
    const platformName = PLATFORM_BY_ID[platformId]?.name ?? "Platform";
    return {
      kind: "clarification",
      message: `What should I monitor on ${platformName}?\n\nPick a metric — ROAS, sales, conversion, ACOS, or orders — and a threshold.`,
      unresolved: ["metric", "threshold"],
      partial: {
        type: "create_monitor",
        platformId,
        monitorPlatformLabel: platformName,
      },
    };
  }

  if (isMetricWithoutThreshold(text, "roas")) {
    const platformId =
      resolvePlatform(text) ??
      (context && context.platform !== "all" ? context.platform : undefined);
    return {
      kind: "clarification",
      message:
        "What ROAS threshold should trigger the alert?\n\nFor example: below 3 or below 2.5.",
      unresolved: ["threshold"],
      partial: {
        type: "create_monitor",
        alertMetric: "roas",
        platformId,
        monitorPlatformLabel: platformId
          ? PLATFORM_BY_ID[platformId]?.name
          : undefined,
      },
    };
  }

  if (isSalesMonitorAmbiguous(text)) {
    return {
      kind: "clarification",
      message:
        "What sales level should I watch?\n\nFor example: sales below ₹10L on Amazon, or gross sales below ₹50L across all platforms.",
      unresolved: ["threshold", "platform"],
      partial: { type: "create_monitor", alertMetric: "gross_sales" },
    };
  }

  const metric = detectMetric(text) ?? "roas";
  const platformId =
    resolvePlatform(text) ??
    (context && context.platform !== "all" ? context.platform : undefined);
  const platformName = platformId
    ? PLATFORM_BY_ID[platformId]?.name
    : "All platforms";

  let operator: MonitorOperator = "lt";
  let threshold: number | undefined;

  const changeDown = text.match(
    /change\s*(?:is\s*)?<?\s*(-?\d+(?:\.\d+)?)\s*%/i,
  );
  const changeUp = text.match(/change\s*>\s*(\d+(?:\.\d+)?)\s*%/i);
  if (changeDown) {
    operator = "change_lt_pct";
    threshold = Number(changeDown[1]);
  } else if (changeUp) {
    operator = "change_gt_pct";
    threshold = Number(changeUp[1]);
  } else if (lower.includes("acos") && (lower.includes(">") || lower.includes("above"))) {
    operator = "gt";
    const m = text.match(/(\d+(?:\.\d+)?)\s*%/);
    threshold = m ? Number(m[1]) : 20;
  } else if (
    lower.includes("conversion") &&
    (lower.includes("<") || lower.includes("below"))
  ) {
    operator = "lt";
    const m = text.match(/(\d+(?:\.\d+)?)\s*%/);
    threshold = m ? Number(m[1]) : 2;
  } else if (
    lower.includes("below") ||
    lower.includes("falls") ||
    lower.includes("drops") ||
    lower.includes("<")
  ) {
    operator = "lt";
    const below = text.match(/below\s+(\d+(?:\.\d+)?)/i);
    const amount = parseIndianAmount(text);
    if (amount !== undefined) threshold = amount;
    else if (below) threshold = Number(below[1]);
    else if (metric === "roas") threshold = 3;
  } else if (lower.includes("above") || lower.includes(">")) {
    operator = "gt";
    const m = text.match(/(\d+(?:\.\d+)?)/);
    threshold = m ? Number(m[1]) : undefined;
  }

  if (threshold === undefined && metric === "roas") threshold = 3;
  if (threshold === undefined) {
    return {
      kind: "clarification",
      message: `What threshold should I use for ${METRIC_BY_ID[metric]?.name ?? metric}?`,
      unresolved: ["threshold"],
      partial: {
        type: "create_monitor",
        alertMetric: metric,
        platformId,
        monitorPlatformLabel: platformName,
      },
    };
  }

  const frequency = detectFrequency(text) ?? "daily";
  const draftPartial: Partial<AskAriaActionDraft> = {
    type: lower.includes("alert") && !lower.includes("monitor")
      ? "create_alert"
      : "create_monitor",
    platformId,
    alertMetric: metric,
    alertThreshold: threshold,
    monitorOperator: operator,
    monitorFrequency: frequency,
    monitorPlatformLabel: platformName,
  };

  const enriched = enrichMonitorDraft(draftPartial, context);
  return { kind: "ready", partial: enriched };
}

export function enrichMonitorDraft(
  partial: Partial<AskAriaActionDraft>,
  context?: AskAriaFullContext,
): Partial<AskAriaActionDraft> {
  if (
    partial.type !== "create_monitor" &&
    partial.type !== "create_alert" &&
    !partial.alertMetric
  ) {
    return partial;
  }

  const metric = partial.alertMetric ?? "roas";
  const platformId =
    partial.platformId ??
    (context && context.platform !== "all" ? context.platform : undefined);
  const platformName = platformId
    ? PLATFORM_BY_ID[platformId]?.name ?? "All platforms"
    : "All platforms";
  const operator = partial.monitorOperator ?? "lt";
  const threshold = partial.alertThreshold ?? 3;
  const frequency = partial.monitorFrequency ?? "daily";

  const stub: AriaMonitor = {
    id: "preview",
    userId: "preview",
    workspaceId: "preview",
    metric,
    platformId,
    operator,
    threshold,
    frequency,
    notificationChannel: "aria",
    status: "active",
    createdAt: Date.now(),
  };

  return {
    ...partial,
    type: partial.type ?? "create_monitor",
    platformId,
    alertMetric: metric,
    alertThreshold: threshold,
    monitorOperator: operator,
    monitorFrequency: frequency,
    monitorPlatformLabel: platformName,
    monitorRuleLabel: formatMonitorCondition(stub),
    reportPlatformScope: platformName,
  };
}

export function tryRefineMonitorDraft(
  text: string,
  draft: AskAriaActionDraft,
  context: AskAriaFullContext,
): AskAriaActionDraft | null {
  if (draft.type !== "create_monitor" && draft.type !== "create_alert") {
    return null;
  }

  const lower = text.toLowerCase().trim();
  if (
    lower === "do it" ||
    lower === "create it" ||
    lower === "confirm" ||
    lower === "yes" ||
    lower === "go ahead"
  ) {
    return null;
  }

  let partial: Partial<AskAriaActionDraft> = { ...draft };
  let changed = false;

  const makeThreshold = text.match(
    /make\s+that\s+(\d+(?:\.\d+)?)/i,
  );
  if (makeThreshold) {
    partial.alertThreshold = Number(makeThreshold[1]);
    changed = true;
  }

  const platformId = resolvePlatform(text);
  if (
    platformId &&
    (lower.includes("actually") ||
      lower.includes("instead") ||
      lower.includes("monitor") ||
      text.trim().split(/\s+/).length <= 3)
  ) {
    partial.platformId = platformId;
    partial.monitorPlatformLabel = PLATFORM_BY_ID[platformId]?.name;
    changed = true;
  }

  const freq = detectFrequency(text);
  if (freq) {
    partial.monitorFrequency = freq;
    changed = true;
  }

  const metric = detectMetric(text);
  if (metric && lower.includes("monitor")) {
    partial.alertMetric = metric;
    changed = true;
  }

  const below = text.match(/below\s+(\d+(?:\.\d+)?)/i);
  if (below) {
    partial.alertThreshold = Number(below[1]);
    partial.monitorOperator = "lt";
    changed = true;
  }

  const amount = parseIndianAmount(text);
  if (amount !== undefined) {
    partial.alertThreshold = amount;
    partial.alertMetric = partial.alertMetric ?? "gross_sales";
    changed = true;
  }

  if (!changed) return null;
  const enriched = enrichMonitorDraft(partial, context);
  return {
    ...draft,
    ...enriched,
    id: draft.id,
  } as AskAriaActionDraft;
}

export function monitorFromActionDraft(
  draft: AskAriaActionDraft,
  userId: string,
  workspaceId: string,
): AriaMonitor {
  return {
    id: draft.monitorId ?? createMonitorId(),
    userId,
    workspaceId,
    metric: draft.alertMetric ?? "roas",
    platformId: draft.platformId,
    operator: draft.monitorOperator ?? "lt",
    threshold: draft.alertThreshold ?? 3,
    frequency: draft.monitorFrequency ?? "daily",
    notificationChannel: "aria",
    status: "active",
    createdAt: Date.now(),
    label: draft.monitorRuleLabel,
  };
}

export function monitorFrequencyLabel(
  frequency: MonitorFrequency,
): string {
  switch (frequency) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "business_day":
      return "Each business day";
    default:
      return frequency;
  }
}

export function monitorPreviewFrequencyNote(
  frequency: MonitorFrequency,
): string {
  const base = monitorFrequencyLabel(frequency);
  if (frequency === "daily") {
    return `${base} (prototype maps “twice a day” to daily — no live scheduler)`;
  }
  return `${base} (simulated checks only)`;
}
