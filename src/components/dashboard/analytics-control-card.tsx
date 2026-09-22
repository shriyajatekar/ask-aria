"use client";

import { useState } from "react";

import { ChevronDown } from "lucide-react";

import { useDashboard } from "@/contexts/dashboard-context";
import { PERFORMANCE_DATE_RANGE } from "@/data/scenarios";
import { BRANDS } from "@/data/brands";
import { PRODUCTS } from "@/data/products";
import { PLATFORMS } from "@/data/platforms";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";
import {
  allPlatformsCheckboxState,
  consolidatedPlatformSelectionLabel,
  normalizeSelectedPlatformIds,
} from "@/lib/dashboard/consolidated-platforms";
import type { DateRange, PlatformId } from "@/types/analytics";

import { DashboardFiltersDialog } from "./dashboard-filters";

function formatRangeLabel(range: DateRange): string {
  const format = (value: string) =>
    new Date(`${value}T00:00:00.000Z`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${format(range.start)} → ${format(range.end)}`;
}

export function AnalyticsControlCard() {
  const dashboard = useDashboard();
  const isComparison = dashboard.analyticsMode === "comparison";

  const filterSummary = [
    dashboard.brandId
      ? BRANDS.find((brand) => brand.id === dashboard.brandId)?.name
      : "All brands",
    dashboard.category ?? "All categories",
    dashboard.subcategory ?? "All sub-categories",
    dashboard.productId
      ? PRODUCTS.find((product) => product.id === dashboard.productId)?.name
      : "All products",
  ].join(" · ");

  return (
    <section
      aria-label="Analytics controls"
      className="rounded-lg border border-border bg-white px-4 py-3 shadow-sm"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-nowrap lg:items-center lg:gap-x-4 lg:gap-y-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3 lg:flex-nowrap">
        <div className="flex shrink-0 gap-2">
          <ModeToggle
            label="Summary"
            active={dashboard.analyticsMode === "summary"}
            onClick={() => dashboard.setAnalyticsMode("summary")}
          />
          <ModeToggle
            label="Comparison"
            active={isComparison}
            onClick={() => dashboard.setAnalyticsMode("comparison")}
          />
        </div>

        <DateRangeControl
          label="Current Period"
          range={dashboard.dateRange}
          onApply={dashboard.setDateRange}
        />

        {isComparison ? (
          <>
            <span className="type-label text-text-tertiary">VS</span>
            <DateRangeControl
              label="Comparison Period"
              range={dashboard.comparisonPeriod}
              onApply={dashboard.setComparisonPeriod}
            />
          </>
        ) : null}

        {dashboard.platform === "all" ? (
          <ConsolidatedPlatformMultiSelect
            selectedPlatformIds={dashboard.consolidatedSelectedPlatformIds}
            onTogglePlatform={dashboard.toggleConsolidatedPlatform}
            onSelectAllPlatforms={dashboard.setConsolidatedAllPlatforms}
          />
        ) : null}

        </div>

        <div className="shrink-0 lg:ml-auto">
          <DashboardFiltersDialog />
        </div>
      </div>

      <p className="mt-2 min-w-0 truncate type-small text-text-secondary">
        {filterSummary}
      </p>
    </section>
  );
}

function ConsolidatedPlatformMultiSelect({
  selectedPlatformIds,
  onTogglePlatform,
  onSelectAllPlatforms,
}: {
  selectedPlatformIds: PlatformId[];
  onTogglePlatform: (platformId: PlatformId) => void;
  onSelectAllPlatforms: (selectAll: boolean) => void;
}) {
  const normalized = normalizeSelectedPlatformIds(selectedPlatformIds);
  const allState = allPlatformsCheckboxState(normalized);
  const triggerLabel = consolidatedPlatformSelectionLabel(normalized);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 type-label text-text-tertiary">Platform</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex h-8 max-w-[11rem] items-center gap-1 truncate rounded-md border border-border bg-background-secondary px-3 type-small text-text-primary hover:bg-surface-hover"
            aria-label="Select platforms for consolidated view"
          >
            <span className="truncate">{triggerLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-[min(20rem,70vh)] w-52 overflow-y-auto"
        >
          <DropdownMenuCheckboxItem
            checked={allState}
            onCheckedChange={(checked) => {
              if (checked === true) onSelectAllPlatforms(true);
            }}
            onSelect={(event) => event.preventDefault()}
          >
            All Platforms
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {PLATFORMS.map((platform) => (
            <DropdownMenuCheckboxItem
              key={platform.id}
              checked={normalized.includes(platform.id)}
              onCheckedChange={() => onTogglePlatform(platform.id)}
              onSelect={(event) => event.preventDefault()}
            >
              {platform.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ModeToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 type-label transition-colors",
        active
          ? "bg-accent-interactive text-white"
          : "border border-border text-text-secondary hover:bg-surface-hover",
      )}
    >
      {label}
    </button>
  );
}

function DateRangeControl({
  label,
  range,
  onApply,
}: {
  label: string;
  range: DateRange;
  onApply: (range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(range.start);
  const [draftEnd, setDraftEnd] = useState(range.end);

  function openEditor() {
    setDraftStart(range.start);
    setDraftEnd(range.end);
    setOpen(true);
  }

  function applyRange() {
    if (!draftStart || !draftEnd) return;
    const start = draftStart <= draftEnd ? draftStart : draftEnd;
    const end = draftStart <= draftEnd ? draftEnd : draftStart;
    onApply({ start, end });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 type-label text-text-tertiary">{label}</span>
        <DialogTrigger asChild>
          <button
            type="button"
            onClick={openEditor}
            className="flex h-8 max-w-full items-center truncate rounded-md border border-border bg-background-secondary px-3 type-small tabular-nums text-text-primary transition-colors hover:bg-surface-hover"
          >
            {formatRangeLabel(range)}
          </button>
        </DialogTrigger>
      </div>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="type-label text-text-tertiary">Start date</span>
            <input
              type="date"
              className="h-9 w-full rounded-md border border-border px-2 text-[13px]"
              min={PERFORMANCE_DATE_RANGE.start}
              max={PERFORMANCE_DATE_RANGE.end}
              value={draftStart}
              onChange={(event) => setDraftStart(event.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="type-label text-text-tertiary">End date</span>
            <input
              type="date"
              className="h-9 w-full rounded-md border border-border px-2 text-[13px]"
              min={PERFORMANCE_DATE_RANGE.start}
              max={PERFORMANCE_DATE_RANGE.end}
              value={draftEnd}
              onChange={(event) => setDraftEnd(event.target.value)}
            />
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={applyRange}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
