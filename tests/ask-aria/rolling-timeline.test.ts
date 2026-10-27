import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The dataset rolls forward so the dashboard always shows the real last 30
 * days. These tests load the app as if it were opened on 7 different days
 * (one per weekday, since weekends follow the real calendar) and check the
 * dates move while the golden path keeps working.
 */
async function loadOn(isoDay: string) {
  vi.resetModules();
  vi.setSystemTime(new Date(`${isoDay}T12:00:00.000Z`));
  return {
    scenarios: await import("@/data/scenarios"),
    ranges: await import("@/lib/dashboard/date-ranges"),
    helpers: await import("./helpers"),
    golden: await import("@/components/dashboard/ask-aria/ask-aria-golden-path"),
  };
}

const DAYS = ["2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"];

afterEach(() => {
  vi.useRealTimers();
});

describe("rolling timeline", () => {
  it("ends yesterday and opens on the last 30 days", async () => {
    const { scenarios, ranges } = await loadOn("2026-10-27");
    expect(scenarios.PERFORMANCE_DATE_RANGE.end).toBe("2026-10-26");
    const { dateRange, comparisonPeriod } = ranges.getDefaultDashboardRanges();
    expect(dateRange).toEqual({ start: "2026-09-27", end: "2026-10-26" });
    expect(comparisonPeriod.end).toBe("2026-09-26");
  });

  it("keeps the golden path working on every weekday", async () => {
    for (const day of DAYS) {
      const { helpers, golden } = await loadOn(day);
      const analyst = helpers.converse("ANALYST", golden.GOLDEN_PATH.ANALYST.map((s) => s.prompt));
      const rca = analyst[1].reply[0];
      expect(rca.kind, day).toBe("rca");
      if (rca.kind === "rca") expect(rca.summary, day).toMatch(/^Cost per click drives \d+% of the ROAS drop on Amazon/);

      const cxo = helpers.converse("CXO", golden.GOLDEN_PATH.CXO.map((s) => s.prompt));
      const risk = cxo[0].reply[0];
      expect(risk.kind === "insight" && risk.summary, day).toMatch(/^Biggest risk: Amazon Gross Sales fell/);

      const kam = helpers.converse("KAM", golden.GOLDEN_PATH.KAM.slice(0, 2).map((s) => s.prompt));
      expect(kam[0].memory.lastBrandName, day).toBe("Haven Wellness");
    }
  }, 60_000);
});
