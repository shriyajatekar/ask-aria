import { METRIC_BY_ID } from "@/data/metrics";
import { PLATFORM_BY_ID } from "@/data/platforms";
import { platformIdFromScopeLabel } from "./ask-aria-scope";
import type { PlatformId } from "@/types/analytics";
import type { UserRole } from "@/lib/auth/types";

import { extractLastWorkspaceArtifact } from "./ask-aria-artifacts";
import type { AskAriaDashboardView } from "./ask-aria-prompts";
import type { AskAriaMessage } from "./ask-aria-types";

export type ConversationSurface =
  | "empty"
  | "after_insight"
  | "after_report"
  | "after_spreadsheet"
  | "after_monitor_alert"
  | "after_email"
  | "general";

export function detectConversationSurface(
  messages: AskAriaMessage[],
): ConversationSurface {
  if (!messages.length) return "empty";
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.kind === "monitor_alert") return "after_monitor_alert";
    if (message.kind === "action_result" && message.status === "completed") {
      if (
        message.draft.type === "generate_report" ||
        message.draft.type === "schedule_report"
      ) {
        return "after_report";
      }
      if (message.draft.type === "create_spreadsheet") {
        return "after_spreadsheet";
      }
      if (
        message.draft.type === "send_email" ||
        message.draft.type === "draft_email"
      ) {
        return "after_email";
      }
    }
    if (message.kind === "insight" || message.kind === "recommendation") {
      return "after_insight";
    }
  }
  return "general";
}

const MAX_CONTEXTUAL_SUGGESTIONS = 4;

interface InsightThreadContext {
  platformId?: PlatformId;
  platformName?: string;
  productMentioned: boolean;
  metricLabel?: string;
  lastUserQuestion?: string;
}

function metricLabelFromMessages(messages: AskAriaMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.kind === "user") {
      const lower = message.text.toLowerCase();
      for (const [id, def] of Object.entries(METRIC_BY_ID)) {
        const name = def?.name?.toLowerCase();
        if (name && lower.includes(name)) {
          return def?.name;
        }
      }
      if (lower.includes("roas")) return "ROAS";
      if (lower.includes("acos")) return "ACOS";
      if (lower.includes("sales")) return "Gross Sales";
      return undefined;
    }
  }
  return undefined;
}

function extractInsightThreadContext(
  messages: AskAriaMessage[],
  view: AskAriaDashboardView,
): InsightThreadContext {
  let platformId: PlatformId | undefined;
  let productMentioned = false;
  let metricLabel: string | undefined;
  let lastUserQuestion: string | undefined;

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.kind === "user" && !lastUserQuestion) {
      lastUserQuestion = message.text;
    }
    if (message.kind === "insight" || message.kind === "recommendation") {
      if (message.kind === "insight") {
        const scopeLine = message.sections.find((s) => s.id === "scope")?.lines[0];
        const analyzed = scopeLine?.replace(/^Analyzed:\s*/i, "").trim();
        if (analyzed) {
          const fromScope = platformIdFromScopeLabel(analyzed);
          if (fromScope) platformId = fromScope;
        }
      }
      const platformHandoff = message.handoffs?.find((h) => h.platformId);
      if (platformHandoff?.platformId) {
        platformId = platformHandoff.platformId;
      }
      if (message.handoffs?.some((h) => h.productId)) {
        productMentioned = true;
      }
      const titleMetric = message.title.match(
        /^(?:Executive summary — |.+ — )(.+?)(?: —|$)/,
      );
      if (titleMetric?.[1]) {
        metricLabel = titleMetric[1].trim();
      }
      break;
    }
  }

  if (!platformId && view.platform !== "all") {
    platformId = view.platform;
  }

  const platformName = platformId
    ? PLATFORM_BY_ID[platformId]?.name
    : undefined;

  return {
    platformId,
    platformName,
    productMentioned,
    metricLabel: metricLabel ?? metricLabelFromMessages(messages),
    lastUserQuestion,
  };
}

