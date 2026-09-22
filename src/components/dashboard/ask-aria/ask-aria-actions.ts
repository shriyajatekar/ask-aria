import type { PlatformId } from "@/types/analytics";
import { PLATFORM_BY_ID } from "@/data/platforms";
import { PRODUCT_BY_ID } from "@/data/products";
import {
  demoGroupById,
  resolveDemoRecipientGroup,
} from "@/lib/ask-aria/demo-recipients";
import {
  buildEmailBodyLines,
  buildEmailSubject,
} from "@/lib/google/email-content";
import {
  countSpreadsheetRows,
  defaultSpreadsheetTitle,
  type SpreadsheetDataset,
} from "@/lib/google/sheet-content";

import type { WorkspaceArtifactRef } from "./ask-aria-artifacts";
import { ARIA_STATUS_LABEL } from "./ask-aria-status";
import type {
  AskAriaActionDraft,
  AskAriaActionType,
  AskAriaFullContext,
  AskAriaMessage,
} from "./ask-aria-types";
import {
  enrichMonitorDraft,
  monitorPreviewFrequencyNote,
  parseMonitorAction,
  tryRefineMonitorDraft,
} from "./ask-aria-monitor-draft";
import { createMessageId } from "./ask-aria-storage";
import { destinationForAction } from "./ask-aria-tool-mapping";

export {
  enrichMonitorDraft,
  tryRefineMonitorDraft,
  parseMonitorAction,
  isMonitorIntent,
} from "./ask-aria-monitor-draft";

export const MOCK_MAX_BID = 16;

const PLATFORM_ALIASES: Array<{ pattern: RegExp; id: PlatformId }> = [
  { pattern: /\bnaykaa\b|\bnayka\b/i, id: "nykaa" },
  { pattern: /\bnykaa\b/i, id: "nykaa" },
  { pattern: /\bamazon\b/i, id: "amazon" },
  { pattern: /\bflipkart\b/i, id: "flipkart" },
  { pattern: /\bmyntra\b/i, id: "myntra" },
  { pattern: /\bajio\b/i, id: "ajio" },
  { pattern: /\btata\s*cliq\b/i, id: "tata_cliq" },
  { pattern: /\bindiamart\b/i, id: "indiamart" },
  { pattern: /\bpurple\b/i, id: "purple" },
  { pattern: /\bbigbasket\b/i, id: "bigbasket" },
  { pattern: /\bblinkit\b/i, id: "blinkit" },
  { pattern: /\bzepto\b/i, id: "zepto" },
  { pattern: /\binstamart\b|\bswiggy\b/i, id: "swiggy_instamart" },
];

export type ActionParseResult =
  | { kind: "none" }
  | {
      kind: "clarification";
      message: string;
      unresolved: string[];
      partial: Partial<AskAriaActionDraft>;
    }
  | { kind: "ready"; partial: Partial<AskAriaActionDraft> };

function resolvePlatform(text: string): PlatformId | undefined {
  const lower = text.toLowerCase();
  for (const alias of PLATFORM_ALIASES) {
    if (alias.pattern.test(lower)) return alias.id;
  }
  for (const platform of Object.values(PLATFORM_BY_ID)) {
    if (lower.includes(platform.name.toLowerCase())) {
      return platform.id;
    }
  }
  return undefined;
}

function parseCampaignName(text: string): string | undefined {
  const patterns = [
    /campaign\s+([A-Za-z0-9][\w\s-]*?)(?:\s+to|\s+bid|\.|,|$)/i,
    /(?:set|make|change)\s+([A-Za-z0-9][\w\s-]*?)\s+campaign/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const name = match?.[1]?.trim();
    if (name && name.length > 0 && !/^(the|a|an)$/i.test(name)) {
      return name;
    }
  }
  const explicit = text.match(/\bCampaign\s+[A-Z0-9]+\b/i);
  return explicit?.[0] ?? undefined;
}

function parseNumericBid(text: string): number | undefined {
  const rupee = text.match(/₹\s*(\d+(?:\.\d+)?)/);
  if (rupee) return Number(rupee[1]);

  const bidTo = text.match(
    /\bbid\s+(?:to|at)\s+₹?\s*(\d+(?:\.\d+)?)/i,
  );
  if (bidTo) return Number(bidTo[1]);

  const setBid = text.match(
    /\bset\s+(?:the\s+)?bid\s+to\s+₹?\s*(\d+(?:\.\d+)?)/i,
  );
  if (setBid) return Number(setBid[1]);

  const targetBid = text.match(/target\s+bid\s+(?:is|to)\s+₹?\s*(\d+(?:\.\d+)?)/i);
  if (targetBid) return Number(targetBid[1]);

  return undefined;
}

function hasNonNumericTargetBidPhrase(text: string): boolean {
  const match = text.match(/target\s+bid\s+is\s+(.+?)(?:\.|,|$)/i);
  if (!match) return false;
  const raw = match[1].trim();
  return !/^₹?\s*\d+(?:\.\d+)?$/.test(raw);
}

export function looksLikeActionSpecification(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("bid") ||
    lower.includes("bidding") ||
    lower.includes("budget") ||
    (lower.includes("pause") && lower.includes("campaign")) ||
    (lower.includes("resume") && lower.includes("campaign")) ||
    lower.includes("alert") ||
    lower.includes("monitor") ||
    lower.includes("report") ||
    lower.includes("spreadsheet") ||
    (lower.includes("send") &&
      (lower.includes("email") ||
        lower.includes("kam") ||
        lower.includes("team"))) ||
    (lower.includes("draft") && lower.includes("email")) ||
    lower.includes("confirm send") ||
    /\bset\s+.+\s+bid\b/i.test(text)
  );
}

