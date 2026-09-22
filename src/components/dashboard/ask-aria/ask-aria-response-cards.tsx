"use client";

import { useState } from "react";

import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PLATFORM_BY_ID } from "@/data/platforms";
import { cn } from "@/lib/cn";

import {
  actionPreviewRows,
  actionPreviewTitle,
} from "./ask-aria-actions";
import {
  actionPreviewStatusLabel,
  actionPreviewSubtitle,
  actionResultHeading,
  confirmButtonLabel,
} from "./ask-aria-status";
import { requiresExplicitConfirmation } from "./ask-aria-tool-mapping";
import {
  META_SECTION_IDS,
  normalizeAccordionSections,
  type NormalizedAskAriaInsightSection,
} from "./ask-aria-insight-sections";
import { useAskAria } from "./ask-aria-context";
import type {
  AskAriaActionDraft,
  AskAriaClarificationChoice,
  AskAriaHandoff,
  AskAriaInsightSection,
  AskAriaMessage,
} from "./ask-aria-types";

export function AskAriaMessageList({
  messages,
  onConfirmAction,
  onCancelAction,
  onEditAction,
  onHandoff,
  onProactivePrompt,
  onClarificationChoice,
}: {
  messages: AskAriaMessage[];
  onConfirmAction: (draft: AskAriaActionDraft) => void;
  onCancelAction: (draft: AskAriaActionDraft) => void;
  onEditAction: (draft: AskAriaActionDraft) => void;
  onHandoff: (handoff: AskAriaHandoff) => void;
  onProactivePrompt: (prompt: string) => void;
  onClarificationChoice: (choice: AskAriaClarificationChoice) => void;
}) {
  const { dismissedMonitorAlertIds } = useAskAria();
  const visibleMessages = messages.filter(
    (message) =>
      message.kind !== "monitor_alert" ||
      !dismissedMonitorAlertIds.includes(message.id),
  );

  if (!visibleMessages.length) {
    return (
      <p className="type-small text-text-tertiary">
        Ask about what you&apos;re seeing in the dashboard.
      </p>
    );
  }

  return (
    <div className="space-y-4 min-w-0">
      {visibleMessages.map((message) => (
        <AskAriaMessageCard
          key={message.id}
          message={message}
          onConfirmAction={onConfirmAction}
          onCancelAction={onCancelAction}
          onEditAction={onEditAction}
          onHandoff={onHandoff}
          onProactivePrompt={onProactivePrompt}
          onClarificationChoice={onClarificationChoice}
        />
      ))}
    </div>
  );
}

