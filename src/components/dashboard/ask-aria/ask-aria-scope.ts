import { PLATFORMS } from "@/data/platforms";
import { PLATFORM_BY_ID } from "@/data/platforms";
import { normalizeSelectedPlatformIds } from "@/lib/dashboard/consolidated-platforms";
import type { PlatformId } from "@/types/analytics";

import type { AskAriaIntent } from "./ask-aria-intent";
import { isFollowUpReference } from "./ask-aria-intent";
import type {
  AskAriaActiveAnalysisContext,
  AskAriaFullContext,
  AskAriaInvestigationMemory,
} from "./ask-aria-types";
import { hasActiveInvestigation } from "./ask-aria-intent";

const REGISTRY_PLATFORM_IDS = PLATFORMS.map((platform) => platform.id);

const PLATFORM_NAME_ALIASES: Record<string, PlatformId> = {
  naykaa: "nykaa",
  nyka: "nykaa",
  flipcart: "flipkart",
  "tata cliq": "tata_cliq",
  tatacliq: "tata_cliq",
  indiamart: "indiamart",
  "swiggy instamart": "swiggy_instamart",
  instamart: "swiggy_instamart",
  bigbasket: "bigbasket",
};

export type QueryScopeMode =
  | "single_platform"
  | "multi_platform"
  | "workspace_platforms"
  | "workspace_brands";

export interface ResolvedQueryScope {
  mode: QueryScopeMode;
  platformIds: PlatformId[];
  scopeLabel: string;
  usedDashboardDefault: boolean;
}

