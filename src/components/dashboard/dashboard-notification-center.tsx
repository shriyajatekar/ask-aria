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
import { aggregateMetric } from "@/lib/analytics/comparisons";
import { useDashboardAnalytics } from "@/lib/dashboard/use-dashboard-analytics";
import {
  getMetricAggregationType,
} from "@/lib/dashboard/filter-records";
import { formatMetricValue } from "@/lib/dashboard/format-metric";
import { cn } from "@/lib/cn";

import { extractLastWorkspaceArtifact } from "./ask-aria/ask-aria-artifacts";
import { useAskAria } from "./ask-aria/ask-aria-context";

type NotificationId =
  | "roas-movement"
  | "monitor-alert"
  | "analysis-ready"
  | "report-artifact";

type DemoNotification = {
  id: NotificationId;
  title: string;
  body: string;
  timeLabel: string;
  actionLabel: string;
  demoOnly?: boolean;
};

const AMAZON_ROAS_INVESTIGATE_PROMPT =
  "Why did Amazon ROAS drop 8.4% compared to the prior period? Investigate drivers across campaigns and placements.";

export function DashboardNotificationCenter() {
  const {
    messages,
    openPanel,
    runProactivePrompt,
    openToolsSheet,
  } = useAskAria();
  const { currentRecords, comparisonRecords } = useDashboardAnalytics();

  const analysisSummary = useMemo(() => {
    const aggregation = getMetricAggregationType("gross_sales");
    const current = aggregateMetric(currentRecords, "gross_sales", aggregation);
    const comparison = aggregateMetric(
      comparisonRecords,
      "gross_sales",
      aggregation,
    );
    if (!current && !comparison) {
      return "Portfolio analysis is ready for your selected filters.";
    }
    return `Gross sales ${formatMetricValue("gross_sales", current)} in the current window (comparison ${formatMetricValue("gross_sales", comparison)}).`;
  }, [comparisonRecords, currentRecords]);

  const artifact = useMemo(
    () => extractLastWorkspaceArtifact(messages),
    [messages],
  );

  const notifications = useMemo((): DemoNotification[] => {
    const reportBody = artifact
      ? "A workspace report from this session is available to open."
      : "Sample report notification — create a report in Ask Aria to link a real artifact.";

    return [
      {
        id: "roas-movement",
        title: "ROAS movement",
        body: "Amazon ROAS dropped 8.4% versus the comparison period.",
        timeLabel: "Just now",
        actionLabel: "Investigate",
      },
      {
        id: "monitor-alert",
        title: "Monitor alert",
        body: "A simulated ROAS threshold was crossed on Amazon.",
        timeLabel: "12m ago",
        actionLabel: "View monitor",
      },
      {
        id: "analysis-ready",
        title: "Analysis ready",
        body: analysisSummary,
        timeLabel: "1h ago",
        actionLabel: "Open Aria",
      },
      {
        id: "report-artifact",
        title: "Report artifact",
        body: reportBody,
        timeLabel: "2h ago",
        actionLabel: artifact ? "Open report" : "View demo",
        demoOnly: !artifact,
      },
    ];
  }, [analysisSummary, artifact]);

  const [readIds, setReadIds] = useState<Set<NotificationId>>(() => new Set());
  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  function markAllRead() {
    setReadIds(new Set(notifications.map((n) => n.id)));
  }

  function markRead(id: NotificationId) {
    setReadIds((current) => new Set([...current, id]));
  }

  function handleAction(notification: DemoNotification) {
    markRead(notification.id);
    switch (notification.id) {
      case "roas-movement":
        runProactivePrompt(AMAZON_ROAS_INVESTIGATE_PROMPT);
        return;
      case "monitor-alert":
        openToolsSheet("monitoring");
        return;
      case "analysis-ready":
        openPanel();
        return;
      case "report-artifact":
        if (artifact?.url) {
          window.open(artifact.url, "_blank", "noopener,noreferrer");
        } else {
          openPanel();
          runProactivePrompt(
            "Summarize the latest portfolio performance and offer to create a shareable report.",
          );
        }
        return;
      default:
        return;
    }
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
        <ul className="max-h-[min(60vh,20rem)] overflow-y-auto py-1">
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
                    <button
                      type="button"
                      className="type-small font-medium text-accent-interactive hover:underline"
                      onClick={() => handleAction(notification)}
                    >
                      {notification.actionLabel}
                      {notification.demoOnly ? " (demo)" : ""}
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
