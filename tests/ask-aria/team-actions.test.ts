import { describe, expect, it } from "vitest";

import { mockExecuteAction } from "@/components/dashboard/ask-aria/ask-aria-actions";
import { parseWhen } from "@/components/dashboard/ask-aria/ask-aria-collab-actions";
import { principlesForMessage } from "@/components/dashboard/ask-aria/ask-aria-principles";
import type { AskAriaMessage } from "@/components/dashboard/ask-aria/ask-aria-types";

import { ask, converse } from "./helpers";

function preview(reply: AskAriaMessage) {
  if (reply.kind !== "action_preview") throw new Error(`expected preview, got ${reply.kind}`);
  return reply.draft;
}

describe("team actions", () => {
  it("posts the latest finding to Slack, with its source", () => {
    const [, post] = converse("ANALYST", ["Why did ROAS drop on Amazon?", "Share this on Slack in #growth"]);
    const draft = preview(post.reply[0]);
    expect(draft.type).toBe("share_slack");
    expect(draft.collab?.target).toBe("#growth");
    expect(draft.collab?.bodyLines[0]).toMatch(/^ROAS on Amazon fell/);
    expect(draft.collab?.bodyLines.join(" ")).toMatch(/Source: Synthetic demo data/);
    expect(principlesForMessage(post.reply[0])).toContain("confirm_before_action");
  });

  it("posts to Teams when asked", () => {
    const draft = preview(ask("CXO", "Post this to Teams").reply[0]);
    expect(draft.collab?.tool).toBe("Microsoft Teams");
  });

  it("books a client review for a KAM, with the time asked for", () => {
    const [, invite] = converse("KAM", [
      "Which brands need attention?",
      "Schedule a review with the client tomorrow at 3pm",
    ]);
    const draft = preview(invite.reply[0]);
    expect(draft.type).toBe("calendar_invite");
    expect(draft.collab?.target).toMatch(/Client account/);
    expect(draft.collab?.when).toBe("Tomorrow · 3:00 PM (30 min)");
    expect(draft.collab?.title).toMatch(/^Review: /);
  });

  it("creates a Jira task with an assignee, or Asana when named", () => {
    const [, task] = converse("ANALYST", [
      "Run a root-cause analysis for ROAS on Amazon",
      "Create a Jira task and assign it to Raghav by Friday",
    ]);
    const draft = preview(task.reply[0]);
    expect(draft.type).toBe("create_task");
    expect(draft.collab?.tool).toBe("Jira");
    expect(draft.collab?.target).toBe("Raghav");
    expect(draft.collab?.when).toMatch(/^Due friday/i);
    expect(draft.collab?.bodyLines.join(" ")).toMatch(/drives/);
    expect(preview(ask("ANALYST", "Add an Asana task for this").reply[0]).collab?.tool).toBe("Asana");
  });

  it("schedules a weekly digest built from the real alerts", () => {
    const draft = preview(ask("CXO", "Send me a weekly digest").reply[0]);
    expect(draft.type).toBe("weekly_digest");
    expect(draft.collab?.when).toBe("Every Monday · 9:00 AM");
    expect(draft.collab?.bodyLines.some((l) => l.startsWith("• Alert:"))).toBe(true);
  });

  it("every confirmed team action says it was simulated", () => {
    for (const q of ["Share this on Slack", "Schedule a review call tomorrow", "Create a task for this", "Send me a weekly digest"]) {
      const result = mockExecuteAction(preview(ask("ANALYST", q).reply[0]));
      expect(result.kind).toBe("action_result");
      if (result.kind === "action_result") {
        expect(result.message).toMatch(/^Simulated/);
        expect(result.detailLines?.join(" ")).toMatch(/Demo only/);
      }
    }
  });

  it("leaves other requests alone", () => {
    expect(preview(ask("ANALYST", "Schedule a weekly performance report").reply[0]).type).toBe(
      "schedule_report",
    );
    expect(preview(ask("ANALYST", "Email this to my team").reply[0]).type).toBe("draft_email");
    expect(ask("ANALYST", "Which brands need attention?").intent).not.toBe("action_request");
  });

  it("parses common times", () => {
    expect(parseWhen("on monday at 10am", "Tomorrow · 11:00 AM")).toBe("Monday · 10:00 AM");
    expect(parseWhen("no time here", "Tomorrow · 11:00 AM")).toBe("Tomorrow · 11:00 AM");
  });
});
