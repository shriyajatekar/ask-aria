export interface CommandCenterSection {
  id: "understand" | "create" | "communicate" | "monitor" | "action";
  label: string;
  /** One-line capability summary for command center disclosure. */
  description: string;
  examples: string[];
}

export const ARIA_COMMAND_CENTER_SECTIONS: CommandCenterSection[] = [
  {
    id: "understand",
    label: "Understand",
    description:
      "Explain metric movement, drivers, and what to investigate in your current filters.",
    examples: [
      "Why did ROAS change?",
      "Which products caused the decline?",
      "What should I investigate next?",
    ],
  },
  {
    id: "create",
    label: "Create",
    description:
      "Turn the current analysis into a report or spreadsheet you can share.",
    examples: [
      "Create a report from this analysis",
      "Create a spreadsheet of underperforming products",
    ],
  },
  {
    id: "communicate",
    label: "Communicate",
    description:
      "Share findings by email, Slack or Teams, or book a review — always previewed first.",
    examples: [
      "Draft an email to the KAM team with this insight",
      "Share this on Slack",
      "Schedule a review with the client tomorrow at 3pm",
    ],
  },
  {
    id: "monitor",
    label: "Monitor",
    description:
      "See what needs attention, set simulated alerts, or get a weekly digest.",
    examples: [
      "What needs my attention?",
      "Monitor Amazon ROAS and alert me if it falls below 3",
      "Send me a weekly digest",
    ],
  },
  {
    id: "action",
    label: "Action",
    description:
      "Prepare campaign changes with review and confirmation before execution.",
    examples: [
      "Set Campaign X bid to ₹14 tonight at 11:50 PM",
      "Pause underperforming keywords on Amazon",
      "Create a Jira task for this",
    ],
  },
];

export const CAPABILITY_DISCOVERY_CHIPS = [
  { group: "Understand", prompt: "Why did this metric change?" },
  { group: "Create", prompt: "Create a weekly performance report" },
  { group: "Communicate", prompt: "Draft an email with this insight" },
  { group: "Monitor", prompt: "What am I monitoring?" },
] as const;
