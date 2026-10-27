import { describe, expect, it } from "vitest";

import { summariseFeedback, type AnswerFeedback } from "@/lib/ask-aria/feedback";
import { processAskAriaMessage } from "@/components/dashboard/ask-aria/ask-aria-intelligence";

import { ask, makeContext } from "./helpers";

const entry = (rating: "up" | "down", reason?: AnswerFeedback["reason"]): AnswerFeedback => ({
  messageId: Math.random().toString(36),
  title: "t",
  rating,
  reason,
  createdAt: 0,
});

describe("answer feedback", () => {
  it("summarises ratings, reasons (most common first) and unanswered questions", () => {
    const summary = summariseFeedback(
      [entry("up"), entry("down", "Too long"), entry("down", "Wrong numbers"), entry("down", "Too long")],
      [
        { question: "tell me a joke", createdAt: 1 },
        { question: "tell me a joke", createdAt: 2 },
        { question: "weather?", createdAt: 3 },
      ],
    );
    expect(summary.helpful).toBe(1);
    expect(summary.notHelpful).toBe(3);
    expect(summary.reasons[0]).toEqual({ reason: "Too long", count: 2 });
    expect(summary.unanswered).toEqual(["tell me a joke", "weather?"]);
  });

  it("'Show feedback' answers from the summary and says it stays in this browser", () => {
    const result = processAskAriaMessage("Show feedback", makeContext(), {}, "ANALYST", undefined, {
      feedbackSummary: { helpful: 2, notHelpful: 1, reasons: [{ reason: "Too long", count: 1 }], unanswered: ["x"] },
    });
    const reply = result.messages[1];
    expect(reply.kind).toBe("feedback_log");
    if (reply.kind === "feedback_log") {
      expect(reply.summary).toMatch(/^2 of 3 rated answers were helpful\. .*this browser only/);
      expect(reply.unanswered).toEqual(["x"]);
    }
  });

  it("recognises other phrasings", () => {
    expect(ask("ANALYST", "What couldn't you answer?").intent).toBe("feedback_log");
  });
});
