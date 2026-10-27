import { describe, expect, it } from "vitest";

import { ask, converse, titleOf } from "./helpers";

describe("intent routing", () => {
  it("asks a clarifying question for a vague complaint", () => {
    for (const role of ["ANALYST", "KAM", "CXO"] as const) {
      const turn = ask(role, "Why is Amazon bad?");
      expect(turn.reply[0].kind).toBe("clarification");
    }
  });

  it("treats 'biggest risk this month' as an executive question, not a date question", () => {
    const turn = ask("CXO", "What's the biggest risk this month?");
    expect(turn.intent).toBe("executive_summary");
    expect(titleOf(turn.reply[0])).not.toMatch(/yesterday/i);
  });

  it("reads 'this month' as the last 30 days", () => {
    const turn = ask("ANALYST", "How did ROAS do this month?");
    expect(titleOf(turn.reply[0])).toMatch(/last 30 days/i);
  });

  it("answers weekend questions with a weekend window", () => {
    const turn = ask("ANALYST", "Is it the weekend effect?");
    expect(titleOf(turn.reply[0])).toMatch(/weekend/i);
  });

  it("parses a bid amount written as 'to 25'", () => {
    const turn = ask("ANALYST", "Increase bid on Amazon campaign Hydra Glow to 25");
    expect(turn.intent).toBe("action_request");
    const preview = turn.reply[0];
    expect(preview.kind).toBe("action_preview");
    if (preview.kind === "action_preview") {
      expect(preview.draft.newBid).toBe(25);
      expect(preview.draft.campaignName).toBe("Hydra Glow");
    }
  });

  it("treats 'email this to my team' as an email draft", () => {
    const turn = ask("ANALYST", "Email this to my team");
    expect(turn.intent).toBe("action_request");
  });

  it("answers 'top products' with a product ranking", () => {
    const turn = ask("ANALYST", "Show me top products");
    expect(turn.intent).toBe("product_ranking");
    expect(titleOf(turn.reply[0])).toMatch(/top products/i);
  });

  it("routes a platform comparison", () => {
    expect(ask("ANALYST", "Compare Amazon and Flipkart").intent).toBe(
      "platform_analysis",
    );
  });
});

describe("conversation context", () => {
  it("keeps metric and platform through Analyst follow-ups", () => {
    const turns = converse("ANALYST", [
      "Why did ROAS drop on Amazon?",
      "Which products caused it?",
      "What about Flipkart?",
    ]);
    expect(turns[1].intent).toBe("product_analysis");
    expect(turns[1].memory.lastMetric).toBe("roas");
    expect(turns[1].memory.lastPlatform).toBe("amazon");
    expect(turns[2].memory.lastMetric).toBe("roas");
    expect(turns[2].memory.lastPlatform).toBe("flipkart");
  });

  it("explains the weakest brand when a KAM asks 'why?' after the brand list", () => {
    const [brands, why] = converse("KAM", [
      "Which brands need attention?",
      "Why?",
    ]);
    expect(brands.memory.lastBrandId).toBeTruthy();
    expect(why.intent).toBe("root_cause");
    expect(titleOf(why.reply[0])).toContain(
      brands.memory.lastBrandName as string,
    );
  });

  it("explains the biggest risk when a CXO asks 'why?' after the summary", () => {
    const [summary, why] = converse("CXO", [
      "What's the biggest risk this month?",
      "Why?",
    ]);
    expect(why.intent).toBe("root_cause");
    expect(titleOf(why.reply[0])).not.toBe("Business summary");
    expect(why.memory.lastPlatform).toBe(summary.memory.lastPlatform);
  });

  it("keeps the metric when the time window changes", () => {
    const turns = converse("ANALYST", [
      "Why did ROAS drop on Amazon?",
      "What about last week?",
    ]);
    expect(turns[1].intent).toBe("temporal_follow_up");
    expect(turns[1].memory.lastMetric).toBe("roas");
  });

  it("asks for confirmation before sending a client update", () => {
    const turns = converse("KAM", [
      "Which brands need attention?",
      "Draft a client update",
      "Send this",
    ]);
    expect(turns[1].reply[0].kind).toBe("action_preview");
    expect(turns[2].reply[0].kind).toBe("action_preview");
  });

  it("blocks a CXO from changing campaigns", () => {
    const turn = ask("CXO", "Pause the Amazon campaign Hydra Glow");
    expect(turn.reply[0].kind).toBe("action_result");
    if (turn.reply[0].kind === "action_result") {
      expect(turn.reply[0].status).toBe("blocked");
    }
  });
});
