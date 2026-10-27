import { METRIC_BY_ID } from "@/data/metrics";
import { PLATFORM_BY_ID } from "@/data/platforms";
import type { OutcomeResult, TrackedAction } from "@/lib/analytics/outcomes";
import { formatMetricValue } from "@/lib/ask-aria/monitors";
import { outcomesFor } from "@/lib/ask-aria/tracked-actions";

import { createMessageId } from "./ask-aria-storage";
import type { AskAriaMessage } from "./ask-aria-types";

/** Shared by the chat and the notification bell, so both say the same thing. */
export const OUTCOME_CAVEAT =
  "This compares the days before and after each change. Other things changed too, and this demo's synthetic data doesn't react to your actions, so read it as how the check works, not proof the action caused the result.";

const VERDICT_LABEL: Record<OutcomeResult["verdict"], string> = {
  improved: "Improved",
  worse: "Got worse",
  no_clear_change: "No clear change",
  too_early: "Too early to tell",
};

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function describeOutcome(result: OutcomeResult): {
  title: string;
  verdictLabel: string;
  detail: string;
} {
  const { action } = result;
  const metric = METRIC_BY_ID[action.metric]?.name ?? action.metric;
  const platform = PLATFORM_BY_ID[action.platformId]?.name ?? action.platformId;
  const title = `${action.example ? "Example · " : ""}${action.label} (${platform}, ${formatDay(action.date)})`;
  if (result.verdict === "too_early") {
    return {
      title,
      verdictLabel: VERDICT_LABEL.too_early,
      detail: `Needs 3 days of data after the change. First check on ${formatDay(result.firstCheckOn)}.`,
    };
  }
  const sign = result.changePct >= 0 ? "+" : "−";
  return {
    title,
    verdictLabel: VERDICT_LABEL[result.verdict],
    detail: `${metric} ${formatMetricValue(action.metric, result.before)} → ${formatMetricValue(action.metric, result.after)} (${sign}${Math.abs(result.changePct).toFixed(1)}%) over ${result.daysMeasured} day${result.daysMeasured === 1 ? "" : "s"} after, vs the 7 days before.`,
  };
}

export function buildOutcomeMessage(tracked: TrackedAction[]): AskAriaMessage {
  const results = outcomesFor(tracked);
  const own = results.filter((r) => !r.action.example);
  const ready = own.filter((r) => r.verdict !== "too_early");
  const summary = !own.length
    ? "You haven't confirmed a bid, budget or keyword change yet. Here's how the check works, using an example from the demo history."
    : ready.length
      ? `${ready.length} of your ${own.length} tracked change${own.length === 1 ? "" : "s"} can be checked: ${ready.filter((r) => r.verdict === "improved").length} improved, ${ready.filter((r) => r.verdict === "worse").length} got worse.`
      : `Your ${own.length} tracked change${own.length === 1 ? " is" : "s are"} too recent to judge yet.`;
  return {
    id: createMessageId(),
    kind: "outcome",
    title: "Did it work?",
    summary,
    items: results.map((result) => {
      const copy = describeOutcome(result);
      return {
        id: result.action.id,
        label: copy.title,
        example: Boolean(result.action.example),
        verdict: result.verdict,
        verdictLabel: copy.verdictLabel,
        detail: copy.detail,
      };
    }),
    caveat: OUTCOME_CAVEAT,
    createdAt: Date.now(),
  };
}