export function parseActionRequest(
  text: string,
  context?: AskAriaFullContext,
): ActionParseResult {
  const lower = text.toLowerCase();

  if (!looksLikeActionSpecification(text)) {
    return { kind: "none" };
  }

  const isSpreadsheet =
    lower.includes("spreadsheet") ||
    (lower.includes("declining") && lower.includes("product")) ||
    (lower.includes("underperform") && lower.includes("product"));
  const isEmailAction =
    (lower.includes("send") || lower.includes("draft")) &&
    (lower.includes("email") ||
      lower.includes("kam") ||
      lower.includes("team") ||
      lower.includes("leadership") ||
      /@/.test(text));
  const isConfirmSend =
    lower.includes("confirm send") ||
    lower.includes("send the prepared email") ||
    (lower.includes("send") &&
      lower.includes("email") &&
      (lower.includes("confirm") || lower.includes("prepared")));
  const isDraftEmail = !isConfirmSend && isEmailAction;

  if (isEmailAction && isCompanyDirectoryEmailRequest(text)) {
    return {
      kind: "clarification",
      message:
        "I don't have a company directory in this workspace.\n\nUse demo contacts (KAM team, leadership) or enter specific email addresses.",
      unresolved: ["recipients"],
      partial: { type: "draft_email" },
    };
  }
  if (isConfirmSend) {
    const group = resolveDemoRecipientGroup(text);
    return {
      kind: "ready",
      partial: {
        type: "send_email",
        emailRecipients: group?.label ?? "Recipients",
        emailRecipientGroupId: group?.id,
        emailToAddresses: parseExplicitEmailAddresses(text),
      },
    };
  }

  if (isDraftEmail) {
    const group = resolveDemoRecipientGroup(text);
    const explicit = parseExplicitEmailAddresses(text);
    return {
      kind: "ready",
      partial: {
        type: "draft_email",
        emailRecipients:
          group?.label ??
          (explicit.length ? explicit.join(", ") : "Recipients"),
        emailRecipientGroupId: group?.id,
        emailToAddresses: explicit.length ? explicit : undefined,
      },
    };
  }

  if (isSpreadsheet) {
    if (isCompetitorPricingSpreadsheet(text)) {
      return {
        kind: "clarification",
        message:
          "I can't build that spreadsheet from the data connected to this workspace.\n\nI have sales, advertising, and platform performance data, but competitor pricing isn't available.",
        unresolved: ["competitor pricing data"],
        partial: { type: "create_spreadsheet" },
      };
    }
    if (isAmbiguousSpreadsheetRequest(text)) {
      return {
        kind: "clarification",
        message:
          "What should the spreadsheet include?\n\nFor example: underperforming products, a platform comparison, full performance export, or products with ROAS below a threshold.",
        unresolved: ["spreadsheet dataset"],
        partial: { type: "create_spreadsheet" },
      };
    }
    const platformId = resolvePlatform(text);
    const dataset = resolveSpreadsheetDataset(text);
    const roasMatch = text.match(/\broas\s+below\s+(\d+(?:\.\d+)?)/i);
    const scopeLabel = platformId
      ? PLATFORM_BY_ID[platformId]?.name ?? "All platforms"
      : "All platforms";
    return {
      kind: "ready",
      partial: {
        type: "create_spreadsheet",
        spreadsheetDataset: dataset,
        spreadsheetTitle: defaultSpreadsheetTitle(dataset),
        spreadsheetRoasMax: roasMatch ? Number(roasMatch[1]) : undefined,
        reportPlatformScope: scopeLabel,
        platformId,
      },
    };
  }

  const monitorParsed = parseMonitorAction(text, context);
  if (monitorParsed.kind === "clarification") {
    return monitorParsed;
  }
  if (monitorParsed.kind === "ready" && !lower.includes("bid") && !lower.includes("budget")) {
    return monitorParsed;
  }

  const platformId = resolvePlatform(text);
  const isResume = lower.includes("resume") && lower.includes("campaign");
  const isKeywordPause =
    lower.includes("keyword") &&
    (lower.includes("pause") || lower.includes("paused"));
  const isPause =
    !isKeywordPause && lower.includes("pause") && lower.includes("campaign");
  const isReallocate = lower.includes("reallocat");
  const isBid =
    lower.includes("bid") ||
    lower.includes("bidding") ||
    lower.includes("set the bid") ||
    lower.includes("make the bid");
  const isBudget =
    lower.includes("budget") ||
    lower.includes("increase tomorrow") ||
    lower.includes("increase budget");
  const isAlert = lower.includes("alert") || lower.includes("notify");
  const isReport =
    lower.includes("report") || lower.includes("weekly performance");

  const campaignName = parseCampaignName(text);
  const unresolved: string[] = [];

  let productId: string | undefined;
  let productName: string | undefined;
  const productMatch = text.match(
    /product\s+([A-Za-z0-9][\w\s-]*?)(?:\s+to|\s+bid|\.|,|$)/i,
  );
  if (productMatch) {
    productName = productMatch[1].trim();
    const found = Object.values(PRODUCT_BY_ID).find((product) =>
      product.name.toLowerCase().includes(productName!.toLowerCase()),
    );
    if (found) {
      productId = found.id;
      productName = found.name;
    }
  }

  const newBid = parseNumericBid(text);
  if (isBid && hasNonNumericTargetBidPhrase(text)) {
    unresolved.push("target bid amount (provide a numeric value in ₹)");
  }

  const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
  const budgetChangePercent = percentMatch ? Number(percentMatch[1]) : undefined;

  const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:am|pm)?)/i);
  const isScheduled =
    lower.includes("schedule") ||
    lower.includes("tonight") ||
    Boolean(timeMatch);
  let scheduledLabel = "Immediate";
  if (isScheduled) {
    scheduledLabel =
      lower.includes("tonight") || /11:50/i.test(text)
        ? "Tonight · 11:50 PM"
        : timeMatch?.[0] ?? "Scheduled";
  }

  const partial: Partial<AskAriaActionDraft> = {
    platformId,
    productId,
    productName,
    campaignName,
    newBid,
    budgetChangePercent,
    scheduledLabel,
    isImmediate: !isScheduled,
    maxBidLimit: MOCK_MAX_BID,
  };

  if (isResume) {
    partial.type = "resume_campaign";
    if (!platformId) unresolved.push("platform");
    if (!campaignName) unresolved.push("campaign name");
    if (unresolved.length) {
      return buildClarification(partial, unresolved, platformId);
    }
    return { kind: "ready", partial };
  }

  if (isPause) {
    partial.type = "pause_campaign";
    if (!platformId) unresolved.push("platform");
    if (!campaignName) unresolved.push("campaign name");
    if (unresolved.length) {
      return buildClarification(partial, unresolved, platformId);
    }
    return { kind: "ready", partial };
  }

  if (isAlert) {
    const thresholdMatch = text.match(/below\s+(\d+(?:\.\d+)?)/i);
    return {
      kind: "ready",
      partial: {
        ...partial,
        type: "create_alert",
        alertMetric: lower.includes("roas") ? "roas" : "gross_sales",
        alertThreshold: thresholdMatch ? Number(thresholdMatch[1]) : 2,
      },
    };
  }

  if (isReport) {
    const isToday =
      lower.includes("today") || lower.includes("today's") || lower.includes("todays");
    const scopeLabel = platformId
      ? PLATFORM_BY_ID[platformId]?.name ?? "All platforms"
      : "All platforms";
    return {
      kind: "ready",
      partial: {
        ...partial,
        type: lower.includes("schedule") ? "schedule_report" : "generate_report",
        reportTitle: isToday
          ? "Today's commerce analysis report"
          : lower.includes("weekly")
            ? "Weekly performance report"
            : "Commerce analysis report",
        reportPeriodLabel: isToday
          ? "Today's analysis"
          : lower.includes("weekly")
            ? "Weekly period"
            : "Current workspace period",
        reportPlatformScope: scopeLabel,
        scheduledLabel: isToday
          ? "Immediate"
          : lower.includes("weekly")
            ? "Weekly · next Monday 9:00 AM"
            : scheduledLabel,
        isImmediate: isToday || !lower.includes("schedule"),
      },
    };
  }

  if (isReallocate && !isBid) {
    const amountMatch = text.match(/₹\s*([\d,]+(?:\.\d+)?)/);
    const campaignCountMatch = text.match(/(\d+)\s+high[- ]?cvr/i);
    partial.type = "budget_reallocation";
    partial.reallocateAmount = amountMatch
      ? Number(amountMatch[1].replace(/,/g, ""))
      : undefined;
    partial.reallocateCampaignCount = campaignCountMatch
      ? Number(campaignCountMatch[1])
      : 2;
    if (!partial.reallocateAmount) {
      unresolved.push("reallocation amount");
    }
    if (unresolved.length) {
      return buildClarification(partial, unresolved, platformId);
    }
    return { kind: "ready", partial };
  }

  if (isKeywordPause) {
    const countMatch = text.match(/(\d+)\s+keyword/i);
    partial.type = "keyword_pause";
    partial.keywordsPausedCount = countMatch ? Number(countMatch[1]) : 3;
    partial.categoryLabel =
      text.match(/\b(hair care|skin care|beauty)\b/i)?.[1] ?? "Hair Care";
    if (!platformId) unresolved.push("platform");
    if (unresolved.length) {
      return buildClarification(partial, unresolved, platformId);
    }
    return { kind: "ready", partial };
  }

  if (isBudget) {
    const amount = newBid;
    partial.type = "campaign_budget";
    partial.newBudget = amount;
    if (!platformId) unresolved.push("platform");
    if (amount === undefined && budgetChangePercent === undefined) {
      unresolved.push("budget amount or percentage");
    }
    if (unresolved.length) {
      return buildClarification(partial, unresolved, platformId);
    }
    return { kind: "ready", partial };
  }

  if (isBid) {
    const type: AskAriaActionType = isScheduled
      ? "schedule_bid_change"
      : "campaign_bid";
    partial.type = type;
    if (!platformId) unresolved.push("platform");
    if (!campaignName && !productName) unresolved.push("campaign or product");
    if (newBid === undefined && !hasNonNumericTargetBidPhrase(text)) {
      unresolved.push("target bid amount");
    }
    if (unresolved.length) {
      return buildClarification(partial, unresolved, platformId);
    }
    partial.currentBid = resolveKnownCurrentBid(platformId, campaignName);
    return { kind: "ready", partial };
  }

  return { kind: "none" };
}