function AskAriaMessageCard({
  message,
  onConfirmAction,
  onCancelAction,
  onEditAction,
  onHandoff,
  onProactivePrompt,
  onClarificationChoice,
}: {
  message: AskAriaMessage;
  onConfirmAction: (draft: AskAriaActionDraft) => void;
  onCancelAction: (draft: AskAriaActionDraft) => void;
  onEditAction: (draft: AskAriaActionDraft) => void;
  onHandoff: (handoff: AskAriaHandoff) => void;
  onProactivePrompt: (prompt: string) => void;
  onClarificationChoice: (choice: AskAriaClarificationChoice) => void;
}) {
  const { openToolsSheet } = useAskAria();

  if (message.kind === "user") {
    return (
      <div className="min-w-0 rounded-md border border-border bg-background-secondary px-3 py-2">
        <p className="type-label text-text-tertiary">You</p>
        <p className="type-body break-words text-text-primary">{message.text}</p>
      </div>
    );
  }

  if (message.kind === "assistant_text") {
    return (
      <div className="min-w-0 rounded-md border border-border px-3 py-2">
        <p className="type-body break-words text-text-primary">{message.text}</p>
        {message.suggestionChips?.length ? (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Suggestions">
            {message.suggestionChips.map((chip) => (
              <li key={chip.label}>
                <button
                  type="button"
                  onClick={() => onProactivePrompt(chip.prompt)}
                  className="min-h-11 rounded-md border border-border bg-background-secondary px-2 py-2 type-small text-text-primary hover:bg-surface-hover"
                >
                  {chip.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  if (message.kind === "workspace_artifact") {
    const kindLabel =
      message.artifactKind === "sheet" ? "Google Sheets" : "Google Docs";
    return (
      <div className="rounded-md border border-border bg-background-secondary/50 px-3 py-3">
        <p className="type-label text-text-tertiary">{kindLabel}</p>
        <p className="mt-1 type-body font-medium text-text-primary">
          {message.title}
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-3"
          onClick={() =>
            window.open(message.ctaUrl, "_blank", "noopener,noreferrer")
          }
        >
          Open
        </Button>
      </div>
    );
  }

  if (message.kind === "clarification") {
    return (
      <ClarificationCard
        message={message}
        onChoice={onClarificationChoice}
      />
    );
  }

  if (message.kind === "proactive") {
    return (
      <div className="rounded-md border border-border bg-background-secondary px-3 py-3">
        <p className="type-label text-text-tertiary">Proactive insight</p>
        <p className="mt-1 type-body font-medium text-text-primary">
          {message.title}
        </p>
        <p className="mt-1 type-small text-text-secondary">{message.body}</p>
        {message.prompt ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => onProactivePrompt(message.prompt!)}
          >
            Investigate
          </Button>
        ) : null}
      </div>
    );
  }

  if (message.kind === "insight") {
    return (
      <InsightAccordionCard
        message={message}
        onHandoff={onHandoff}
      />
    );
  }

  if (message.kind === "recommendation") {
    return (
      <RecommendationAccordionCard
        message={message}
        onHandoff={onHandoff}
      />
    );
  }

  if (message.kind === "action_preview") {
    const draft = message.draft;
    const blocked = Boolean(draft.validationError);
    const previewRows = actionPreviewRows(draft);
    const needsConfirm = requiresExplicitConfirmation(draft.type);
    const isDraftEmail = draft.type === "draft_email";
    const isSendEmail = draft.type === "send_email";
    const emailBody = draft.emailPreviewLines?.join("\n") ?? "";
    return (
      <div className="rounded-md border border-border px-3 py-3">
        <p className="type-label text-text-tertiary">
          {actionPreviewStatusLabel(draft)}
        </p>
        <p className="mt-1 type-body font-medium text-text-primary">
          {actionPreviewTitle(draft)}
        </p>
        <p className="mt-1 type-small text-text-secondary">
          {actionPreviewSubtitle(draft)}
        </p>
        {draft.emailPreviewLines?.length ? (
          <div className="mt-3 rounded-md bg-background-secondary px-3 py-2 type-small text-text-secondary whitespace-pre-line">
            {draft.emailPreviewLines.join("\n")}
          </div>
        ) : null}
        {blocked ? (
          <p className="mt-2 type-small text-error">{draft.validationError}</p>
        ) : null}
        <dl className="mt-3 space-y-1 type-small text-text-secondary">
          {previewRows.map((row) => (
            <Row key={row.label} label={row.label} value={row.value} />
          ))}
        </dl>
        <div className="mt-3 flex min-w-0 flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="shrink-0"
            onClick={() => onCancelAction(draft)}
          >
            Cancel
          </Button>
          {emailBody ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void navigator.clipboard?.writeText(emailBody)}
            >
              Copy
            </Button>
          ) : null}
          {blocked ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onEditAction(draft)}
            >
              Edit
            </Button>
          ) : isDraftEmail ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onEditAction(draft)}
              >
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  onClarificationChoice({
                    label: "Send to KAM team",
                    followUpText: "Confirm send email to the KAM team",
                  })
                }
              >
                Send
              </Button>
            </>
          ) : isSendEmail ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onEditAction(draft)}
              >
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => onConfirmAction(draft)}
              >
                {confirmButtonLabel(draft)}
              </Button>
            </>
          ) : needsConfirm ? (
            <Button
              type="button"
              size="sm"
              onClick={() => onConfirmAction(draft)}
            >
              {confirmButtonLabel(draft)}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (message.kind === "monitor_alert") {
    return <MonitorAlertCard message={message} />;
  }

  if (message.kind === "action_result") {
    const isSuccess = message.status === "completed";
    const isRunning =
      message.status === "running" ||
      message.status === "executing" ||
      message.status === "scheduled" ||
      message.status === "confirmed";
    const isBlocked =
      message.status === "blocked" || message.status === "failed";

    const heading = actionResultHeading(message.status);

    return (
      <div
        className={cn(
          "rounded-md border px-3 py-3",
          isSuccess && "border-success/30 bg-success/5",
          isBlocked && "border-error/30 bg-error/5",
          isRunning && "border-border bg-background-secondary",
        )}
      >
        <p className="type-label text-text-tertiary">{heading}</p>
        <p className="mt-1 flex items-center gap-2 type-body text-text-primary">
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
          ) : null}
          {message.message}
        </p>
        {message.detailLines?.length ? (
          <ul className="mt-2 list-none space-y-0.5 type-small text-text-secondary">
            {message.detailLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        {isSuccess &&
        message.draft.newBid !== undefined &&
        (message.draft.type === "campaign_bid" ||
          message.draft.type === "schedule_bid_change" ||
          message.draft.type === "update_bid") ? (
          <p className="mt-2 type-small text-text-secondary">
            {message.draft.campaignName ?? message.draft.productName}
            {message.draft.currentBid !== undefined
              ? ` · ₹${message.draft.currentBid} → ₹${message.draft.newBid}`
              : ` · ₹${message.draft.newBid}`}
          </p>
        ) : null}
        {isSuccess && message.ctaLabel ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!message.ctaUrl}
              title={
                message.ctaUrl
                  ? undefined
                  : "Connect Google Workspace to open a real report."
              }
              onClick={() => {
                if (message.ctaUrl) {
                  window.open(message.ctaUrl, "_blank", "noopener,noreferrer");
                }
              }}
            >
              {message.ctaLabel}
            </Button>
            {message.secondaryCtaLabel ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={message.secondaryCtaDisabled ?? !message.ctaUrl}
                title={
                  message.secondaryCtaHint ??
                  (message.ctaUrl
                    ? undefined
                    : "Share is available after a real Doc is created.")
                }
                onClick={() => {
                  if (message.ctaUrl && !message.secondaryCtaDisabled) {
                    void navigator.clipboard?.writeText(message.ctaUrl);
                  }
                }}
              >
                {message.secondaryCtaLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
        {message.status === "blocked" ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => onEditAction(message.draft)}
          >
            Edit action
          </Button>
        ) : null}
        {message.status === "failed" &&
        (message.draft.type === "send_email" ||
          message.draft.type === "generate_report" ||
          message.draft.type === "schedule_report" ||
          message.draft.type === "create_spreadsheet") ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onConfirmAction(message.draft)}
            >
              Try again
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => openToolsSheet("google_workspace")}
            >
              Connect again
            </Button>
          </div>
        ) : null}
        {message.status === "completed" &&
        message.draft.type === "send_email" &&
        !message.ctaUrl ? (
          <p className="mt-2 type-small text-text-secondary">Done</p>
        ) : null}
      </div>
    );
  }

  return null;
}

