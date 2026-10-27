import { METRIC_BY_ID } from "@/data/metrics";
import { PERFORMANCE_RECORDS } from "@/data/performance";
import { PLATFORM_BY_ID } from "@/data/platforms";
import { PERFORMANCE_DATE_RANGE } from "@/data/scenarios";
import { formatMetricValue } from "@/lib/ask-aria/monitors";
import {
  detectSituations,
  type PastEpisode,
  type Situation,
} from "@/lib/analytics/situations";
import { filterPerformanceRecords } from "@/lib/dashboard/filter-records";
import type { PlatformId } from "@/types/analytics";

import { createMessageId } from "./ask-aria-storage";
import type { AskAriaFullContext, AskAriaMessage } from "./ask-aria-types";

/**
 * Situation alerts in words, shared by the notification bell and the chat so
 * both always say the same thing. Every number comes from detectSituations.
 */
export interface SituationCopy {
  id: string;
  platformId: PlatformId;
  severity: Situation["severity"];
  /** "Amazon Gross Sales down 22.0%" */
  title: string;
  /** What's happening, with the driver behind it. */
  summary: string;
  /** What happened last time, or that there is no precedent. */
  pastLine: string;
  /** True when the history has a comparable episode. */
  hasPrecedent: boolean;
  suggestion: string;
  investigatePrompt: string;
  /** One-click deep dive into this metric and platform. */
  deepDivePrompt: string;
}

const platformName = (id: PlatformId) => PLATFORM_BY_ID[id]?.name ?? id;

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function situationsForContext(
  context: Pick<
    AskAriaFullContext,
    "dateRange" | "comparisonPeriod" | "brandId" | "category" | "subcategory" | "productId"
  >,
  limit = 3,
): Situation[] {
  const records = filterPerformanceRecords(PERFORMANCE_RECORDS, {
    brandId: context.brandId,
    category: context.category,
    subcategory: context.subcategory,
    productId: context.productId,
  });
  return detectSituations(
    records,
    context.dateRange,
    context.comparisonPeriod,
    PERFORMANCE_DATE_RANGE.start,
    limit,
  );
}

/** "Last time on Amazon: …", or that the history has no comparable drop. */
export function describePastEpisode(
  past: PastEpisode | null,
  options: { metricLabel: string; platformName: string; currentChangePct: number },
): string {
  const { metricLabel, platformName: name, currentChangePct } = options;
  if (!past) {
    return `No comparable drop in the available history (since ${formatDay(PERFORMANCE_DATE_RANGE.start)}), so there's no past playbook to draw on.`;
  }
  const where = past.samePlatform
    ? name
    : `${platformName(past.platformId)} (no earlier drop on ${name}; this is the closest case)`;
  const when = `${formatDay(past.dropWindow.start)} – ${formatDay(past.dropWindow.end)}`;
  const outcome =
    past.recoveredBy && past.daysToRecover !== null
      ? `recovered within ${past.daysToRecover} days${
          past.recoveryDriver
            ? `, as ${past.recoveryDriver.label.toLowerCase()} ${past.recoveryDriver.changePct >= 0 ? "rose" : "fell"} ${Math.abs(past.recoveryDriver.changePct).toFixed(1)}%`
            : ""
        }`
      : "had not recovered before this period began";
  const smaller =
    Math.abs(past.dropPct) < Math.abs(currentChangePct) / 2
      ? " That drop was much smaller than this one, so treat it as a rough guide."
      : "";
  return `Last time on ${where}: ${metricLabel} fell ${Math.abs(past.dropPct).toFixed(1)}% (${when}) and ${outcome}.${smaller}`;
}

export function describeSituation(situation: Situation): SituationCopy {
  const name = platformName(situation.platformId);
  const metricLabel = METRIC_BY_ID[situation.metric]?.name ?? situation.metric;
  const drop = Math.abs(situation.changePct).toFixed(1);
  const driver = situation.driver;
  const because =
    driver && situation.metric !== "conversion_rate"
      ? `, mainly because ${driver.label.toLowerCase()} ${driver.changePct >= 0 ? "rose" : "fell"} ${Math.abs(driver.changePct).toFixed(1)}%`
      : "";

  const past = situation.pastEpisode;
  const pastLine = describePastEpisode(past, {
    metricLabel,
    platformName: name,
    currentChangePct: situation.changePct,
  });

  return {
    id: situation.id,
    platformId: situation.platformId,
    severity: situation.severity,
    title: `${name} ${metricLabel} down ${drop}%`,
    summary: `${name} ${metricLabel} fell ${drop}% (${formatMetricValue(situation.metric, situation.previous)} → ${formatMetricValue(situation.metric, situation.current)}) vs the comparison period${because}.`,
    pastLine,
    hasPrecedent: Boolean(past),
    suggestion: situation.suggestion,
    investigatePrompt: `What needs my attention on ${name}?`,
    deepDivePrompt: `Deep dive into ${metricLabel} on ${name}`,
  };
}

/** Chat message for one situation (or the most urgent one). */
export function buildSituationMessage(
  context: AskAriaFullContext,
  platformId?: PlatformId,
): AskAriaMessage | null {
  const all = situationsForContext(context, 12);
  const situation = platformId
    ? all.find((s) => s.platformId === platformId)
    : all[0];
  if (!situation) return null;
  const copy = describeSituation(situation);
  const others = all.filter((s) => s !== situation).slice(0, 2);
  return {
    id: createMessageId(),
    kind: "situation",
    title: copy.title,
    summary: copy.summary,
    pastLine: copy.pastLine,
    hasPrecedent: copy.hasPrecedent,
    suggestion: copy.suggestion,
    severity: copy.severity,
    scopeLabel: platformName(situation.platformId),
    alsoWatching: others.map((s) => describeSituation(s).title),
    handoffs: [{ label: "Deep dive", prompt: copy.deepDivePrompt }],
    createdAt: Date.now(),
  };
}
