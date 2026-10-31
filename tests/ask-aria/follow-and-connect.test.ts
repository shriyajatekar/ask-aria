import { describe, expect, it } from "vitest";

import { evidenceToFollow } from "@/components/dashboard/ask-aria/ask-aria-evidence";

import { converse, makeContext } from "./helpers";

const NOT_CONNECTED = {
  googleOAuthConfigured: false,
  googleOAuthConnected: false,
  googleDemoConnected: false,
  microsoftDemoConnected: false,
};

describe("dashboard follows the question", () => {
  it("switches to Amazon when the question names Amazon", () => {
    const [turn] = converse("ANALYST", ["Why did ROAS drop on Amazon?"]);
    const evidence = evidenceToFollow(turn.text, turn.reply);
    expect(evidence?.platformId).toBe("amazon");
  });

  it("stays put when no single platform is named", () => {
    const [turn] = converse("ANALYST", ["Which platform is growing fastest?"]);
    expect(evidenceToFollow(turn.text, turn.reply)).toBeNull();
  });
});

describe("simulated Connect Google step", () => {
  it("asks to connect before creating a report", () => {
    const turns = converse(
      "ANALYST",
      ["Why did ROAS drop on Amazon?", "Create an RCA report"],
      makeContext({ role: "ANALYST" }),
      NOT_CONNECTED,
    );
    const last = turns[1];
    expect(last.reply.some((m) => m.kind === "action_preview")).toBe(false);
    expect(last.memory.pendingActionDraft).toBeTruthy();
  });

  it("goes straight to the preview once connected", () => {
    const turns = converse("ANALYST", ["Why did ROAS drop on Amazon?", "Create an RCA report"]);
    expect(turns[1].reply.some((m) => m.kind === "action_preview")).toBe(true);
  });
});