function MonitorAlertCard({
  message,
}: {
  message: Extract<AskAriaMessage, { kind: "monitor_alert" }>;
}) {
  const { dismissMonitorAlert, runProactivePrompt } = useAskAria();

  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="type-label text-text-tertiary">Monitor alert</p>
        <span className="rounded border border-border px-1 type-label text-text-tertiary">
          Simulated
        </span>
      </div>
      <p className="mt-1 type-body font-medium text-text-primary">
        {message.title}
      </p>
      <ul className="mt-2 list-none space-y-0.5 type-small text-text-secondary">
        {message.bodyLines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div className="mt-3 flex min-w-0 flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="shrink-0"
          onClick={() => runProactivePrompt(message.investigatePrompt)}
        >
          Investigate
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => runProactivePrompt(message.draftEmailPrompt)}
        >
          Draft email
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => dismissMonitorAlert(message.id, message.monitorId)}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-text-tertiary">{label}</dt>
      <dd className="text-right text-text-primary">{value}</dd>
    </div>
  );
}

function ClarificationCard({
  message,
  onChoice,
}: {
  message: Extract<AskAriaMessage, { kind: "clarification" }>;
  onChoice: (choice: AskAriaClarificationChoice) => void;
}) {
  return (
    <div className="rounded-md border border-border bg-background-secondary/60 px-3 py-3">
      <p className="type-label text-text-tertiary">Quick clarification</p>
      <p className="mt-1 type-body font-medium text-text-primary">
        {message.title}
      </p>
      <p className="mt-2 whitespace-pre-line type-small text-text-secondary">
        {message.body}
      </p>
      {message.prompt ? (
        <p className="mt-3 type-label text-text-primary">{message.prompt}</p>
      ) : null}
      {message.choices.length ? (
        <div className="mt-2 space-y-1.5">
          {message.choices.map((choice) => (
            <button
              key={choice.label}
              type="button"
              onClick={() => onChoice(choice)}
              aria-label={`Clarify: ${choice.label}`}
              className="flex w-full min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-white px-3 py-2 text-left transition-colors hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-interactive"
            >
              <span className="type-small text-text-primary">{choice.label}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary" />
            </button>
          ))}
        </div>
      ) : null}
      {message.alternative ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-3"
          onClick={() => onChoice(message.alternative!)}
        >
          {message.alternative.label}
        </Button>
      ) : null}
    </div>
  );
}