function buildClarification(
  partial: Partial<AskAriaActionDraft>,
  unresolved: string[],
  platformId?: PlatformId,
): ActionParseResult {
  const lines: string[] = [];
  if (unresolved.includes("platform")) {
    const hint =
      platformId === "nykaa"
        ? "Did you mean Nykaa?"
        : "Which platform should this apply to?";
    lines.push(hint);
  }
  if (unresolved.includes("campaign name") || unresolved.includes("campaign or product")) {
    lines.push("Which campaign should I update?");
  }
  if (unresolved.some((field) => field.includes("bid"))) {
    lines.push("What numeric bid amount should I set (for example, ₹14)?");
  }
  if (unresolved.includes("budget amount or percentage")) {
    lines.push("What budget amount or percentage change should I apply?");
  }

  const message =
    lines.length > 0
      ? `I can help schedule that change, but I need a few details:\n\n${lines.map((line) => `• ${line}`).join("\n")}`
      : "I need more details before I can prepare this action.";

  return {
    kind: "clarification",
    message,
    unresolved,
    partial,
  };
}

export function resolveKnownCurrentBid(
  platformId?: PlatformId,
  campaignName?: string,
): number | undefined {
  if (platformId === "amazon" && campaignName === "Campaign X") {
    return 12;
  }
  return undefined;
}

/** @deprecated Use parseActionRequest */
export function parseActionIntent(
  text: string,
): Partial<AskAriaActionDraft> | null {
  const result = parseActionRequest(text);
  if (result.kind === "ready") return result.partial;
  return null;
}

