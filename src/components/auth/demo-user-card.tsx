"use client";

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/cn";

interface DemoUserCardProps {
  name: string;
  roleLabel: string;
  onSelect: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function DemoUserCard({
  name,
  roleLabel,
  onSelect,
  disabled = false,
  loading = false,
}: DemoUserCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-busy={loading}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3.5 text-left shadow-sm",
        "transition-colors hover:border-accent-primary/50 hover:bg-accent-subtle",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-interactive",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      <span className="min-w-0">
        <span className="block type-body-medium text-text-primary">{name}</span>
        <span className="block type-small text-text-secondary">{roleLabel}</span>
      </span>
      {loading ? (
        <Loader2
          className="h-4 w-4 shrink-0 animate-spin text-accent-interactive"
          aria-hidden
        />
      ) : (
        <span
          className="type-label shrink-0 text-accent-interactive"
          aria-hidden
        >
          Enter
        </span>
      )}
    </button>
  );
}
