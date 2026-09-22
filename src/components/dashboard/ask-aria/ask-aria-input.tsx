"use client";

import { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { useAskAria } from "./ask-aria-context";

export function AskAriaInput() {
  const { inputValue, setInputValue, submitQuestion, isSubmitting } =
    useAskAria();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitQuestion();
  }

  return (
    <div className="border-t border-border-subtle bg-white p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="ask-aria-input" className="sr-only">
          Ask Aria
        </label>
        <textarea
          id="ask-aria-input"
          rows={3}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Ask about your commerce data..."
          disabled={isSubmitting}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submitQuestion();
            }
          }}
          className={cn(
            "w-full resize-y rounded-md border border-border-strong bg-white px-3 py-2",
            "type-body text-text-primary placeholder:text-text-disabled",
            "focus-visible:border-accent-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-interactive/15",
            "disabled:cursor-not-allowed disabled:bg-background-secondary",
          )}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            className="min-h-11 sm:min-h-0"
            disabled={isSubmitting || !inputValue.trim()}
          >
            Ask
          </Button>
        </div>
      </form>
    </div>
  );
}
