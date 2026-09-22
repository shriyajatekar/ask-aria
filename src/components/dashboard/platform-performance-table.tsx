"use client";

import { useMemo } from "react";

import { PLATFORM_BY_ID } from "@/data/platforms";
import { useDashboard } from "@/contexts/dashboard-context";
import { useDashboardAnalytics } from "@/lib/dashboard/use-dashboard-analytics";
import { formatMetricValue, formatPercentChange } from "@/lib/dashboard/format-metric";
import { cn } from "@/lib/cn";
import type { PlatformId } from "@/types/analytics";

export function PlatformPerformanceTable() {
  const dashboard = useDashboard();
  const { platformBreakdown } = useDashboardAnalytics();

  const sorted = useMemo(() => {
    const copy = [...platformBreakdown];
    copy.sort((a, b) => {
      const field = dashboard.platformTableSort.field;
      const direction = dashboard.platformTableSort.direction === "asc" ? 1 : -1;
      const left = a[field as keyof typeof a] as number;
      const right = b[field as keyof typeof b] as number;
      return (left - right) * direction;
    });
    return copy;
  }, [dashboard.platformTableSort, platformBreakdown]);

  function toggleSort(field: string) {
    dashboard.setPlatformTableSort({
      field,
      direction:
        dashboard.platformTableSort.field === field &&
        dashboard.platformTableSort.direction === "desc"
          ? "asc"
          : "desc",
    });
  }

  return (
    <section aria-labelledby="platform-performance-heading" className="space-y-4">
      <div>
        <h2 id="platform-performance-heading" className="type-h2">
          Performance breakdown
        </h2>
        <p className="type-small text-text-tertiary">
          Platform-level revenue, efficiency and growth from synthetic workspace data.
        </p>
      </div>

      <div className="max-w-full overflow-x-auto rounded-lg border border-border bg-white">
        <table className="min-w-full border-collapse text-[13px]">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-border">
              <SortableHeader label="Platform" onSort={() => toggleSort("platformId")} />
              <SortableHeader label="Revenue" align="right" onSort={() => toggleSort("revenue")} />
              <SortableHeader label="Orders" align="right" onSort={() => toggleSort("orders")} />
              <SortableHeader
                label="Conversion"
                align="right"
                onSort={() => toggleSort("conversion")}
              />
              <SortableHeader label="ROAS" align="right" onSort={() => toggleSort("roas")} />
              <SortableHeader label="Growth" align="right" onSort={() => toggleSort("growth")} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const selected = dashboard.platform === row.platformId;
              return (
                <tr
                  key={row.platformId}
                  className={cn(
                    "cursor-pointer border-b border-border-subtle hover:bg-surface-hover",
                    selected && "bg-background-tertiary",
                  )}
                  onClick={() => dashboard.setPlatform(row.platformId as PlatformId)}
                >
                  <td className="px-4 py-3 type-body-medium text-text-primary">
                    {PLATFORM_BY_ID[row.platformId].name}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatMetricValue("revenue", row.revenue)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatMetricValue("orders", row.orders)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatMetricValue("conversion_rate", row.conversion)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatMetricValue("roas", row.roas)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right tabular-nums",
                      row.growth >= 0 ? "text-success" : "text-error",
                    )}
                  >
                    {formatPercentChange(row.growth)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SortableHeader({
  label,
  onSort,
  align = "left",
}: {
  label: string;
  onSort: () => void;
  align?: "left" | "right";
}) {
  return (
    <th className={cn("px-4 py-3", align === "right" && "text-right")}>
      <button
        type="button"
        onClick={onSort}
        className="type-label text-text-tertiary hover:text-text-primary"
      >
        {label}
      </button>
    </th>
  );
}
