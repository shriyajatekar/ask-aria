import { describe, expect, it } from "vitest";

import { PERFORMANCE_RECORDS } from "@/data/performance";
import { PERFORMANCE_DATE_RANGE } from "@/data/scenarios";
import { assessBidRisk } from "@/lib/analytics/bid-risk";
import { confirmButtonLabel } from "@/components/dashboard/ask-aria/ask-aria-status";

import { ask } from "./helpers";

const asOf = PERFORMANCE_DATE_RANGE.end;

describe("bid risk check", () => {
  it("flags a ₹5 bid scheduled for 11:50 PM on Amazon as high risk", () => {
    const turn = ask("ANALYST", "Set bid to ₹5 at 11:50 pm on Amazon campaign Hydra Glow");
    const preview = turn.reply[0];
    expect(preview.kind).toBe("action_preview");
    if (preview.kind !== "action_preview") return;
    expect(preview.draft.type).toBe("schedule_bid_change");
    expect(preview.draft.bidRisk?.level).toBe("high");
    expect(preview.draft.bidRisk?.reasons[0]).toMatch(/well below what clicks cost/);
    expect(confirmButtonLabel(preview.draft)).toBe("Confirm anyway");
  });

  it("does not flag a bid close to the recent cost per click when the trend is calm", () => {
    const base = assessBidRisk(PERFORMANCE_RECORDS, { platformId: "myntra", newBid: 1, asOf });
    const risk = assessBidRisk(PERFORMANCE_RECORDS, {
      platformId: "myntra",
      newBid: base.recentCpc,
      currentBid: base.recentCpc,
      asOf,
    });
    // Same bid as today: only trend-based reasons could apply, never price ones.
    expect(risk.reasons.some((r) => /below what clicks cost|1\.5×/.test(r))).toBe(false);
  });

  it("warns about overpaying when the bid is far above the cost per click", () => {
    const { recentCpc } = assessBidRisk(PERFORMANCE_RECORDS, { platformId: "amazon", newBid: 1, asOf });
    const risk = assessBidRisk(PERFORMANCE_RECORDS, {
      platformId: "amazon",
      newBid: Math.round(recentCpc * 2),
      asOf,
    });
    expect(risk.level).not.toBe("none");
    expect(risk.reasons.join(" ")).toMatch(/1\.5×/);
  });

  it("only uses daily data (no claims about late-night traffic)", () => {
    const risk = assessBidRisk(PERFORMANCE_RECORDS, { platformId: "amazon", newBid: 5, asOf });
    expect(risk.reasons.join(" ")).not.toMatch(/night|hour|traffic is low/i);
  });
});
