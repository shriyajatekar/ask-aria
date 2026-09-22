"use client";

import { useAskAria } from "./ask-aria-context";

export function AskAriaConnectedToolsLink({
  onOpenCommandCenter,
}: {
  onOpenCommandCenter?: () => void;
}) {
  const { openToolsSheet } = useAskAria();

  return (
    <nav
      className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 type-small text-text-tertiary"
      aria-label="Ask Aria navigation"
    >
      {onOpenCommandCenter ? (
        <button
          type="button"
          onClick={onOpenCommandCenter}
          className="underline-offset-2 hover:text-text-secondary hover:underline"
        >
          Aria
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => openToolsSheet()}
        className="underline-offset-2 hover:text-text-secondary hover:underline"
      >
        Tools
      </button>
      <button
        type="button"
        onClick={() => openToolsSheet("monitoring")}
        className="underline-offset-2 hover:text-text-secondary hover:underline"
      >
        Monitors
      </button>
    </nav>
  );
}
