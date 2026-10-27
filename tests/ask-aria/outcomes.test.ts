import { describe, expect, it } from "vitest";

import { OUTCOME_CAVEAT } from "@/components/dashboard/ask-aria/ask-aria-outcomes";
import { buildActionDraft } from "@/components/dashboard/ask-aria/ask-aria-actions";
import { PERFORMANCE_RECORDS } from "@/data/performance";
import { PERFORMANCE_DATE_RANGE } from "@/data/scenarios";
import { evaluateOutcome, exampleTrackedAction, type TrackedAction } from "@/lib/analytics/outcomes";
import { trackableFromDraft } from "@/lib/ask-aria/tracked-actions";

import { converse } from "./helpers";

const end = PERFORMANCE_DATE_RANGE.end;
const daysBefore = (n: number) =>
  new Date(Date.parse(`${end}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);

describe("did it work?", () => {
  it("judges the built-in example from the data, with a clear verdict", () => {
    const result = evaluateOutcome(exampleTrackedAction(end), PERFORMANCE_RECORDS, end);
    expect(result.daysMeasured).toBe(7);
    expect(["improved", "worse", "no_clear_change"]).toContain(result.verdict);
    expect(result.before).toBeGreaterThan(0);
  });

  it("says it's too early until there are 3 days of data after the change", () => {
    const action: TrackedAction = {
      id: "t",
      label: "Bid set",
      platformId: "amazon",
      metric: "roas",
      goal: "increase",
      date: daysBefore(1),
    };
    const result = evaluateOutcome(action, PERFORMANCE_RECORDS, end);
    expect(result.verdict).toBe("too_early");
    expect(result.daysMeasured).toBe(2);
  });

  it("respects the goal: lower ACOS counts as improved", () => {
    const action: TrackedAction = {
      id: "t",
      label: "Paused keywords",
      platformId: "amazon",
      metric: "acos",
      goal: "decrease",
      date: daysBefore(9),
    };
    const result = evaluateOutcome(action, PERFORMANCE_RECORDS, end);
    if (result.verdict === "improved") expect(result.changePct).toBeLessThan(0);
    if (result.verdict === "worse") expect(result.changePct).toBeGreaterThan(0);
  });

  it("tracks bid and budget changes, not emails or reports", () => {
    const today = "2026-10-27";
    const bid = buildActionDraft({ type: "campaign_bid", platformId: "amazon", newBid: 14, campaignName: "X" });
    expect(trackableFromDraft(bid, today)?.metric).toBe("roas");
    const email = buildActionDraft({ type: "send_email", platformId: "amazon" });
    expect(trackableFromDraft(email, today)).toBeNull();
  });

  it("answers 'Did it work?' in the chat with the caveat", () => {
    const [turn] = converse("ANALYST", ["Did it work?"]);
    expect(turn.intent).toBe("outcome_check");
    const reply = turn.reply[0];
    expect(reply.kind).toBe("outcome");
    if (reply.kind !== "outcome") return;
    expect(reply.summary).toMatch(/haven't confirmed/);
    expect(reply.items[0].example).toBe(true);
    expect(reply.items[0].label).toMatch(/^Example · /);
    expect(reply.caveat).toBe(OUTCOME_CAVEAT);
  });

  it("recognises other phrasings", () => {
    for (const q of ["How did my bids do?", "Did my bid change work?", "Show outcomes"]) {
      expect(converse("ANALYST", [q])[0].intent, q).toBe("outcome_check");
    }
  });
});
