"use client";

import { useState } from "react";

import { ChevronDown, ChevronRight, Loader2, LocateFixed, ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PLATFORM_BY_ID } from "@/data/platforms";
import { useAuth } from "@/contexts/auth-provider";
import { useDashboard } from "@/contexts/dashboard-context";
import { cn } from "@/lib/cn";
import {
  FEEDBACK_REASONS,
  loadFeedback,
  saveFeedback,
  type AnswerFeedback,
  type FeedbackReason,
} from "@/lib/ask-aria/feedback";

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
import { evidenceForMessage } from "./ask-aria-evidence";
import { PRINCIPLE_LABELS, principlesForMessage } from "./ask-aria-principles";
import type {
  AskAriaActionDraft,
  AskAriaAnswerSource,
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
  showDesignNotes = false,
}: {
  messages: AskAriaMessage[];
  onConfirmAction: (draft: AskAriaActionDraft) => void;
  onCancelAction: (draft: AskAriaActionDraft) => void;
  onEditAction: (draft: AskAriaActionDraft) => void;
  onHandoff: (handoff: AskAriaHandoff) => void;
  onProactivePrompt: (prompt: string) => void;
  onClarificationChoice: (choice: AskAriaClarificationChoice) => void;
  showDesignNotes?: boolean;
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
    <div
      className="space-y-4 min-w-0"
      role="log"
      aria-live="polite"
      aria-label="Conversation with Ask Aria"
    >
      {visibleMessages.map((message) => (
        <div key={message.id} className="min-w-0 motion-safe:animate-enter">
          <AskAriaMessageCard
            message={message}
            onConfirmAction={onConfirmAction}
            onCancelAction={onCancelAction}
            onEditAction={onEditAction}
            onHandoff={onHandoff}
            onProactivePrompt={onProactivePrompt}
            onClarificationChoice={onClarificationChoice}
          />
          {RATEABLE_KINDS.has(message.kind) ? (
            <div className="flex flex-wrap items-center justify-between gap-x-3">
              <FeedbackBar message={message} />
              <ShowOnDashboardButton message={message} />
            </div>
          ) : null}
          {showDesignNotes ? <DesignNotes message={message} /> : null}
        </div>
      ))}
    </div>
  );
}

const RATEABLE_KINDS = new Set<AskAriaMessage["kind"]>([
  "insight",
  "recommendation",
  "rca",
  "deep_dive",
  "situation",
  "outcome",
]);

function messageTitle(message: AskAriaMessage): string {
  return "title" in message && typeof message.title === "string" ? message.title : message.kind;
}

/**
 * "Show on dashboard": switch the chart to the answer's metric, highlight its
 * platform, and scroll there, so the user can check the answer themselves.
 */
function ShowOnDashboardButton({ message }: { message: AskAriaMessage }) {
  const { showEvidence } = useDashboard();
  const { closePanel } = useAskAria();
  const evidence = evidenceForMessage(message);
  if (!evidence) return null;
  return (
    <button
      type="button"
      onClick={() => {
        showEvidence(evidence);
        // On phones the chat covers the dashboard.
        if (window.matchMedia?.("(max-width: 767px)").matches) closePanel();
      }}
      className="mt-1 inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 type-small text-accent-interactive hover:bg-accent-subtle"
    >
      <LocateFixed className="h-3.5 w-3.5" aria-hidden />
      Show on dashboard
    </button>
  );
}

