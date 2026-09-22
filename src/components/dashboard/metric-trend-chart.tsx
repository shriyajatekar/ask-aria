"use client";

import { useMemo, useRef, useState } from "react";

import { METRIC_BY_ID } from "@/data/metrics";
import { PERFORMANCE_RECORDS } from "@/data/performance";
import { PLATFORM_BY_ID } from "@/data/platforms";
import {
  calculateChange,
  calculatePercentageChange,
} from "@/lib/analytics/calculations";
import { aggregateMetric } from "@/lib/analytics/comparisons";
import { useDashboard } from "@/contexts/dashboard-context";
import { useDashboardAnalytics } from "@/lib/dashboard/use-dashboard-analytics";
import {
  aggregateMetricSeriesByDate,
  aggregateMetricSeriesWeekly,
  filterPerformanceRecords,
  getMetricAggregationType,
} from "@/lib/dashboard/filter-records";
import {
  chartPeriodPair,
  METRIC_COMPARISON_BASE,
  metricChartColor,
  platformChartColor,
} from "@/lib/dashboard/chart-colors";
import { normalizeSelectedPlatformIds } from "@/lib/dashboard/consolidated-platforms";
import {
  formatMetricValue,
  formatPercentChange,
} from "@/lib/dashboard/format-metric";
import { cn } from "@/lib/cn";
import type { MetricId, PlatformId } from "@/types/analytics";

export function MetricTrendVisualization({
  showDataTable,
}: {
  showDataTable: boolean;
}) {
  return (
    <MetricTrendVisualizationIndividual showDataTable={showDataTable} />
  );
}

export function MetricTrendVisualizationIndividual({
  showDataTable,
}: {
  showDataTable: boolean;
}) {
  const dashboard = useDashboard();
  const trendMetrics = dashboard.chartMetrics;

  if (dashboard.analyticsMode === "comparison") {
    return (
      <ComparisonTrendSection
        chartMetrics={trendMetrics}
        showDataTable={showDataTable}
      />
    );
  }

  return (
    <SummaryLineTrendSection
      chartMetrics={trendMetrics}
      showDataTable={showDataTable}
    />
  );
}

export function IndividualPlatformChart() {
  const dashboard = useDashboard();
  const trendMetrics = dashboard.chartMetrics;
  const platformLabel =
    dashboard.platform !== "all"
      ? PLATFORM_BY_ID[dashboard.platform]?.name
      : null;
  const isSummary = dashboard.analyticsMode === "summary";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {platformLabel ? (
          <p className="type-label text-text-secondary">{platformLabel}</p>
        ) : (
          <span />
        )}
        {isSummary ? <ChartGranularityToggle /> : null}
      </div>
      {dashboard.analyticsMode === "comparison" ? (
        <ComparisonTrendSection
          chartMetrics={trendMetrics}
          showDataTable={false}
        />
      ) : (
        <SummaryLineTrendSection
          chartMetrics={trendMetrics}
          showDataTable={false}
        />
      )}
    </div>
  );
}

export function IndividualCombinedDataView() {
  const dashboard = useDashboard();
  const trendMetrics = dashboard.chartMetrics;
  const seriesByMetric = useIndividualSummarySeries(trendMetrics);
  const comparisonRows = useIndividualComparisonRows(trendMetrics);

  if (dashboard.analyticsMode === "comparison") {
    return <ComparisonMetricsTable rows={comparisonRows} />;
  }

  return <CombinedTimeSeriesTable seriesByMetric={seriesByMetric} />;
}

function ChartGranularityToggle() {
  const dashboard = useDashboard();

  return (
    <div className="flex gap-1">
      <GranularityButton
        label="Daily"
        active={dashboard.chartGranularity === "daily"}
        onClick={() => dashboard.setChartGranularity("daily")}
      />
      <GranularityButton
        label="Weekly"
        active={dashboard.chartGranularity === "weekly"}
        onClick={() => dashboard.setChartGranularity("weekly")}
      />
    </div>
  );
}

function GranularityButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2 py-0.5 type-label transition-colors",
        active
          ? "bg-accent-interactive text-white"
          : "border border-border text-text-secondary hover:bg-surface-hover",
      )}
    >
      {label}
    </button>
  );
}

function useIndividualSummarySeries(chartMetrics: MetricId[]) {
  const dashboard = useDashboard();
  const { currentRecords } = useDashboardAnalytics();

  return useMemo(() => {
    const aggregate =
      dashboard.chartGranularity === "weekly"
        ? aggregateMetricSeriesWeekly
        : aggregateMetricSeriesByDate;

    return chartMetrics.map((metricId) => ({
      metricId,
      color: metricChartColor(metricId),
      points: aggregate(currentRecords, metricId),
    }));
  }, [chartMetrics, currentRecords, dashboard.chartGranularity]);
}

function useIndividualComparisonRows(chartMetrics: MetricId[]) {
  const { currentRecords, comparisonRecords } = useDashboardAnalytics();

  return useMemo(() => {
    return chartMetrics.map((metricId) => {
      const aggregation = getMetricAggregationType(metricId);
      const current = aggregateMetric(currentRecords, metricId, aggregation);
      const comparison = aggregateMetric(
        comparisonRecords,
        metricId,
        aggregation,
      );
      return {
        metricId,
        current,
        comparison,
        absoluteChange: calculateChange(current, comparison),
        percentageChange: calculatePercentageChange(current, comparison),
      };
    });
  }, [chartMetrics, comparisonRecords, currentRecords]);
}

/** @deprecated Use MetricTrendsWorkspace instead */
export function MetricTrendChart({ embedded = false }: { embedded?: boolean }) {
  const dashboard = useDashboard();
  return (
    <div className={embedded ? "" : "rounded-lg border border-border bg-white p-4 shadow-sm"}>
      <MetricTrendVisualization showDataTable={dashboard.chartView === "combined"} />
    </div>
  );
}

