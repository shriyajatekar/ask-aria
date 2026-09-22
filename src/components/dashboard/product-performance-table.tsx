"use client";

import { useMemo, useState } from "react";

import { BRAND_BY_ID } from "@/data/brands";
import { PLATFORM_BY_ID } from "@/data/platforms";
import { PRODUCT_BY_ID } from "@/data/products";
import { useDashboard } from "@/contexts/dashboard-context";
import { useDashboardAnalytics } from "@/lib/dashboard/use-dashboard-analytics";
import {
  calculatePercentageChange,
  getTrendDirection,
} from "@/lib/analytics/calculations";
import { aggregateMetric } from "@/lib/analytics/comparisons";
import { formatMetricValue, formatPercentChange } from "@/lib/dashboard/format-metric";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 10;

interface ProductRow {
  productId: string;
  productName: string;
  brandName: string;
  platformName: string;
  revenue: number;
  orders: number;
  unitsSold: number;
  conversionRate: number;
  roas: number;
  stockAvailability: number;
  buyBoxShare: number;
  trend: number;
}

export function ProductPerformanceTable() {
  const dashboard = useDashboard();
  const { currentRecords, comparisonRecords } = useDashboardAnalytics();
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const groupedCurrent = groupRecords(currentRecords);
    const groupedComparison = groupRecords(comparisonRecords);

    return [...groupedCurrent.entries()]
      .map(([productId, records]) => {
        const product = PRODUCT_BY_ID[productId];
        if (!product) return null;
        if (
          dashboard.productSearch &&
          !`${product.name} ${product.sku}`.toLowerCase().includes(
            dashboard.productSearch.toLowerCase(),
          )
        ) {
          return null;
        }

        const revenue = aggregateMetric(records, "revenue", "sum");
        const previousRevenue = aggregateMetric(
          groupedComparison.get(productId) ?? [],
          "revenue",
          "sum",
        );
        const direction = getTrendDirection(revenue, previousRevenue);
        const trend = calculatePercentageChange(revenue, previousRevenue);

        return {
          productId,
          productName: product.name,
          brandName: BRAND_BY_ID[product.brandId]?.name ?? product.brandId,
          platformName: PLATFORM_BY_ID[product.platformId]?.name ?? product.platformId,
          revenue,
          orders: aggregateMetric(records, "orders", "sum"),
          unitsSold: aggregateMetric(records, "units_sold", "sum"),
          conversionRate: aggregateMetric(records, "conversion_rate", "average"),
          roas: aggregateMetric(records, "roas", "average"),
          stockAvailability: aggregateMetric(records, "stock_availability", "average"),
          buyBoxShare: aggregateMetric(records, "buy_box_share", "average"),
          trend: direction === "down" ? -Math.abs(trend) : trend,
        } satisfies ProductRow;
      })
      .filter(Boolean) as ProductRow[];
  }, [comparisonRecords, currentRecords, dashboard.productSearch]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const field = dashboard.productTableSort.field as keyof ProductRow;
      const direction = dashboard.productTableSort.direction === "asc" ? 1 : -1;
      const left = a[field];
      const right = b[field];
      if (typeof left === "number" && typeof right === "number") {
        return (left - right) * direction;
      }
      return String(left).localeCompare(String(right)) * direction;
    });
    return copy;
  }, [dashboard.productTableSort, rows]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(field: keyof ProductRow) {
    dashboard.setProductTableSort({
      field,
      direction:
        dashboard.productTableSort.field === field &&
        dashboard.productTableSort.direction === "desc"
          ? "asc"
          : "desc",
    });
  }

  return (
    <section aria-labelledby="product-table-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="product-table-heading" className="type-h2">
            Product performance
          </h2>
          <p className="type-small text-text-tertiary">
            Dense SKU table with sorting, search and pagination.
          </p>
        </div>
        <Input
          className="max-w-sm"
          placeholder="Search products"
          value={dashboard.productSearch}
          onChange={(event) => {
            dashboard.setProductSearch(event.target.value);
            setPage(1);
          }}
          aria-label="Search products"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-white max-w-full">
        <table className="min-w-[1100px] w-full border-collapse text-[13px]">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-border">
              <SortHeader label="Product" onSort={() => toggleSort("productName")} />
              <SortHeader label="Brand" onSort={() => toggleSort("brandName")} />
              <SortHeader label="Platform" onSort={() => toggleSort("platformName")} />
              <SortHeader label="Revenue" align="right" onSort={() => toggleSort("revenue")} />
              <SortHeader label="Orders" align="right" onSort={() => toggleSort("orders")} />
              <SortHeader label="Units Sold" align="right" onSort={() => toggleSort("unitsSold")} />
              <SortHeader
                label="Conversion Rate"
                align="right"
                onSort={() => toggleSort("conversionRate")}
              />
              <SortHeader label="ROAS" align="right" onSort={() => toggleSort("roas")} />
              <SortHeader
                label="Stock Availability"
                align="right"
                onSort={() => toggleSort("stockAvailability")}
              />
              <SortHeader
                label="Buy Box Share"
                align="right"
                onSort={() => toggleSort("buyBoxShare")}
              />
              <SortHeader label="Trend" align="right" onSort={() => toggleSort("trend")} />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr
                key={row.productId}
                className="border-b border-border-subtle hover:bg-surface-hover"
              >
                <td className="px-4 py-2.5 type-body-medium">{row.productName}</td>
                <td className="px-4 py-2.5 text-text-secondary">{row.brandName}</td>
                <td className="px-4 py-2.5 text-text-secondary">{row.platformName}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {formatMetricValue("revenue", row.revenue)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {formatMetricValue("orders", row.orders)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {formatMetricValue("units_sold", row.unitsSold)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {formatMetricValue("conversion_rate", row.conversionRate)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {formatMetricValue("roas", row.roas)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {formatMetricValue("stock_availability", row.stockAvailability)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {formatMetricValue("buy_box_share", row.buyBoxShare)}
                </td>
                <td
                  className={cn(
                    "px-4 py-2.5 text-right tabular-nums",
                    row.trend >= 0 ? "text-success" : "text-error",
                  )}
                >
                  {formatPercentChange(row.trend)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="type-small text-text-tertiary">
          Showing {(page - 1) * PAGE_SIZE + 1}-
          {Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}

function groupRecords(records: ReturnType<typeof useDashboardAnalytics>["currentRecords"]) {
  const grouped = new Map<string, typeof records>();
  for (const record of records) {
    const bucket = grouped.get(record.productId) ?? [];
    bucket.push(record);
    grouped.set(record.productId, bucket);
  }
  return grouped;
}

function SortHeader({
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
        className="type-label text-text-tertiary hover:text-text-primary"
        onClick={onSort}
      >
        {label}
      </button>
    </th>
  );
}
