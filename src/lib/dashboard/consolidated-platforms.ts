import type { PlatformId } from "@/types/analytics";

import { PLATFORMS, PLATFORM_BY_ID } from "@/data/platforms";

export function getRegistryPlatformIds(): PlatformId[] {
  return PLATFORMS.map((platform) => platform.id);
}

/** Selected IDs in registry order (single source of truth: PLATFORMS). */
export function normalizeSelectedPlatformIds(
  selected: PlatformId[],
): PlatformId[] {
  const selectedSet = new Set(selected);
  return getRegistryPlatformIds().filter((id) => selectedSet.has(id));
}

export function areAllPlatformsSelected(selected: PlatformId[]): boolean {
  return (
    normalizeSelectedPlatformIds(selected).length === PLATFORMS.length
  );
}

export function allPlatformsCheckboxState(
  selected: PlatformId[],
): boolean | "indeterminate" {
  const count = normalizeSelectedPlatformIds(selected).length;
  if (count === 0) return false;
  if (count === PLATFORMS.length) return true;
  return "indeterminate";
}

export function consolidatedPlatformSelectionLabel(
  selected: PlatformId[],
): string {
  const normalized = normalizeSelectedPlatformIds(selected);
  if (normalized.length === PLATFORMS.length) return "All Platforms";
  if (normalized.length === 0) return "Select platforms";
  if (normalized.length === 1) {
    return PLATFORM_BY_ID[normalized[0]]?.name ?? "1 Platform";
  }
  if (normalized.length === 2) {
    return normalized
      .map((id) => PLATFORM_BY_ID[id]?.name ?? id)
      .join(", ");
  }
  if (normalized.length === 3) {
    return "3 Platforms";
  }
  const first = PLATFORM_BY_ID[normalized[0]]?.name ?? normalized[0];
  const second = PLATFORM_BY_ID[normalized[1]]?.name ?? normalized[1];
  const extra = normalized.length - 2;
  return `${first}, ${second} +${extra}`;
}
