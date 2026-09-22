"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

interface RoleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  selected: boolean;
  onSelect: () => void;
}

export function RoleCard({
  title,
  description,
  icon: Icon,
  selected,
  onSelect,
}: RoleCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "w-full rounded-lg border p-5 text-left transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-interactive",
        selected
          ? "border-accent-interactive bg-accent-subtle"
          : "border-border bg-white hover:bg-surface-hover",
      )}
    >
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border",
            selected
              ? "border-accent-interactive bg-white text-accent-interactive"
              : "border-border bg-background-secondary text-text-secondary",
          )}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <span className="space-y-1">
          <span className="block type-body-medium text-text-primary">{title}</span>
          <span className="block type-small text-text-secondary">{description}</span>
        </span>
      </div>
    </button>
  );
}
