import type { AnalyticsMode, DashboardPlatform } from "@/contexts/dashboard-context";
import type { DateRangePreset } from "@/lib/dashboard/date-ranges";
import type { UserRole } from "@/lib/auth/types";
import type {
  MonitorFrequency,
  MonitorOperator,
} from "@/lib/ask-aria/monitors";
import type { MetricId, PlatformId } from "@/types/analytics";

export type AskAriaActionType =
  | "campaign_bid"
  | "campaign_budget"
  | "pause_campaign"
  | "resume_campaign"
  | "keyword_pause"
  | "budget_reallocation"
  | "schedule_bid_change"
  | "update_bid"
  | "update_budget"
  | "create_alert"
  | "create_monitor"
  | "generate_report"
  | "schedule_report"
  | "create_spreadsheet"
  | "create_presentation"
  | "draft_email"
  | "send_email"
  | "create_task"
  | "share_slack"
  | "investigate_anomaly";

export type AskAriaActionStatus =
  | "ready_for_confirmation"
  | "pending_confirmation"
  | "confirmed"
  | "scheduled"
  | "running"
  | "executing"
  | "completed"
  | "failed"
  | "blocked"
  | "cancelled";

export interface AskAriaActionDraft {
  id: string;
  type: AskAriaActionType;
  platformId?: PlatformId;
  productId?: string;
  productName?: string;
  campaignName?: string;
  currentBid?: number;
  newBid?: number;
  currentBudget?: number;
  newBudget?: number;
  budgetChangePercent?: number;
  alertMetric?: MetricId;
  alertThreshold?: number;
  scheduledAt?: string;
  scheduledLabel?: string;
  validationError?: string;
  maxBidLimit?: number;
  isImmediate?: boolean;
  reportTitle?: string;
  reportPeriodLabel?: string;
  reportPlatformScope?: string;
  keywordsPausedCount?: number;
  categoryLabel?: string;
  reallocateAmount?: number;
  reallocateCampaignCount?: number;
  workspaceDestination?: string;
  emailSubject?: string;
  emailRecipients?: string;
  emailToAddresses?: string[];
  emailRecipientGroupId?: string;
  emailArtifactUrl?: string;
  emailArtifactKind?: "doc" | "sheet";
  emailPreviewLines?: string[];
  gmailMessageId?: string;
  spreadsheetTitle?: string;
  spreadsheetRowCount?: number;
  spreadsheetDataset?:
    | "underperforming_products"
    | "platform_comparison"
    | "export_performance"
    | "roas_below";
  spreadsheetRoasMax?: number;
  monitorRuleLabel?: string;
  monitorPlatformLabel?: string;
  monitorOperator?: MonitorOperator;
  monitorFrequency?: MonitorFrequency;
  monitorId?: string;
}

export interface AskAriaHandoff {
  label: string;
  platformId?: PlatformId;
  productId?: string;
  analyticsMode?: AnalyticsMode;
  /** When set, submits this prompt to Ask Aria after optional dashboard handoff. */
  prompt?: string;
}

export interface AskAriaInsightSection {
  /** Stable key for accordion rendering; set at creation or by normalizeAccordionSections. */
  id?: string;
  heading: string;
  lines: string[];
}

export interface AskAriaMetricLine {
  label: string;
  value: string;
  change?: string;
  direction?: "up" | "down" | "flat";
}

