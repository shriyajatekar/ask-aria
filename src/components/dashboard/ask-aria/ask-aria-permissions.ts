import type { UserRole } from "@/lib/auth/types";

import { cxoOperationalActionMessage } from "./ask-aria-role-profiles";
import type { AskAriaActionType } from "./ask-aria-types";

const CAMPAIGN_OPERATION_TYPES = new Set<AskAriaActionType>([
  "campaign_bid",
  "campaign_budget",
  "pause_campaign",
  "resume_campaign",
  "keyword_pause",
  "budget_reallocation",
  "schedule_bid_change",
  "update_bid",
  "update_budget",
]);

const ANALYST_ALLOWED = new Set<AskAriaActionType>([
  "campaign_bid",
  "update_bid",
  "schedule_bid_change",
  "create_alert",
  "create_monitor",
  "generate_report",
  "schedule_report",
  "create_spreadsheet",
  "draft_email",
  "send_email",
  "investigate_anomaly",
]);

const KAM_ALLOWED = new Set<AskAriaActionType>([
  ...CAMPAIGN_OPERATION_TYPES,
  "create_alert",
  "create_monitor",
  "generate_report",
  "schedule_report",
  "create_spreadsheet",
  "draft_email",
  "send_email",
  "investigate_anomaly",
]);

export function canConfirmAction(
  role: UserRole,
  type: AskAriaActionType,
): { allowed: boolean; reason?: string } {
  if (role === "KAM") {
    return KAM_ALLOWED.has(type)
      ? { allowed: true }
      : {
          allowed: false,
          reason: "This action type is not enabled for your role in the demo workspace.",
        };
  }

  if (role === "ANALYST") {
    if (
      type === "pause_campaign" ||
      type === "resume_campaign" ||
      type === "keyword_pause"
    ) {
      return {
        allowed: false,
        reason:
          "Campaign pause and resume require KAM-level permissions in this demo.",
      };
    }
    if (
      type === "campaign_budget" ||
      type === "update_budget" ||
      type === "budget_reallocation"
    ) {
      return {
        allowed: false,
        reason:
          "Budget changes require KAM-level permissions in this demo. You can prepare a recommendation instead.",
      };
    }
    return ANALYST_ALLOWED.has(type)
      ? { allowed: true }
      : {
          allowed: false,
          reason: "This action is not permitted for Analyst in the demo workspace.",
        };
  }

  if (role === "CXO") {
    if (CAMPAIGN_OPERATION_TYPES.has(type)) {
      return {
        allowed: false,
        reason: cxoOperationalActionMessage("the selected platform"),
      };
    }
    return {
      allowed: true,
    };
  }

  return { allowed: false, reason: "Unknown role." };
}
