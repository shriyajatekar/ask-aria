export type AskAriaCapability =
  | "understand"
  | "compare"
  | "investigate"
  | "discover"
  | "create"
  | "transform"
  | "communicate"
  | "act"
  | "monitor";

const CAPABILITY_PATTERNS: Array<{ capability: AskAriaCapability; pattern: RegExp }> =
  [
    { capability: "monitor", pattern: /\b(monitor|alert me|let me know if)\b/i },
    { capability: "communicate", pattern: /\b(email|send|slack|teams|share with)\b/i },
    { capability: "create", pattern: /\b(create|generate|build|spreadsheet|report)\b/i },
    { capability: "transform", pattern: /\b(turn this into|convert|executive summary|summarize)\b/i },
    { capability: "compare", pattern: /\b(compare|versus|vs\.?|better than)\b/i },
    { capability: "discover", pattern: /\b(opportunity|biggest|which products need)\b/i },
    { capability: "investigate", pattern: /\b(why|cause|decline|drop|what happened)\b/i },
    { capability: "understand", pattern: /\b(what is happening|how is|performance)\b/i },
  ];

export function classifyCapability(text: string): AskAriaCapability {
  const trimmed = text.trim();
  for (const entry of CAPABILITY_PATTERNS) {
    if (entry.pattern.test(trimmed)) return entry.capability;
  }
  return "understand";
}

export const CAPABILITY_LABELS: Record<AskAriaCapability, string> = {
  understand: "Understand",
  compare: "Compare",
  investigate: "Investigate",
  discover: "Discover",
  create: "Create",
  transform: "Transform",
  communicate: "Communicate",
  act: "Act",
  monitor: "Monitor",
};

/** Optional welcome rotation — one capability example alongside contextual prompts. */
export const CAPABILITY_EXPLORE_EXAMPLES = [
  "Create a weekly performance report",
  "Turn this into an executive summary",
  "Create a spreadsheet of underperforming products",
  "Draft an email to the KAM team",
  "Monitor Amazon ROAS and alert me if it falls below 3",
] as const;
