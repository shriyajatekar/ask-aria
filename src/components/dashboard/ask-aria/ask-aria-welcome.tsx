"use client";

import { useMemo } from "react";

import { ArrowRight } from "lucide-react";

import { useAskAria, useAskAriaDashboardView } from "./ask-aria-context";
import { buildWelcomeStartHerePrompts } from "./ask-aria-prompts";
import { buildWelcomeInsight } from "./ask-aria-welcome-insight";

export function AskAriaWelcomeState() {
  const view = useAskAriaDashboardView();
  const { runProactivePrompt, isSubmitting } = useAskAria();

  const { headline, subline } = useMemo(
    () => buildWelcomeInsight(view),
    [view],
  );
  const starterPrompts = useMemo(
    () => buildWelcomeStartHerePrompts(view),
    [view],
  );

  return (
    <div className="flex flex-col gap-4 py-2 text-left">
      <div>
        <p className="type-body font-medium leading-snug text-text-primary">
          {headline}
        </p>
        <p className="mt-2 type-small text-text-secondary">{subline}</p>
      </div>

      <div>
        <p className="mb-2 type-label text-text-tertiary">Start here</p>
        <ul className="flex flex-col gap-1.5" aria-label="Suggested prompts">
          {starterPrompts.map((prompt) => (
            <li key={prompt}>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => runProactivePrompt(prompt)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-white px-3 py-2.5 text-left type-small text-text-primary transition-colors hover:bg-surface-hover disabled:opacity-60"
              >
                <span className="min-w-0 flex-1">{prompt}</span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-text-tertiary"
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
