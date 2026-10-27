import { describe, expect, it } from "vitest";

import { PERFORMANCE_DATE_RANGE } from "@/data/scenarios";
import { DEMO_DATASET_LABEL } from "@/components/dashboard/ask-aria/ask-aria-intelligence";
import { principlesForMessage } from "@/components/dashboard/ask-aria/ask-aria-principles";
import type { AskAriaMessage } from "@/components/dashboard/ask-aria/ask-aria-types";

import { ask, converse } from "./helpers";

const ROLES = ["ANALYST", "KAM", "CXO"] as const;

const ANALYSIS_QUESTIONS = [
  "Why did ROAS drop on Amazon?",
  "Which brands need attention?",
  "What's the biggest risk this month?",
  "Compare Amazon and Flipkart",
  "What should I do?",
  "What about last week?",
  "Show me top products",
];

function analysisReplies(): AskAriaMessage[] {
  return ROLES.flatMap((role) =>
    ANALYSIS_QUESTIONS.flatMap((q) => ask(role, q).reply),
  ).filter((m) => m.kind === "insight" || m.kind === "recommendation");
}

describe("show the source", () => {
  it("cites dataset, scope and both periods on every analysis answer", () => {
    const replies = analysisReplies();
    expect(replies.length).toBeGreaterThan(15);
    for (const reply of replies) {
      if (reply.kind !== "insight" && reply.kind !== "recommendation") continue;
      expect(reply.source?.dataset).toBe(DEMO_DATASET_LABEL);
      expect(reply.source?.scope).toBeTruthy();
      expect(reply.source?.period).toMatch(/\d{4}/);
      expect(reply.source?.comparison).toMatch(/\d{4}/);
    }
  });

  it("cites the window actually analysed for time questions", () => {
    const [, lastWeek] = converse("ANALYST", [
      "Why did ROAS drop on Amazon?",
      "What about last week?",
    ]);
    const reply = lastWeek.reply[0];
    expect(reply.kind).toBe("insight");
    if (reply.kind === "insight") {
      expect(reply.title).toContain("Previous week");
      // 7-day window, not the dashboard's 30-day range.
      // The week before last: 13 to 7 days before the dataset ends.
      const day = (offset: number) =>
        new Date(Date.parse(`${PERFORMANCE_DATE_RANGE.end}T00:00:00Z`) - offset * 86_400_000)
          .toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      expect(reply.source?.period).toBe(`${day(13)} – ${day(7)}`);
    }
  });
});

describe("answer copy", () => {
  it("has no double negatives and uses lakh/crore, never millions", () => {
    const followUps = ["Which products caused it?", "Has this happened before?", "Why?"];
    const texts = ROLES.flatMap((role) =>
      ANALYSIS_QUESTIONS.flatMap((q) =>
        followUps.flatMap((f) => converse(role, [q, f]).flatMap((t) => t.reply)),
      ),
    ).flatMap((m) =>
      m.kind === "insight"
        ? [m.summary, m.caveat ?? "", ...m.sections.flatMap((s) => s.lines)]
        : m.kind === "recommendation"
          ? [m.observation]
          : [],
    );
    expect(texts.length).toBeGreaterThan(100);
    const bad = texts.filter((t) =>
      /\b(declined|fell|dropped) -\d|\b(increased|rose|grew) \+\d|₹[\d.]+M\b/.test(t),
    );
    expect(bad).toEqual([]);
  });
});

describe("design-notes labels", () => {
  it("every analysis answer shows source, one answer and leads with a number", () => {
    for (const reply of analysisReplies()) {
      const shown = principlesForMessage(reply);
      expect(shown).toContain("show_source");
      expect(shown).toContain("one_answer");
      expect(shown).toContain("lead_with_insight");
    }
  });

  it("labels the confirm-before-action step", () => {
    const turns = converse("KAM", ["Which brands need attention?", "Draft a client update"]);
    expect(principlesForMessage(turns[1].reply[0])).toContain("confirm_before_action");
  });

  it("labels clarifying questions and corrections as 'says when uncertain'", () => {
    expect(principlesForMessage(ask("ANALYST", "Why is Amazon bad?").reply[0])).toContain(
      "say_when_uncertain",
    );
    expect(
      principlesForMessage(ask("ANALYST", "Why did ROAS drop on Flipkart?").reply[0]),
    ).toContain("say_when_uncertain");
  });
});
