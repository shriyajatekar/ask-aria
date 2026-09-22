import { METRIC_BY_ID } from "@/data/metrics";
import { PLATFORM_BY_ID } from "@/data/platforms";

import type {
  AskAriaActionDraft,
  AskAriaInvestigationMemory,
  AskAriaMessage,
} from "./ask-aria-types";

/**
 * CURRENT CONVERSATION CONTEXT: messages + investigation memory for the active
 * thread only (see processAskAriaMessage recentMessages). Not a search across
 * persisted Recent threads — those are separate conversation records in storage.
 */

export interface WorkspaceArtifactRef {
  url: string;
  kind: "doc" | "sheet";
}

export interface ThreadAnalysisContext {
  metricId?: string;
  platformLabel?: string;
  hasInsight: boolean;
  lastInsightTitle?: string;
}

export function extractLastWorkspaceArtifact(
  messages: AskAriaMessage[],
): WorkspaceArtifactRef | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.kind !== "action_result") continue;
    if (message.status !== "completed") continue;
    const url = message.ctaUrl?.trim();
    if (!url) continue;
    if (url.includes("docs.google.com/document")) {
      return { url, kind: "doc" };
    }
    if (url.includes("docs.google.com/spreadsheets")) {
      return { url, kind: "sheet" };
    }
  }
  return null;
}

export function textReferencesArtifact(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\bthis\b/.test(lower) ||
    /\bit\b/.test(lower) ||
    lower.includes("the report") ||
    lower.includes("the spreadsheet") ||
    lower.includes("the doc") ||
    lower.includes("the sheet")
  );
}

export function textReferencesSendOrEmail(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return (
    /^email\s+it\b/.test(lower) ||
    /^send\s+it\b/.test(lower) ||
    lower.includes("email it") ||
    lower.includes("send it") ||
    lower.includes("email the report") ||
    lower.includes("send the report")
  );
}

export function extractThreadAnalysisContext(
  messages: AskAriaMessage[],
  memory: AskAriaInvestigationMemory,
): ThreadAnalysisContext {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.kind === "insight" || message.kind === "recommendation") {
      const platformLine = message.kind === "insight"
        ? message.sections.find((s) => s.id === "scope")?.lines[0]
        : undefined;
      return {
        hasInsight: true,
        lastInsightTitle: message.title,
        metricId: memory.lastMetric ?? memory.metricId,
        platformLabel: platformLine?.replace(/^Analyzed:\s*/i, ""),
      };
    }
  }
  return {
    hasInsight: Boolean(memory.topic === "metric_change" || memory.lastMetric),
    metricId: memory.lastMetric ?? memory.metricId,
    platformLabel:
      memory.lastPlatform && memory.lastPlatform !== "all"
        ? PLATFORM_BY_ID[memory.lastPlatform]?.name
        : undefined,
  };
}

export function enrichReportDraftFromThread(
  partial: Partial<AskAriaActionDraft>,
  messages: AskAriaMessage[],
  memory: AskAriaInvestigationMemory,
): Partial<AskAriaActionDraft> {
  const ctx = extractThreadAnalysisContext(messages, memory);
  if (!ctx.hasInsight) return partial;

  const metricLabel = ctx.metricId
    ? METRIC_BY_ID[ctx.metricId as import("@/types/analytics").MetricId]?.name ??
      ctx.metricId
    : "performance";
  const scope = ctx.platformLabel ?? partial.reportPlatformScope ?? "All platforms";
  const fromAnalysis =
    partial.reportTitle?.toLowerCase().includes("commerce analysis") ||
    !partial.reportTitle;

  return {
    ...partial,
    reportTitle: fromAnalysis
      ? `${metricLabel} analysis report`
      : partial.reportTitle,
    reportPeriodLabel: partial.reportPeriodLabel ?? "Current workspace period",
    reportPlatformScope: partial.reportPlatformScope ?? scope,
  };
}
