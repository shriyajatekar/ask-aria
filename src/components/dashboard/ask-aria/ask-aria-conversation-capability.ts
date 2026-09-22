import type { AskAriaConversationCapabilityKind, AskAriaMessage } from "./ask-aria-types";

export function inferCapabilityFromMessage(
  message: AskAriaMessage,
): AskAriaConversationCapabilityKind | null {
  switch (message.kind) {
    case "insight":
    case "recommendation":
      return "Analysis";
    case "action_result":
      if (message.status !== "completed") return null;
      switch (message.draft.type) {
        case "generate_report":
        case "schedule_report":
          return "Google Docs";
        case "create_spreadsheet":
          return "Google Sheets";
        case "send_email":
        case "draft_email":
          return "Email";
        case "create_monitor":
        case "create_alert":
          return "Monitor";
        default:
          return "Action";
      }
    case "monitor_alert":
      return "Monitor";
    case "workspace_artifact":
      return message.artifactKind === "sheet" ? "Google Sheets" : "Google Docs";
    default:
      return null;
  }
}

export function inferLastCapabilityKind(
  messages: AskAriaMessage[],
): AskAriaConversationCapabilityKind | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const kind = inferCapabilityFromMessage(messages[i]);
    if (kind) return kind;
  }
  return undefined;
}
