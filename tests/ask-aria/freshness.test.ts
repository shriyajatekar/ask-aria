import { describe, expect, it } from "vitest";

import { partialDataNote } from "@/components/dashboard/ask-aria/ask-aria-intelligence";
import { PERFORMANCE_RECORDS } from "@/data/performance";
import {
  COMPLETE_THROUGH,
  PERFORMANCE_DATE_RANGE,
  PLATFORM_DATA_THROUGH,
} from "@/data/scenarios";
import { getDefaultDashboardRanges } from "@/lib/dashboard/date-ranges";

import { ask, makeContext } from "./helpers";

describe("data freshness", () => {
  it("has no data for days a platform hasn't reported", () => {
    for (const record of PERFORMANCE_RECORDS) {
      expect(record.date <= PLATFORM_DATA_THROUGH[record.platformId]).toBe(true);
    }
    expect(PLATFORM_DATA_THROUGH.amazon).toBe(PERFORMANCE_DATE_RANGE.end);
    expect(PLATFORM_DATA_THROUGH.tata_cliq < PERFORMANCE_DATE_RANGE.end).toBe(true);
  });

  it("opens on a period every platform has fully reported", () => {
    expect(getDefaultDashboardRanges().dateRange.end).toBe(COMPLETE_THROUGH);
    expect(partialDataNote("all platforms", COMPLETE_THROUGH)).toBeUndefined();
  });

  it("warns when a period runs past what a platform has reported", () => {
    const note = partialDataNote("all platforms", PERFORMANCE_DATE_RANGE.end);
    expect(note).toMatch(/^Partial data: .*Tata CLiQ, IndiaMART through/);
    expect(partialDataNote("Amazon", PERFORMANCE_DATE_RANGE.end)).toBeUndefined();
  });

  it("shows the warning on answers about an incomplete period", () => {
    const context = makeContext({ dateRange: { start: COMPLETE_THROUGH, end: PERFORMANCE_DATE_RANGE.end } });
    const reply = ask("ANALYST", "Why did Gross Sales change?", context).reply[0];
    expect(reply.kind === "insight" && reply.source?.partial).toMatch(/^Partial data/);
  });

  it("'yesterday' means yesterday for a platform that reports daily, the latest full day otherwise", () => {
    const amazon = ask("ANALYST", "What about yesterday on Amazon?").reply[0];
    expect(amazon.kind === "insight" && amazon.title).toMatch(/^Yesterday — /);
    const all = ask("ANALYST", "What happened yesterday?").reply[0];
    expect(all.kind === "insight" && all.title).toMatch(/^Latest full day — .*some platforms report later/);
  });
});
