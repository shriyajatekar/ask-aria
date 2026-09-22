import { PLATFORM_BY_ID } from "@/data/platforms";

import { extractPlatformIdsFromText } from "./ask-aria-scope";
import { createMessageId } from "./ask-aria-storage";
import type {
  AskAriaClarificationChoice,
  AskAriaMessage,
} from "./ask-aria-types";
import type { AskAriaActionType } from "./ask-aria-types";
import {
  destinationForAction,
  toolRequiredMessage,
} from "./ask-aria-tool-mapping";

function platformLabelFromText(text: string): string {
  const ids = extractPlatformIdsFromText(text);
  if (ids.length > 0) {
    return PLATFORM_BY_ID[ids[0]]?.name ?? "this platform";
  }
  return "this platform";
}

function hasExplicitMetric(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\b(roas|acos|revenue|sales|gross sales|conversion|traffic|orders|impressions|clicks|buy box)\b/.test(
      lower,
    ) ||
    lower.includes("decline") ||
    lower.includes("dropped") ||
    lower.includes("increased")
  );
}

function isCompanyDirectoryEmailQuery(text: string): boolean {
  const lower = text.toLowerCase();
  if (!lower.includes("email") && !lower.includes("send")) return false;
  return (
    lower.includes("company directory") ||
    lower.includes("all employees") ||
    (lower.includes("everyone") &&
      (lower.includes("company") || lower.includes("org"))) ||
    lower.includes("whole company")
  );
}

function isWhatsAppQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes("whatsapp") || lower.includes("whats app");
}

function isSlackOrTeamsShareQuery(text: string): boolean {
  const lower = text.toLowerCase();
  if (!/\b(slack|teams)\b/.test(lower)) return false;
  return (
    lower.includes("share") ||
    lower.includes("post") ||
    lower.includes("send") ||
    lower.includes("notify")
  );
}

function isJiraTaskQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes("jira") && (lower.includes("task") || lower.includes("ticket"));
}

function isCompetitorPricingQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("competitor") &&
    (lower.includes("pric") || lower.includes("pricing"))
  );
}

function isPermanentDeleteCampaignQuery(text: string): boolean {
  const lower = text.toLowerCase();
  if (!lower.includes("delete")) return false;
  if (!lower.includes("campaign")) return false;
  return (
    lower.includes("all") ||
    lower.includes("permanent") ||
    lower.includes("remove all")
  );
}

function isAmbiguousImproveQuery(text: string): boolean {
  const lower = text.toLowerCase();
  const hasPlatform = extractPlatformIdsFromText(text).length > 0;
  if (!hasPlatform || hasExplicitMetric(text)) return false;
  return (
    (lower.includes("make ") && lower.includes("better")) ||
    (lower.includes("improve ") && !lower.includes("roas"))
  );
}

function isVagueNegativePlatformQuery(text: string): boolean {
  const lower = text.toLowerCase();
  if (extractPlatformIdsFromText(text).length === 0) return false;
  if (hasExplicitMetric(text)) return false;
  if (/\bwhy\b/.test(lower) && /\b(bad|terrible|awful|poor)\b/.test(lower)) {
    return true;
  }
  return (
    /\b(bad|terrible|awful|poor|struggling|underperforming)\b/.test(lower) &&
    !lower.includes("which")
  );
}

function clarificationMessage(
  variant: Extract<
    AskAriaMessage,
    { kind: "clarification" }
  >["variant"],
  title: string,
  body: string,
  choices: AskAriaClarificationChoice[],
  prompt?: string,
  alternative?: AskAriaClarificationChoice,
): AskAriaMessage {
  return {
    id: createMessageId(),
    kind: "clarification",
    variant,
    title,
    body,
    prompt,
    choices,
    alternative,
    createdAt: Date.now(),
  };
}

export function buildGoogleGmailRequiredClarification(): AskAriaMessage {
  return clarificationMessage(
    "tool_required",
    "Gmail send access needed",
    "Your Google account is connected, but sending email requires send access.\n\nAuthorize Gmail to continue — your draft stays in this thread.",
    [
      {
        label: "Connect Gmail send",
        followUpText: "",
        action: "connect_google_gmail",
      },
    ],
    "Only send permission is added; Docs and Sheets access stay unchanged.",
  );
}

export function buildGoogleSheetsRequiredClarification(): AskAriaMessage {
  return clarificationMessage(
    "tool_required",
    "Google Sheets access needed",
    "Docs is connected, but spreadsheet export needs Sheets access.\n\nAuthorize Sheets to continue — your draft stays in this thread.",
    [
      {
        label: "Connect Google Sheets",
        followUpText: "",
        action: "connect_google_sheets",
      },
    ],
    "Only Sheets access is added; existing Docs permissions stay unchanged.",
  );
}

export function buildToolRequiredClarification(
  actionType: AskAriaActionType,
  options?: { googleOAuthConfigured?: boolean },
): AskAriaMessage {
  const destination = destinationForAction(actionType, true);
  const copy = toolRequiredMessage(actionType, destination);
  const useOAuth = options?.googleOAuthConfigured === true;
  const body = useOAuth
    ? copy.body.replace(
        "Connect from Tools to enable create, share, and send in this workspace.",
        "Connect with Google to create real Docs from your analytics.",
      )
    : copy.body;
  return clarificationMessage(
    "tool_required",
    copy.title,
    body,
    [
      {
        label: useOAuth ? "Connect Google Workspace" : copy.connectLabel,
        followUpText: "",
        action: useOAuth ? "connect_google_oauth" : "connect_google_workspace",
      },
    ],
    useOAuth
      ? "You return to this thread after Google authorizes access."
      : "Open Tools to connect a workspace app.",
  );
}

