"use client";

import { useAskAria } from "./ask-aria-context";
import type { AskAriaActionLogEntry } from "./ask-aria-types";

/** Renders entries loaded for the current session user (see ask-aria-storage action log keys). */

export function AskAriaActionHistory({
  entries,
}: {
  entries: AskAriaActionLogEntry[];
}) {
  const { openToolsSheet } = useAskAria();

  if (!entries.length) return null;

  return (
    <div className="mt-6 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="type-label text-text-tertiary">Recent actions</p>
        <button
          type="button"
          onClick={() => openToolsSheet("monitoring")}
          className="type-label text-text-tertiary underline-offset-2 hover:text-text-secondary hover:underline"
        >
          Monitors
        </button>
      </div>
      <ul className="space-y-1">
        {entries.slice(0, 5).map((entry) => (
          <li
            key={entry.id}
            className="flex items-center justify-between gap-2 rounded-md border border-border-subtle px-2 py-1.5 type-small"
          >
            <span className="text-text-primary">
              {entry.status === "completed" ? "✓" : "○"} {entry.label}
            </span>
            <span className="shrink-0 text-text-tertiary">
              {new Date(entry.timestamp).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
