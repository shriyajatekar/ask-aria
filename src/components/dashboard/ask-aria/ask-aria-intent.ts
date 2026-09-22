import type { AskAriaInvestigationMemory } from "./ask-aria-types";
import { isHistoricalPatternQuery } from "./ask-aria-historical";
import { looksLikeActionSpecification, parseActionRequest } from "./ask-aria-actions";

export type AskAriaIntent =
  | "confirm_action"
  | "action_request"
  | "action_clarification"
  | "temporal_follow_up"
  | "product_analysis"
  | "brand_analysis"
  | "platform_analysis"
  | "recommendation"
  | "root_cause"
  | "metric_follow_up"
  | "executive_summary"
  | "historical_pattern"
  | "general_performance";

export function isConfirmPhrase(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return (
    lower === "do it" ||
    lower === "create it" ||
    lower === "confirm" ||
    lower === "confirm action" ||
    lower === "yes" ||
    lower === "go ahead" ||
    lower.includes("confirm &")
  );
}

export function isCapabilityDiscoveryQuery(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return (
    lower === "what can you do" ||
    lower === "what can you do?" ||
    lower.includes("what can you do for me") ||
    lower.includes("what are your capabilities") ||
    lower.includes("help me understand what you can") ||
    lower.includes("what do you do")
  );
}

export function isMonitorListingQuery(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return (
    lower.includes("what am i monitoring") ||
    lower.includes("what's being monitored") ||
    lower.includes("whats being monitored") ||
    lower.includes("what monitors") ||
    lower.includes("list my monitors") ||
    lower.includes("show my monitors")
  );
}

export function isAffectedProductsQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("affected product") ||
    lower.includes("products affected") ||
    lower.includes("show me the products affected") ||
    (lower.includes("which products") &&
      (lower.includes("affect") ||
        lower.includes("caused") ||
        lower.includes("driving")))
  );
}

export function isFollowUpReference(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\b(it|this|that)\b/.test(lower) ||
    lower.includes("caused this") ||
    lower.includes("caused it") ||
    lower.includes("what about")
  );
}

export function hasActiveInvestigation(
  memory: AskAriaInvestigationMemory,
): boolean {
  return (
    Boolean(memory.activeAnalysisContext) ||
    memory.topic === "metric_change" ||
    memory.lastTopic === "metric_change" ||
    Boolean(memory.lastMetric || memory.metricId)
  );
}

function isProductFollowUp(
  text: string,
  memory: AskAriaInvestigationMemory,
): boolean {
  const lower = text.toLowerCase();
  if (!lower.includes("product")) return false;
  if (!hasActiveInvestigation(memory)) return false;
  return (
    isFollowUpReference(text) ||
    lower.includes("caused") ||
    lower.includes("contribut") ||
    lower === "which products?" ||
    lower === "which products"
  );
}

function isBrandQuery(text: string): boolean {
  const lower = text.toLowerCase();
  if (isFollowUpReference(text) && lower.includes("product")) return false;
  return (
    lower.includes("which brand") ||
    lower.includes("brands need attention") ||
    lower.includes("brand need attention") ||
    lower.includes("underperforming account") ||
    lower.includes("accounts are underperforming") ||
    lower.includes("accounts need attention") ||
    (lower.includes("brand") &&
      (lower.includes("attention") ||
        lower.includes("declin") ||
        lower.includes("losing")))
  );
}

function isPlatformComparisonQuery(text: string): boolean {
  const lower = text.toLowerCase();
  if (
    lower.includes("compare") &&
    (lower.includes("amazon") ||
      lower.includes("flipkart") ||
      lower.includes("myntra") ||
      lower.includes("platform"))
  ) {
    return true;
  }
  if (lower.includes("which platform") && lower.includes("growing")) {
    return true;
  }
  return (
    lower.includes("which platform") &&
    (lower.includes("changed") ||
      lower.includes("strongest") ||
      lower.includes("most") ||
      lower.includes("driving") ||
      lower.includes("underperform"))
  );
}

function isTemporalQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("yesterday") ||
    lower.includes("last week") ||
    lower.includes("last 7") ||
    lower.includes("last 30") ||
    lower.includes("30 day") ||
    lower.includes("this month") ||
    lower.includes("weekend") ||
    lower.includes("previous week") ||
    (lower.includes("what about") && lower.includes("yesterday"))
  );
}

function isRecommendationQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("what should i") ||
    lower.includes("investigate next") ||
    lower.includes("what should i do") ||
    lower.includes("where should i focus") ||
    lower.includes("improve roas") ||
    lower.includes("how can i improve") ||
    lower.includes("what worked best") ||
    lower.includes("which campaign should i focus") ||
    lower.includes("losing sales") ||
    lower.includes("losing revenue") ||
    lower.includes("client meeting")
  );
}

function isRootCauseQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("why ") ||
    lower.includes("why did") ||
    (lower.includes("decline") && !lower.includes("when did")) ||
    (lower.includes("what happened") && !isTemporalQuery(text)) ||
    (isFollowUpReference(text) &&
      (lower.includes("happen") || lower.includes("this")))
  );
}

function isExecutiveQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("biggest risk") ||
    lower.includes("business summary") ||
    lower.includes("how is the business performing") ||
    lower.includes("executive summary") ||
    lower.includes("leadership investigate")
  );
}

export function classifyIntent(
  text: string,
  memory: AskAriaInvestigationMemory,
): AskAriaIntent {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  const actionParse = parseActionRequest(trimmed);

  if (
    isConfirmPhrase(trimmed) &&
    memory.pendingActionDraft &&
    !looksLikeActionSpecification(trimmed)
  ) {
    return "confirm_action";
  }

  if (actionParse.kind === "clarification") {
    return "action_clarification";
  }

  if (actionParse.kind === "ready") {
    return "action_request";
  }

  if (memory.pendingActionDraft && looksLikeActionSpecification(trimmed)) {
    return "action_request";
  }

  if (isTemporalQuery(trimmed)) {
    if (hasActiveInvestigation(memory) || isFollowUpReference(trimmed)) {
      return "temporal_follow_up";
    }
    return "temporal_follow_up";
  }

  if (isAffectedProductsQuery(trimmed) && hasActiveInvestigation(memory)) {
    return "product_analysis";
  }

  if (isProductFollowUp(trimmed, memory)) {
    return "product_analysis";
  }

  if (
    isHistoricalPatternQuery(trimmed) ||
    (hasActiveInvestigation(memory) &&
      (lower.includes("like this") || lower.includes("happened before")))
  ) {
    return "historical_pattern";
  }

  if (lower.includes("what about roas") || lower.includes("what about acos")) {
    return "metric_follow_up";
  }

  if (isBrandQuery(trimmed)) {
    return "brand_analysis";
  }

  if (isPlatformComparisonQuery(trimmed)) {
    return "platform_analysis";
  }

  if (isRecommendationQuery(trimmed)) {
    return "recommendation";
  }

  if (isExecutiveQuery(trimmed)) {
    return "executive_summary";
  }

  if (isRootCauseQuery(trimmed)) {
    return "root_cause";
  }

  if (
    lower.includes("what changed") ||
    lower.includes("perform") ||
    lower.includes("summary")
  ) {
    return "general_performance";
  }

  return "general_performance";
}
