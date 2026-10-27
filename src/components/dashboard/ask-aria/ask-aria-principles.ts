import type { AskAriaMessage } from "./ask-aria-types";

/**
 * The six conversation principles from the case study. The "Design notes"
 * toggle labels each answer with the ones it demonstrates, so a reviewer can
 * check them against the live demo. tests/ask-aria/principles.test.ts keeps
 * the labels honest.
 */
export type AriaPrinciple =
  | "lead_with_insight"
  | "show_source"
  | "one_answer"
  | "offer_next_step"
  | "confirm_before_action"
  | "say_when_uncertain";

export const PRINCIPLE_LABELS: Record<AriaPrinciple, string> = {
  lead_with_insight: "Leads with the insight",
  show_source: "Shows source & period",
  one_answer: "One answer per response",
  offer_next_step: "Offers a next step",
  confirm_before_action: "Confirms before acting",
  say_when_uncertain: "Says when uncertain",
};

/** A lead sentence that states a number or a named finding, not a preamble. */
function leadsWithInsight(summary: string): boolean {
  return /[\d₹%]/.test(summary) && summary.length <= 220;
}

export function principlesForMessage(message: AskAriaMessage): AriaPrinciple[] {
  const shown: AriaPrinciple[] = [];
  switch (message.kind) {
    case "insight":
      if (leadsWithInsight(message.summary)) shown.push("lead_with_insight");
      if (message.source) shown.push("show_source");
      shown.push("one_answer");
      if (message.handoffs?.length) shown.push("offer_next_step");
      if (message.caveat) shown.push("say_when_uncertain");
      break;
    case "deep_dive":
      if (leadsWithInsight(message.summary)) shown.push("lead_with_insight");
      if (message.source) shown.push("show_source");
      shown.push("one_answer");
      if (message.actions.length) shown.push("offer_next_step");
      if (
        message.caveat ||
        !message.hasPrecedent ||
        message.rca.confidence !== "high" ||
        /rough guide|had not recovered/.test(message.pastLine)
      ) {
        shown.push("say_when_uncertain");
      }
      break;
    case "situation":
      if (leadsWithInsight(message.summary)) shown.push("lead_with_insight");
      if (message.source) shown.push("show_source");
      shown.push("one_answer");
      shown.push("offer_next_step");
      if (!message.hasPrecedent || /rough guide|had not recovered/.test(message.pastLine)) {
        shown.push("say_when_uncertain");
      }
      break;
    case "rca":
      if (leadsWithInsight(message.summary)) shown.push("lead_with_insight");
      if (message.source) shown.push("show_source");
      shown.push("one_answer");
      if (message.handoffs?.length) shown.push("offer_next_step");
      // Every RCA states its confidence; low confidence is called out.
      shown.push("say_when_uncertain");
      break;
    case "recommendation":
      if (leadsWithInsight(message.observation)) shown.push("lead_with_insight");
      if (message.source) shown.push("show_source");
      shown.push("one_answer");
      if (message.handoffs?.length || message.nextAction) shown.push("offer_next_step");
      break;
    case "clarification":
      shown.push("say_when_uncertain");
      break;
    case "assistant_text":
      if (/not sure|don't have|can't/i.test(message.text)) {
        shown.push("say_when_uncertain");
      }
      if (message.suggestionChips?.length) shown.push("offer_next_step");
      break;
    case "action_preview":
      shown.push("confirm_before_action");
      break;
    case "action_result":
      if (message.status === "blocked") shown.push("confirm_before_action");
      break;
    default:
      break;
  }
  return shown;
}
