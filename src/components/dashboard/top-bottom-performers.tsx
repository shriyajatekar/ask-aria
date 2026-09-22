"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { BRAND_BY_ID } from "@/data/brands";
import { PLATFORM_BY_ID } from "@/data/platforms";
import { PRODUCT_BY_ID } from "@/data/products";
import { aggregateMetric } from "@/lib/analytics/comparisons";
import { useDashboardAnalytics } from "@/lib/dashboard/use-dashboard-analytics";
import { formatMetricValue, formatPercentChange } from "@/lib/dashboard/format-metric";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TopBottomPerformers() {
  const [tab, setTab] = useState<"top" | "bottom">("top");
  const { topPerformers, bottomPerformers, currentRecords } = useDashboardAnalytics();
  const rows = tab === "top" ? topPerformers : bottomPerformers;

  const unitsByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const record of currentRecords) {
      map.set(
        record.productId,
        (map.get(record.productId) ?? 0) + record.metrics.units_sold,
      );
    }
    return map;
  }, [currentRecords]);

  const trendByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) {
      const productRecords = currentRecords.filter(
        (record) => record.productId === row.productId,
      );
      map.set(row.productId, aggregateMetric(productRecords, "sales_growth", "average"));
    }
    return map;
  }, [currentRecords, rows]);

  const enriched = useMemo(
    () =>
      rows.map((row) => {
        const product = PRODUCT_BY_ID[row.productId];
        return {
          ...row,
          productName: product?.name ?? row.productId,
          brandName: BRAND_BY_ID[row.brandId]?.name ?? row.brandId,
          platformName: PLATFORM_BY_ID[row.platformId]?.name ?? row.platformId,
          unitsSold: unitsByProduct.get(row.productId) ?? 0,
          trend: trendByProduct.get(row.productId) ?? 0,
        };
      }),
    [rows, trendByProduct, unitsByProduct],
  );

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-3 border-b border-border-subtle p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="type-h3">Top &amp; Bottom Performers</CardTitle>
          <p className="type-small text-text-tertiary">
            Rankings from existing analytics utilities.
          </p>
        </div>
        <div className="inline-flex rounded-md border border-border p-1">
          <Button
            size="sm"
            variant={tab === "top" ? "primary" : "tertiary"}
            onClick={() => setTab("top")}
          >
            Top Performers
          </Button>
          <Button
            size="sm"
            variant={tab === "bottom" ? "primary" : "tertiary"}
            onClick={() => setTab("bottom")}
          >
            Bottom Performers
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-background-secondary">
                <th className="px-4 py-3 text-left type-label text-text-tertiary">Product</th>
                <th className="px-4 py-3 text-left type-label text-text-tertiary">Brand</th>
                <th className="px-4 py-3 text-left type-label text-text-tertiary">Platform</th>
                <th className="px-4 py-3 text-right type-label text-text-tertiary">Sales</th>
                <th className="px-4 py-3 text-right type-label text-text-tertiary">Units</th>
                <th className="px-4 py-3 text-right type-label text-text-tertiary">Conversion</th>
                <th className="px-4 py-3 text-right type-label text-text-tertiary">ROAS</th>
                <th className="px-4 py-3 text-right type-label text-text-tertiary">Trend</th>
              </tr>
            </thead>
            <tbody>
              {enriched.map((row) => (
                <tr
                  key={row.productId}
                  className="border-b border-border-subtle hover:bg-surface-hover"
                >
                  <td className="px-4 py-3 type-body-medium">{row.productName}</td>
                  <td className="px-4 py-3 text-text-secondary">{row.brandName}</td>
                  <td className="px-4 py-3 text-text-secondary">{row.platformName}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatMetricValue("revenue", row.revenue)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatMetricValue("units_sold", row.unitsSold)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatMetricValue("conversion_rate", row.conversionRate)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatMetricValue("roas", row.roas)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 type-label",
                        tab === "top" ? "text-success" : "text-error",
                      )}
                    >
                      {tab === "top" ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      )}
                      {formatPercentChange(row.trend)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
