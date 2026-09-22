import type { AskAriaActionType } from "./ask-aria-types";
import type { DemoWorkspaceTool } from "./ask-aria-tools-storage";

export interface WorkspaceConnectionState {
  googleOAuthConfigured: boolean;
  /** Docs/Drive OAuth satisfied (legacy alias: any Google connect) */
  googleOAuthConnected: boolean;
  googleOAuthDocsConnected?: boolean;
  googleOAuthSheetsConnected?: boolean;
  googleOAuthGmailConnected?: boolean;
  googleDemoConnected: boolean;
  microsoftDemoConnected: boolean;
}

export type WorkspaceDestination =
  | "Google Docs"
  | "Google Sheets"
  | "Google Slides"
  | "Gmail"
  | "Google Calendar"
  | "Microsoft Word"
  | "Microsoft Excel"
  | "Microsoft PowerPoint"
  | "Outlook"
  | "Microsoft Teams";

const ACTION_TOOL_REQUIREMENTS = new Set<AskAriaActionType>([
  "generate_report",
  "schedule_report",
  "create_spreadsheet",
  "draft_email",
  "send_email",
  "create_presentation",
  "create_task",
]);

export function actionRequiresWorkspaceTool(type: AskAriaActionType): boolean {
  return ACTION_TOOL_REQUIREMENTS.has(type);
}

export function isWorkspaceToolSatisfied(
  connection: WorkspaceConnectionState = {
    googleOAuthConfigured: false,
    googleOAuthConnected: false,
    googleDemoConnected: false,
    microsoftDemoConnected: false,
  },
): boolean {
  if (connection.googleOAuthConfigured && connection.googleOAuthConnected) {
    return true;
  }
  return connection.googleDemoConnected || connection.microsoftDemoConnected;
}

export function isWorkspaceToolSatisfiedForAction(
  type: AskAriaActionType,
  connection: WorkspaceConnectionState,
): boolean {
  if (!actionRequiresWorkspaceTool(type)) return true;
  const destination = destinationForAction(type, connection);
  const needsGoogle =
    destination.includes("Google") || destination === "Gmail";
  if (needsGoogle && connection.googleOAuthConfigured) {
    if (type === "create_spreadsheet") {
      return Boolean(connection.googleOAuthSheetsConnected);
    }
    if (type === "send_email") {
      return Boolean(connection.googleOAuthGmailConnected);
    }
    if (type === "draft_email") {
      const docsOk =
        connection.googleOAuthDocsConnected ?? connection.googleOAuthConnected;
      return Boolean(
        docsOk ||
          connection.googleOAuthGmailConnected ||
          connection.googleOAuthSheetsConnected,
      );
    }
    if (actionNeedsRealGoogleDoc(type)) {
      const docsOk =
        connection.googleOAuthDocsConnected ?? connection.googleOAuthConnected;
      return Boolean(docsOk);
    }
    return connection.googleOAuthConnected;
  }
  if (needsGoogle) {
    return connection.googleDemoConnected;
  }
  return isWorkspaceToolSatisfied(connection);
}

export function actionNeedsRealGoogleDoc(type: AskAriaActionType): boolean {
  return type === "generate_report" || type === "schedule_report";
}

export function actionNeedsRealGoogleSheets(type: AskAriaActionType): boolean {
  return type === "create_spreadsheet";
}

export function actionNeedsRealGoogleGmail(type: AskAriaActionType): boolean {
  return type === "send_email";
}

export function destinationForAction(
  type: AskAriaActionType,
  connectionOrPreferGoogle: WorkspaceConnectionState | boolean = true,
): WorkspaceDestination {
  const connection: WorkspaceConnectionState =
    typeof connectionOrPreferGoogle === "boolean"
      ? {
          googleOAuthConfigured: false,
          googleOAuthConnected: false,
          googleDemoConnected: connectionOrPreferGoogle,
          microsoftDemoConnected: false,
        }
      : connectionOrPreferGoogle;
  const google =
    connection.googleDemoConnected ||
    (connection.googleOAuthConfigured && connection.googleOAuthConnected);
  switch (type) {
    case "generate_report":
    case "schedule_report":
      return google ? "Google Docs" : "Microsoft Word";
    case "create_spreadsheet":
      return google ? "Google Sheets" : "Microsoft Excel";
    case "create_presentation":
      return google ? "Google Slides" : "Microsoft PowerPoint";
    case "draft_email":
    case "send_email":
      return google ? "Gmail" : "Outlook";
    case "create_task":
      return "Google Calendar";
    default:
      return google ? "Google Docs" : "Microsoft Word";
  }
}

export function requiredToolForConnect(
  type: AskAriaActionType,
  connection: WorkspaceConnectionState,
): DemoWorkspaceTool {
  if (connection.googleDemoConnected) return "google_workspace";
  if (connection.microsoftDemoConnected) return "microsoft_365";
  if (
    type === "create_spreadsheet" ||
    type === "generate_report" ||
    type === "schedule_report"
  ) {
    return "google_workspace";
  }
  return "google_workspace";
}

export function toolRequiredMessage(
  type: AskAriaActionType,
  destination: WorkspaceDestination,
): { title: string; body: string; connectLabel: string } {
  const tool =
    destination.includes("Google") || destination === "Gmail"
      ? "Google Workspace"
      : "Microsoft 365";
  const actionLabel =
    type === "create_spreadsheet"
      ? "Google Sheets"
      : type === "draft_email" || type === "send_email"
        ? tool.includes("Google")
          ? "Gmail"
          : "Outlook"
        : destination;

  return {
    title: "Workspace connection needed",
    body: `${actionLabel} needs ${tool} connected before Aria can run this action.\n\nConnect from Tools to enable create, share, and send in this workspace.`,
    connectLabel: `Connect ${tool}`,
  };
}

export type ActionRiskLevel =
  | "read_analyze"
  | "create_draft"
  | "create_file"
  | "send_share"
  | "modify_data"
  | "monitor_rule";

export function actionRiskLevel(type: AskAriaActionType): ActionRiskLevel {
  switch (type) {
    case "draft_email":
      return "create_draft";
    case "generate_report":
    case "schedule_report":
    case "create_spreadsheet":
    case "create_presentation":
      return "create_file";
    case "send_email":
      return "send_share";
    case "create_monitor":
    case "create_alert":
      return "monitor_rule";
    case "campaign_bid":
    case "campaign_budget":
    case "budget_reallocation":
    case "keyword_pause":
    case "pause_campaign":
    case "resume_campaign":
    case "schedule_bid_change":
    case "update_bid":
    case "update_budget":
      return "modify_data";
    default:
      return "read_analyze";
  }
}

export function requiresExplicitConfirmation(type: AskAriaActionType): boolean {
  const risk = actionRiskLevel(type);
  return (
    risk === "send_share" ||
    risk === "modify_data" ||
    risk === "monitor_rule" ||
    risk === "create_file"
  );
}