export function buildActionDraft(
  partial: Partial<AskAriaActionDraft>,
): AskAriaActionDraft {
  const normalizedType =
    partial.type === "update_bid"
      ? "campaign_bid"
      : partial.type === "update_budget"
        ? "campaign_budget"
        : partial.type ?? "campaign_bid";

  const isBidAction =
    normalizedType === "campaign_bid" ||
    normalizedType === "schedule_bid_change";

  const currentBid = isBidAction
    ? partial.currentBid ??
      resolveKnownCurrentBid(partial.platformId, partial.campaignName)
    : partial.currentBid;

  const workspaceDestination = partial.workspaceDestination ??
    (partial.type
      ? destinationForAction(partial.type, true)
      : undefined);

  return {
    id: createMessageId(),
    type: normalizedType,
    platformId: partial.platformId,
    productId: partial.productId,
    productName: partial.productName,
    campaignName: partial.campaignName,
    currentBid,
    newBid: partial.newBid,
    currentBudget: partial.currentBudget,
    newBudget: partial.newBudget,
    budgetChangePercent: partial.budgetChangePercent,
    alertMetric: partial.alertMetric,
    alertThreshold: partial.alertThreshold,
    scheduledAt: partial.scheduledAt,
    scheduledLabel: partial.scheduledLabel,
    maxBidLimit: MOCK_MAX_BID,
    isImmediate: partial.isImmediate,
    validationError: partial.validationError,
    reportTitle: partial.reportTitle,
    reportPeriodLabel: partial.reportPeriodLabel,
    reportPlatformScope: partial.reportPlatformScope,
    keywordsPausedCount: partial.keywordsPausedCount,
    categoryLabel: partial.categoryLabel,
    reallocateAmount: partial.reallocateAmount,
    reallocateCampaignCount: partial.reallocateCampaignCount,
    workspaceDestination,
    emailSubject: partial.emailSubject,
    emailRecipients: partial.emailRecipients,
    emailToAddresses: partial.emailToAddresses,
    emailRecipientGroupId: partial.emailRecipientGroupId,
    emailArtifactUrl: partial.emailArtifactUrl,
    emailArtifactKind: partial.emailArtifactKind,
    emailPreviewLines: partial.emailPreviewLines,
    gmailMessageId: partial.gmailMessageId,
    spreadsheetTitle: partial.spreadsheetTitle,
    spreadsheetRowCount: partial.spreadsheetRowCount,
    spreadsheetDataset: partial.spreadsheetDataset,
    spreadsheetRoasMax: partial.spreadsheetRoasMax,
    monitorRuleLabel: partial.monitorRuleLabel,
    monitorPlatformLabel: partial.monitorPlatformLabel,
    monitorOperator: partial.monitorOperator,
    monitorFrequency: partial.monitorFrequency,
    monitorId: partial.monitorId,
  };
}

export function validateActionDraft(draft: AskAriaActionDraft): string | null {
  if (
    draft.type === "generate_report" ||
    draft.type === "schedule_report" ||
    draft.type === "create_spreadsheet" ||
    draft.type === "draft_email"
  ) {
    return null;
  }

  if (draft.type === "send_email") {
    if (!draft.emailToAddresses?.length) {
      return "Who should receive this email?";
    }
    if (!draft.emailSubject?.trim()) {
      return "Email subject is required.";
    }
    if (!draft.emailPreviewLines?.length) {
      return "Email body is required.";
    }
    return null;
  }

  if (draft.type === "create_monitor" || draft.type === "create_alert") {
    return null;
  }

  if (draft.type === "keyword_pause") {
    if (!draft.platformId) {
      return "Which platform should these keyword changes apply to?";
    }
    return null;
  }

  if (draft.type === "budget_reallocation") {
    if (draft.reallocateAmount === undefined) {
      return "I need a reallocation amount to proceed.";
    }
    return null;
  }

  const bidTypes = new Set<AskAriaActionType>([
    "campaign_bid",
    "schedule_bid_change",
    "update_bid",
  ]);

  if (bidTypes.has(draft.type)) {
    if (draft.newBid === undefined || Number.isNaN(draft.newBid)) {
      return "I can schedule that, but I need the target bid amount.";
    }
    if (draft.newBid > (draft.maxBidLimit ?? MOCK_MAX_BID)) {
      return `Action cannot be executed. Requested bid of ₹${draft.newBid} exceeds the allowed maximum of ₹${draft.maxBidLimit ?? MOCK_MAX_BID}.`;
    }
    if (!draft.platformId) {
      return "Which platform should this bid change apply to?";
    }
    if (!draft.campaignName && !draft.productName) {
      return "Which campaign or product should this bid change apply to?";
    }
  }

  if (draft.type === "campaign_budget" || draft.type === "update_budget") {
    if (draft.newBudget === undefined && draft.budgetChangePercent === undefined) {
      return "I need a target budget amount or percentage change to proceed.";
    }
    if (!draft.platformId) {
      return "Which platform should this budget change apply to?";
    }
    if (!draft.campaignName) {
      return "Which campaign should receive the budget change?";
    }
  }

  if (
    (draft.type === "pause_campaign" || draft.type === "resume_campaign") &&
    (!draft.platformId || !draft.campaignName)
  ) {
    return "Which platform and campaign should I update?";
  }

  return null;
}

export function actionPreviewTitle(draft: AskAriaActionDraft): string {
  switch (draft.type) {
    case "campaign_bid":
    case "schedule_bid_change":
    case "update_bid":
      return "Change campaign bid";
    case "campaign_budget":
    case "update_budget":
      return "Change campaign budget";
    case "budget_reallocation":
      return "Reallocate campaign budget";
    case "pause_campaign":
      return "Pause campaign";
    case "keyword_pause":
      return "Pause underperforming keywords";
    case "resume_campaign":
      return "Resume campaign";
    case "create_alert":
      return "Create alert";
    case "create_monitor":
      return "Create performance monitor";
    case "generate_report":
      return draft.reportTitle ?? "Generate commerce analysis report";
    case "schedule_report":
      return draft.reportTitle ?? "Schedule commerce analysis report";
    case "create_spreadsheet":
      return draft.spreadsheetTitle ?? "Create spreadsheet";
    case "draft_email":
      return "Draft email";
    case "send_email":
      return "Send email";
    default:
      return "Action requires confirmation";
  }
}