/** "Was this helpful?" with a one-tap reason when it wasn't. Stored in this browser. */
function FeedbackBar({ message }: { message: AskAriaMessage }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState<AnswerFeedback | undefined>(() =>
    loadFeedback(user?.id).find((f) => f.messageId === message.id),
  );
  const [askingReason, setAskingReason] = useState(false);

  function record(rating: "up" | "down", reason?: FeedbackReason) {
    const entry: AnswerFeedback = {
      messageId: message.id,
      title: messageTitle(message),
      rating,
      reason,
      createdAt: Date.now(),
    };
    if (user?.id) saveFeedback(user.id, entry);
    setSaved(entry);
    setAskingReason(false);
  }

  if (saved && !askingReason) {
    return (
      <p className="mt-1 type-small text-text-tertiary" role="status">
        {saved.rating === "up" ? "Thanks, marked helpful." : `Thanks, noted: ${saved.reason ?? "not helpful"}.`}
      </p>
    );
  }

  return (
    <div className="mt-1">
      <div className="flex items-center gap-1">
        <span className="type-small text-text-tertiary">Was this helpful?</span>
        <button
          type="button"
          onClick={() => record("up")}
          aria-label="Helpful"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
        >
          <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setAskingReason(true)}
          aria-label="Not helpful"
          aria-expanded={askingReason}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
        >
          <ThumbsDown className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      {askingReason ? (
        <ul className="mt-1 flex flex-wrap gap-1.5" aria-label="What was wrong?">
          {FEEDBACK_REASONS.map((reason) => (
            <li key={reason}>
              <button
                type="button"
                onClick={() => record("down", reason)}
                className="rounded-md border border-border px-2 py-1 type-small text-text-primary hover:bg-surface-hover"
              >
                {reason}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function DesignNotes({ message }: { message: AskAriaMessage }) {
  const principles = principlesForMessage(message);
  if (!principles.length) return null;
  return (
    <ul
      className="mt-1.5 flex flex-wrap gap-1"
      aria-label="Design principles shown in this answer"
    >
      {principles.map((principle) => (
        <li
          key={principle}
          className="rounded-sm border border-dashed border-accent-interactive px-1.5 py-0.5 type-small text-text-secondary"
        >
          ✓ {PRINCIPLE_LABELS[principle]}
        </li>
      ))}
    </ul>
  );
}

function SourceLine({ source }: { source?: AskAriaAnswerSource }) {
  if (!source) return null;
  return (
    <p className="mt-3 type-small text-text-tertiary">
      <span className="font-medium text-text-secondary">Source:</span>{" "}
      {source.dataset} · {source.scope} · {source.period}{" "}
      <span className="whitespace-nowrap">vs {source.comparison}</span>
      {source.partial ? <span className="mt-0.5 block text-warning">{source.partial}</span> : null}
    </p>
  );
}

function CaveatNote({ caveat }: { caveat?: string }) {
  if (!caveat) return null;
  return (
    <p
      role="note"
      className="mt-2 rounded-md border-l-2 border-warning bg-background-secondary px-2.5 py-2 type-small text-text-primary"
    >
      {caveat}
    </p>
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

  if (message.kind === "rca") {
    return <RootCauseCard message={message} onHandoff={onHandoff} />;
  }

  if (message.kind === "situation") {
    return <SituationCard message={message} onHandoff={onHandoff} />;
  }

  if (message.kind === "feedback_log") {
    return (
      <div className="rounded-md border border-border px-3 py-3">
        <p className="type-label text-text-tertiary">Feedback</p>
        <p className="mt-2 type-body font-medium leading-snug text-text-primary">{message.summary}</p>
        {message.reasons.length ? (
          <>
            <p className="mt-3 type-label text-text-primary">Why answers missed</p>
            <ul className="mt-1 space-y-0.5 type-small text-text-secondary">
              {message.reasons.map((r) => (
                <li key={r.reason}>{r.reason}: {r.count}</li>
              ))}
            </ul>
          </>
        ) : null}
        <p className="mt-3 type-label text-text-primary">Questions Aria couldn&apos;t answer</p>
        {message.unanswered.length ? (
          <ul className="mt-1 list-disc space-y-0.5 pl-5 type-small text-text-secondary">
            {message.unanswered.map((q) => (
              <li key={q}>“{q}”</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 type-small text-text-secondary">None so far.</p>
        )}
      </div>
    );
  }

  if (message.kind === "outcome") {
    return <OutcomeCard message={message} />;
  }

  if (message.kind === "deep_dive") {
    return <DeepDiveCard message={message} onHandoff={onHandoff} />;
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
    const isClientUpdate =
      draft.emailRecipientGroupId === "client_account";
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
        {draft.bidRisk && draft.bidRisk.level !== "none" ? (
          <div
            role="alert"
            className={cn(
              "mt-3 rounded-md border-l-2 bg-background-secondary px-3 py-2",
              draft.bidRisk.level === "high" ? "border-error" : "border-warning",
            )}
          >
            <p className="type-label text-text-primary">
              {draft.bidRisk.level === "high"
                ? "This bid looks risky right now"
                : "Check the trend before confirming"}
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 type-small text-text-secondary">
              {draft.bidRisk.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            {draft.bidRisk.suggestion ? (
              <p className="mt-1.5 type-small text-text-primary">
                Suggestion: {draft.bidRisk.suggestion}
              </p>
            ) : null}
          </div>
        ) : null}
        {draft.collab?.bodyLines.length ? (
          <div className="mt-3 rounded-md bg-background-secondary px-3 py-2 type-small text-text-secondary whitespace-pre-line">
            {draft.collab.bodyLines.join("\n")}
          </div>
        ) : null}
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
                  onClarificationChoice(
                    isClientUpdate
                      ? {
                          label: "Send this",
                          followUpText:
                            "Confirm send email to the client account",
                        }
                      : {
                          label: "Send to KAM team",
                          followUpText: "Confirm send email to the KAM team",
                        },
                  )
                }
              >
                {isClientUpdate ? "Send this" : "Send"}
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
  // One answer, one primary next step; follow-up questions live below the thread.
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {handoffs.slice(0, 1).map((handoff) => (
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
  // Period & scope now show in the always-visible source line; the
  // "what can I do now" section is replaced by the single next-step button.
  const { accordion: allSections } = splitMetaSections(message.sections);
  const accordion = allSections.filter((section) => section.id !== "next_action");

  return (
    <div className="rounded-md border border-border px-3 py-3">
      <p className="type-label text-text-tertiary">{message.title}</p>
      <CaveatNote caveat={message.caveat} />
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

      <SourceLine source={message.source} />

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

const VERDICT_STYLE = {
  improved: "border border-border text-text-primary",
  worse: "bg-error-subtle text-error",
  no_clear_change: "border border-border text-text-secondary",
  too_early: "border border-dashed border-border-strong text-text-secondary",
} as const;

/** "Did it work?": each tracked change with a before/after verdict. */
function OutcomeCard({ message }: { message: Extract<AskAriaMessage, { kind: "outcome" }> }) {
  return (
    <div className="rounded-md border border-border px-3 py-3">
      <p className="type-label text-text-tertiary">{message.title}</p>
      <p className="mt-2 type-body font-medium leading-snug text-text-primary">{message.summary}</p>
      <ul className="mt-3 space-y-2.5">
        {message.items.map((item) => (
          <li key={item.id} className="rounded-md bg-background-secondary px-2.5 py-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="min-w-0 flex-1 type-small text-text-primary">{item.label}</p>
              <span className={cn("shrink-0 rounded-sm px-1.5 py-0.5 type-small", VERDICT_STYLE[item.verdict])}>
                {item.verdictLabel}
              </span>
            </div>
            <p className="mt-1 type-small tabular-nums text-text-secondary">{item.detail}</p>
          </li>
        ))}
      </ul>
      <CaveatNote caveat={message.caveat} />
    </div>
  );
}

function DeepDiveStep({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="relative pl-7">
      <span
        className="absolute left-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-accent-subtle type-small font-medium text-accent-interactive"
        aria-hidden
      >
        {number}
      </span>
      <h3 className="type-label text-text-primary">{title}</h3>
      <div className="mt-1">{children}</div>
    </li>
  );
}

/**
 * One-click deep dive: five steps in reading order, then actions. Reuses
 * the RCA bars so the "why" and "where" look the same as a single RCA.
 */
function DeepDiveCard({
  message,
  onHandoff,
}: {
  message: Extract<AskAriaMessage, { kind: "deep_dive" }>;
  onHandoff: (handoff: AskAriaHandoff) => void;
}) {
  const { rca } = message;
  const whereRows = [...rca.platforms, ...rca.products];
  return (
    <article className="rounded-md border border-border px-3 py-3" aria-label={message.title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="type-label text-text-tertiary">{message.title}</p>
        <span className="rounded-sm border border-border px-1.5 py-0.5 type-small text-text-secondary">
          {CONFIDENCE_LABEL[rca.confidence]}
        </span>
      </div>
      <CaveatNote caveat={message.caveat} />

      <ol className="mt-3 space-y-4">
        <DeepDiveStep number={1} title="What happened">
          <p className="type-body font-medium leading-snug text-text-primary">{message.summary}</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {message.metrics.map((metric) => (
              <div key={metric.label} className="rounded-md bg-background-secondary px-2 py-1.5">
                <p className="truncate type-small text-text-secondary">{metric.label}</p>
                <p className="type-body-medium tabular-nums text-text-primary">{metric.value}</p>
                <p
                  className={cn(
                    "type-small tabular-nums",
                    metric.direction === "down" ? "text-error" : "text-text-secondary",
                  )}
                >
                  {metric.direction === "up" ? "↑ " : metric.direction === "down" ? "↓ " : ""}
                  {metric.change?.replace(/^[+-]/, "")}
                </p>
              </div>
            ))}
          </div>
        </DeepDiveStep>

        <DeepDiveStep number={2} title="Why">
          <p className="type-small font-mono text-text-secondary">{rca.formula}</p>
          <ul className="mt-1.5 space-y-1.5">
            {rca.drivers.map((driver) => (
              <li key={driver.label}>
                <div className="flex items-baseline justify-between gap-2 type-small">
                  <span className="text-text-primary">{driver.label}</span>
                  <span className="tabular-nums text-text-secondary">
                    {driver.changePct} ·{" "}
                    {driver.role === "offset"
                      ? `offset ${Math.abs(driver.sharePct).toFixed(0)}%`
                      : `${Math.abs(driver.sharePct).toFixed(0)}% of change`}
                  </span>
                </div>
                <ShareBar sharePct={driver.sharePct} role={driver.role} />
              </li>
            ))}
          </ul>
        </DeepDiveStep>

        {whereRows.length ? (
          <DeepDiveStep number={3} title="Where">
            <ul className="space-y-1.5">
              {whereRows.map((row) => (
                <li key={row.label} className="flex items-center gap-2 type-small">
                  <span className="w-36 shrink-0 truncate text-text-primary" title={row.label}>
                    {row.label}
                  </span>
                  <ShareBar sharePct={row.sharePct} role="cause" />
                  <span className="w-9 shrink-0 text-right tabular-nums text-text-secondary">
                    {Math.round(row.sharePct)}%
                  </span>
                </li>
              ))}
            </ul>
          </DeepDiveStep>
        ) : null}

        <DeepDiveStep number={whereRows.length ? 4 : 3} title="Has it happened before?">
          <p className="type-small text-text-secondary">{message.pastLine}</p>
        </DeepDiveStep>

        <DeepDiveStep number={whereRows.length ? 5 : 4} title="What to do">
          <p className="type-small text-text-primary">{message.suggestion}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {message.actions.map((action, index) => (
              <Button
                key={action.label}
                type="button"
                size="sm"
                variant={index === 0 ? "primary" : "secondary"}
                onClick={() => onHandoff(action)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </DeepDiveStep>
      </ol>

      <div className="mt-3 space-y-1">
        {rca.ruledOut.length ? (
          <AccordionBlock panelId={`dd-${message.id}-ruled-out`} title="Ruled out" lines={rca.ruledOut} />
        ) : null}
        <AccordionBlock
          panelId={`dd-${message.id}-confidence`}
          title="How sure is this?"
          lines={[rca.confidenceReason, ...rca.otherSignals]}
        />
      </div>
      <SourceLine source={message.source} />
    </article>
  );
}

/**
 * Situation alert: what's happening, what happened last time, and a
 * suggested next step — in that order, so the reader can act without
 * opening anything else.
 */
function SituationCard({
  message,
  onHandoff,
}: {
  message: Extract<AskAriaMessage, { kind: "situation" }>;
  onHandoff: (handoff: AskAriaHandoff) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-3",
        message.severity === "high" ? "border-error/40" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="type-label text-text-tertiary">Alert · {message.title}</p>
        <span
          className={cn(
            "rounded-sm px-1.5 py-0.5 type-small",
            message.severity === "high"
              ? "bg-error-subtle text-error"
              : "border border-border text-text-secondary",
          )}
        >
          {message.severity === "high" ? "Needs attention" : "Worth watching"}
        </span>
      </div>
      <p className="mt-2 type-body font-medium leading-snug text-text-primary">
        {message.summary}
      </p>
      <dl className="mt-3 space-y-2.5">
        <div>
          <dt className="type-label text-text-primary">Last time</dt>
          <dd className="mt-0.5 type-small text-text-secondary">{message.pastLine}</dd>
        </div>
        <div>
          <dt className="type-label text-text-primary">Suggested next step</dt>
          <dd className="mt-0.5 type-small text-text-secondary">{message.suggestion}</dd>
        </div>
        {message.alsoWatching.length ? (
          <div>
            <dt className="type-label text-text-primary">Also watching</dt>
            <dd className="mt-0.5 type-small text-text-secondary">
              {message.alsoWatching.join(" · ")}
            </dd>
          </div>
        ) : null}
      </dl>
      <SourceLine source={message.source} />
      <HandoffButtons handoffs={message.handoffs} onHandoff={onHandoff} />
    </div>
  );
}

const CONFIDENCE_LABEL = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
} as const;

function ShareBar({
  sharePct,
  role,
}: {
  sharePct: number;
  role: "cause" | "offset" | "minor";
}) {
  const width = Math.min(100, Math.max(2, Math.abs(sharePct)));
  return (
    <div className="h-2 w-full rounded-full bg-background-secondary" aria-hidden>
      <div
        className={cn(
          "h-2 rounded-full motion-safe:transition-[width] motion-safe:duration-500",
          role === "cause" && "bg-accent-interactive",
          role === "minor" && "bg-border-strong",
          role === "offset" && "border border-dashed border-text-tertiary bg-transparent",
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

/**
 * Root-cause analysis: the driver tree as a waterfall (how much each driver
 * explains), then where it happened, then what was ruled out.
 */
function RootCauseCard({
  message,
  onHandoff,
}: {
  message: Extract<AskAriaMessage, { kind: "rca" }>;
  onHandoff: (handoff: AskAriaHandoff) => void;
}) {
  return (
    <div className="rounded-md border border-border px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="type-label text-text-tertiary">{message.title}</p>
        <span className="rounded-sm border border-border px-1.5 py-0.5 type-small text-text-secondary">
          {CONFIDENCE_LABEL[message.confidence]}
        </span>
      </div>
      <CaveatNote caveat={message.caveat} />
      <p className="mt-2 type-body font-medium leading-snug text-text-primary">
        {message.summary}
      </p>
      <p className="mt-1 type-small tabular-nums text-text-secondary">
        {message.totalLine}
      </p>

      <section className="mt-3 rounded-md bg-background-secondary px-2.5 py-2.5" aria-label="Driver tree">
        <p className="type-small font-mono text-text-secondary">{message.formula}</p>
        <ul className="mt-2 space-y-2">
          {message.drivers.map((driver) => (
            <li key={driver.label}>
              <div className="flex items-baseline justify-between gap-2 type-small">
                <span className="text-text-primary">{driver.label}</span>
                <span className="tabular-nums text-text-secondary">
                  {driver.from} → {driver.to} ({driver.changePct})
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <ShareBar sharePct={driver.sharePct} role={driver.role} />
                <span className="w-28 shrink-0 text-right type-small tabular-nums text-text-secondary">
                  {driver.role === "offset"
                    ? `offset ${Math.abs(driver.sharePct).toFixed(0)}%`
                    : `${Math.abs(driver.sharePct).toFixed(0)}% of change`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {message.platforms.length || message.products.length ? (
        <section className="mt-3" aria-label="Where it happened">
          <p className="type-label text-text-primary">Where it happened</p>
          <ul className="mt-1.5 space-y-1.5">
            {[...message.platforms, ...message.products].map((row) => (
              <li key={row.label} className="flex items-center gap-2 type-small">
                <span className="w-40 shrink-0 truncate text-text-primary" title={row.label}>
                  {row.label}
                </span>
                <ShareBar sharePct={row.sharePct} role="cause" />
                <span className="w-10 shrink-0 text-right tabular-nums text-text-secondary">
                  {Math.round(row.sharePct)}%
                </span>
              </li>
            ))}
          </ul>
          {message.products.reduce((total, row) => total + row.sharePct, 0) > 100 ? (
            <p className="mt-1.5 type-small text-text-tertiary">
              Some products moved the other way, so these shares can add up to more than 100%.
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="mt-3 space-y-1">
        {message.ruledOut.length ? (
          <AccordionBlock
            panelId={`rca-${message.id}-ruled-out`}
            title="Ruled out"
            lines={message.ruledOut}
          />
        ) : null}
        {message.otherSignals.length ? (
          <AccordionBlock
            panelId={`rca-${message.id}-signals`}
            title="Also moved"
            lines={message.otherSignals}
          />
        ) : null}
        <AccordionBlock
          panelId={`rca-${message.id}-confidence`}
          title="How sure is this?"
          lines={[message.confidenceReason]}
        />
      </div>

      <SourceLine source={message.source} />
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
      <SourceLine source={message.source} />
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
            title="Next step"
            lines={[message.nextAction]}
          />
        ) : null}
      </div>
      <HandoffButtons handoffs={message.handoffs} onHandoff={onHandoff} />
    </div>
  );
}
