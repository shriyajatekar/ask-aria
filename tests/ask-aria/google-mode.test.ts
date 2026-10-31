import { afterEach, describe, expect, it, vi } from "vitest";

import { mockExecuteAction } from "@/components/dashboard/ask-aria/ask-aria-actions";
import { isWorkspaceToolSatisfiedForAction } from "@/components/dashboard/ask-aria/ask-aria-tool-mapping";
import { isGoogleOAuthConfigured } from "@/lib/google/config";

import { converse } from "./helpers";

describe("Google demo-only mode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("stays off when OAuth keys exist but the live switch is not set", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    vi.stubEnv("ASK_ARIA_LIVE_GOOGLE", "");
    expect(isGoogleOAuthConfigured()).toBe(false);
  });

  it("turns on only with the switch and both keys", () => {
    vi.stubEnv("ASK_ARIA_LIVE_GOOGLE", "true");
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    expect(isGoogleOAuthConfigured()).toBe(false);
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    expect(isGoogleOAuthConfigured()).toBe(true);
  });

  it("labels every simulated result as demo-only, without repeating 'demo'", () => {
    const [, , draft, send] = converse("KAM", [
      "Which brands need attention?",
      "Why?",
      "Draft a client update",
      "Send this",
    ]);
    expect(draft.reply[0].kind).toBe("action_preview");
    if (send.reply[0].kind !== "action_preview") throw new Error("expected preview");
    const result = mockExecuteAction(send.reply[0].draft);
    if (result.kind !== "action_result") throw new Error("expected result");
    expect(result.detailLines?.join(" ")).toMatch(/Demo only: nothing was actually sent/);
    expect(result.message).not.toMatch(/\(demo\).*\(demo\)/);
  });

  it("asks visitors to run the simulated connect step first, then allows actions", () => {
    const demo = {
      googleOAuthConfigured: false,
      googleOAuthConnected: false,
      googleDemoConnected: false,
      microsoftDemoConnected: false,
    };
    for (const type of ["generate_report", "create_spreadsheet", "send_email"] as const) {
      expect(isWorkspaceToolSatisfiedForAction(type, demo)).toBe(false);
      expect(isWorkspaceToolSatisfiedForAction(type, { ...demo, googleDemoConnected: true })).toBe(true);
    }
  });
});