function formatRangeLabel(range: { start: string; end: string }): string {
  const format = (value: string) =>
    new Date(`${value}T00:00:00.000Z`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${format(range.start)} → ${format(range.end)}`;
}

export function buildActiveAnalysisContext(
  context: AskAriaFullContext,
  scope: ResolvedQueryScope,
  metricId: import("@/types/analytics").MetricId,
  metricDirection?: "up" | "down" | "flat",
): AskAriaActiveAnalysisContext {
  const platformId =
    scope.mode === "single_platform" && scope.platformIds.length === 1
      ? scope.platformIds[0]
      : scope.platformIds.length > 1
        ? "all"
        : context.platform;

  return {
    metricId,
    platformId,
    platformIds: scope.platformIds.length > 0 ? scope.platformIds : undefined,
    scopeLabel: scope.scopeLabel,
    scopeMode: scope.mode,
    dateRange: context.dateRange,
    comparisonPeriod: context.comparisonPeriod,
    metricDirection,
  };
}

export function platformIdFromScopeLabel(label: string): PlatformId | undefined {
  const normalized = label.trim().toLowerCase();
  if (!normalized || normalized.includes("all platforms")) return undefined;
  if (normalized.includes(",")) return undefined;
  for (const platform of PLATFORMS) {
    if (platform.name.toLowerCase() === normalized) {
      return platform.id;
    }
  }
  return undefined;
}

function inheritsInvestigationScope(
  text: string,
  intent: AskAriaIntent,
): boolean {
  if (intent === "product_analysis") return true;
  if (intent === "metric_follow_up" || intent === "temporal_follow_up") {
    return true;
  }
  if (intent === "historical_pattern" || intent === "recommendation") {
    return true;
  }
  if (intent === "root_cause" && isFollowUpReference(text)) return true;
  return isFollowUpReference(text);
}

function inheritedPlatformIds(
  text: string,
  memory: AskAriaInvestigationMemory,
  intent: AskAriaIntent,
): PlatformId[] | null {
  if (extractPlatformIdsFromText(text).length > 0) return null;
  if (isWorkspacePlatformQuestion(text)) return null;
  if (intent === "brand_analysis" || intent === "platform_analysis") {
    return null;
  }
  if (!hasActiveInvestigation(memory)) return null;
  if (!inheritsInvestigationScope(text, intent)) return null;

  const ctx = memory.activeAnalysisContext;
  if (ctx?.platformIds?.length) return ctx.platformIds;
  const single =
    ctx?.platformId ?? memory.lastPlatform ?? memory.platformId ?? undefined;
  if (single && single !== "all") return [single];
  return null;
}

export function buildPeriodTransparencySection(
  context: AskAriaFullContext,
): import("./ask-aria-types").AskAriaInsightSection {
  return {
    id: "periods_analyzed",
    heading: "Periods analyzed",
    lines: [
      `Current period: ${formatRangeLabel(context.dateRange)}`,
      `Comparison period: ${formatRangeLabel(context.comparisonPeriod)}`,
    ],
  };
}

export function extractPlatformIdsFromText(text: string): PlatformId[] {
  const lower = text.toLowerCase();
  const found = new Set<PlatformId>();

  for (const platform of PLATFORMS) {
    const name = platform.name.toLowerCase();
    if (lower.includes(name)) {
      found.add(platform.id);
    }
    const idSpaced = platform.id.replace(/_/g, " ");
    if (idSpaced !== platform.name.toLowerCase() && lower.includes(idSpaced)) {
      found.add(platform.id);
    }
  }

  for (const [alias, platformId] of Object.entries(PLATFORM_NAME_ALIASES)) {
    if (lower.includes(alias)) {
      found.add(platformId);
    }
  }

  return REGISTRY_PLATFORM_IDS.filter((id) => found.has(id));
}

function isWorkspacePlatformQuestion(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    (lower.includes("which platform") &&
      (lower.includes("growing") ||
        lower.includes("grow") ||
        lower.includes("strongest") ||
        lower.includes("driving") ||
        lower.includes("changed") ||
        lower.includes("most"))) ||
    lower.includes("across platforms") ||
    lower.includes("all platforms")
  );
}

function isCrossPlatformCompare(text: string): boolean {
  const lower = text.toLowerCase();
  if (!lower.includes("compare") && !lower.includes("versus") && !lower.includes(" vs ")) {
    return false;
  }
  return extractPlatformIdsFromText(text).length >= 2;
}

function defaultDashboardPlatformIds(context: AskAriaFullContext): PlatformId[] {
  if (context.platform === "all") {
    return normalizeSelectedPlatformIds(context.consolidatedSelectedPlatformIds);
  }
  return [context.platform];
}

function labelForPlatforms(ids: PlatformId[]): string {
  if (ids.length === 0) return "workspace";
  if (ids.length === 1) {
    return PLATFORM_BY_ID[ids[0]]?.name ?? ids[0];
  }
  if (ids.length === REGISTRY_PLATFORM_IDS.length) {
    return "all platforms";
  }
  return ids
    .map((id) => PLATFORM_BY_ID[id]?.name ?? id)
    .slice(0, 3)
    .join(", ")
    .concat(ids.length > 3 ? ` +${ids.length - 3}` : "");
}

export function resolveQueryScope(
  text: string,
  memory: AskAriaInvestigationMemory,
  context: AskAriaFullContext,
  intent: AskAriaIntent,
): ResolvedQueryScope {
  const explicit = extractPlatformIdsFromText(text);
  const lower = text.toLowerCase();

  if (intent === "brand_analysis") {
    return {
      mode: "workspace_brands",
      platformIds: [],
      scopeLabel: "all brands (workspace)",
      usedDashboardDefault: false,
    };
  }

  if (
    intent === "platform_analysis" ||
    isWorkspacePlatformQuestion(text) ||
    isCrossPlatformCompare(text)
  ) {
    const ids =
      explicit.length >= 2
        ? explicit
        : explicit.length === 1 && isCrossPlatformCompare(text)
          ? explicit
          : REGISTRY_PLATFORM_IDS;
    return {
      mode: explicit.length >= 2 ? "multi_platform" : "workspace_platforms",
      platformIds: ids,
      scopeLabel: labelForPlatforms(ids),
      usedDashboardDefault: false,
    };
  }

  if (explicit.length >= 2) {
    return {
      mode: "multi_platform",
      platformIds: explicit,
      scopeLabel: labelForPlatforms(explicit),
      usedDashboardDefault: false,
    };
  }

  if (explicit.length === 1) {
    return {
      mode: "single_platform",
      platformIds: explicit,
      scopeLabel: labelForPlatforms(explicit),
      usedDashboardDefault: false,
    };
  }

  const inherited = inheritedPlatformIds(text, memory, intent);
  if (inherited?.length) {
    const mode =
      inherited.length === 1
        ? "single_platform"
        : inherited.length === REGISTRY_PLATFORM_IDS.length
          ? "workspace_platforms"
          : "multi_platform";
    return {
      mode,
      platformIds: inherited,
      scopeLabel:
        memory.activeAnalysisContext?.scopeLabel ??
        labelForPlatforms(inherited),
      usedDashboardDefault: false,
    };
  }

  if (
    isFollowUpReference(text) &&
    memory.lastPlatform &&
    memory.lastPlatform !== "all"
  ) {
    return {
      mode: "single_platform",
      platformIds: [memory.lastPlatform],
      scopeLabel: labelForPlatforms([memory.lastPlatform]),
      usedDashboardDefault: false,
    };
  }

  if (
    isFollowUpReference(text) &&
    memory.platformId &&
    memory.platformId !== "all"
  ) {
    return {
      mode: "single_platform",
      platformIds: [memory.platformId],
      scopeLabel: labelForPlatforms([memory.platformId]),
      usedDashboardDefault: false,
    };
  }

  if (lower.includes("on flipkart") || lower.includes("on amazon")) {
    const fromPhrase = extractPlatformIdsFromText(text);
    if (fromPhrase.length === 1) {
      return {
        mode: "single_platform",
        platformIds: fromPhrase,
        scopeLabel: labelForPlatforms(fromPhrase),
        usedDashboardDefault: false,
      };
    }
  }

  const defaults = defaultDashboardPlatformIds(context);
  if (context.platform === "all") {
    return {
      mode: "workspace_platforms",
      platformIds: defaults,
      scopeLabel: labelForPlatforms(defaults),
      usedDashboardDefault: true,
    };
  }

  return {
    mode: "single_platform",
    platformIds: defaults,
    scopeLabel: labelForPlatforms(defaults),
    usedDashboardDefault: true,
  };
}