export type AskAriaMessage =
  | {
      id: string;
      kind: "user";
      text: string;
      createdAt: number;
    }
  | {
      id: string;
      kind: "insight";
      title: string;
      summary: string;
      sections: AskAriaInsightSection[];
      metrics?: AskAriaMetricLine[];
      handoffs?: AskAriaHandoff[];
      createdAt: number;
    }
  | {
      id: string;
      kind: "recommendation";
      title: string;
      observation: string;
      why: string;
      evidence: string;
      recommendation: string;
      expectedConsideration?: string;
      nextAction?: string;
      handoffs?: AskAriaHandoff[];
      createdAt: number;
    }
  | {
      id: string;
      kind: "action_preview";
      draft: AskAriaActionDraft;
      createdAt: number;
    }
  | {
      id: string;
      kind: "action_result";
      draft: AskAriaActionDraft;
      status: AskAriaActionStatus;
      message: string;
      detailLines?: string[];
      ctaLabel?: string;
      ctaUrl?: string;
      secondaryCtaLabel?: string;
      secondaryCtaDisabled?: boolean;
      secondaryCtaHint?: string;
      createdAt: number;
    }
  | {
      id: string;
      kind: "proactive";
      title: string;
      body: string;
      prompt?: string;
      createdAt: number;
    }
  | {
      id: string;
      kind: "monitor_alert";
      monitorId: string;
      title: string;
      bodyLines: string[];
      investigatePrompt: string;
      draftEmailPrompt: string;
      createdAt: number;
    }
  | {
      id: string;
      kind: "assistant_text";
      text: string;
      /** Grouped suggestion chips after capability discovery responses. */
      suggestionChips?: Array<{ label: string; prompt: string }>;
      createdAt: number;
    }
  | {
      id: string;
      kind: "workspace_artifact";
      title: string;
      artifactKind: "doc" | "sheet";
      ctaUrl: string;
      createdAt: number;
    }
  | {
      id: string;
      kind: "clarification";
      variant:
        | "needs_clarification"
        | "data_not_available"
        | "action_not_supported"
        | "ambiguous_intent"
        | "tool_required"
        | "integration_not_connected";
      title: string;
      body: string;
      prompt?: string;
      choices: AskAriaClarificationChoice[];
      alternative?: AskAriaClarificationChoice;
      createdAt: number;
    };

export interface AskAriaClarificationChoice {
  label: string;
  followUpText: string;
  /** Portfolio demo: open connected-tools sheet instead of submitting follow-up. */
  action?:
    | "open_tools_sheet"
    | "open_monitors_panel"
    | "connect_google_workspace"
    | "connect_google_oauth"
    | "connect_google_sheets"
    | "connect_google_gmail";
}

export type AskAriaTemporalWindow =
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "previous_week"
  | "decline_onset";

/** Latest metric/platform/period investigation — inherited on follow-ups in the same thread. */
export interface AskAriaActiveAnalysisContext {
  metricId: MetricId;
  platformId?: DashboardPlatform;
  platformIds?: PlatformId[];
  scopeLabel: string;
  scopeMode?: "single_platform" | "multi_platform" | "workspace_platforms" | "workspace_brands";
  dateRange: { start: string; end: string };
  comparisonPeriod: { start: string; end: string };
  metricDirection?: "up" | "down" | "flat";
}

export interface AskAriaInvestigationMemory {
  topic?:
    | "metric_change"
    | "products"
    | "temporal"
    | "recommendation"
    | "action";
  metricId?: MetricId;
  platformId?: DashboardPlatform;
  lastMetric?: MetricId;
  lastPlatform?: DashboardPlatform;
  lastTopic?: string;
  temporalWindow?: AskAriaTemporalWindow;
  pendingActionDraft?: AskAriaActionDraft;
  activeAnalysisContext?: AskAriaActiveAnalysisContext;
}

export interface AskAriaConversationSnapshot {
  platform: DashboardPlatform;
  analyticsMode: AnalyticsMode;
  dateRange: { start: string; end: string };
  comparisonPeriod: { start: string; end: string };
  focusMetric: MetricId;
  brandId: string | null;
  productId: string | null;
}

/** Badge for Recent threads — derived from the latest assistant turn in that thread. */
export type AskAriaConversationCapabilityKind =
  | "Analysis"
  | "Google Docs"
  | "Google Sheets"
  | "Monitor"
  | "Email"
  | "Action";

export interface AskAriaConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  /** Session user id (e.g. demo-raghav); client-side partition only. */
  userId: string;
  workspaceId: string;
  role: UserRole;
  messages: AskAriaMessage[];
  memory: AskAriaInvestigationMemory;
  savedContext: AskAriaFullContext;
  /** Latest capability surfaced in this thread (not global history). */
  lastCapabilityKind?: AskAriaConversationCapabilityKind;
}

export interface AskAriaFullContext {
  role: UserRole;
  analyticsMode: AnalyticsMode;
  platform: DashboardPlatform;
  focusMetric: MetricId;
  chartMetrics: MetricId[];
  consolidatedChartMetric: MetricId;
  consolidatedSelectedPlatformIds: PlatformId[];
  dateRangePreset: DateRangePreset;
  dateRange: { start: string; end: string };
  comparisonPeriod: { start: string; end: string };
  brandId: string | null;
  category: string | null;
  subcategory: string | null;
  productId: string | null;
}

export interface AskAriaActionLogEntry {
  id: string;
  label: string;
  platformId?: PlatformId;
  status: AskAriaActionStatus;
  timestamp: number;
}
