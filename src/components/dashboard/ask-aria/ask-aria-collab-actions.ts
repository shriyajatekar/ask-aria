import { PERFORMANCE_RECORDS } from "@/data/performance";
import { PLATFORM_BY_ID } from "@/data/platforms";
import { formatMetricValue } from "@/lib/ask-aria/monitors";
import { calculatePercentageChange } from "@/lib/analytics/calculations";
import { aggregateMetric } from "@/lib/analytics/comparisons";
import type { UserRole } from "@/lib/auth/types";
import { filterPerformanceRecords } from "@/lib/dashboard/filter-records";
import type { PlatformId } from "@/types/analytics";

import { describeSituation, situationsForContext } from "./ask-aria-situations";
import type {
  AskAriaActionDraft,
  AskAriaFullContext,
  AskAriaMessage,
} from "./ask-aria-types";

/**
 * Team actions: post to Slack/Teams, calendar invite, Jira/Asana task and a
 * weekly digest. Each builds its content from the latest finding in the
 * conversation, shows a preview to confirm, and is always simulated — there
 * is no live integration behind them.
 */
export type CollabActionType =
  | "share_slack"
  | "calendar_invite"
  | "create_task"
  | "weekly_digest";

export function detectCollabAction(text: string): CollabActionType | null {
  const lower = text.toLowerCase();
  if (/\b(digest|weekly summary|weekly round-?up)\b/.test(lower)) return "weekly_digest";
  if (/\b(slack|teams)\b/.test(lower) || /#[a-z0-9-]+/.test(lower)) return "share_slack";
  if (
    /\b(jira|asana|ticket)\b/.test(lower) ||
    /\b(create|add|open|make)\b.*\b(task|to-?do)\b/.test(lower) ||
    /\bassign (this|it)\b/.test(lower)
  ) {
    return "create_task";
  }
  if (
    /\b(calendar|invite)\b/.test(lower) ||
    /\b(schedule|set up|book|arrange)\b.*\b(meeting|call|review|sync|catch-?up)\b/.test(lower)
  ) {
    return "calendar_invite";
  }
  return null;
}

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** "tomorrow at 3pm" → "Tomorrow · 3:00 PM"; falls back to `fallback`. */
export function parseWhen(text: string, fallback: string): string {
  const lower = text.toLowerCase();
  const day =
    lower.match(/\b(today|tomorrow)\b/)?.[1] ??
    lower.match(new RegExp(`\\b(?:on |next )?(${DAYS.join("|")})\\b`))?.[1];
  const time = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (!day && !time) return fallback;
  const [fallbackDay, fallbackTime] = fallback.split(" · ");
  const dayLabel = day ? capitalise(day) : fallbackDay;
  const timeLabel = time
    ? `${Number(time[1])}:${time[2] ?? "00"} ${time[3].toUpperCase()}`
    : fallbackTime;
  return timeLabel ? `${dayLabel} · ${timeLabel}` : dayLabel;
}

/** The finding the action is about: the latest analysis answer in the thread. */
function latestFinding(
  messages: AskAriaMessage[],
  context: AskAriaFullContext,
): { title: string; lines: string[] } {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.kind === "insight" || m.kind === "rca" || m.kind === "situation") {
      const source = m.source
        ? `Source: ${m.source.dataset} · ${m.source.scope} · ${m.source.period} vs ${m.source.comparison}`
        : undefined;
      const extra =
        m.kind === "situation"
          ? [`Suggested next step: ${m.suggestion}`]
          : m.kind === "rca"
            ? [m.confidenceReason]
            : [];
      return {
        title: m.title,
        lines: [m.summary, ...extra, ...(source ? [source] : [])],
      };
    }
  }
  // No analysis yet: use the most urgent alert so the action still has substance.
  const top = situationsForContext(context, 1)[0];
  if (top) {
    const copy = describeSituation(top);
    return { title: copy.title, lines: [copy.summary, `Suggested next step: ${copy.suggestion}`] };
  }
  return { title: "Commerce performance update", lines: ["No material changes this period."] };
}

