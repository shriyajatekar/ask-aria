"use client";

import { useCallback, useState, type CSSProperties } from "react";

import { Loader2, Sparkles, X } from "lucide-react";

import { AskAriaMessageList } from "@/components/dashboard/ask-aria/ask-aria-response-cards";
import type { AskAriaMessage } from "@/components/dashboard/ask-aria/ask-aria-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { ShowcaseActionReviewModal } from "./showcase-action-review-modal";
import {
  SHOWCASE_EVIDENCE,
  SHOWCASE_FLIPKART_ROAS,
  SHOWCASE_PERIODS,
  SHOWCASE_SOURCE,
} from "./showcase-data";

const CONTEXT_PROMPTS = [
  "Why did this happen?",
  "Which products are affected?",
  "Compare with Amazon",
  "Show me the biggest opportunity",
] as const;

type ShowcasePhase =
  | "intro"
  | "thinking"
  | "explained"
  | "processing"
  | "completed";

const panelAccentStyle: CSSProperties = {
  ["--showcase-ai" as string]: "#68785D",
  ["--showcase-ai-light" as string]: "#EEF1E9",
};

function buildWhyInsightMessage(): AskAriaMessage {
  const now = Date.now();
  return {
    id: `showcase-insight-${now}`,
    kind: "insight",
    createdAt: now,
    title: "Three factors contributed to the decline.",
    summary:
      "The largest impact came from Buy Box loss on two high-performing SKUs.",
    metrics: SHOWCASE_EVIDENCE.map((row) => ({
      label: row.label,
      value: row.value,
      direction: row.value.startsWith("-") ? "down" : "up",
    })),
    sections: [
      {
        heading: "Periods analyzed",
        lines: [
          `Current period: ${SHOWCASE_PERIODS.currentLong}`,
          `Comparison period: ${SHOWCASE_PERIODS.comparisonLong}`,
        ],
      },
      {
        heading: "Scope",
        lines: ["Platforms analyzed: Flipkart"],
      },
      {
        heading: "What happened",
        lines: SHOWCASE_EVIDENCE.map((row) => `${row.label}: ${row.value}`),
      },
      {
        heading: "Why it happened",
        lines: [
          "Primary driver: Buy Box visibility declined on two high-performing SKUs.",
          "Secondary signal: Conversion rate softened while ad spend increased.",
        ],
      },
    ],
    handoffs: [{ label: "View affected platform", platformId: "flipkart" }],
  };
}

function buildSuccessMessage(): AskAriaMessage {
  const now = Date.now();
  return {
    id: `showcase-success-${now}`,
    kind: "action_result",
    createdAt: now,
    status: "completed",
    message:
      "I've paused 3 keywords and reallocated ₹18,500 toward the selected campaigns.",
    draft: {
      id: "showcase-action-1",
      type: "pause_campaign",
      platformId: "amazon",
      campaignName: "Hair Care",
    },
  };
}

function buildStubReply(text: string): AskAriaMessage {
  return {
    id: `assistant-${Date.now()}`,
    kind: "assistant_text",
    createdAt: Date.now(),
    text,
  };
}

