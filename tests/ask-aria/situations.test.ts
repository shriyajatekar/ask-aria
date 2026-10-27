import { describe, expect, it } from "vitest";

import { describeSituation } from "@/components/dashboard/ask-aria/ask-aria-situations";
import { buildProactiveInsight } from "@/components/dashboard/ask-aria/ask-aria-intelligence";
import { principlesForMessage } from "@/components/dashboard/ask-aria/ask-aria-principles";
import { PERFORMANCE_RECORDS } from "@/data/performance";
import { PERFORMANCE_DATE_RANGE } from "@/data/scenarios";
import {
  detectSituations,
  findPastEpisode,
  SITUATION_THRESHOLDS,
  type Situation,
} from "@/lib/analytics/situations";
import { getDefaultDashboardRanges } from "@/lib/dashboard/date-ranges";

import { ask, makeContext } from "./helpers";

const { dateRange, comparisonPeriod } = getDefaultDashboardRanges();
const detect = () =>
  detectSituations(PERFORMANCE_RECORDS, dateRange, comparisonPeriod, PERFORMANCE_DATE_RANGE.start, 5);

describe("situation detection", () => {
  it("only raises drops past the threshold, biggest impact first, one per platform", () => {
    const situations = detect();
    expect(situations.length).toBeGreaterThan(0);
    for (const s of situations) {
      expect(s.changePct).toBeLessThanOrEqual(SITUATION_THRESHOLDS[s.metric]);
    }
    const impacts = situations.map((s) => s.impact);
    expect([...impacts].sort((a, b) => b - a)).toEqual(impacts);
    expect(new Set(situations.map((s) => s.platformId)).size).toBe(situations.length);
  });

  it("finds a past episode only before the current period", () => {
    for (const s of detect()) {
      if (!s.pastEpisode) continue;
      expect(s.pastEpisode.dropWindow.end < dateRange.start).toBe(true);
      if (s.pastEpisode.recoveredBy) {
        expect(s.pastEpisode.recoveredBy < dateRange.start).toBe(true);
      }
    }
  });

  it("says there is no precedent when the history has none", () => {
    // Nothing before the dataset start, so no episode can exist.
    expect(
      findPastEpisode(PERFORMANCE_RECORDS, "amazon", "roas", PERFORMANCE_DATE_RANGE.start, PERFORMANCE_DATE_RANGE.start),
    ).toBeNull();
    const fake: Situation = { ...detect()[0], pastEpisode: null };
    expect(describeSituation(fake).pastLine).toMatch(/^No comparable drop in the available history/);
  });

  it("flags a much smaller past drop as only a rough guide", () => {
    const s = detect()[0];
    const fake: Situation = {
      ...s,
      changePct: -30,
      pastEpisode: { ...s.pastEpisode!, dropPct: -5, samePlatform: true },
    };
    expect(describeSituation(fake).pastLine).toMatch(/rough guide/);
  });
});

describe("situation alerts in the chat", () => {
  it("answers 'what needs my attention?' with an alert card", () => {
    const turn = ask("ANALYST", "What needs my attention?");
    expect(turn.intent).toBe("situation_alerts");
    const reply = turn.reply[0];
    expect(reply.kind).toBe("situation");
    if (reply.kind !== "situation") return;
    expect(reply.summary).toMatch(/fell \d+\.\d% \(/);
    expect(reply.source?.scope).toBe(reply.scopeLabel);
    expect(principlesForMessage(reply)).toEqual(
      expect.arrayContaining(["lead_with_insight", "show_source", "offer_next_step"]),
    );
  });

  it("matches the bell: same title for the same platform", () => {
    const top = describeSituation(detect()[0]);
    const reply = ask("ANALYST", top.investigatePrompt).reply[0];
    expect(reply.kind === "situation" && reply.title).toBe(top.title);
  });

  it("keeps 'brands need attention' as a brand question", () => {
    expect(ask("KAM", "Which brands need attention?").intent).toBe("brand_analysis");
  });

  it("opens an empty chat with the most urgent alert", () => {
    const proactive = buildProactiveInsight(makeContext());
    expect(proactive?.kind).toBe("situation");
  });
});
