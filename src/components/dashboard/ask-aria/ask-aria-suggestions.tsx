"use client";

import { useAskAria, useAskAriaDashboardView } from "./ask-aria-context";
import { buildExploreAnotherQuestionPrompts } from "./ask-aria-prompts";

export function AskAriaSuggestions({
  visible = true,
  compact = false,
}: {
  visible?: boolean;
  compact?: boolean;
}) {
  const { setInputValue } = useAskAria();
  const view = useAskAriaDashboardView();

  if (!visible) return null;

  const suggestions = buildExploreAnotherQuestionPrompts(view);

  return (
    <ul
      className={
        compact
          ? "flex flex-wrap gap-1.5"
          : "flex flex-wrap gap-2"
      }
      aria-label="Explore another question"
    >
      {suggestions.map((prompt) => (
        <li key={prompt}>
          <button
            type="button"
            onClick={() => setInputValue(prompt)}
            className={
              compact
                ? "max-w-full min-h-11 rounded-md border border-border bg-background-secondary px-2 py-2 text-left type-small text-text-primary transition-colors hover:bg-surface-hover"
                : "min-h-11 rounded-md border border-border bg-white px-2.5 py-2 text-left type-small text-text-primary transition-colors hover:bg-surface-hover"
            }
          >
            <span className="line-clamp-2">{prompt}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
