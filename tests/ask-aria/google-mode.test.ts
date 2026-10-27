import { afterEach, describe, expect, it, vi } from "vitest";

import { isWorkspaceToolSatisfiedForAction } from "@/components/dashboard/ask-aria/ask-aria-tool-mapping";
import { isGoogleOAuthConfigured } from "@/lib/google/config";

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

  it("lets visitors run simulated actions without connecting anything", () => {
    const demo = {
      googleOAuthConfigured: false,
      googleOAuthConnected: false,
      googleDemoConnected: false,
      microsoftDemoConnected: false,
    };
    for (const type of ["generate_report", "create_spreadsheet", "send_email"] as const) {
      expect(isWorkspaceToolSatisfiedForAction(type, demo)).toBe(true);
    }
  });
});