export function ShowcaseAskAriaPanel({
  open,
  onClose,
  onHighlightSource,
  onHandoffPlatform,
}: {
  open: boolean;
  onClose: () => void;
  onHighlightSource: (active: boolean) => void;
  onHandoffPlatform: () => void;
}) {
  const [phase, setPhase] = useState<ShowcasePhase>("intro");
  const [messages, setMessages] = useState<AskAriaMessage[]>([]);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [showRecommendation, setShowRecommendation] = useState(false);

  const handleWhyPrompt = useCallback(() => {
    if (phase === "thinking") return;
    const userMsg: AskAriaMessage = {
      id: `user-${Date.now()}`,
      kind: "user",
      text: "Why did this happen?",
      createdAt: Date.now(),
    };
    setMessages([userMsg]);
    setShowRecommendation(false);
    setPhase("thinking");
    window.setTimeout(() => {
      setMessages([userMsg, buildWhyInsightMessage()]);
      setShowRecommendation(true);
      setPhase("explained");
    }, 650);
  }, [phase]);

  const handleContextPrompt = useCallback(
    (prompt: (typeof CONTEXT_PROMPTS)[number]) => {
      if (prompt === "Why did this happen?") {
        handleWhyPrompt();
        return;
      }
      const userMsg: AskAriaMessage = {
        id: `user-${Date.now()}`,
        kind: "user",
        text: prompt,
        createdAt: Date.now(),
      };
      const replies: Record<string, string> = {
        "Which products are affected?":
          "Two high-performing SKUs lost Buy Box share on Flipkart during the current period.",
        "Compare with Amazon":
          "Flipkart ROAS fell 18% while Amazon ROAS improved 6% in the same comparison window.",
        "Show me the biggest opportunity":
          "Reallocating spend from underperforming keywords to the two high-CVR campaigns offers an estimated +8–12% ROAS lift.",
      };
      setMessages([userMsg, buildStubReply(replies[prompt])]);
      setPhase("explained");
    },
    [handleWhyPrompt],
  );

  const toggleSource = useCallback(() => {
    setSourceOpen((current) => {
      const next = !current;
      onHighlightSource(next);
      return next;
    });
  }, [onHighlightSource]);

  const handleReview = useCallback(() => {
    setReviewOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    setReviewOpen(false);
    setPhase("processing");
    window.setTimeout(() => {
      setMessages((current) => [...current, buildSuccessMessage()]);
      setPhase("completed");
    }, 900);
  }, []);

  if (!open) return null;

  return (
    <>
      <aside
        className={cn(
          "flex w-[min(100%,400px)] shrink-0 flex-col border-l border-border bg-white",
        )}
        style={panelAccentStyle}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border-subtle px-4 py-3">
          <div>
            <p className="flex items-center gap-1.5 type-body-medium text-text-primary">
              <Sparkles className="h-4 w-4 text-[var(--showcase-ai)]" />
              Ask Aria
            </p>
            <p className="type-small text-text-secondary">
              Commerce intelligence copilot
            </p>
          </div>
          <Button
            type="button"
            variant="tertiary"
            size="icon"
            aria-label="Close Ask Aria"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              {phase === "intro" ? (
                <>
                  <p className="type-body text-text-primary">
                    I noticed something worth investigating.
                  </p>
                  <div className="rounded-xl border border-[var(--showcase-ai)]/20 bg-[var(--showcase-ai-light)] px-3 py-3">
                    <p className="type-body text-text-primary">
                      Your Flipkart ROAS dropped 18% compared with the previous
                      period.
                    </p>
                    <div className="mt-3 rounded-lg border border-border/60 bg-white px-3 py-2">
                      <p className="type-label text-text-tertiary">ROAS</p>
                      <p className="mt-1 flex items-baseline gap-2 type-body tabular-nums">
                        <span>₹{SHOWCASE_FLIPKART_ROAS.previous}</span>
                        <span className="text-text-tertiary">→</span>
                        <span className="font-medium">
                          ₹{SHOWCASE_FLIPKART_ROAS.current}
                        </span>
                        <span className="type-small text-error">
                          ↓ {Math.abs(SHOWCASE_FLIPKART_ROAS.changePercent)}%
                        </span>
                      </p>
                      <p className="mt-2 type-small text-text-secondary">
                        Primary driver: {SHOWCASE_FLIPKART_ROAS.driver}
                      </p>
                    </div>
                    <p className="mt-3 type-small text-text-secondary">
                      Based on Flipkart performance data ·{" "}
                      {SHOWCASE_PERIODS.currentLong}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="mt-2"
                      onClick={toggleSource}
                    >
                      View source
                    </Button>
                    {sourceOpen ? (
                      <div className="mt-3 rounded-lg border border-border bg-white px-3 py-2 type-small">
                        <p className="type-label text-text-tertiary">
                          Source data
                        </p>
                        <dl className="mt-2 space-y-1 text-text-secondary">
                          <Row
                            label="Platform"
                            value={SHOWCASE_SOURCE.platform}
                          />
                          <Row label="Period" value={SHOWCASE_SOURCE.period} />
                          <Row label="Metric" value={SHOWCASE_SOURCE.metric} />
                          <Row
                            label="Data points used"
                            value={String(SHOWCASE_SOURCE.dataPoints)}
                          />
                          <Row
                            label="Last updated"
                            value={SHOWCASE_SOURCE.lastUpdated}
                          />
                        </dl>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <p className="type-label text-text-primary">
                      What would you like to know?
                    </p>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {CONTEXT_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => handleContextPrompt(prompt)}
                          className={cn(
                            "rounded-lg border border-border bg-white px-3 py-2 text-left type-small text-text-primary transition-colors",
                            "hover:border-[var(--showcase-ai)]/40 hover:bg-[var(--showcase-ai-light)]/50",
                          )}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              {phase === "thinking" ? (
                <div className="flex items-center gap-2 rounded-md border border-border px-3 py-3 type-small text-text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing Flipkart performance…
                </div>
              ) : null}

              {messages.length > 0 && phase !== "intro" ? (
                <AskAriaMessageList
                  messages={messages}
                  onConfirmAction={() => undefined}
                  onCancelAction={() => undefined}
                  onEditAction={() => undefined}
                  onHandoff={() => onHandoffPlatform()}
                  onProactivePrompt={handleWhyPrompt}
                  onClarificationChoice={() => undefined}
                />
              ) : null}

              {showRecommendation &&
              phase !== "processing" &&
              phase !== "completed" ? (
                <div className="rounded-xl border border-border bg-background-secondary/50 px-3 py-3">
                  <p className="type-label text-text-tertiary">
                    Recommended action
                  </p>
                  <p className="mt-2 type-body text-text-primary">
                    I can pause the underperforming keywords and reallocate
                    budget toward the two high-converting campaigns.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-3 bg-[var(--showcase-ai)] text-white hover:bg-primary-hover"
                    onClick={handleReview}
                  >
                    Review action
                  </Button>
                </div>
              ) : null}

              {phase === "processing" ? (
                <div className="flex items-center gap-2 rounded-md border border-border px-3 py-3 type-small text-text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Executing recommended changes…
                </div>
              ) : null}

              {phase === "completed" ? (
                <ul className="list-none space-y-1 type-small text-text-secondary">
                  <li className="text-success">✓ 3 keywords paused</li>
                  <li className="text-success">✓ Budget reallocated</li>
                  <li className="text-success">✓ Changes synced</li>
                  <li className="pt-2 text-text-primary">
                    ROAS impact will become visible as new performance data
                    arrives.
                  </li>
                </ul>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 border-t border-border-subtle bg-white p-4">
            <textarea
              rows={2}
              readOnly
              placeholder="Ask about your commerce data..."
              className="w-full resize-none rounded-md border border-border-strong bg-white px-3 py-2 type-body text-text-primary placeholder:text-text-disabled"
            />
            <div className="mt-2 flex justify-end">
              <Button type="button" disabled>
                Ask
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <ShowcaseActionReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        onConfirm={handleConfirm}
        onCancel={() => setReviewOpen(false)}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="text-text-primary">{value}</dd>
    </div>
  );
}
