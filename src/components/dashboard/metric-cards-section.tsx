"use client";

import { useState } from "react";

import { ArrowDownRight, ArrowUpRight, Minus, Plus } from "lucide-react";

import { METRIC_BY_ID } from "@/data/metrics";
import { TREND_METRIC_LIMIT, useDashboard } from "@/contexts/dashboard-context";
import { useDashboardAnalytics } from "@/lib/dashboard/use-dashboard-analytics";
import {
  formatMetricValue,
  formatPercentChange,
} from "@/lib/dashboard/format-metric";
import { cn } from "@/lib/cn";
import type { MetricId } from "@/types/analytics";

import { MetricSelectorDialog } from "./metric-selector";

export function MetricCardsSection({
  variant = "default",
}: {
  variant?: "default" | "workspace";
}) {
  const {
    platform,
    selectedMetrics,
    chartMetrics,
    toggleTrendMetric,
    consolidatedChartMetric,
    setConsolidatedChartMetric,
  } = useDashboard();
  const { metricComparisons } = useDashboardAnalytics();
  const [trendLimitMessage, setTrendLimitMessage] = useState<string | null>(
    null,
  );
  const isWorkspace = variant === "workspace";
  const isConsolidated = platform === "all";

  function handleMetricCardClick(metricId: MetricId) {
    if (isConsolidated) {
      setTrendLimitMessage(null);
      setConsolidatedChartMetric(metricId);
      return;
    }

    setTrendLimitMessage(null);
    const wasSelected = chartMetrics.includes(metricId);
    const allowed = toggleTrendMetric(metricId);
    if (!allowed && !wasSelected) {
      setTrendLimitMessage(
        `Select up to ${TREND_METRIC_LIMIT} KPI cards for Metric Trends.`,
      );
    }
  }

  return (
    <div className={isWorkspace ? "" : "px-3 py-2"}>
      <h3
        className={cn(
          "text-text-primary",
          isWorkspace ? "mb-2 type-label font-medium" : "mb-2 type-h3",
        )}
      >
        Frequently used metrics
      </h3>

      <div
        className={cn(
          "grid",
          isWorkspace
            ? "grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8"
            : "grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8",
        )}
      >
        {selectedMetrics.map((metricId) => {
          const definition = METRIC_BY_ID[metricId];
          const comparison = metricComparisons[metricId];
          if (!definition || !comparison) return null;

          return (
            <MetricCard
              key={metricId}
              metricId={metricId}
              name={definition.name}
              description={definition.description}
              value={comparison.current}
              percentageChange={comparison.percentageChange}
              direction={comparison.direction}
              selectedForTrend={
                isConsolidated
                  ? consolidatedChartMetric === metricId
                  : chartMetrics.includes(metricId)
              }
              onToggleTrend={() => handleMetricCardClick(metricId)}
              compact={isWorkspace}
            />
          );
        })}

        <div
          className={cn(
            "flex items-center justify-center rounded-md border border-dashed border-border bg-background-secondary",
            isWorkspace ? "min-h-[64px] px-1 py-1" : "min-h-[72px] px-1.5 py-1.5",
          )}
        >
          <MetricSelectorDialog
            trigger={
              <button
                type="button"
                className="inline-flex flex-col items-center gap-0.5 rounded-md px-1 py-0.5 type-label text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="text-center text-[10px] leading-tight sm:text-[11px]">
                  Add More Metrics
                </span>
              </button>
            }
          />
        </div>
      </div>

      {trendLimitMessage ? (
        <p className="mt-1.5 type-small text-text-secondary">{trendLimitMessage}</p>
      ) : isConsolidated ? (
        <p className="mt-1.5 type-small text-text-tertiary">
          Select a KPI card to choose the chart metric.
        </p>
      ) : (
        <p className="mt-1.5 type-small text-text-tertiary">
          Select up to {TREND_METRIC_LIMIT} KPI cards for Metric Trends.
        </p>
      )}
    </div>
  );
}

function MetricCard({
  metricId,
  name,
  description,
  value,
  percentageChange,
  direction,
  selectedForTrend,
  onToggleTrend,
  compact = false,
}: {
  metricId: MetricId;
  name: string;
  description: string;
  value: number;
  percentageChange: number;
  direction: "up" | "down" | "flat";
  selectedForTrend: boolean;
  onToggleTrend: () => void;
  compact?: boolean;
}) {
  const isPositive = direction === "up";
  const isNegative = direction === "down";
  const metricDirection = METRIC_BY_ID[metricId]?.direction;
  const changeIsGood =
    metricDirection === "lower_is_better" ? isNegative : isPositive;

  return (
    <button
      type="button"
      title={description}
      onClick={onToggleTrend}
      className={cn(
        "min-w-0 rounded-md border text-left transition-colors hover:bg-surface-hover",
        compact ? "p-3" : "px-2 py-2",
        selectedForTrend
          ? "border-accent-interactive bg-accent-subtle ring-1 ring-accent-interactive/20"
          : "border-border bg-white",
      )}
    >
      <p className="truncate type-label text-text-secondary">{name}</p>
      <p
        className={cn(
          "type-metric leading-6 text-text-primary",
          compact ? "mt-0.5 text-[15px]" : "mt-0.5 text-[17px]",
        )}
      >
        {formatMetricValue(metricId, value)}
      </p>
      <p className="mt-0.5 flex items-center gap-0.5 type-small leading-tight">
        <span
          className={cn(
            "inline-flex items-center gap-0.5",
            changeIsGood && "text-success",
            !changeIsGood && direction !== "flat" && "text-error",
            direction === "flat" && "text-text-secondary",
          )}
        >
          {direction === "up" ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : direction === "down" ? (
            <ArrowDownRight className="h-3 w-3" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
          {formatPercentChange(percentageChange)}
        </span>
      </p>
    </button>
  );
}