export function buildClarificationResponse(text: string): AskAriaMessage | null {
  const trimmed = text.trim();
  const platform = platformLabelFromText(trimmed);

  if (isCompanyDirectoryEmailQuery(trimmed)) {
    return clarificationMessage(
      "data_not_available",
      "Recipient list not available",
      "I don't have access to a company directory in this workspace.\n\nYou can use labeled demo contacts or enter specific recipients.",
      [
        {
          label: "Draft to KAM team (demo)",
          followUpText: "Draft an email to the KAM team with this insight",
        },
        {
          label: "Enter recipients",
          followUpText:
            "Draft email to yuga@demo.commerce-intelligence.io with this update",
        },
      ],
      "Demo contacts are clearly labeled and are not a real directory.",
    );
  }

  if (isWhatsAppQuery(trimmed)) {
    return clarificationMessage(
      "integration_not_connected",
      "Integration not connected",
      "WhatsApp isn't connected in this workspace.\n\nI can draft an email or share a report through Google Workspace once connected.",
      [],
      "Would you like a different channel?",
      {
        label: "Draft email to the team",
        followUpText: "Draft an email to the KAM team with this insight",
      },
    );
  }

  if (isSlackOrTeamsShareQuery(trimmed)) {
    const channel = trimmed.toLowerCase().includes("teams")
      ? "Microsoft Teams"
      : "Slack";
    return clarificationMessage(
      "integration_not_connected",
      "Integration not connected",
      `${channel} isn't connected in this demo workspace.\n\nI can prepare a shareable report or email instead.`,
      [],
      "Try an alternative?",
      {
        label: "Create a performance report",
        followUpText: "Create today's performance report",
      },
    );
  }

  if (isJiraTaskQuery(trimmed)) {
    return clarificationMessage(
      "integration_not_connected",
      "Integration not connected",
      "Jira isn't connected in this workspace.\n\nConnect workflow tools from Connected tools to simulate task creation.",
      [
        {
          label: "Open Connected tools",
          followUpText: "",
          action: "open_tools_sheet",
        },
      ],
    );
  }

  if (isCompetitorPricingQuery(trimmed)) {
    const isMonitor =
      /\b(monitor|alert|watch)\b/i.test(trimmed) &&
      /\b(competitor|pricing|price)\b/i.test(trimmed);
    return clarificationMessage(
      "data_not_available",
      "Competitor pricing not connected",
      "Competitor pricing isn't connected to Aria.\n\nConnected data covers sales, advertising, inventory, and platform performance in your current filters.",
      isMonitor
        ? [
            {
              label: "Monitor our pricing",
              followUpText:
                "Monitor gross sales and alert me if sales drop below ₹10L",
            },
          ]
        : [],
      "What would you like to explore instead?",
      {
        label: isMonitor
          ? "Connect data source"
          : "Compare price vs performance",
        followUpText: isMonitor
          ? ""
          : "Compare price movement with sales and conversion performance for my current selection",
        action: isMonitor ? "open_tools_sheet" : undefined,
      },
    );
  }

  if (isPermanentDeleteCampaignQuery(trimmed)) {
    const amazon =
      extractPlatformIdsFromText(trimmed)[0] === "amazon" ? "Amazon" : platform;
    return clarificationMessage(
      "action_not_supported",
      "Action not supported",
      `I can help identify or pause campaigns, but I can't permanently delete campaigns from this workspace.`,
      [],
      "Would you like a safer alternative?",
      {
        label: "Review campaigns",
        followUpText: `Identify ${amazon} campaigns that are safe to pause`,
      },
    );
  }

  if (isAmbiguousImproveQuery(trimmed)) {
    return clarificationMessage(
      "ambiguous_intent",
      "Clarify your goal",
      `I can help with ${platform}. What outcome are you trying to improve?`,
      [
        {
          label: "Increase sales",
          followUpText: `How can I increase sales on ${platform}?`,
        },
        {
          label: "Improve ROAS",
          followUpText: `Why did ROAS change on ${platform}?`,
        },
        {
          label: "Increase conversion",
          followUpText: `Why did conversion rate change on ${platform}?`,
        },
        {
          label: "Reduce ad spend",
          followUpText: `Where can I reduce ad spend on ${platform} without hurting sales?`,
        },
      ],
    );
  }

  if (isVagueNegativePlatformQuery(trimmed)) {
    return clarificationMessage(
      "needs_clarification",
      "Clarify what to investigate",
      `I can investigate ${platform} performance, but "bad" could mean several things.`,
      [
        {
          label: "Revenue",
          followUpText: `Why did revenue change on ${platform}?`,
        },
        {
          label: "ROAS",
          followUpText: `Why did ROAS change on ${platform}?`,
        },
        {
          label: "Conversion",
          followUpText: `Why did conversion rate change on ${platform}?`,
        },
        {
          label: "Traffic",
          followUpText: `Why did traffic or sessions change on ${platform}?`,
        },
      ],
      "What would you like me to look at?",
    );
  }

  return null;
}
