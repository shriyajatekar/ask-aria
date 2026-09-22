"use client";

import { cn } from "@/lib/cn";

import { useAskAria } from "./ask-aria-context";

export function AskAriaTrigger({ compact = false }: { compact?: boolean }) {
  const { togglePanel, open } = useAskAria();

  return (
    <button
      type="button"
      onClick={togglePanel}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls="ask-aria-panel"
      className={cn(
        "relative z-[60] inline-flex shrink-0 items-center justify-center border bg-surface shadow-sm transition-colors hover:bg-surface-hover",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-interactive",
        open
          ? "border-accent-primary/50 bg-accent-subtle ring-2 ring-accent-primary/25"
          : "border-border",
        compact
          ? "h-9 w-9 rounded-md"
          : "h-9 gap-2 rounded-[10px] px-2 sm:px-3",
      )}
      aria-label={compact ? "Ask Aria" : undefined}
    >
      <span className="text-[13px] text-text-tertiary" aria-hidden>
        ✦
      </span>
      {!compact ? (
        <span className="hidden type-body-medium text-text-primary sm:inline">
          Ask Aria
        </span>
      ) : null}
    </button>
  );
}
