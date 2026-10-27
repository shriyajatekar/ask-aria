import { describe, expect, it } from "vitest";

import {
  ARIA_COMMAND_CENTER_SECTIONS,
  CAPABILITY_DISCOVERY_CHIPS,
} from "@/components/dashboard/ask-aria/ask-aria-command-center-data";
import {
  buildAskAriaSuggestions,
  buildContextualExplorePrompts,
  buildExploreAnotherQuestionPrompts,
  buildWelcomeStartHerePrompts,
} from "@/components/dashboard/ask-aria/ask-aria-prompts";
import { buildContextualThreadSuggestions } from "@/components/dashboard/ask-aria/ask-aria-thread-suggestions";

import { ask, converse, makeContext } from "./helpers";

const ROLES = ["ANALYST", "KAM", "CXO"] as const;

describe("say when uncertain", () => {
  it("corrects a question whose premise the data contradicts", () => {
    // Flipkart ROAS rose slightly in the synthetic data.
    const turn = ask("ANALYST", "Why did ROAS drop on Flipkart?");
    const reply = turn.reply[0];
    expect(reply.kind).toBe("insight");
    if (reply.kind === "insight") {
      expect(reply.caveat).toMatch(/didn't drop/i);
    }
  });

  it("does not add a caveat when the premise is right", () => {
    const reply = ask("ANALYST", "Why did ROAS drop on Amazon?").reply[0];
    expect(reply.kind === "insight" && reply.caveat).toBeFalsy();
  });

  it("greets without inventing an analysis", () => {
    const reply = ask("ANALYST", "Hello").reply[0];
    expect(reply.kind).toBe("assistant_text");
  });

  it("defines a metric instead of analysing it", () => {
    const reply = ask("KAM", "What is ACOS?").reply[0];
    expect(reply.kind).toBe("assistant_text");
    if (reply.kind === "assistant_text") {
      expect(reply.text).toMatch(/^ACOS:/);
    }
  });

  it("admits it doesn't understand instead of guessing", () => {
    const reply = ask("CXO", "Tell me a joke about penguins").reply[0];
    expect(reply.kind).toBe("assistant_text");
    if (reply.kind === "assistant_text") {
      expect(reply.text).toMatch(/not sure/i);
      expect(reply.suggestionChips?.length).toBeGreaterThan(0);
    }
  });
});

describe("built-in suggestions never hit the 'not sure' fallback", () => {
  for (const role of ROLES) {
    it(`${role} suggestion chips all get a real answer`, () => {
      const view = makeContext({ role });
      const amazonView = makeContext({ role, platform: "amazon", focusMetric: "roas" });
      const first = converse(role, ["Why did Gross Sales change?"], view);
      const prompts = new Set<string>([
        ...buildWelcomeStartHerePrompts(view),
        ...buildAskAriaSuggestions(view),
        ...buildAskAriaSuggestions(amazonView),
        ...buildContextualExplorePrompts(view),
        ...buildExploreAnotherQuestionPrompts(view),
        ...buildContextualThreadSuggestions(
          first.flatMap((t) => t.reply),
          "all platforms",
          view,
        ),
        ...ARIA_COMMAND_CENTER_SECTIONS.flatMap((s) => s.examples),
        ...CAPABILITY_DISCOVERY_CHIPS.map((c) => c.prompt),
      ]);
      const unanswered = [...prompts].filter(
        (prompt) => converse(role, ["Why did Gross Sales change?", prompt])[1].intent === "unknown",
      );
      expect(unanswered).toEqual([]);
    });
  }
});
