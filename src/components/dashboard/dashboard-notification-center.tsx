"use client";

import { useMemo, useState } from "react";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDashboard } from "@/contexts/dashboard-context";
import { PLATFORM_BY_ID } from "@/data/platforms";
import { cn } from "@/lib/cn";

import { extractLastWorkspaceArtifact } from "./ask-aria/ask-aria-artifacts";
import { useAskAria } from "./ask-aria/ask-aria-context";
import {
  describeSituation,
  situationsForContext,
} from "./ask-aria/ask-aria-situations";

type Notification = {
  id: string;
  title: string;
  body: string;
  /** Secondary line, e.g. what happened last time. */
  detail?: string;
  timeLabel: string;
  actionLabel: string;
  onAction: () => void;
};

/**
 * Notifications are real: situation alerts detected from the data for the
 * current filters (with what happened last time), plus a link to a report
 * created in this session. Nothing here is hard-coded.
 */
export function DashboardNotificationCenter() {
  const { messages, runProactivePrompt } = useAskAria();
  const dashboard = useDashboard();

  const situations = useMemo(
    () =>
      situationsForContext({
        dateRange: dashboard.dateRange,
        comparisonPeriod: dashboard.comparisonPeriod,
        brandId: dashboard.brandId,
        category: dashboard.category,
        subcategory: dashboard.subcategory,
        productId: dashboard.productId,
      }).map(describeSituation),
    [
      dashboard.dateRange,
      dashboard.comparisonPeriod,
      dashboard.brandId,
      dashboard.category,
      dashboard.subcategory,
      dashboard.productId,
    ],
  );

  const artifact = useMemo(
    () => extractLastWorkspaceArtifact(messages),
    [messages],
  );

  const notifications = useMemo((): Notification[] => {
    const alerts: Notification[] = situations.map((situation) => ({
      id: situation.id,
      title: situation.title,
      body: situation.summary,
      detail: situation.pastLine,
      timeLabel: situation.severity === "high" ? "Needs attention" : "Worth watching",
      actionLabel: "Investigate in Aria",
      onAction: () => runProactivePrompt(situation.investigatePrompt),
    }));
    // A confirmed bid change that the trend check flagged.
    const riskyBid = [...messages]
      .reverse()
      .find(
        (m) =>
          m.kind === "action_result" &&
          (m.status === "scheduled" || m.status === "completed") &&
          m.draft.bidRisk &&
          m.draft.bidRisk.level !== "none",
      );
    if (riskyBid?.kind === "action_result" && riskyBid.draft.bidRisk) {
      const { draft } = riskyBid;
      const risk = riskyBid.draft.bidRisk;
      alerts.unshift({
        id: `bid-risk-${draft.id}`,
        title: `${draft.isImmediate ? "Bid change" : "Scheduled bid"} may be risky`,
        body: `₹${draft.newBid} on ${draft.campaignName ?? "the campaign"}${draft.isImmediate ? "" : ` · ${draft.scheduledLabel ?? "scheduled"}`}. ${risk.reasons[0] ?? ""}`,
        detail: risk.suggestion ?? undefined,
        timeLabel: risk.level === "high" ? "Needs attention" : "Worth watching",
        actionLabel: "Review in Aria",
        onAction: () =>
          runProactivePrompt(
            `Set bid to ₹${draft.newBid} on ${PLATFORM_BY_ID[draft.platformId ?? "amazon"]?.name ?? "Amazon"} campaign ${draft.campaignName ?? ""}`.trim(),
          ),
      });
    }
    if (artifact?.url) {
      alerts.push({
        id: "report-artifact",
        title: "Report ready",
        body: "A report from this session is ready to open.",
        timeLabel: "This session",
        actionLabel: "Open report",
        onAction: () => window.open(artifact.url, "_blank", "noopener,noreferrer"),
      });
    }
    return alerts;
  }, [artifact, runProactivePrompt, situations]);

  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  function markAllRead() {
    setReadIds(new Set(notifications.map((n) => n.id)));
  }

  function handleAction(notification: Notification) {
    setReadIds((current) => new Set([...current, notification.id]));
    notification.onAction();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="tertiary"
          size="icon"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
          className="relative"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span
              className="absolute right-1.5 top-1.5 flex h-2 w-2 items-center justify-center rounded-full bg-accent-interactive ring-2 ring-surface"
              aria-hidden
            />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(100vw-2rem,22rem)] rounded-lg border border-border bg-white p-0 shadow-md"
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <DropdownMenuLabel className="p-0 type-body-medium text-text-primary">
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 ? (
            <button
              type="button"
              className="type-small text-text-secondary transition-colors hover:text-text-primary"
              onClick={markAllRead}
            >
              Mark all as read
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator className="m-0" />
        {notifications.length === 0 ? (
          <p className="px-3 py-4 type-small text-text-secondary">
            Nothing needs attention for these filters.
          </p>
        ) : null}
        <ul className="max-h-[min(60vh,24rem)] overflow-y-auto py-1">
          {notifications.map((notification) => {
            const unread = !readIds.has(notification.id);
            return (
              <li
                key={notification.id}
                className={cn(
                  "border-b border-border-subtle px-3 py-2.5 last:border-b-0",
                  unread && "bg-background-secondary/40",
                )}
              >
                <div className="flex items-start gap-2">
                  {unread ? (
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-interactive"
                      aria-hidden
                    />
                  ) : (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="type-body-medium text-text-primary">
                        {notification.title}
                      </p>
                      <span className="shrink-0 type-small text-text-tertiary">
                        {notification.timeLabel}
                      </span>
                    </div>
                    <p className="type-small text-text-secondary">
                      {notification.body}
                    </p>
                    {notification.detail ? (
                      <p className="type-small text-text-tertiary">
                        {notification.detail}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className="type-small font-medium text-accent-interactive hover:underline"
                      onClick={() => handleAction(notification)}
                    >
                      {notification.actionLabel}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