/** Lines for the weekly digest: open alerts and the biggest gain. */
function digestLines(context: AskAriaFullContext): string[] {
  const alerts = situationsForContext(context, 3).map(describeSituation);
  const records = filterPerformanceRecords(PERFORMANCE_RECORDS, {
    brandId: context.brandId,
    category: context.category,
    subcategory: context.subcategory,
    productId: context.productId,
  });
  const growth = [...new Set(records.map((r) => r.platformId))]
    .map((platformId) => {
      const own = records.filter((r) => r.platformId === platformId);
      const inRange = (range: { start: string; end: string }) =>
        own.filter((r) => r.date >= range.start && r.date <= range.end);
      const cur = aggregateMetric(inRange(context.dateRange), "gross_sales", "sum");
      const prev = aggregateMetric(inRange(context.comparisonPeriod), "gross_sales", "sum");
      return { platformId, pct: calculatePercentageChange(cur, prev), gain: cur - prev };
    })
    .sort((a, b) => b.gain - a.gain)[0];

  return [
    "Every Monday you'll get:",
    ...(alerts.length
      ? alerts.map((a) => `• Alert: ${a.title}`)
      : ["• Alerts: none crossing the thresholds this week"]),
    ...(growth && growth.gain > 0
      ? [
          `• Biggest gain: ${PLATFORM_BY_ID[growth.platformId as PlatformId]?.name ?? growth.platformId} Gross Sales +${growth.pct.toFixed(1)}% (${formatMetricValue("gross_sales", growth.gain)} more)`,
        ]
      : []),
    "• What happened last time for each alert, and a suggested next step",
  ];
}

function attendeesFor(text: string, role: UserRole): string {
  const lower = text.toLowerCase();
  if (lower.includes("leadership") || lower.includes("cxo")) return "Leadership (demo), you";
  if (lower.includes("client") || (role === "KAM" && !lower.includes("team"))) {
    return "Client account (demo), you";
  }
  return "KAM team (demo), you";
}

export function buildCollabDraftPartial(
  type: CollabActionType,
  text: string,
  options: { context: AskAriaFullContext; role: UserRole; messages: AskAriaMessage[] },
): Partial<AskAriaActionDraft> {
  const finding = latestFinding(options.messages, options.context);
  const lower = text.toLowerCase();

  if (type === "share_slack") {
    const teams = /\bteams\b/.test(lower);
    const channel = text.match(/#[A-Za-z0-9-]+/)?.[0] ?? "#commerce-insights";
    return {
      type,
      collab: {
        tool: teams ? "Microsoft Teams" : "Slack",
        target: teams ? "Commerce insights channel" : channel,
        title: `Share: ${finding.title}`,
        bodyLines: finding.lines,
      },
    };
  }

  if (type === "calendar_invite") {
    return {
      type,
      collab: {
        tool: "Google Calendar",
        target: attendeesFor(text, options.role),
        title: `Review: ${finding.title}`,
        when: `${parseWhen(text, "Tomorrow · 11:00 AM")} (30 min)`,
        bodyLines: ["Agenda:", ...finding.lines],
      },
    };
  }

  if (type === "create_task") {
    const assignee =
      text.match(/\bassign(?:ed)? (?:this |it )?to (\w+)/i)?.[1] ?? "You";
    return {
      type,
      collab: {
        tool: /\basana\b/.test(lower) ? "Asana" : "Jira",
        target: capitalise(assignee === "me" ? "You" : assignee),
        title: `Investigate: ${finding.title}`,
        when: `Due ${parseWhen(text, "In 3 days").replace(/^(\w)/, (c) => c.toLowerCase())}`,
        bodyLines: finding.lines,
      },
    };
  }

  const recipients = lower.includes("leadership")
    ? "Leadership (demo)"
    : lower.includes("team")
      ? "KAM team (demo)"
      : "You";
  return {
    type,
    collab: {
      tool: "Email digest",
      target: recipients,
      title: "Weekly commerce digest",
      when: "Every Monday · 9:00 AM",
      bodyLines: digestLines(options.context),
    },
  };
}

const RESULT_COPY: Record<CollabActionType, { done: string; demo: string }> = {
  share_slack: { done: "Simulated post", demo: "Demo only: nothing was posted." },
  calendar_invite: { done: "Simulated invite", demo: "Demo only: no invite was sent." },
  create_task: { done: "Simulated task", demo: "Demo only: no task was created." },
  weekly_digest: { done: "Simulated weekly digest", demo: "Demo only: nothing will be sent." },
};

export function isCollabAction(type: AskAriaActionDraft["type"]): type is CollabActionType {
  return type in RESULT_COPY;
}

export function collabResult(draft: AskAriaActionDraft): {
  message: string;
  detailLines: string[];
} {
  const copy = RESULT_COPY[draft.type as CollabActionType];
  const collab = draft.collab;
  return {
    message: `${copy.done} · ${collab?.tool ?? ""}`.trim(),
    detailLines: [
      collab?.title ?? "",
      [collab?.target, collab?.when].filter(Boolean).join(" · "),
      copy.demo,
    ].filter(Boolean),
  };
}
