import { describe, expect, it } from "vitest";

import type { PerformanceRecord } from "@/types/analytics";

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
    // Sessions rose 40% while conversion fell 45%: Gross Sales fell overall,
    // with a large offset.
    const record = (date: string, sessions: number, orders: number, sales: number) =>
      ({
        date,
        platformId: "amazon",
        brandId: "b",
        productId: "p",
        metrics: { sessions, orders, gross_sales: sales, ad_sales: 0, ad_spend: 0, ad_clicks: 0 },
      }) as unknown as PerformanceRecord;
    const previous = [record("2026-01-01", 1000, 100, 10000)];
    const current = [record("2026-01-08", 1400, 77, 7700)];
    const rca = analyzeRootCause("gross_sales", current, previous);
    expect(Math.sign(rca.topDriver!.contribution)).toBe(Math.sign(rca.change));
    for (const d of rca.drivers) expect(Math.abs(d.sharePct)).toBeLessThanOrEqual(100.0001);
    expect(rca.confidenceReason).toMatch(/offset by sessions/);
    expect(rca.confidence).not.toBe("high");
  });
});

import { buildReportDocumentText } from "@/lib/google/report-content";
import { principlesForMessage } from "@/components/dashboard/ask-aria/ask-aria-principles";

import { converse } from "./helpers";

describe("root-cause analysis in the chat", () => {
  it("keeps metric and platform from the previous question", () => {
    const [, rca] = converse("ANALYST", ["Why did ROAS drop on Amazon?", "Run a root-cause analysis"]);
    expect(rca.intent).toBe("root_cause_analysis");
    const reply = rca.reply[0];
    expect(reply.kind).toBe("rca");
    if (reply.kind !== "rca") return;
    expect(reply.rcaMetric).toBe("roas");
    expect(reply.scopeLabel).toBe("Amazon");
    expect(reply.summary).toMatch(/^Cost per click drives \d+% of the ROAS drop on Amazon/);
    expect(reply.source?.scope).toBe("Amazon");
    expect(principlesForMessage(reply)).toEqual(
      expect.arrayContaining(["lead_with_insight", "show_source", "offer_next_step"]),
    );
  });

  it("understands other phrasings", () => {
    for (const q of ["What's driving the drop?", "RCA for gross sales", "root cause of the ROAS change"]) {
      expect(converse("ANALYST", [q])[0].intent).toBe("root_cause_analysis");
    }
    expect(converse("ANALYST", ["Tell me about the arcade"])[0].intent).not.toBe("root_cause_analysis");
  });

  it("exports the RCA as a report with the driver breakdown", () => {
    const turns = converse("ANALYST", [
      "Why did ROAS drop on Amazon?",
      "Run a root-cause analysis",
      "Create an RCA report",
    ]);
    const preview = turns[2].reply[0];
    expect(preview.kind).toBe("action_preview");
    if (preview.kind !== "action_preview") return;
    expect(preview.draft.reportRcaMetric).toBe("roas");
    expect(preview.draft.reportTitle).toBe("Root-cause analysis — ROAS (Amazon)");

    const text = buildReportDocumentText({
      title: preview.draft.reportTitle!,
      platformId: "amazon",
      dateRange,
      comparisonRange: comparisonPeriod,
      rcaMetric: "roas",
    });
    expect(text).toContain("ROAS = Ad sales per click ÷ Cost per click");
    expect(text).toContain("Confidence:");
    // Report % changes now have the right sign (ROAS fell on Amazon).
    expect(text).toMatch(/roas: [\d.]+ \(-\d/);
  });
});