export function actionPreviewRows(
  draft: AskAriaActionDraft,
): Array<{ label: string; value: string }> {
  const platform = draft.platformId
    ? PLATFORM_BY_ID[draft.platformId]?.name ?? "—"
    : "—";

  if (draft.type === "generate_report" || draft.type === "schedule_report") {
    return [
      {
        label: "Destination",
        value: draft.workspaceDestination ?? "Google Docs",
      },
      { label: "Platform", value: draft.reportPlatformScope ?? "All platforms" },
      { label: "Period", value: draft.reportPeriodLabel ?? "Current period" },
      {
        label: "Scheduled for",
        value: draft.scheduledLabel ?? "Immediate",
      },
    ];
  }

  if (draft.type === "create_spreadsheet") {
    const rows = draft.spreadsheetRowCount ?? 0;
    const datasetLabel = spreadsheetDatasetLabel(draft.spreadsheetDataset);
    return [
      {
        label: "Destination",
        value: draft.workspaceDestination ?? "Google Sheets",
      },
      { label: "Dataset", value: datasetLabel },
      {
        label: "Rows",
        value: `${rows} row${rows === 1 ? "" : "s"} from workspace analytics`,
      },
      { label: "Scope", value: draft.reportPlatformScope ?? "All platforms" },
    ];
  }

  if (draft.type === "draft_email" || draft.type === "send_email") {
    return [
      {
        label: "Destination",
        value: draft.workspaceDestination ?? "Gmail",
      },
      { label: "To", value: draft.emailRecipients ?? "—" },
      { label: "Subject", value: draft.emailSubject ?? "—" },
    ];
  }

  if (draft.type === "create_monitor" || draft.type === "create_alert") {
    const freq = draft.monitorFrequency ?? "daily";
    return [
      {
        label: "Metric",
        value: (draft.alertMetric ?? "roas").replace(/_/g, " "),
      },
      {
        label: "Platform",
        value: draft.monitorPlatformLabel ?? platform,
      },
      {
        label: "Condition",
        value:
          draft.monitorRuleLabel ??
          `Alert when ${draft.alertMetric ?? "metric"} falls below ${draft.alertThreshold ?? "—"}`,
      },
      {
        label: "Frequency",
        value: monitorPreviewFrequencyNote(freq),
      },
      { label: "Notify", value: "Aria (in-app, simulated)" },
    ];
  }

  if (draft.type === "keyword_pause") {
    const count = draft.keywordsPausedCount ?? 3;
    return [
      { label: "Platform", value: platform },
      { label: "Keywords", value: `${count} keywords` },
      { label: "Category", value: draft.categoryLabel ?? "—" },
      {
        label: "Scheduled for",
        value: draft.scheduledLabel ?? "Immediate",
      },
    ];
  }

  if (draft.type === "budget_reallocation") {
    const amount = draft.reallocateAmount;
    const campaigns = draft.reallocateCampaignCount ?? 2;
    return [
      ...(draft.platformId ? [{ label: "Platform", value: platform }] : []),
      {
        label: "Amount",
        value: amount !== undefined ? `₹${amount.toLocaleString("en-IN")}` : "—",
      },
      { label: "Campaigns", value: `${campaigns} high-CVR campaigns` },
      {
        label: "Scheduled for",
        value: draft.scheduledLabel ?? "Immediate",
      },
    ];
  }

  const rows: Array<{ label: string; value: string }> = [
    { label: "Platform", value: platform },
  ];
  if (draft.campaignName) {
    rows.push({ label: "Campaign", value: draft.campaignName });
  }
  if (draft.productName) {
    rows.push({ label: "Product", value: draft.productName });
  }
  if (draft.currentBid !== undefined) {
    rows.push({ label: "Current bid", value: `₹${draft.currentBid}` });
  }
  if (draft.newBid !== undefined) {
    rows.push({ label: "Target bid", value: `₹${draft.newBid}` });
  }
  if (draft.newBudget !== undefined) {
    rows.push({ label: "New budget", value: `₹${draft.newBudget}` });
  }
  if (draft.budgetChangePercent !== undefined) {
    rows.push({
      label: "Budget change",
      value: `${draft.budgetChangePercent}%`,
    });
  }
  rows.push({
    label: "Scheduled for",
    value: draft.scheduledLabel ?? "Immediate",
  });
  return rows;
}

export function actionConfirmedMessage(draft: AskAriaActionDraft): string {
  if (draft.type === "generate_report" || draft.type === "schedule_report") {
    return `${ARIA_STATUS_LABEL.preparing} report.`;
  }
  if (draft.type === "send_email") {
    return `Ready to send this. ${ARIA_STATUS_LABEL.executing} via Gmail…`;
  }
  if (draft.type === "create_spreadsheet") {
    return "Ready to create this.";
  }
  return `${ARIA_STATUS_LABEL.preparing} action.`;
}

export function actionScheduledMessage(draft: AskAriaActionDraft): string {
  if (draft.type === "generate_report" || draft.type === "schedule_report") {
    return draft.isImmediate
      ? "Generating report…"
      : `Scheduled. ${draft.reportTitle ?? "Report"} · ${draft.scheduledLabel ?? "Pending"}`;
  }
  if (draft.type === "budget_reallocation") {
    return draft.isImmediate
      ? "Reallocating budget…"
      : `Scheduled. Budget reallocation · ${draft.scheduledLabel ?? "Pending"}`;
  }
  if (draft.type === "keyword_pause") {
    return draft.isImmediate
      ? "Pausing keywords…"
      : `Scheduled. Keyword pause · ${draft.scheduledLabel ?? "Pending"}`;
  }
  const target = draft.campaignName ?? draft.productName ?? "Target";
  return draft.isImmediate
    ? `${ARIA_STATUS_LABEL.executing}…`
    : `Scheduled. ${target} · ${draft.scheduledLabel ?? "Pending"}`;
}

export function actionExecutingMessage(draft: AskAriaActionDraft): string {
  if (draft.type === "send_email") {
    return "Sending email…";
  }
  if (draft.type === "generate_report" || draft.type === "schedule_report") {
    return "Generating report…";
  }
  if (draft.type === "budget_reallocation") {
    return "Reallocating budget across campaigns…";
  }
  if (draft.type === "keyword_pause") {
    const count = draft.keywordsPausedCount ?? 3;
    return `Pausing ${count} keywords…`;
  }
  const target = draft.campaignName ?? draft.productName ?? "campaign";
  if (draft.type === "pause_campaign") {
    return `Pausing ${target}…`;
  }
  if (draft.type === "resume_campaign") {
    return `Resuming ${target}…`;
  }
  if (
    draft.type === "campaign_budget" ||
    draft.type === "update_budget"
  ) {
    return `Updating ${target} budget…`;
  }
  return `Updating ${target} bid…`;
}

