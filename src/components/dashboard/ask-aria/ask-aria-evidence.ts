import { METRICS } from "@/data/metrics";
import { PLATFORMS } from "@/data/platforms";
import type { MetricId, PlatformId } from "@/types/analytics";

import type { AskAriaMessage } from "./ask-aria-types";

/**
 * "Show on dashboard": which metric and platform an answer is about, so the
 * dashboard can switch its chart to that metric and highlight that platform.
 */
export interface EvidenceHighlight {
  metricId?: MetricId;
  platformId?: PlatformId;
}

const METRICS_LONGEST_FIRST = [...METRICS].sort((a, b) => b.name.length - a.name.length);

function metricFromText(text: string): MetricId | undefined {
  const lower = text.toLowerCase();
  return METRICS_LONGEST_FIRST.find((m) => lower.includes(m.name.toLowerCase()))?.id;
}

function platformFromText(text: string | undefined): PlatformId | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase();
  return PLATFORMS.find((p) => lower.includes(p.name.toLowerCase()))?.id;
}

export function evidenceForMessage(message: AskAriaMessage): EvidenceHighlight | null {
  let evidence: EvidenceHighlight | null = null;
  switch (message.kind) {
    case "rca":
      evidence = { metricId: message.rcaMetric, platformId: platformFromText(message.scopeLabel) };
      break;
    case "deep_dive":
      evidence = {
        metricId: metricFromText(message.metricLabel),
        platformId: platformFromText(message.scopeLabel),
      };
      break;
    case "situation":
      evidence = {
        metricId: metricFromText(message.title),
        platformId: platformFromText(message.scopeLabel),
      };
      break;
    case "insight":
      evidence = {
        metricId: metricFromText(message.metrics?.[0]?.label ?? message.title),
        platformId: platformFromText(message.source?.scope),
      };
      break;
    default:
      return null;
  }
  return evidence.metricId || evidence.platformId ? evidence : null;
}

/**
 * Auto-follow: when the question names exactly one platform ("…on Amazon")
 * and Aria answered with an analysis about it, the dashboard should move to
 * that platform's page with the answer's metric. Returns what to show, or
 * null to leave the dashboard where it is.
 */
export function evidenceToFollow(
  question: string,
  replies: AskAriaMessage[],
): EvidenceHighlight | null {
  const lower = question.toLowerCase();
  const named = PLATFORMS.filter((p) => lower.includes(p.name.toLowerCase()));
  if (named.length !== 1) return null;
  for (const reply of replies) {
    const evidence = evidenceForMessage(reply);
    if (evidence?.platformId === named[0].id) return evidence;
  }
  return null;
}
