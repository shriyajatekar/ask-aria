import type { UserRole } from "@/lib/auth/types";

/**
 * Scripted interview path: 4 questions per role, asked in order, that each
 * show a conversation principle. tests/ask-aria/golden-path.test.ts keeps
 * them working — change both together.
 */
export interface GoldenPathStep {
  prompt: string;
  /** Which design principle this step demonstrates (for the presenter). */
  shows: string;
}

export const GOLDEN_PATH: Record<UserRole, GoldenPathStep[]> = {
  ANALYST: [
    { prompt: "Why did ROAS drop on Amazon?", shows: "Leads with the insight, cites source and period" },
    { prompt: "Run a root-cause analysis", shows: "Driver tree: what explains the drop, where, and what was ruled out" },
    { prompt: "Has this happened before?", shows: "Says plainly when there is no precedent" },
    { prompt: "Create an RCA report", shows: "Insight → action, confirm before it runs" },
  ],
  KAM: [
    { prompt: "Which brands need attention?", shows: "Role-specific answer: accounts, not channels" },
    { prompt: "Why?", shows: "Bare follow-up explains the weakest brand" },
    { prompt: "Draft a client update", shows: "Insight → action with a reviewable draft" },
    { prompt: "Send this", shows: "Confirm before send" },
  ],
  CXO: [
    { prompt: "What's the biggest risk this month?", shows: "One answer, led by the biggest number" },
    { prompt: "Why?", shows: "Follow-up drills into that risk" },
    { prompt: "Which platform is growing fastest?", shows: "Executive-level, one-line answer" },
    { prompt: "Pause the Amazon campaign Hydra Glow", shows: "Role guardrail: CXOs can't change campaigns" },
  ],
};

/** Shared by all roles: the vague question that should get a clarifying question. */
export const VAGUE_QUESTION = "Why is Amazon bad?";

export function goldenPathChips(role: UserRole): Array<{ label: string; prompt: string }> {
  return GOLDEN_PATH[role].slice(0, 1).concat(
    role === "ANALYST"
      ? [{ prompt: "Show me top products", shows: "" }]
      : role === "KAM"
        ? [{ prompt: "Compare Amazon and Flipkart", shows: "" }]
        : [{ prompt: "How are we doing overall?", shows: "" }],
  ).map((step) => ({ label: step.prompt, prompt: step.prompt }));
}
