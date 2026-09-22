"use client";

import { useMemo, useState, type ReactNode } from "react";

import { METRICS } from "@/data/metrics";
import {
  KPI_LIBRARY_LIMIT,
  TREND_METRIC_LIMIT,
  useDashboard,
} from "@/contexts/dashboard-context";
import { getMetricCategoryLabel } from "@/lib/dashboard/format-metric";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import type { MetricId } from "@/types/analytics";

export function MetricSelectorDialog({
  trigger,
}: {
  trigger?: ReactNode;
}) {
  const dashboard = useDashboard();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const filtered = METRICS.filter((metric) => {
      const haystack =
        `${metric.name} ${metric.id} ${metric.description}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    });

    return filtered.reduce<Record<string, typeof METRICS>>(
      (accumulator, metric) => {
        const key = metric.category;
        accumulator[key] = accumulator[key] ?? [];
        accumulator[key].push(metric);
        return accumulator;
      },
      {},
    );
  }, [query]);

  function handleSelect(metricId: MetricId) {
    setLimitMessage(null);

    if (dashboard.selectedMetrics.includes(metricId)) {
      if (dashboard.selectedMetrics.length <= 1) {
        setLimitMessage("At least one KPI must remain in the library.");
        return;
      }
      const nextLibrary = dashboard.selectedMetrics.filter((id) => id !== metricId);
      dashboard.setSelectedMetrics(nextLibrary);
      setOpen(false);
      return;
    }

    if (dashboard.selectedMetrics.length >= KPI_LIBRARY_LIMIT) {
      setLimitMessage(
        `Maximum ${KPI_LIBRARY_LIMIT} KPI slots. Replace an existing metric first.`,
      );
      return;
    }

    dashboard.addSelectedMetric(metricId);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="secondary" size="sm">
            Add metric
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add more metrics</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search metrics"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search metrics"
        />
        {limitMessage ? (
          <p className="type-small text-text-secondary">{limitMessage}</p>
        ) : null}
        <p className="type-small text-text-tertiary">
          Up to {KPI_LIBRARY_LIMIT} KPIs in Frequently Used Metrics. Select up to{" "}
          {TREND_METRIC_LIMIT} KPI cards for Metric Trends.
        </p>
        <div className="max-h-[55vh] overflow-y-auto pr-1">
          {Object.entries(grouped).map(([category, metrics]) => (
            <div key={category} className="mb-5">
              <h3 className="mb-2 type-label text-text-tertiary">
                {getMetricCategoryLabel(category)}
              </h3>
              <div className="space-y-1">
                {metrics.map((metric) => {
                  const selected = dashboard.selectedMetrics.includes(metric.id);
                  return (
                    <button
                      key={metric.id}
                      type="button"
                      onClick={() => handleSelect(metric.id)}
                      className={cn(
                        "w-full rounded-md border px-3 py-2 text-left transition-colors",
                        selected
                          ? "border-accent-interactive bg-accent-subtle"
                          : "border-border hover:bg-surface-hover",
                      )}
                    >
                      <div className="type-body-medium text-text-primary">
                        {metric.name}
                      </div>
                      <div className="type-small text-text-tertiary">
                        {metric.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
