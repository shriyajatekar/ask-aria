"use client";

import { useState } from "react";

import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/cn";

import { useAskAria } from "./ask-aria-context";
import { ARIA_COMMAND_CENTER_SECTIONS } from "./ask-aria-command-center-data";

const VISIBLE_EXAMPLES = 2;

export function AskAriaCommandCenter({
  onBack,
  className,
}: {
  onBack: () => void;
  className?: string;
}) {
  const { runProactivePrompt, isSubmitting } = useAskAria();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    {},
  );

  return (
    <div className={cn("flex flex-col gap-4 py-1", className)}>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 type-label text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to conversation
      </button>

      <div>
        <p className="type-h3 text-text-primary">Aria</p>
        <p className="type-small text-text-secondary">
          Capabilities for this workspace — pick a prompt to continue in your
          thread.
        </p>
      </div>

      <div className="space-y-3">
        {ARIA_COMMAND_CENTER_SECTIONS.map((section) => {
          const showAll = expandedSections[section.id] === true;
          const visibleExamples = showAll
            ? section.examples
            : section.examples.slice(0, VISIBLE_EXAMPLES);
          const hasMore = section.examples.length > VISIBLE_EXAMPLES;

          return (
            <section
              key={section.id}
              aria-labelledby={`aria-cc-${section.id}`}
              className="rounded-lg border border-border-subtle px-3 py-2.5"
            >
              <h3
                id={`aria-cc-${section.id}`}
                className="type-label font-medium text-text-primary"
              >
                {section.label}
              </h3>
              <p className="mt-1 type-small text-text-secondary">
                {section.description}
              </p>
              <ul className="mt-2 space-y-1">
                {visibleExamples.map((prompt) => (
                  <li key={prompt}>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        onBack();
                        runProactivePrompt(prompt);
                      }}
                      className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-white px-3 py-2 text-left type-small text-text-primary transition-colors hover:bg-surface-hover disabled:opacity-60"
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
              {hasMore ? (
                <button
                  type="button"
                  className="mt-1.5 type-label text-text-tertiary underline-offset-2 hover:text-text-secondary hover:underline"
                  onClick={() =>
                    setExpandedSections((current) => ({
                      ...current,
                      [section.id]: !showAll,
                    }))
                  }
                  aria-expanded={showAll}
                >
                  {showAll ? "Show fewer examples" : "More examples"}
                </button>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
