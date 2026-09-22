"use client";

import { useDashboard } from "@/contexts/dashboard-context";

import { MetricCardsSection } from "./metric-cards-section";
import {
  ConsolidatedCombinedDataView,
  ConsolidatedPlatformChart,
  IndividualCombinedDataView,
  IndividualPlatformChart,
} from "./metric-trend-chart";

export function MetricTrendsWorkspace() {
  const dashboard = useDashboard();
  const isConsolidated = dashboard.platform === "all";

  if (isConsolidated) {
    return (
      <section
        aria-labelledby="metric-trends-heading"
        className="rounded-lg border border-border bg-white shadow-sm min-w-0 max-w-full"
      >
        <div className="border-b border-border-subtle px-4 py-3">
          <h2 id="metric-trends-heading" className="type-h3">
            Metric Trends
          </h2>
        </div>

        <div className="space-y-3 p-3">
          <MetricCardsSection variant="workspace" />

          <div className="grid min-h-0 gap-4 border-t border-border-subtle pt-3 lg:grid-cols-2">
            <div className="min-w-0">
              <ConsolidatedPlatformChart />
            </div>
            <div className="flex min-w-0 flex-col lg:border-l lg:border-border-subtle lg:pl-4">
              <h3 className="mb-2 type-label font-medium text-text-primary">
                Combined Data View
              </h3>
              <ConsolidatedCombinedDataView />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return <IndividualMetricTrendsWorkspace />;
}

function IndividualMetricTrendsWorkspace() {
  return (
    <section
      aria-labelledby="metric-trends-heading-individual"
      className="rounded-lg border border-border bg-white shadow-sm min-w-0 max-w-full"
    >
      <div className="border-b border-border-subtle px-4 py-3">
        <h2 id="metric-trends-heading-individual" className="type-h3">
          Metric Trends
        </h2>
      </div>

      <div className="space-y-3 p-3">
        <MetricCardsSection variant="workspace" />

        <div className="grid min-h-0 gap-4 border-t border-border-subtle pt-3 lg:grid-cols-2">
          <div className="min-w-0">
            <IndividualPlatformChart />
          </div>
          <div className="flex min-w-0 flex-col lg:border-l lg:border-border-subtle lg:pl-4">
            <h3 className="mb-2 type-label font-medium text-text-primary">
              Combined Data View
            </h3>
            <IndividualCombinedDataView />
          </div>
        </div>
      </div>
    </section>
  );
}
