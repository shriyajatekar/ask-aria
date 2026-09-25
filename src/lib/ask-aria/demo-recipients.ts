/**
 * Prototype demo contacts — not a real company directory.
 * Labels make demo intent explicit; do not use for production routing.
 */

export interface DemoRecipientGroup {
  id: string;
  /** Display label shown in drafts (includes "demo") */
  label: string;
  emails: string[];
}

export const DEMO_RECIPIENT_GROUPS: DemoRecipientGroup[] = [
  {
    id: "client_account",
    label: "Client account (demo)",
    emails: ["client-contact@demo.commerce-intelligence.io"],
  },
  {
    id: "kam_team",
    label: "KAM team (demo)",
    emails: [
      "yuga@demo.commerce-intelligence.io",
      "raghav@demo.commerce-intelligence.io",
    ],
  },
  {
    id: "leadership",
    label: "Leadership (demo)",
    emails: ["sri@demo.commerce-intelligence.io"],
  },
];

export function resolveDemoRecipientGroup(
  text: string,
): DemoRecipientGroup | null {
  const lower = text.toLowerCase();
  if (
    lower.includes("client update") ||
    (lower.includes("client") &&
      !lower.includes("kam") &&
      (lower.includes("draft") ||
        lower.includes("send") ||
        lower.includes("prepare") ||
        lower.includes("write") ||
        lower.includes("create")))
  ) {
    return DEMO_RECIPIENT_GROUPS.find((g) => g.id === "client_account") ?? null;
  }
  if (
    lower.includes("kam") ||
    (lower.includes("account") && lower.includes("team"))
  ) {
    return DEMO_RECIPIENT_GROUPS.find((g) => g.id === "kam_team") ?? null;
  }
  if (
    lower.includes("leadership") ||
    lower.includes("executive") ||
    lower.includes("cxo")
  ) {
    return DEMO_RECIPIENT_GROUPS.find((g) => g.id === "leadership") ?? null;
  }
  if (
    lower.includes("myself") ||
    /\bto me\b/.test(lower) ||
    lower.includes("send to me")
  ) {
    return { id: "myself", label: "Myself (demo)", emails: [] };
  }
  return null;
}

export function demoGroupById(id: string): DemoRecipientGroup | undefined {
  return DEMO_RECIPIENT_GROUPS.find((g) => g.id === id);
}
