import type { AskAriaFullContext } from "@/components/dashboard/ask-aria/ask-aria-types";
import { PLATFORM_BY_ID } from "@/data/platforms";

export interface EmailContentInput {
  subject?: string;
  recipientLabel?: string;
  context: AskAriaFullContext;
  artifactUrl?: string;
  artifactKind?: "doc" | "sheet";
  insightSummary?: string;
}

function platformScopeLabel(context: AskAriaFullContext): string {
  if (context.platform === "all") return "All platforms";
  return PLATFORM_BY_ID[context.platform]?.name ?? "Workspace";
}

export function defaultEmailSubject(context: AskAriaFullContext): string {
  const scope = platformScopeLabel(context);
  return `Commerce performance update — ${scope}`;
}

export function buildClientUpdateBodyLines(input: EmailContentInput): string[] {
  const period = `${input.context.dateRange.start} – ${input.context.dateRange.end}`;
  const platformScope = platformScopeLabel(input.context);
  const lines: string[] = [
    "Hi there,",
    "",
    input.insightSummary ??
      `Sharing a brief performance update for ${platformScope} (${period}).`,
    "",
    "Summary:",
    `• Period reviewed: ${period}`,
    `• Scope: ${platformScope}`,
  ];

  if (input.artifactUrl) {
    const label =
      input.artifactKind === "sheet"
        ? "Supporting spreadsheet"
        : input.artifactKind === "doc"
          ? "Supporting report"
          : "Link";
    lines.push("", `${label}: ${input.artifactUrl}`);
  }

  lines.push(
    "",
    "Please let me know if you would like to walk through drivers or next steps on a call.",
    "",
    "Best regards,",
  );
  return lines;
}

export function buildEmailBodyLines(input: EmailContentInput): string[] {
  const scope = platformScopeLabel(input.context);
  const period = `${input.context.dateRange.start} – ${input.context.dateRange.end}`;
  const lines: string[] = [
    "Hi team,",
    "",
    input.insightSummary ??
      `Sharing a concise read on commerce performance for ${scope} (${period}).`,
    "",
    "Highlights from the current workspace view:",
    `• Period: ${period}`,
    `• Scope: ${scope}`,
  ];

  if (input.artifactUrl) {
    const label =
      input.artifactKind === "sheet"
        ? "Spreadsheet"
        : input.artifactKind === "doc"
          ? "Report"
          : "Link";
    lines.push("", `${label}: ${input.artifactUrl}`);
  }

  lines.push("", "— Ask Aria");
  return lines;
}

export function buildEmailPlainBody(input: EmailContentInput): string {
  return buildEmailBodyLines(input).join("\n");
}

export function defaultClientUpdateSubject(context: AskAriaFullContext): string {
  const scope = platformScopeLabel(context);
  return `Performance update — ${scope}`;
}

export function buildEmailSubject(input: EmailContentInput): string {
  if (input.subject?.trim()) return input.subject.trim();
  if (input.recipientLabel?.toLowerCase().includes("client")) {
    return defaultClientUpdateSubject(input.context);
  }
  return defaultEmailSubject(input.context);
}
