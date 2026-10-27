import { describe, expect, it } from "vitest";

import { PERFORMANCE_RECORDS } from "@/data/performance";
import { aggregateMetric } from "@/lib/analytics/comparisons";
import { analyzeRootCause, groupContributions } from "@/lib/analytics/root-cause";
import { getDefaultDashboardRanges } from "@/lib/dashboard/date-ranges";
import { filterPerformanceRecords } from "@/lib/dashboard/filter-records";

const { dateRange, comparisonPeriod } = getDefaultDashboardRanges();
const slice = (platformId?: "amazon") => ({
  current: filterPerformanceRecords(PERFORMANCE_RECORDS, { dateRange, platformId }),
  previous: filterPerformanceRecords(PERFORMANCE_RECORDS, {
    dateRange: comparisonPeriod,
    platformId,
  }),
});
const total = (values: Iterable<number>) => [...values].reduce((a, b) => a + b, 0);

describe("root-cause analysis", () => {
  for (const metric of ["gross_sales", "roas"] as const) {
    it(`${metric}: driver contributions add up to the total change`, () => {
      const { current, previous } = slice();
      const rca = analyzeRootCause(metric, current, previous);
      expect(total(rca.drivers.map((d) => d.contribution))).toBeCloseTo(rca.change, 6);
    });

    it(`${metric}: platform and product contributions add up to the total change`, () => {
      const { current, previous } = slice();
      const rca = analyzeRootCause(metric, current, previous);
      for (const key of [(r: { platformId: string }) => r.platformId, (r: { productId: string }) => r.productId]) {
        const parts = groupContributions(metric, current, previous, key as never);
        expect(total(parts.values())).toBeCloseTo(rca.change, 6);
      }
    });

    it(`${metric}: matches the number shown on the dashboard`, () => {
      const { current, previous } = slice();
      const rca = analyzeRootCause(metric, current, previous);
      expect(rca.current).toBeCloseTo(aggregateMetric(current, metric, "sum"), 6);
      expect(rca.previous).toBeCloseTo(aggregateMetric(previous, metric, "sum"), 6);
    });
  }

  it("explains the Amazon ROAS drop with a ranked top driver and a confidence level", () => {
    const { current, previous } = slice("amazon");
    const rca = analyzeRootCause("roas", current, previous);
    expect(rca.changePct).toBeLessThan(-1);
    expect(rca.topDriver).not.toBeNull();
    expect(["high", "medium", "low"]).toContain(rca.confidence);
    expect(rca.confidenceReason.length).toBeGreaterThan(10);
    expect(rca.products.length).toBeGreaterThan(0);
    // Every listed product pushes in the same direction as the change.
    for (const p of rca.products) expect(Math.sign(p.contribution)).toBe(Math.sign(rca.change));
  });

  it("reports low confidence when the change is too small", () => {
    const { current } = slice();
    const rca = analyzeRootCause("gross_sales", current, current);
    expect(rca.confidence).toBe("low");
    expect(rca.change).toBe(0);
  });
});

describe("root-cause wording", () => {
  it("never names a driver that pushed the other way as the cause", () => {
    // All platforms: sessions rose while Gross Sales fell.
    const { current, previous } = slice();
    const rca = analyzeRootCause("gross_sales", current, previous);
    expect(Math.sign(rca.topDriver!.contribution)).toBe(Math.sign(rca.change));
    for (const d of rca.drivers) expect(Math.abs(d.sharePct)).toBeLessThanOrEqual(100.0001);
    expect(rca.confidenceReason).toMatch(/offset by sessions/);
    expect(rca.confidence).not.toBe("high");
  });
});
