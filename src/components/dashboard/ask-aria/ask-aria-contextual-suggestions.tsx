"use client";

import { useMemo } from "react";

import { useAskAria, useAskAriaDashboardView } from "./ask-aria-context";
import { buildContextualThreadSuggestions } from "./ask-aria-thread-suggestions";
import { PLATFORM_BY_ID } from "@/data/platforms";

export function AskAriaContextualSuggestions({ visible }: { visible?: boolean }) {
  const { messages, runProactivePrompt, isSubmitting } = useAskAria();
  const view = useAskAriaDashboardView();

  const scopeLabel = useMemo(() => {
    if (view.platform !== "all") {
      return PLATFORM_BY_ID[view.platform]?.name ?? "this platform";
    }
    return "this scope";
  }, [view.platform]);

  const suggestions = useMemo(
    () => buildContextualThreadSuggestions(messages, scopeLabel, view),
    [messages, scopeLabel, view],
  );

  const lastIsAssistant =
    messages.length > 0 && messages[messages.length - 1]?.kind !== "user";

  if (!visible || !lastIsAssistant || suggestions.length === 0) return null;

  return (
    <div className="mt-2">
      <p className="mb-1.5 type-label text-text-tertiary">Next steps</p>
      <ul
        className="flex max-w-full flex-wrap gap-1.5 max-md:max-h-24 max-md:overflow-x-auto max-md:flex-nowrap max-md:pb-0.5"
        aria-label="Next steps"
      >
      {suggestions.map((prompt) => (
        <li key={prompt}>
          <button
            type="button"
            disabled={isSubmitting}
            aria-label={`Suggested follow-up: ${prompt}`}
            onClick={() => runProactivePrompt(prompt)}
            className="max-w-full rounded-md border border-border bg-background-secondary px-2 py-1 text-left type-small text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-interactive disabled:opacity-60"
          >
            <span className="line-clamp-2">{prompt}</span>
          </button>
        </li>
      ))}
      </ul>
    </div>
  );
}
