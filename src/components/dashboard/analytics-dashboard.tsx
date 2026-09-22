"use client";

import { MetricTrendsWorkspace } from "./metric-trends-workspace";
import { PlatformPerformanceTable } from "./platform-performance-table";
import { TopBottomPerformers } from "./top-bottom-performers";
import { ProductPerformanceTable } from "./product-performance-table";

export function AnalyticsDashboard() {
  return (
    <div id="analytics" className="min-w-0 space-y-5">
      <MetricTrendsWorkspace />

      <div className="space-y-6">
        <PlatformPerformanceTable />
        <TopBottomPerformers />
        <ProductPerformanceTable />
      </div>
    </div>
  );
}