export function mockExecuteAction(draft: AskAriaActionDraft): AskAriaMessage {
  const validationError = validateActionDraft(draft);
  if (validationError) {
    return {
      id: createMessageId(),
      kind: "action_result",
      draft,
      status: "blocked",
      message: validationError,
      createdAt: Date.now(),
    };
  }

  const platformName = draft.platformId
    ? PLATFORM_BY_ID[draft.platformId]?.name
    : undefined;
  const target = draft.campaignName ?? draft.productName ?? "Target";

  if (draft.type === "generate_report" || draft.type === "schedule_report") {
    const title = draft.reportTitle ?? "Commerce analysis report";
    return {
      id: createMessageId(),
      kind: "action_result",
      draft,
      status: "completed",
      message: "Report generated (demo)",
      detailLines: [
        `${title} is ready in ${draft.workspaceDestination ?? "Google Docs"} (simulated — connect Google OAuth for a real Doc).`,
      ],
      ctaLabel: "Open report",
      secondaryCtaLabel: "Share",
      secondaryCtaDisabled: true,
      secondaryCtaHint: "Sharing requires a real Google Doc.",
      createdAt: Date.now(),
    };
  }

  if (draft.type === "create_spreadsheet") {
    const rows = draft.spreadsheetRowCount ?? 0;
    return {
      id: createMessageId(),
      kind: "action_result",
      draft,
      status: "completed",
      message: "Spreadsheet created (demo)",
      detailLines: [
        `${rows} rows would export to ${draft.workspaceDestination ?? "Google Sheets"} (simulated — connect Google Sheets OAuth for a real file).`,
      ],
      ctaLabel: "Open spreadsheet",
      secondaryCtaDisabled: true,
      secondaryCtaHint: "Open requires a real Google Sheet URL.",
      createdAt: Date.now(),
    };
  }

  if (draft.type === "draft_email") {
    return {
      id: createMessageId(),
      kind: "action_result",
      draft,
      status: "completed",
      message: "Email draft ready for review",
      detailLines: [
        "Nothing was sent — confirm when you're ready to deliver via Gmail.",
      ],
      createdAt: Date.now(),
    };
  }

  if (draft.type === "send_email") {
    return {
      id: createMessageId(),
      kind: "action_result",
      draft,
      status: "completed",
      message: `Email sent to ${draft.emailRecipients ?? "recipients"}.`,
      detailLines: [
        `Subject: ${draft.emailSubject ?? "—"}`,
        "Delivery simulated for this demo workspace.",
      ],
      createdAt: Date.now(),
    };
  }

  if (draft.type === "create_monitor" || draft.type === "create_alert") {
    return {
      id: createMessageId(),
      kind: "action_result",
      draft,
      status: "completed",
      message: "Monitor created",
      detailLines: [
        draft.monitorRuleLabel ??
          `Monitoring ${draft.alertMetric ?? "ROAS"} below ${draft.alertThreshold ?? "—"}.`,
        "Checks are simulated in this prototype — no background cron or push notifications.",
      ],
      createdAt: Date.now(),
    };
  }

  if (draft.type === "keyword_pause") {
    const count = draft.keywordsPausedCount ?? 3;
    return {
      id: createMessageId(),
      kind: "action_result",
      draft,
      status: "completed",
      message: `Paused ${count} underperforming keywords.`,
      detailLines: [
        platformName ? `Platform: ${platformName}` : "",
        `Category: ${draft.categoryLabel ?? "Hair Care"}`,
      ].filter(Boolean),
      createdAt: Date.now(),
    };
  }

  if (draft.type === "budget_reallocation") {
    const amount = draft.reallocateAmount ?? 0;
    const campaigns = draft.reallocateCampaignCount ?? 2;
    return {
      id: createMessageId(),
      kind: "action_result",
      draft,
      status: "completed",
      message: `₹${amount.toLocaleString("en-IN")} reallocated toward ${campaigns} high-CVR campaigns.`,
      createdAt: Date.now(),
    };
  }

  if (
    draft.type === "pause_campaign" ||
    draft.type === "resume_campaign"
  ) {
    return {
      id: createMessageId(),
      kind: "action_result",
      draft,
      status: "completed",
      message: `${target} ${draft.type === "pause_campaign" ? "paused" : "resumed"} successfully.`,
      createdAt: Date.now(),
    };
  }

  if (draft.type === "campaign_budget" || draft.type === "update_budget") {
    const budgetLabel =
      draft.newBudget !== undefined
        ? `₹${draft.newBudget}`
        : draft.budgetChangePercent !== undefined
          ? `${draft.budgetChangePercent}%`
          : "updated";
    return {
      id: createMessageId(),
      kind: "action_result",
      draft,
      status: "completed",
      message: `${target} budget updated to ${budgetLabel}.`,
      createdAt: Date.now(),
    };
  }

  if (draft.newBid !== undefined) {
    const fromPart =
      draft.currentBid !== undefined
        ? ` from ₹${draft.currentBid}`
        : "";
    return {
      id: createMessageId(),
      kind: "action_result",
      draft,
      status: "completed",
      message: `${target} bid updated${fromPart} to ₹${draft.newBid}.`,
      createdAt: Date.now(),
    };
  }

  return {
    id: createMessageId(),
    kind: "action_result",
    draft,
    status: "completed",
    message: `${target} updated successfully.`,
    createdAt: Date.now(),
  };
}

function isCompetitorPricingSpreadsheet(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("competitor") &&
    (lower.includes("pric") || lower.includes("pricing")) &&
    (lower.includes("spreadsheet") || lower.includes("sheet") || lower.includes("export"))
  );
}

function hasSpreadsheetDatasetHint(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    (lower.includes("underperform") && lower.includes("product")) ||
    lower.includes("declining") ||
    lower.includes("platform compar") ||
    (lower.includes("comparison") && lower.includes("platform")) ||
    lower.includes("export performance") ||
    lower.includes("performance export") ||
    /\broas\s+below\b/.test(lower) ||
    (lower.includes("export") && lower.includes("performance"))
  );
}