function HandoffButtons({
  handoffs,
  onHandoff,
}: {
  handoffs?: AskAriaHandoff[];
  onHandoff: (handoff: AskAriaHandoff) => void;
}) {
  if (!handoffs?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {handoffs.map((handoff) => (
        <Button
          key={`${handoff.label}-${handoff.platformId ?? handoff.productId}`}
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onHandoff(handoff)}
        >
          {handoff.label}
        </Button>
      ))}
    </div>
  );
}

function splitMetaSections(sections: AskAriaInsightSection[]): {
  meta: NormalizedAskAriaInsightSection[];
  accordion: NormalizedAskAriaInsightSection[];
} {
  const normalized = normalizeAccordionSections(sections);
  const meta = normalized.filter((section) =>
    META_SECTION_IDS.has(section.id),
  );
  const accordion = normalized.filter(
    (section) => !META_SECTION_IDS.has(section.id),
  );
  return { meta, accordion };
}

function AccordionBlock({
  title,
  lines,
  defaultOpen = false,
  panelId,
}: {
  title: string;
  lines: string[];
  defaultOpen?: boolean;
  panelId: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-border-subtle pt-2 first:border-t-0 first:pt-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={open}
        aria-controls={panelId}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
        )}
        <span className="type-label text-text-primary">{title}</span>
      </button>
      {open ? (
        <ul
          id={panelId}
          className="mt-1.5 list-disc space-y-0.5 pl-6 type-small text-text-secondary"
        >
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function InsightAccordionCard({
  message,
  onHandoff,
}: {
  message: Extract<AskAriaMessage, { kind: "insight" }>;
  onHandoff: (handoff: AskAriaHandoff) => void;
}) {
  const { meta, accordion } = splitMetaSections(message.sections);

  const metaLines = meta.flatMap((section) => section.lines);

  return (
    <div className="rounded-md border border-border px-3 py-3">
      <p className="type-label text-text-tertiary">{message.title}</p>
      <p className="mt-2 type-body font-medium leading-snug text-text-primary">
        {message.summary}
      </p>

      {message.metrics?.length ? (
        <div className="mt-3 space-y-1 rounded-md bg-background-secondary px-2 py-2">
          {message.metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex items-center justify-between gap-2 type-small"
            >
              <span className="text-text-secondary">{metric.label}</span>
              <span className="tabular-nums text-text-primary">
                {metric.value}
                {metric.change ? (
                  <span
                    className={cn(
                      "ml-2",
                      metric.direction === "down" && "text-error",
                      metric.direction === "up" && "text-success",
                    )}
                  >
                    {metric.change}
                  </span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {metaLines.length ? (
        <div className="mt-3">
          <AccordionBlock
            panelId={`insight-meta-${message.id}`}
            title="Period & scope"
            lines={metaLines}
          />
        </div>
      ) : null}

      <div className="mt-3 space-y-1">
        {accordion.map((section) => (
          <AccordionBlock
            key={section.id}
            panelId={`insight-${message.id}-${section.id}`}
            title={section.heading}
            lines={section.lines}
            defaultOpen={section.id === "what_happened"}
          />
        ))}
      </div>

      <HandoffButtons handoffs={message.handoffs} onHandoff={onHandoff} />
    </div>
  );
}

function RecommendationAccordionCard({
  message,
  onHandoff,
}: {
  message: Extract<AskAriaMessage, { kind: "recommendation" }>;
  onHandoff: (handoff: AskAriaHandoff) => void;
}) {
  return (
    <div className="rounded-md border border-border px-3 py-3">
      <p className="type-label text-text-tertiary">{message.title}</p>
      <p className="mt-2 type-body font-medium leading-snug text-text-primary">
        {message.observation}
      </p>
      <div className="mt-3 space-y-1">
        <AccordionBlock
          panelId={`rec-${message.id}-why`}
          title="Why"
          lines={[message.why]}
        />
        <AccordionBlock
          panelId={`rec-${message.id}-evidence`}
          title="Evidence"
          lines={[message.evidence]}
        />
        <AccordionBlock
          panelId={`rec-${message.id}-rec`}
          title="Recommendation"
          lines={[message.recommendation]}
        />
        {message.expectedConsideration ? (
          <AccordionBlock
            panelId={`rec-${message.id}-consideration`}
            title="Expected consideration"
            lines={[message.expectedConsideration]}
          />
        ) : null}
        {message.nextAction ? (
          <AccordionBlock
            panelId={`rec-${message.id}-next`}
            title="What can I do now?"
            lines={[message.nextAction]}
          />
        ) : null}
      </div>
      <HandoffButtons handoffs={message.handoffs} onHandoff={onHandoff} />
    </div>
  );
}