function roleInsightFollowUps(
  role: UserRole,
  ctx: InsightThreadContext,
  scopeLabel: string,
): string[] {
  const platform = ctx.platformName ?? scopeLabel;
  const metric = ctx.metricLabel ?? "ROAS";

  if (role === "ANALYST") {
    const prompts: string[] = [];
    if (ctx.platformId && ctx.platformName) {
      prompts.push(`Break down ${ctx.platformName}`);
    }
    prompts.push("Compare platform ROAS");
    prompts.push("Which products are affecting performance?");
    prompts.push("Create a report from this analysis");
    if (!ctx.platformId) {
      prompts.unshift(`Why did ${metric} change on ${platform}?`);
    }
    return prompts;
  }

  if (role === "KAM") {
    return [
      `Show account impact for ${platform}`,
      "Draft an email to the KAM team with this insight",
      "Compare platform ROAS",
      "Which products are affecting account performance?",
    ];
  }

  return [
    "Give me an executive summary.",
    "What are our biggest risks?",
    "Compare platform ROAS",
    "Create a report from this analysis",
  ];
}

function mergeUnique(prompts: string[], limit: number): string[] {
  const unique: string[] = [];
  for (const prompt of prompts) {
    const trimmed = prompt.trim();
    if (!trimmed || unique.includes(trimmed)) continue;
    unique.push(trimmed);
    if (unique.length >= limit) break;
  }
  return unique;
}

function secondarySurfaceSuggestions(
  surface: ConversationSurface,
  artifact: ReturnType<typeof extractLastWorkspaceArtifact>,
  scopeLabel: string,
  role: UserRole,
): string[] {
  switch (surface) {
    case "after_report":
      return role === "CXO"
        ? [
            "Email leadership a summary of this platform",
            "Create a spreadsheet from this data",
          ]
        : role === "KAM"
          ? [
              "Email the report to the KAM team",
              "Draft an email to the KAM team with this insight",
            ]
          : [
              "Email the report to the KAM team",
              "Create a spreadsheet from this data",
            ];
    case "after_spreadsheet":
      return [
        "Email this spreadsheet to the team",
        "Create a report from this analysis",
      ];
    case "after_monitor_alert":
      return [
        "Investigate what triggered this",
        role === "KAM"
          ? "Draft an email about this alert"
          : "Draft an email about this alert",
        "Create a report from this analysis",
      ];
    case "after_email":
      return role === "CXO"
        ? ["Create a follow-up report", "What are our biggest risks?"]
        : [
            "Create a follow-up report",
            "What should I investigate next?",
          ];
    default:
      return [];
  }
}

export function buildContextualThreadSuggestions(
  messages: AskAriaMessage[],
  scopeLabel = "this scope",
  view?: AskAriaDashboardView,
): string[] {
  const surface = detectConversationSurface(messages);
  const role = view?.role ?? "ANALYST";
  const artifact = extractLastWorkspaceArtifact(messages);

  if (surface === "after_insight" && view) {
    const ctx = extractInsightThreadContext(messages, view);
    const rolePrompts = roleInsightFollowUps(role, ctx, scopeLabel);
    const actionPrompts: string[] = [];

    if (ctx.productMentioned || ctx.lastUserQuestion?.toLowerCase().includes("product")) {
      actionPrompts.push("Which products are affecting performance?");
    }

    if (role === "ANALYST") {
      actionPrompts.push(
        `Monitor ${scopeLabel} ROAS and alert me if it falls below 3`,
      );
    } else if (role === "KAM") {
      actionPrompts.push("Draft an email to the KAM team with this insight");
    } else {
      actionPrompts.push("Create a report from this analysis");
    }

    return mergeUnique(
      [...rolePrompts, ...actionPrompts],
      MAX_CONTEXTUAL_SUGGESTIONS,
    );
  }

  if (surface !== "empty" && surface !== "general") {
    const secondary = secondarySurfaceSuggestions(
      surface,
      artifact,
      scopeLabel,
      role,
    );
    if (surface === "after_report" && artifact) {
      return mergeUnique(
        [
          ...secondary,
          `Monitor ${scopeLabel} ROAS and alert me if it falls below 3`,
        ],
        MAX_CONTEXTUAL_SUGGESTIONS,
      );
    }
    return mergeUnique(secondary, MAX_CONTEXTUAL_SUGGESTIONS);
  }

  return [];
}
