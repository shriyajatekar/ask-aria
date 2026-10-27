import { resolveAskAriaStorageScope } from "@/components/dashboard/ask-aria/ask-aria-user-scope";
import type { AskAriaActionDraft } from "@/components/dashboard/ask-aria/ask-aria-types";
import { PERFORMANCE_RECORDS } from "@/data/performance";
import { PERFORMANCE_DATE_RANGE } from "@/data/scenarios";
import {
  evaluateOutcome,
  exampleTrackedAction,
  type OutcomeResult,
  type TrackedAction,
} from "@/lib/analytics/outcomes";
import type { PlatformId } from "@/types/analytics";

/**
 * Confirmed actions whose outcome Aria checks later ("Did it work?").
 * Stored per user in this browser only.
 */
const MAX_TRACKED = 20;

function storageKey(userId: string): string {
  return `ci-ask-aria-tracked-actions:${resolveAskAriaStorageScope(userId)}`;
}

function isTrackedAction(value: unknown): value is TrackedAction {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.label === "string" &&
    typeof v.platformId === "string" &&
    typeof v.metric === "string" &&
    (v.goal === "increase" || v.goal === "decrease") &&
    typeof v.date === "string"
  );
}

export function loadTrackedActions(userId: string | null | undefined): TrackedAction[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey(userId)) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter(isTrackedAction).slice(0, MAX_TRACKED) : [];
  } catch {
    return [];
  }
}

export function saveTrackedAction(userId: string, action: TrackedAction): void {
  if (typeof window === "undefined") return;
  try {
    const next = [action, ...loadTrackedActions(userId).filter((a) => a.id !== action.id)];
    window.localStorage.setItem(storageKey(userId), JSON.stringify(next.slice(0, MAX_TRACKED)));
  } catch {
    // Storage blocked: the action still ran, it just won't be tracked.
  }
}

/** Which confirmed actions are worth a before/after check, and on what metric. */
export function trackableFromDraft(
  draft: AskAriaActionDraft,
  todayIso: string,
): TrackedAction | null {
  if (!draft.platformId) return null;
  const platformId = draft.platformId as PlatformId;
  const target = draft.campaignName ? ` · ${draft.campaignName}` : "";
  const base = { id: `tracked-${draft.id}`, platformId, date: todayIso };
  switch (draft.type) {
    case "campaign_bid":
    case "schedule_bid_change":
    case "update_bid":
      return {
        ...base,
        label: `Bid set to ₹${draft.newBid ?? "?"}${target}`,
        metric: "roas",
        goal: "increase",
      };
    case "campaign_budget":
    case "update_budget":
    case "budget_reallocation":
      return { ...base, label: `Budget change${target}`, metric: "roas", goal: "increase" };
    case "keyword_pause":
      return { ...base, label: "Paused underperforming keywords", metric: "acos", goal: "decrease" };
    case "pause_campaign":
      return { ...base, label: `Paused campaign${target}`, metric: "acos", goal: "decrease" };
    default:
      return null;
  }
}

/** Outcomes for the user's tracked actions, plus the labelled demo example. */
export function outcomesFor(tracked: TrackedAction[]): OutcomeResult[] {
  const actions = [...tracked, exampleTrackedAction(PERFORMANCE_DATE_RANGE.end)];
  return actions.map((action) =>
    evaluateOutcome(action, PERFORMANCE_RECORDS, PERFORMANCE_DATE_RANGE.end),
  );
}
