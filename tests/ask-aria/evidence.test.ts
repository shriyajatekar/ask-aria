import { describe, expect, it } from "vitest";

import { evidenceForMessage } from "@/components/dashboard/ask-aria/ask-aria-evidence";

import { ask } from "./helpers";

describe("show on dashboard", () => {
  it("points each analysis answer at its metric and platform", () => {
    const cases: Array<[string, string, string | undefined]> = [
      ["Why did ROAS drop on Amazon?", "roas", "amazon"],
      ["Run a root-cause analysis for ROAS on Amazon", "roas", "amazon"],
      ["Deep dive into Conversion Rate on Flipkart", "conversion_rate", "flipkart"],
      ["Deep dive into Gross Sales", "gross_sales", undefined],
    ];
    for (const [question, metricId, platformId] of cases) {
      const evidence = evidenceForMessage(ask("ANALYST", question).reply[0]);
      expect(evidence, question).toEqual({ metricId, platformId });
    }
  });

  it("offers nothing for replies that aren't analysis", () => {
    expect(evidenceForMessage(ask("ANALYST", "Hello").reply[0])).toBeNull();
  });
});
