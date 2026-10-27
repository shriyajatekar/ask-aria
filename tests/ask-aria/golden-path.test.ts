import { describe, expect, it } from "vitest";

import {
  GOLDEN_PATH,
  VAGUE_QUESTION,
} from "@/components/dashboard/ask-aria/ask-aria-golden-path";
import { buildWelcomeStartHerePrompts } from "@/components/dashboard/ask-aria/ask-aria-prompts";
import { principlesForMessage } from "@/components/dashboard/ask-aria/ask-aria-principles";

import { ask, converse, makeContext, titleOf } from "./helpers";

/**
 * The interview script. If one of these fails, fix the app or update
 * docs/GOLDEN-PATH.md together with GOLDEN_PATH — never ship a broken step.
 */
describe("golden path", () => {
  it("Analyst: investigate → products → history → report", () => {
    const turns = converse(
      "ANALYST",
      GOLDEN_PATH.ANALYST.map((s) => s.prompt),
    );
    const [why, products, history, report] = turns;
    expect(why.reply[0].kind).toBe("insight");
    expect(principlesForMessage(why.reply[0])).toEqual(
      expect.arrayContaining(["lead_with_insight", "show_source"]),
    );
    expect(why.reply[0].kind === "insight" && why.reply[0].caveat).toBeFalsy();
    expect(products.intent).toBe("root_cause_analysis");
    expect(products.reply[0].kind).toBe("rca");
    expect(products.memory.lastMetric).toBe("roas");
    expect(products.memory.lastPlatform).toBe("amazon");
    expect(history.intent).toBe("historical_pattern");
    expect(history.memory.lastPlatform).toBe("amazon");
    // Demo mode: a reviewable preview, nothing runs until confirmed.
    expect(report.reply[0].kind).toBe("action_preview");
  });

  it("KAM: brands → why → draft → confirm send", () => {
    const [brands, why, draft, send] = converse(
      "KAM",
      GOLDEN_PATH.KAM.map((s) => s.prompt),
    );
    expect(titleOf(brands.reply[0])).toMatch(/brands/i);
    expect(titleOf(why.reply[0])).toContain(brands.memory.lastBrandName as string);
    expect(draft.reply[0].kind).toBe("action_preview");
    if (draft.reply[0].kind === "action_preview") {
      // The client email is about the brand the thread discussed.
      const brand = brands.memory.lastBrandName as string;
      expect(draft.reply[0].draft.emailSubject).toContain(brand);
      expect(draft.reply[0].draft.emailPreviewLines?.join("\n")).toContain(brand);
    }
    expect(send.reply[0].kind).toBe("action_preview");
    expect(principlesForMessage(send.reply[0])).toContain("confirm_before_action");
  });

  it("CXO: biggest risk → why → fastest growth → guardrail", () => {
    const [risk, why, growth, pause] = converse(
      "CXO",
      GOLDEN_PATH.CXO.map((s) => s.prompt),
    );
    const riskReply = risk.reply[0];
    expect(riskReply.kind === "insight" && riskReply.summary).toMatch(/^Biggest risk: /);
    expect(why.memory.lastPlatform).toBe(risk.memory.lastPlatform);
    expect(growth.reply[0].kind === "insight" && growth.reply[0].summary).toMatch(
      /grew fastest: .*\+/,
    );
    expect(pause.reply[0].kind).toBe("action_result");
    if (pause.reply[0].kind === "action_result") {
      expect(pause.reply[0].status).toBe("blocked");
    }
  });

  it("the vague question gets a clarifying question in every role", () => {
    for (const role of ["ANALYST", "KAM", "CXO"] as const) {
      expect(ask(role, VAGUE_QUESTION).reply[0].kind).toBe("clarification");
    }
  });

  it("each role's first golden-path question is offered on the welcome screen", () => {
    for (const role of ["ANALYST", "KAM", "CXO"] as const) {
      expect(buildWelcomeStartHerePrompts(makeContext({ role }))).toContain(
        GOLDEN_PATH[role][0].prompt,
      );
    }
  });
});
