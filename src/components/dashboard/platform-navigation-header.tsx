"use client";

import { PLATFORMS } from "@/data/platforms";
import { cn } from "@/lib/cn";
import type { DashboardPlatform } from "@/contexts/dashboard-context";

import { AskAriaTrigger } from "./ask-aria";

export function PlatformNavigationHeader({
  platform,
  onPlatformChange,
}: {
  platform: DashboardPlatform;
  onPlatformChange: (platform: DashboardPlatform) => void;
}) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="flex items-stretch gap-2 px-4 lg:px-6">
        <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain">
          <div
            className="flex h-11 min-w-max flex-nowrap items-center gap-1"
            role="tablist"
            aria-label="Platform navigation"
          >
            <PlatformTab
              label="Consolidated View"
              selected={platform === "all"}
              onClick={() => onPlatformChange("all")}
            />
            {PLATFORMS.map((entry) => (
              <PlatformTab
                key={entry.id}
                label={entry.name}
                selected={platform === entry.id}
                onClick={() => onPlatformChange(entry.id)}
              />
            ))}
          </div>
        </div>
        <div className="relative z-[1] flex shrink-0 items-center border-l border-border-subtle pl-3">
          <AskAriaTrigger />
        </div>
      </div>
    </header>
  );
}

function PlatformTab({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1.5 type-label whitespace-nowrap transition-colors",
        selected
          ? "bg-accent-interactive text-white"
          : "text-text-secondary hover:bg-surface-hover",
      )}
    >
      {label}
    </button>
  );
}
