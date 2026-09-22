import type { AskAriaActionDraft, AskAriaActionStatus } from "./ask-aria-types";

/** User-facing status labels for action result cards and progress copy. */
export const ARIA_STATUS_LABEL = {
  thinking: "Thinking",
  analyzing: "Analyzing",
  preparing: "Preparing",
  waitingForConfirmation: "Waiting for confirmation",
  waitingForPermission: "Waiting for permission",
  executing: "Executing",
  completed: "Completed",
  needsClarification: "Needs clarification",
  unavailable: "Unavailable",
  scheduled: "Scheduled",
  confirmed: "Confirmed",
} as const;

export function actionResultHeading(status: AskAriaActionStatus): string {
  switch (status) {
    case "completed":
      return ARIA_STATUS_LABEL.completed;
    case "blocked":
    case "failed":
      return ARIA_STATUS_LABEL.unavailable;
    case "executing":
    case "running":
      return ARIA_STATUS_LABEL.executing;
    case "scheduled":
      return ARIA_STATUS_LABEL.scheduled;
    case "confirmed":
      return ARIA_STATUS_LABEL.confirmed;
    case "ready_for_confirmation":
    case "pending_confirmation":
      return ARIA_STATUS_LABEL.waitingForConfirmation;
    case "cancelled":
      return "Cancelled";
    default:
      return "Action update";
  }
}

export function actionPreviewSubtitle(draft: AskAriaActionDraft): string {
  if (draft.validationError) {
    return ARIA_STATUS_LABEL.needsClarification;
  }
  if (draft.type === "draft_email") {
    return `${ARIA_STATUS_LABEL.waitingForConfirmation} — review before sending`;
  }
  if (draft.type === "create_monitor" || draft.type === "create_alert") {
    return "Ready to create monitor — confirm to save.";
  }
  if (
    draft.type === "generate_report" ||
    draft.type === "schedule_report" ||
    draft.type === "create_spreadsheet"
  ) {
    return "Ready to create — confirm to proceed.";
  }
  if (draft.type === "send_email") {
    return "Ready to send — confirm to deliver via Gmail.";
  }
  if (
    draft.type === "campaign_bid" ||
    draft.type === "schedule_bid_change" ||
    draft.type === "campaign_budget" ||
    draft.type === "pause_campaign" ||
    draft.type === "resume_campaign" ||
    draft.type === "keyword_pause" ||
    draft.type === "budget_reallocation"
  ) {
    return `${ARIA_STATUS_LABEL.waitingForConfirmation} — review details`;
  }
  return ARIA_STATUS_LABEL.waitingForConfirmation;
}

export function confirmButtonLabel(draft: AskAriaActionDraft): string {
  if (draft.type === "send_email") return "Confirm";
  if (draft.type === "create_monitor" || draft.type === "create_alert") {
    return "Confirm";
  }
  if (
    draft.type === "generate_report" ||
    draft.type === "schedule_report" ||
    draft.type === "create_spreadsheet"
  ) {
    return "Confirm";
  }
  return "Confirm";
}

export function googleWorkspaceErrorMessage(
  kind: "doc" | "sheet" | "email",
  code?: string,
  fallback?: string,
): string {
  if (kind === "doc") {
    if (code === "NOT_CONNECTED") {
      return "Report creation failed — connect Google Workspace under Tools, then try again.";
    }
    return fallback ?? "Report creation failed. Check Tools connection and try again.";
  }
  if (kind === "sheet") {
    if (code === "NOT_CONNECTED" || code === "SHEETS_SCOPE_REQUIRED") {
      return "Spreadsheet export failed — connect Google Sheets under Tools, then try again.";
    }
    return fallback ?? "Spreadsheet export failed. Check Tools connection and try again.";
  }
  if (code === "NOT_CONNECTED") {
    return "Email send failed — connect Gmail under Tools, then try again.";
  }
  return fallback ?? "Email send failed. Check Tools connection and try again.";
}

export function actionPreviewStatusLabel(draft: AskAriaActionDraft): string {
  if (draft.validationError) {
    return ARIA_STATUS_LABEL.needsClarification;
  }
  return ARIA_STATUS_LABEL.waitingForConfirmation;
}
