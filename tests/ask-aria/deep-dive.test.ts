import { describe, expect, it } from "vitest";

import { DEFAULT_KPI_METRICS } from "@/contexts/dashboard-context";
import { describeSituation, situationsForContext } from "@/components/dashboard/ask-aria/ask-aria-situations";
import { principlesForMessage } from "@/components/dashboard/ask-aria/ask-aria-principles";
import type { AskAriaMessage } from "@/components/dashboard/ask-aria/ask-aria-types";
import { METRIC_BY_ID } from "@/data/metrics";

import { ask, converse, makeContext } from "./helpers";

function deepDive(reply: AskAriaMessage) {
  if (reply.kind !== "deep_dive") throw new Error(`expected deep_dive, got ${reply.kind}`);
  return reply;
}

describe("one-click deep dive", () => {
  it("answers in five steps with sources and three actions", () => {
    const dive = deepDive(ask("ANALYST", "Deep dive into ROAS on Amazon").reply[0]);
    expect(dive.title).toBe("Deep dive — ROAS on Amazon");
    expect(dive.summary).toMatch(/^ROAS on Amazon fell \d+\.\d% to [\d.]+ vs the comparison period\. Cost per click explains \d+% of the move\.$/);
    expect(dive.rca.scopeLabel).toBe("Amazon");
    expect(dive.pastLine.length).toBeGreaterThan(20);
    expect(dive.suggestion).toMatch(/Cost per click rose/);
    expect(dive.actions.map((a) => a.label)).toEqual(["Export report", "Create a task", "Share on Slack"]);
    expect(dive.source?.scope).toBe("Amazon");
    expect(principlesForMessage(dive)).toEqual(
      expect.arrayContaining(["lead_with_insight", "show_source", "offer_next_step"]),
    );
  });

  it("works from every KPI card's one-click prompt", () => {
    for (const metricId of DEFAULT_KPI_METRICS) {
      const name = METRIC_BY_ID[metricId].name;
      for (const prompt of [`Deep dive into ${name}`, `Deep dive into ${name} on Flipkart`]) {
        const dive = deepDive(ask("KAM", prompt).reply[0]);
        expect(dive.summary, prompt).toMatch(/\d/);
        expect(dive.metricLabel, prompt).toBe(name);
      }
    }
  });

  it("keeps the platform and metric of the previous answer", () => {
    const [, dive] = converse("ANALYST", ["Why did ROAS drop on Amazon?", "Deep dive"]);
    const reply = deepDive(dive.reply[0]);
    expect(reply.scopeLabel).toBe("Amazon");
    expect(reply.metricLabel).toBe("ROAS");
  });

  it("uses the dashboard's platform when the question names none", () => {
    const dive = deepDive(
      ask("ANALYST", "Deep dive into Conversion Rate", makeContext({ platform: "amazon" })).reply[0],
    );
    expect(dive.scopeLabel).toBe("Amazon");
  });

  it("does not invent a history for a metric that went up", () => {
    const dive = deepDive(ask("CXO", "Deep dive into Gross Sales on Myntra").reply[0]);
    expect(dive.summary).toMatch(/rose/);
    expect(dive.pastLine).toMatch(/isn't a drop/);
    expect(dive.suggestion).toMatch(/monitor/);
  });

  it("feeds its actions: report and task use the deep dive", () => {
    const turns = converse("ANALYST", [
      "Deep dive into ROAS on Amazon",
      "Create an RCA report",
      "Create a task for this",
    ]);
    const report = turns[1].reply[0];
    expect(report.kind === "action_preview" && report.draft.reportTitle).toBe(
      "Root-cause analysis — ROAS (Amazon)",
    );
    const task = turns[2].reply[0];
    expect(task.kind === "action_preview" && task.draft.collab?.title).toBe(
      "Investigate: Deep dive — ROAS on Amazon",
    );
  });

  it("alert cards and the bell open a deep dive on the same metric and platform", () => {
    const top = describeSituation(situationsForContext(makeContext())[0]);
    const dive = deepDive(ask("ANALYST", top.deepDivePrompt).reply[0]);
    expect(top.title.startsWith(dive.scopeLabel)).toBe(true);
    expect(top.title).toContain(dive.metricLabel);
  });
});