function isAmbiguousSpreadsheetRequest(text: string): boolean {
  const lower = text.toLowerCase();
  if (!lower.includes("spreadsheet") && !lower.includes("google sheet")) {
    return false;
  }
  if (hasSpreadsheetDatasetHint(text)) return false;
  return (
    /\b(create|make|build|generate)\b/.test(lower) ||
    lower.trim() === "spreadsheet" ||
    lower.includes("create a spreadsheet")
  );
}

function resolveSpreadsheetDataset(text: string): SpreadsheetDataset {
  const lower = text.toLowerCase();
  if (/\broas\s+below\b/.test(lower)) return "roas_below";
  if (
    lower.includes("platform compar") ||
    (lower.includes("comparison") && lower.includes("platform"))
  ) {
    return "platform_comparison";
  }
  if (
    (lower.includes("underperform") || lower.includes("declining")) &&
    (lower.includes("product") || lower.includes("sku"))
  ) {
    return "underperforming_products";
  }
  if (lower.includes("export") || lower.includes("performance")) {
    return "export_performance";
  }
  return "underperforming_products";
}

function spreadsheetDatasetLabel(
  dataset?: AskAriaActionDraft["spreadsheetDataset"],
): string {
  switch (dataset) {
    case "platform_comparison":
      return "Platform comparison";
    case "export_performance":
      return "Performance export";
    case "roas_below":
      return "ROAS filter";
    case "underperforming_products":
    default:
      return "Underperforming products";
  }
}

function resolvePlatformScopeLabel(
  platformId?: PlatformId,
  fallback = "All platforms",
): string {
  if (!platformId) return fallback;
  return PLATFORM_BY_ID[platformId]?.name ?? fallback;
}

function isCompanyDirectoryEmailRequest(text: string): boolean {
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

function parseExplicitEmailAddresses(text: string): string[] {
  const matches = text.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  );
  if (!matches) return [];
  return [...new Set(matches.map((e) => e.toLowerCase()))];
}

function resolveEmailToAddresses(
  partial: Partial<AskAriaActionDraft>,
  userEmail?: string,
): string[] {
  if (partial.emailToAddresses?.length) {
    return partial.emailToAddresses;
  }
  if (partial.emailRecipientGroupId === "myself" && userEmail) {
    return [userEmail];
  }
  const group =
    (partial.emailRecipientGroupId
      ? demoGroupById(partial.emailRecipientGroupId)
      : null) ??
    (partial.emailRecipients
      ? resolveDemoRecipientGroup(partial.emailRecipients)
      : null);
  if (group?.emails.length) return group.emails;
  if (partial.emailRecipients) {
    const fromLabel = parseExplicitEmailAddresses(partial.emailRecipients);
    if (fromLabel.length) return fromLabel;
  }
  return [];
}

export function enrichEmailDraft(
  partial: Partial<AskAriaActionDraft>,
  context: AskAriaFullContext,
  options?: {
    artifact?: WorkspaceArtifactRef | null;
    userEmail?: string;
    includeArtifact?: boolean;
  },
): Partial<AskAriaActionDraft> {
  if (partial.type !== "draft_email" && partial.type !== "send_email") {
    return partial;
  }

  const artifact =
    options?.includeArtifact && options.artifact
      ? options.artifact
      : partial.emailArtifactUrl
        ? {
            url: partial.emailArtifactUrl,
            kind: partial.emailArtifactKind ?? "doc",
          }
        : null;

  const emailToAddresses = resolveEmailToAddresses(partial, options?.userEmail);
  const group =
    partial.emailRecipientGroupId
      ? demoGroupById(partial.emailRecipientGroupId)
      : resolveDemoRecipientGroup(partial.emailRecipients ?? "");

  const emailSubject = buildEmailSubject({
    subject: partial.emailSubject,
    context,
    recipientLabel: partial.emailRecipients,
  });
  const emailPreviewLines = buildEmailBodyLines({
    subject: emailSubject,
    recipientLabel: partial.emailRecipients,
    context,
    artifactUrl: artifact?.url,
    artifactKind: artifact?.kind,
  });

  return {
    ...partial,
    emailRecipients:
      partial.emailRecipients ?? group?.label ?? "Recipients",
    emailRecipientGroupId: partial.emailRecipientGroupId ?? group?.id,
    emailToAddresses,
    emailSubject,
    emailPreviewLines,
    emailArtifactUrl: artifact?.url,
    emailArtifactKind: artifact?.kind,
    reportPeriodLabel:
      partial.reportPeriodLabel ?? formatContextPeriodLabel(context),
    workspaceDestination: partial.workspaceDestination ?? "Gmail",
  };
}

export function tryRefineEmailDraft(
  text: string,
  draft: AskAriaActionDraft,
  context: AskAriaFullContext,
  options?: {
    artifact?: WorkspaceArtifactRef | null;
    userEmail?: string;
  },
): AskAriaActionDraft | null {
  if (draft.type !== "draft_email" && draft.type !== "send_email") {
    return null;
  }
  const lower = text.toLowerCase();
  let partial: Partial<AskAriaActionDraft> = { ...draft };
  let changed = false;

  const explicit = parseExplicitEmailAddresses(text);
  if (explicit.length) {
    partial.emailToAddresses = explicit;
    partial.emailRecipients = explicit.join(", ");
    partial.emailRecipientGroupId = undefined;
    changed = true;
  }

  const group = resolveDemoRecipientGroup(text);
  if (group) {
    partial.emailRecipients = group.label;
    partial.emailRecipientGroupId = group.id;
    partial.emailToAddresses =
      group.id === "myself" && options?.userEmail
        ? [options.userEmail]
        : group.emails;
    changed = true;
  }

  if (lower.includes("subject:")) {
    const match = text.match(/subject:\s*(.+)$/i);
    if (match?.[1]) {
      partial.emailSubject = match[1].trim();
      changed = true;
    }
  }

  if (!changed) return null;
  const enriched = enrichEmailDraft(partial, context, {
    artifact: options?.artifact,
    userEmail: options?.userEmail,
    includeArtifact: Boolean(partial.emailArtifactUrl ?? options?.artifact),
  });
  return buildActionDraft(enriched);
}

