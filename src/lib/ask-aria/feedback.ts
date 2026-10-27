import { resolveAskAriaStorageScope } from "@/components/dashboard/ask-aria/ask-aria-user-scope";

/**
 * Answer feedback and the "questions Aria couldn't answer" log. Stored per
 * user in this browser only: it shows how feedback would steer improvements,
 * it is not collected anywhere.
 */
export const FEEDBACK_REASONS = [
  "Wrong numbers",
  "Wrong metric or platform",
  "Not what I asked",
  "Too long",
  "Something else",
] as const;
export type FeedbackReason = (typeof FEEDBACK_REASONS)[number];

export interface AnswerFeedback {
  messageId: string;
  /** Answer title, e.g. "Root-cause analysis — ROAS on Amazon". */
  title: string;
  rating: "up" | "down";
  reason?: FeedbackReason;
  createdAt: number;
}

export interface UnansweredQuestion {
  question: string;
  createdAt: number;
}

const MAX_ENTRIES = 100;

const feedbackKey = (userId: string) =>
  `ci-ask-aria-feedback:${resolveAskAriaStorageScope(userId)}`;
const unansweredKey = (userId: string) =>
  `ci-ask-aria-unanswered:${resolveAskAriaStorageScope(userId)}`;

function read<T>(key: string, isValid: (value: unknown) => value is T): T[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter(isValid) : [];
  } catch {
    return [];
  }
}

function write(key: string, values: unknown[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(values.slice(0, MAX_ENTRIES)));
  } catch {
    // Storage blocked: feedback is shown as sent but not kept.
  }
}

const isFeedback = (v: unknown): v is AnswerFeedback =>
  !!v &&
  typeof v === "object" &&
  typeof (v as AnswerFeedback).messageId === "string" &&
  ((v as AnswerFeedback).rating === "up" || (v as AnswerFeedback).rating === "down");

const isUnanswered = (v: unknown): v is UnansweredQuestion =>
  !!v && typeof v === "object" && typeof (v as UnansweredQuestion).question === "string";

export function loadFeedback(userId: string | null | undefined): AnswerFeedback[] {
  return userId ? read(feedbackKey(userId), isFeedback) : [];
}

export function saveFeedback(userId: string, entry: AnswerFeedback): void {
  write(feedbackKey(userId), [
    entry,
    ...loadFeedback(userId).filter((f) => f.messageId !== entry.messageId),
  ]);
}

export function loadUnanswered(userId: string | null | undefined): UnansweredQuestion[] {
  return userId ? read(unansweredKey(userId), isUnanswered) : [];
}

export function logUnanswered(userId: string, question: string): void {
  write(unansweredKey(userId), [
    { question: question.slice(0, 200), createdAt: Date.now() },
    ...loadUnanswered(userId),
  ]);
}

export interface FeedbackSummary {
  helpful: number;
  notHelpful: number;
  reasons: Array<{ reason: FeedbackReason; count: number }>;
  unanswered: string[];
}

export function summariseFeedback(
  feedback: AnswerFeedback[],
  unanswered: UnansweredQuestion[],
): FeedbackSummary {
  const reasons = FEEDBACK_REASONS.map((reason) => ({
    reason,
    count: feedback.filter((f) => f.rating === "down" && f.reason === reason).length,
  }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
  return {
    helpful: feedback.filter((f) => f.rating === "up").length,
    notHelpful: feedback.filter((f) => f.rating === "down").length,
    reasons,
    unanswered: [...new Set(unanswered.map((u) => u.question))].slice(0, 8),
  };
}