function SummaryLineTrendSection({
  chartMetrics,
  showDataTable,
}: {
  chartMetrics: MetricId[];
  showDataTable: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const seriesByMetric = useIndividualSummarySeries(chartMetrics);

  const dates = seriesByMetric[0]?.points.map((point) => point.date) ?? [];
  const panelCount = Math.max(seriesByMetric.length, 1);
  const width = 960;
  const panelHeight = 44;
  const padding = { top: 8, right: 16, bottom: 28, left: 108 };
  const height = padding.top + panelCount * panelHeight + padding.bottom;
  const innerWidth = width - padding.left - padding.right;

  function xForIndex(index: number) {
    if (dates.length <= 1) return padding.left;
    return padding.left + (index / (dates.length - 1)) * innerWidth;
  }

  const xLabelIndexes =
    dates.length <= 6
      ? dates.map((_, index) => index)
      : [
          0,
          Math.floor(dates.length / 3),
          Math.floor((2 * dates.length) / 3),
          dates.length - 1,
        ];

  function handleHover(index: number, event: React.MouseEvent) {
    setHoveredIndex(index);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rawX = event.clientX - rect.left + 12;
    const rawY = event.clientY - rect.top - 12;
    setTooltipPos({
      x: Math.min(rawX, Math.max(8, rect.width - 224)),
      y: Math.max(8, Math.min(rawY, rect.height - 130)),
    });
  }

  const hoveredPoint =
    hoveredIndex === null
      ? null
      : {
          date: dates[hoveredIndex],
          values: Object.fromEntries(
            seriesByMetric.map((series) => [
              series.metricId,
              series.points[hoveredIndex]?.value ?? 0,
            ]),
          ) as Partial<Record<MetricId, number>>,
        };

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="relative w-full max-w-full min-w-0">
        <div className="max-w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[min(220px,40vh)] min-w-full w-full"
            role="img"
            aria-label="Metric trend line chart"
          >
            {seriesByMetric.map((series, seriesIndex) => {
              const panelTop = padding.top + seriesIndex * panelHeight;
              const panelBottom = panelTop + panelHeight - 6;
              const innerPanelHeight = panelBottom - panelTop;
              const values = series.points.map((point) => point.value);
              let minValue = Math.min(...values, 0);
              let maxValue = Math.max(...values, 1);
              const rangePad = (maxValue - minValue) * 0.08 || 1;
              minValue -= rangePad;
              maxValue += rangePad;

              function yForValue(value: number) {
                const range = maxValue - minValue || 1;
                return (
                  panelBottom -
                  ((value - minValue) / range) * innerPanelHeight
                );
              }

              const path = series.points
                .map((point, index) => {
                  const x = xForIndex(index);
                  const y = yForValue(point.value);
                  return `${index === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ");

              return (
                <g key={series.metricId}>
                  <text
                    x={padding.left - 8}
                    y={panelTop + innerPanelHeight / 2 + 4}
                    textAnchor="end"
                    className="fill-[#404040] text-[10px]"
                  >
                    {METRIC_BY_ID[series.metricId]?.name ?? series.metricId}
                  </text>
                  <line
                    x1={padding.left}
                    x2={width - padding.right}
                    y1={panelBottom}
                    y2={panelBottom}
                    stroke="#F0F0F0"
                  />
                  <path
                    d={path}
                    fill="none"
                    stroke={series.color}
                    strokeWidth={2}
                  />
                  {hoveredIndex !== null && series.points[hoveredIndex] ? (
                    <circle
                      cx={xForIndex(hoveredIndex)}
                      cy={yForValue(series.points[hoveredIndex].value)}
                      r={3.5}
                      fill="#FFFFFF"
                      stroke={series.color}
                      strokeWidth={2}
                    />
                  ) : null}
                </g>
              );
            })}

            {dates.map((date, index) => (
              <rect
                key={date}
                x={xForIndex(index) - 12}
                y={padding.top}
                width={24}
                height={panelCount * panelHeight}
                fill="transparent"
                onMouseEnter={(event) => handleHover(index, event)}
                onMouseMove={(event) => handleHover(index, event)}
                onMouseLeave={() => {
                  setHoveredIndex(null);
                  setTooltipPos(null);
                }}
              />
            ))}

            {xLabelIndexes.map((index) => (
              <text
                key={dates[index]}
                x={xForIndex(index)}
                y={height - 10}
                textAnchor="middle"
                className="fill-[#737373] text-[10px]"
              >
                {new Date(`${dates[index]}T00:00:00.000Z`).toLocaleDateString(
                  "en-IN",
                  { month: "short", day: "numeric" },
                )}
              </text>
            ))}
          </svg>
        </div>

        {hoveredPoint && tooltipPos ? (
          <div
            className="pointer-events-none absolute z-20 min-w-[200px] rounded-md border border-border bg-white px-3 py-2 shadow-md"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <p className="type-label text-text-secondary">
              {new Date(`${hoveredPoint.date}T00:00:00.000Z`).toLocaleDateString(
                "en-IN",
                { month: "short", day: "numeric", year: "numeric" },
              )}
            </p>
            <div className="mt-1 space-y-0.5">
              {Object.entries(hoveredPoint.values).map(([metricId, value]) => (
                <div
                  key={metricId}
                  className="flex items-center justify-between gap-4 type-small"
                >
                  <span className="text-text-secondary">
                    {METRIC_BY_ID[metricId as MetricId]?.name ?? metricId}
                  </span>
                  <span className="tabular-nums text-text-primary">
                    {formatMetricValue(metricId as MetricId, value ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <Legend series={seriesByMetric} compact />

      {showDataTable ? (
        <CombinedTimeSeriesTable seriesByMetric={seriesByMetric} />
      ) : null}
    </div>
  );
}

function ComparisonTrendSection({
  chartMetrics,
  showDataTable,
}: {
  chartMetrics: MetricId[];
  showDataTable: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredMetricIndex, setHoveredMetricIndex] = useState<number | null>(
    null,
  );
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const rows = useIndividualComparisonRows(chartMetrics);
  const periodLegend = chartPeriodPair(METRIC_COMPARISON_BASE);

  const width = 960;
  const padding = { top: 16, right: 20, bottom: 40, left: 48 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = 180;
  const height = padding.top + innerHeight + padding.bottom;
  const baseline = padding.top + innerHeight;
  const groupCount = Math.max(rows.length, 1);
  const groupWidth = innerWidth / groupCount;
  const barWidth = Math.min(28, groupWidth * 0.22);
  const barGap = 6;

  function handleBarHover(
    index: number,
    event: React.MouseEvent<SVGRectElement>,
  ) {
    setHoveredMetricIndex(index);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({
      x: Math.min(
        event.clientX - rect.left + 8,
        Math.max(8, rect.width - 210),
      ),
      y: Math.max(8, event.clientY - rect.top - 100),
    });
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="relative w-full max-w-full min-w-0">
        <div className="max-w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[min(220px,40vh)] min-w-full w-full"
            role="img"
            aria-label="Period comparison vertical bar chart"
          >
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={baseline}
              y2={baseline}
              stroke="#E5E5E5"
            />

            {rows.map((row, index) => {
              const groupCenter =
                padding.left + index * groupWidth + groupWidth / 2;
              const maxValue = Math.max(row.current, row.comparison, 1);
              const currentHeight = (row.current / maxValue) * (innerHeight - 12);
              const comparisonHeight =
                (row.comparison / maxValue) * (innerHeight - 12);
              const currentX = groupCenter - barWidth - barGap / 2;
              const comparisonX = groupCenter + barGap / 2;
              const periodColors = chartPeriodPair(metricChartColor(row.metricId));

              return (
                <g key={row.metricId}>
                  <rect
                    x={currentX}
                    y={baseline - currentHeight}
                    width={barWidth}
                    height={currentHeight}
                    fill={periodColors.current}
                    rx={2}
                    onMouseEnter={(event) => handleBarHover(index, event)}
                    onMouseMove={(event) => handleBarHover(index, event)}
                    onMouseLeave={() => {
                      setHoveredMetricIndex(null);
                      setTooltipPos(null);
                    }}
                  />
                  <rect
                    x={comparisonX}
                    y={baseline - comparisonHeight}
                    width={barWidth}
                    height={comparisonHeight}
                    fill={periodColors.comparison}
                    rx={2}
                    onMouseEnter={(event) => handleBarHover(index, event)}
                    onMouseMove={(event) => handleBarHover(index, event)}
                    onMouseLeave={() => {
                      setHoveredMetricIndex(null);
                      setTooltipPos(null);
                    }}
                  />
                  <text
                    x={groupCenter}
                    y={baseline + 16}
                    textAnchor="middle"
                    className="fill-[#525252] text-[10px]"
                  >
                    {METRIC_BY_ID[row.metricId]?.name ?? row.metricId}
                  </text>
                </g>
              );
            })}

            <text
              x={padding.left + innerWidth / 2}
              y={height - 6}
              textAnchor="middle"
              className="fill-[#737373] text-[9px]"
            >
              Current vs comparison period
            </text>
          </svg>
        </div>

        {hoveredMetricIndex !== null && tooltipPos && rows[hoveredMetricIndex] ? (
          <div
            className="pointer-events-none absolute z-20 min-w-[200px] rounded-md border border-border bg-white px-3 py-2 shadow-md"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <p className="type-label text-text-secondary">
              {METRIC_BY_ID[rows[hoveredMetricIndex].metricId]?.name}
            </p>
            <p className="type-small text-text-primary">
              Current:{" "}
              {formatMetricValue(
                rows[hoveredMetricIndex].metricId,
                rows[hoveredMetricIndex].current,
              )}
            </p>
            <p className="type-small text-text-primary">
              Comparison:{" "}
              {formatMetricValue(
                rows[hoveredMetricIndex].metricId,
                rows[hoveredMetricIndex].comparison,
              )}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3 type-small text-text-secondary">
        <span className="inline-flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: periodLegend.current }}
          />
          Current period
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: periodLegend.comparison }}
          />
          Comparison period
        </span>
      </div>

      {showDataTable ? <ComparisonMetricsTable rows={rows} /> : null}
    </div>
  );
}

function CombinedTimeSeriesTable({
  seriesByMetric,
}: {
  seriesByMetric: Array<{
    metricId: MetricId;
    points: Array<{ date: string; value: number }>;
  }>;
}) {
  const dates = seriesByMetric[0]?.points.map((point) => point.date) ?? [];

  return (
    <div className="max-h-[min(240px,42vh)] max-w-full flex-1 overflow-x-auto overflow-y-auto rounded-md border border-border-subtle">
      <table className="min-w-full border-collapse text-[12px]">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-border text-left">
            <th className="px-2 py-1.5 type-label text-text-tertiary">Date</th>
            {seriesByMetric.map((series) => (
              <th
                key={series.metricId}
                className="px-2 py-1.5 text-right type-label text-text-tertiary"
              >
                {METRIC_BY_ID[series.metricId]?.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dates.map((date, index) => (
            <tr key={date} className="border-b border-border-subtle">
              <td className="px-2 py-1.5 text-text-secondary">{date}</td>
              {seriesByMetric.map((series) => (
                <td
                  key={series.metricId}
                  className="px-2 py-1.5 text-right tabular-nums"
                >
                  {formatMetricValue(
                    series.metricId,
                    series.points[index]?.value ?? 0,
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComparisonMetricsTable({
  rows,
}: {
  rows: Array<{
    metricId: MetricId;
    current: number;
    comparison: number;
    absoluteChange: number;
    percentageChange: number;
  }>;
}) {
  return (
    <div className="max-h-[min(240px,42vh)] max-w-full flex-1 overflow-x-auto overflow-y-auto rounded-md border border-border-subtle">
      <table className="min-w-full border-collapse text-[12px]">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-border text-left">
            <th className="px-2 py-1.5 type-label text-text-tertiary">Metric</th>
            <th className="px-2 py-1.5 text-right type-label text-text-tertiary">
              Current Period
            </th>
            <th className="px-2 py-1.5 text-right type-label text-text-tertiary">
              Comparison Period
            </th>
            <th className="px-2 py-1.5 text-right type-label text-text-tertiary">
              Change
            </th>
            <th className="px-2 py-1.5 text-right type-label text-text-tertiary">
              % Change
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.metricId} className="border-b border-border-subtle">
              <td className="px-2 py-1.5 text-text-primary">
                {METRIC_BY_ID[row.metricId]?.name ?? row.metricId}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                {formatMetricValue(row.metricId, row.current)}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                {formatMetricValue(row.metricId, row.comparison)}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                {formatMetricValue(row.metricId, row.absoluteChange)}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                {formatPercentChange(row.percentageChange)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Legend({
  series,
  compact = false,
}: {
  series: Array<{ metricId: MetricId; color: string }>;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", compact ? "" : "mt-2 gap-3")}>
      {series.map((entry) => (
        <div key={entry.metricId} className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="type-small text-text-secondary">
            {METRIC_BY_ID[entry.metricId]?.name ?? entry.metricId}
          </span>
        </div>
      ))}
    </div>
  );
}

function useConsolidatedPlatformMetricRows() {
  const dashboard = useDashboard();
  const isComparison = dashboard.analyticsMode === "comparison";
  const metricId = dashboard.consolidatedChartMetric;

  const catalogFilters = useMemo(
    () => ({
      brandId: dashboard.brandId,
      category: dashboard.category,
      subcategory: dashboard.subcategory,
      productId: dashboard.productId,
    }),
    [
      dashboard.brandId,
      dashboard.category,
      dashboard.subcategory,
      dashboard.productId,
    ],
  );

  const platformIds = useMemo(
    () => normalizeSelectedPlatformIds(dashboard.consolidatedSelectedPlatformIds),
    [dashboard.consolidatedSelectedPlatformIds],
  );

  const rows = useMemo(() => {
    const aggregation = getMetricAggregationType(metricId);
    return platformIds.map((platformId) => {
      const currentRecords = filterPerformanceRecords(PERFORMANCE_RECORDS, {
        ...catalogFilters,
        platformId,
        dateRange: dashboard.dateRange,
      });
      const current = aggregateMetric(currentRecords, metricId, aggregation);
      if (!isComparison) {
        return { platformId, current, comparison: null as number | null };
      }
      const comparisonRecords = filterPerformanceRecords(PERFORMANCE_RECORDS, {
        ...catalogFilters,
        platformId,
        dateRange: dashboard.comparisonPeriod,
      });
      const comparison = aggregateMetric(
        comparisonRecords,
        metricId,
        aggregation,
      );
      return { platformId, current, comparison };
    });
  }, [
    catalogFilters,
    dashboard.comparisonPeriod,
    dashboard.dateRange,
    isComparison,
    metricId,
    platformIds,
  ]);

  const metricName = METRIC_BY_ID[metricId]?.name ?? metricId;

  return { rows, metricId, metricName, isComparison };
}

export function ConsolidatedPlatformChart() {
  const { rows, metricId, metricName, isComparison } =
    useConsolidatedPlatformMetricRows();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const padding = { top: 16, right: 20, bottom: 52, left: 56 };
  const innerHeight = 200;
  const height = padding.top + innerHeight + padding.bottom;
  const baseline = padding.top + innerHeight;
  const groupCount = Math.max(rows.length, 1);
  const minGroupWidth = isComparison ? 72 : 56;
  const innerWidth = groupCount * minGroupWidth;
  const width = padding.left + padding.right + innerWidth;
  const groupWidth = innerWidth / groupCount;
  const barWidth = isComparison
    ? Math.min(22, groupWidth * 0.18)
    : Math.min(36, groupWidth * 0.42);
  const barGap = 6;

  const maxValue = useMemo(() => {
    let max = 1;
    for (const row of rows) {
      max = Math.max(max, row.current, row.comparison ?? 0);
    }
    return max;
  }, [rows]);

  function handleBarHover(
    index: number,
    event: React.MouseEvent<SVGRectElement>,
  ) {
    setHoveredIndex(index);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({
      x: Math.min(
        event.clientX - rect.left + 8,
        Math.max(8, rect.width - 220),
      ),
      y: Math.max(8, event.clientY - rect.top - 96),
    });
  }

  return (
    <div className="space-y-2">
      <p className="type-label text-text-secondary">
        {metricName} by platform
      </p>
      <div ref={containerRef} className="relative w-full max-w-full min-w-0">
        <div className="max-w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ minWidth: width }}
            className="h-[min(240px,42vh)] w-full max-w-none"
            role="img"
            aria-label="Consolidated platform comparison vertical bar chart"
          >
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={baseline}
              y2={baseline}
              stroke="#E5E5E5"
            />

            {rows.map((row, index) => {
              const groupCenter =
                padding.left + index * groupWidth + groupWidth / 2;
              const currentHeight =
                (row.current / maxValue) * (innerHeight - 12);
              const platformName =
                PLATFORM_BY_ID[row.platformId]?.name ?? row.platformId;

              const platformColor = platformChartColor(row.platformId);

              if (!isComparison) {
                const barX = groupCenter - barWidth / 2;
                return (
                  <g key={row.platformId}>
                    <rect
                      x={barX}
                      y={baseline - currentHeight}
                      width={barWidth}
                      height={currentHeight}
                      fill={platformColor}
                      rx={2}
                      onMouseEnter={(event) => handleBarHover(index, event)}
                      onMouseMove={(event) => handleBarHover(index, event)}
                      onMouseLeave={() => {
                        setHoveredIndex(null);
                        setTooltipPos(null);
                      }}
                    />
                    <text
                      x={groupCenter}
                      y={baseline + 14}
                      textAnchor="middle"
                      className="fill-[#525252] text-[9px]"
                    >
                      {platformName.length > 14
                        ? `${platformName.slice(0, 12)}…`
                        : platformName}
                    </text>
                  </g>
                );
              }

              const comparisonHeight =
                ((row.comparison ?? 0) / maxValue) * (innerHeight - 12);
              const currentX = groupCenter - barWidth - barGap / 2;
              const comparisonX = groupCenter + barGap / 2;
              const periodColors = chartPeriodPair(platformColor);

              return (
                <g key={row.platformId}>
                  <rect
                    x={currentX}
                    y={baseline - currentHeight}
                    width={barWidth}
                    height={currentHeight}
                    fill={periodColors.current}
                    rx={2}
                    onMouseEnter={(event) => handleBarHover(index, event)}
                    onMouseMove={(event) => handleBarHover(index, event)}
                    onMouseLeave={() => {
                      setHoveredIndex(null);
                      setTooltipPos(null);
                    }}
                  />
                  <rect
                    x={comparisonX}
                    y={baseline - comparisonHeight}
                    width={barWidth}
                    height={comparisonHeight}
                    fill={periodColors.comparison}
                    rx={2}
                    onMouseEnter={(event) => handleBarHover(index, event)}
                    onMouseMove={(event) => handleBarHover(index, event)}
                    onMouseLeave={() => {
                      setHoveredIndex(null);
                      setTooltipPos(null);
                    }}
                  />
                  <text
                    x={groupCenter}
                    y={baseline + 14}
                    textAnchor="middle"
                    className="fill-[#525252] text-[9px]"
                  >
                    {platformName.length > 14
                      ? `${platformName.slice(0, 12)}…`
                      : platformName}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {hoveredIndex !== null && tooltipPos && rows[hoveredIndex] ? (
          <div
            className="pointer-events-none absolute z-20 min-w-[200px] rounded-md border border-border bg-white px-3 py-2 shadow-md"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <p className="type-label text-text-secondary">
              {PLATFORM_BY_ID[rows[hoveredIndex].platformId]?.name}
            </p>
            <p className="type-small text-text-primary">
              {metricName}:{" "}
              {formatMetricValue(metricId, rows[hoveredIndex].current)}
            </p>
            {isComparison && rows[hoveredIndex].comparison !== null ? (
              <p className="type-small text-text-primary">
                Comparison:{" "}
                {formatMetricValue(
                  metricId,
                  rows[hoveredIndex].comparison ?? 0,
                )}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {isComparison ? (
        <div className="flex flex-wrap gap-3 type-small text-text-secondary">
          <span className="inline-flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{
                backgroundColor: chartPeriodPair(METRIC_COMPARISON_BASE).current,
              }}
            />
            Current period
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{
                backgroundColor: chartPeriodPair(METRIC_COMPARISON_BASE)
                  .comparison,
              }}
            />
            Comparison period
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function ConsolidatedCombinedDataView() {
  const { rows, metricId, isComparison } = useConsolidatedPlatformMetricRows();

  return (
    <ConsolidatedPlatformTable
      rows={rows}
      metricId={metricId}
      isComparison={isComparison}
    />
  );
}

function ConsolidatedPlatformTable({
  rows,
  metricId,
  isComparison,
}: {
  rows: Array<{
    platformId: PlatformId;
    current: number;
    comparison: number | null;
  }>;
  metricId: MetricId;
  isComparison: boolean;
}) {
  return (
    <div className="max-h-[min(240px,42vh)] max-w-full flex-1 overflow-x-auto overflow-y-auto rounded-md border border-border-subtle">
      <table className="min-w-full border-collapse text-[12px]">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-border text-left">
            <th className="px-2 py-1.5 type-label text-text-tertiary">
              Platform
            </th>
            <th className="px-2 py-1.5 text-right type-label text-text-tertiary">
              Current Period
            </th>
            {isComparison ? (
              <th className="px-2 py-1.5 text-right type-label text-text-tertiary">
                Comparison Period
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.platformId} className="border-b border-border-subtle">
              <td className="px-2 py-1.5 text-text-primary">
                {PLATFORM_BY_ID[row.platformId]?.name ?? row.platformId}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                {formatMetricValue(metricId, row.current)}
              </td>
              {isComparison ? (
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {formatMetricValue(metricId, row.comparison ?? 0)}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