export function enrichSpreadsheetDraft(
  partial: Partial<AskAriaActionDraft>,
  context: AskAriaFullContext,
): Partial<AskAriaActionDraft> {
  if (partial.type !== "create_spreadsheet" && !partial.spreadsheetDataset) {
    return partial;
  }
  const dataset = partial.spreadsheetDataset ?? "export_performance";
  const platformId =
    partial.platformId ??
    (context.platform === "all" ? undefined : context.platform);
  const platformScope =
    partial.reportPlatformScope ??
    resolvePlatformScopeLabel(platformId, "All platforms");
  const rowCount = countSpreadsheetRows({
    title: partial.spreadsheetTitle ?? defaultSpreadsheetTitle(dataset),
    platformId: platformId ?? "all",
    dateRange: context.dateRange,
    comparisonRange: context.comparisonPeriod,
    brandId: context.brandId,
    productId: partial.productId ?? context.productId,
    dataset,
    roasMax: partial.spreadsheetRoasMax,
  });
  return {
    ...partial,
    type: "create_spreadsheet",
    spreadsheetDataset: dataset,
    spreadsheetTitle:
      partial.spreadsheetTitle ?? defaultSpreadsheetTitle(dataset),
    spreadsheetRowCount: rowCount,
    reportPlatformScope: platformScope,
    reportPeriodLabel:
      partial.reportPeriodLabel ?? formatContextPeriodLabel(context),
    platformId,
  };
}

function formatContextPeriodLabel(context: AskAriaFullContext): string {
  return `${context.dateRange.start} – ${context.dateRange.end}`;
}

function isSpreadsheetRefinementPhrase(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (
    lower === "do it" ||
    lower === "create it" ||
    lower === "confirm" ||
    lower === "yes" ||
    lower === "go ahead"
  ) {
    return false;
  }
  return true;
}

export function tryRefineSpreadsheetDraft(
  text: string,
  draft: AskAriaActionDraft,
  context: AskAriaFullContext,
): AskAriaActionDraft | null {
  if (draft.type !== "create_spreadsheet") return null;
  if (!isSpreadsheetRefinementPhrase(text)) return null;

  const lower = text.toLowerCase().trim();
  let partial: Partial<AskAriaActionDraft> = { ...draft };
  let changed = false;

  const platformId = resolvePlatform(text);
  const shortPlatformTweak =
    platformId &&
    (lower.includes("only") ||
      lower.startsWith("just ") ||
      text.trim().split(/\s+/).length <= 3);
  if (shortPlatformTweak && platformId) {
    partial.platformId = platformId;
    partial.reportPlatformScope = resolvePlatformScopeLabel(platformId);
    changed = true;
  }

  const roasMatch = text.match(/\broas\s+below\s+(\d+(?:\.\d+)?)/i);
  if (roasMatch) {
    partial.spreadsheetDataset = "roas_below";
    partial.spreadsheetRoasMax = Number(roasMatch[1]);
    partial.spreadsheetTitle = defaultSpreadsheetTitle("roas_below");
    changed = true;
  }

  if (lower.includes("amazon") && !platformId && lower.includes("only")) {
    partial.platformId = "amazon";
    partial.reportPlatformScope = "Amazon";
    changed = true;
  }

  if (!changed) return null;
  const enriched = enrichSpreadsheetDraft(partial, context);
  return buildActionDraft(enriched);
}

export function draftToEditPrompt(draft: AskAriaActionDraft): string {
  const platform = draft.platformId
    ? PLATFORM_BY_ID[draft.platformId]?.name
    : "";
  if (
    draft.type === "campaign_bid" ||
    draft.type === "schedule_bid_change" ||
    draft.type === "update_bid"
  ) {
    const bid = draft.newBid ?? 14;
    const when = draft.scheduledLabel?.includes("Tonight")
      ? " tonight at 11:50 PM"
      : "";
    const platformPart = platform ? `${platform} ` : "";
    const target = draft.campaignName ?? draft.productName ?? "Campaign";
    return `Set ${platformPart}${target} bid to ₹${bid}${when}.`;
  }
  if (draft.type === "campaign_budget" || draft.type === "update_budget") {
    return `Update ${platform} ${draft.campaignName ?? "campaign"} budget${draft.newBudget ? ` to ₹${draft.newBudget}` : ""}.`;
  }
  if (draft.type === "pause_campaign") {
    return `Pause ${platform} ${draft.campaignName ?? "campaign"}.`;
  }
  if (draft.type === "resume_campaign") {
    return `Resume ${platform} ${draft.campaignName ?? "campaign"}.`;
  }
  if (draft.type === "draft_email" || draft.type === "send_email") {
    const to = draft.emailRecipients ?? "the team";
    const subject = draft.emailSubject ?? "";
    return `Draft email to ${to}${subject ? ` — subject: ${subject}` : ""}`;
  }
  return "Update campaign settings.";
}

export function actionLogLabel(draft: AskAriaActionDraft): string {
  const platform = draft.platformId
    ? PLATFORM_BY_ID[draft.platformId]?.name
    : "Workspace";
  switch (draft.type) {
    case "schedule_bid_change":
    case "campaign_bid":
    case "update_bid":
      return `${platform} bid updated`;
    case "campaign_budget":
    case "update_budget":
      return `${platform} budget updated`;
    case "create_alert":
      return "ROAS alert created";
    case "generate_report":
      return "Report generated";
    case "schedule_report":
      return "Report scheduled";
    case "create_spreadsheet":
      return "Spreadsheet created";
    case "draft_email":
      return "Email draft prepared";
    case "send_email":
      return "Email sent";
    case "create_monitor":
      return "Monitor created";
    case "keyword_pause":
      return "Keywords paused";
    case "budget_reallocation":
      return "Budget reallocated";
    case "pause_campaign":
      return "Campaign paused";
    case "resume_campaign":
      return "Campaign resumed";
    default:
      return "Agent action";
  }
}
