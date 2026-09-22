import { METRIC_BY_ID } from "@/data/metrics";
import { PLATFORM_BY_ID } from "@/data/platforms";
import { BRAND_BY_ID } from "@/data/brands";
import { PRODUCT_BY_ID } from "@/data/products";
import type { AnalyticsMode, DashboardPlatform } from "@/contexts/dashboard-context";
import type { DateRangePreset } from "@/lib/dashboard/date-ranges";
import type { UserRole } from "@/lib/auth/types";
import {
  areAllPlatformsSelected,
  consolidatedPlatformSelectionLabel,
  normalizeSelectedPlatformIds,
} from "@/lib/dashboard/consolidated-platforms";
import type { MetricId, PlatformId } from "@/types/analytics";

import { CAPABILITY_EXPLORE_EXAMPLES } from "./ask-aria-capabilities";

export interface AskAriaDashboardView {
  role: UserRole;
  analyticsMode: AnalyticsMode;
  platform: DashboardPlatform;
  focusMetric: MetricId;
  chartMetrics: MetricId[];
  consolidatedChartMetric: MetricId;
  consolidatedSelectedPlatformIds: PlatformId[];
  dateRangePreset: DateRangePreset;
  dateRange: { start: string; end: string };
  comparisonPeriod: { start: string; end: string };
  brandId: string | null;
  category: string | null;
  subcategory: string | null;
  productId: string | null;
}

function metricLabel(metricId: MetricId): string {
  return METRIC_BY_ID[metricId]?.name ?? metricId;
}

function platformLabel(platform: DashboardPlatform): string {
  if (platform === "all") return "Consolidated View";
  return PLATFORM_BY_ID[platform]?.name ?? platform;
}

/** Broader “Explore another question” prompts (spec 05D.29B). */
export const ROLE_EXPLORE_ANOTHER_QUESTION_PROMPTS: Record<UserRole, string[]> = {
  ANALYST: [
    "Why did Gross Sales decline?",
    "Which platform changed the most?",
    "Which products caused the decline?",
    "What should I investigate next?",
  ],
  KAM: [
    "Which brands need attention?",
    "Where are we losing revenue?",
    "Which accounts show growth opportunities?",
    "What should I discuss with the client?",
  ],
  CXO: [
    "How is the business performing?",
    "What changed significantly?",
    "What are our biggest risks?",
    "Where are we growing?",
  ],
};

/** Role-specific “Start here” starters for a fresh Ask Aria session (spec 05D.29A). */
const ROLE_WELCOME_STARTERS: Record<UserRole, string[]> = {
  ANALYST: [
    "Why did ROAS change?",
    "Which platform drove the biggest movement?",
    "What changed significantly?",
    "Show me the biggest performance anomalies.",
  ],
  KAM: [
    "Which accounts need attention?",
    "What changed significantly for my key platforms?",
    "Which products are affecting account performance?",
    "Draft an update for the KAM team.",
  ],
  CXO: [
    "How is the business performing?",
    "What changed significantly?",
    "What are our biggest risks?",
    "Where are we growing?",
  ],
};

const ANALYST_PROMPTS = {
  consolidated: [
    "Why did Gross Sales decline?",
    "Which platform changed the most?",
    "Which products caused the decline?",
    "What should I investigate next?",
    "What happened yesterday?",
    "Show me unusual changes.",
    "Which campaigns need attention?",
    "What caused the conversion drop?",
  ],
  platform: [
    "Why did this metric change?",
    "Which products are affecting performance?",
    "What should I investigate next?",
    "What happened yesterday?",
    "Which platform is underperforming?",
    "Set Campaign X bid to ₹14 tonight at 11:50 PM.",
    "Draft an email to the KAM team with this insight",
  ],
};

const KAM_PROMPTS = {
  consolidated: [
    "Which brands need attention?",
    "Where are we losing revenue?",
    "Which accounts show growth opportunities?",
    "What should I discuss with the client?",
    "What changed this week?",
    "Which accounts are underperforming?",
    "What should I investigate before my client meeting?",
  ],
  platform: [
    "Where are we losing sales on this platform?",
    "Which products are growing?",
    "What opportunities should I discuss with the client?",
    "What are the biggest account risks?",
    "What changed this period?",
    "Is this platform creating an account opportunity?",
    "Email leadership a summary of this platform",
  ],
};

const CXO_PROMPTS = {
  consolidated: [
    "How is the business performing?",
    "What changed significantly?",
    "What are our biggest risks?",
    "Where are we growing?",
    "Which platforms are driving growth?",
    "What should leadership investigate?",
    "Give me an executive summary.",
  ],
  platform: [
    "How is this platform affecting overall performance?",
    "What changed on this platform?",
    "What are the biggest risks here?",
    "Give me an executive summary.",
    "Where is growth coming from?",
    "What should leadership focus on?",
    "Draft an email summarizing risks for leadership",
  ],
};

function contextualLeadPrompts(view: AskAriaDashboardView): string[] {
  if (view.platform === "all") return [];
  const name = platformLabel(view.platform);
  const metric = metricLabel(view.focusMetric);
  if (view.role === "ANALYST") {
    return [
      `Why did ${name} ${metric} change?`,
      `Which products are affecting ${name} performance?`,
    ];
  }
  if (view.role === "KAM") {
    return [
      `Is ${name} creating an account opportunity?`,
      `Where are we losing revenue on ${name}?`,
    ];
  }
  return [
    `How is ${name} affecting overall performance?`,
    `What are the biggest risks on ${name}?`,
  ];
}

export function buildExploreAnotherQuestionPrompts(
  view: AskAriaDashboardView,
): string[] {
  const pool = ROLE_EXPLORE_ANOTHER_QUESTION_PROMPTS[view.role];
  const metricName = metricLabel(
    view.platform === "all"
      ? view.consolidatedChartMetric
      : view.focusMetric,
  );
  const platformName = platformLabel(view.platform);

  const mapped = pool.map((prompt) =>
    prompt
      .replace(/\bGross Sales\b/g, metricName)
      .replace("this metric", metricName)
      .replace("this platform", platformName),
  );

  const unique: string[] = [];
  for (const prompt of mapped) {
    if (!unique.includes(prompt)) unique.push(prompt);
  }
  return unique.slice(0, 4);
}

export function buildAskAriaSuggestions(view: AskAriaDashboardView): string[] {
  const isConsolidated = view.platform === "all";
  const pool =
    view.role === "KAM"
      ? isConsolidated
        ? KAM_PROMPTS.consolidated
        : KAM_PROMPTS.platform
      : view.role === "CXO"
        ? isConsolidated
          ? CXO_PROMPTS.consolidated
          : CXO_PROMPTS.platform
        : isConsolidated
          ? ANALYST_PROMPTS.consolidated
          : ANALYST_PROMPTS.platform;

  const metricName = metricLabel(
    isConsolidated ? view.consolidatedChartMetric : view.focusMetric,
  );
  const platformName = platformLabel(view.platform);

  const contextual = contextualLeadPrompts(view);
  const mapped = pool.map((prompt) =>
    prompt
      .replace("this metric", metricName)
      .replace("this platform", platformName),
  );

  const merged = [...contextual, ...mapped];
  const unique: string[] = [];
  for (const prompt of merged) {
    if (!unique.includes(prompt)) unique.push(prompt);
  }
  return unique.slice(0, 8);
}

export function buildAskAriaContextLabels(view: AskAriaDashboardView): string[] {
  const labels = [
    view.role === "ANALYST"
      ? "Analyst"
      : view.role === "KAM"
        ? "KAM"
        : "CXO",
    platformLabel(view.platform),
    view.analyticsMode === "comparison" ? "Comparison" : "Summary",
    metricLabel(
      view.platform === "all"
        ? view.consolidatedChartMetric
        : view.focusMetric,
    ),
    dateRangeLabel(view.dateRangePreset, view.dateRange),
  ];

  if (view.platform === "all") {
    labels.push(
      areAllPlatformsSelected(view.consolidatedSelectedPlatformIds)
        ? "All platforms"
        : consolidatedPlatformSelectionLabel(
            normalizeSelectedPlatformIds(view.consolidatedSelectedPlatformIds),
          ),
    );
  }

  if (view.brandId) {
    labels.push(BRAND_BY_ID[view.brandId]?.name ?? "Selected brand");
  } else {
    labels.push("All brands");
  }

  if (view.category) labels.push(view.category);
  if (view.subcategory) labels.push(view.subcategory);
  if (view.productId) {
    labels.push(PRODUCT_BY_ID[view.productId]?.name ?? "Selected product");
  }

  if (view.platform !== "all" && view.chartMetrics.length) {
    labels.push(
      `${view.chartMetrics.length} trend KPI${view.chartMetrics.length === 1 ? "" : "s"}`,
    );
  }

  return labels;
}

function dateRangeLabel(
  preset: DateRangePreset,
  range: { start: string; end: string },
): string {
  if (preset === "7") return "Last 7 days";
  if (preset === "30") return "Last 30 days";
  if (preset === "60") return "Last 60 days";
  return `${range.start} → ${range.end}`;
}

export function mapDashboardToAskAriaView(
  dashboard: {
    analyticsMode: AnalyticsMode;
    platform: DashboardPlatform;
    chartMetrics: MetricId[];
    selectedMetrics: MetricId[];
    consolidatedChartMetric: MetricId;
    consolidatedSelectedPlatformIds: PlatformId[];
    dateRangePreset: DateRangePreset;
    dateRange: { start: string; end: string };
    comparisonPeriod: { start: string; end: string };
    brandId: string | null;
    category: string | null;
    subcategory: string | null;
    productId: string | null;
  },
  role: UserRole,
): AskAriaDashboardView {
  return {
    role,
    analyticsMode: dashboard.analyticsMode,
    platform: dashboard.platform,
    focusMetric:
      dashboard.chartMetrics[0] ?? dashboard.selectedMetrics[0] ?? "gross_sales",
    chartMetrics: dashboard.chartMetrics,
    consolidatedChartMetric: dashboard.consolidatedChartMetric,
    consolidatedSelectedPlatformIds: dashboard.consolidatedSelectedPlatformIds,
    dateRangePreset: dashboard.dateRangePreset,
    dateRange: dashboard.dateRange,
    comparisonPeriod: dashboard.comparisonPeriod,
    brandId: dashboard.brandId,
    category: dashboard.category,
    subcategory: dashboard.subcategory,
    productId: dashboard.productId,
  };
}

export function toFullContext(view: AskAriaDashboardView): import("./ask-aria-types").AskAriaFullContext {
  return { ...view };
}

function focusMetricForView(view: AskAriaDashboardView): MetricId {
  if (view.platform === "all") {
    return view.consolidatedChartMetric;
  }
  return view.chartMetrics[0] ?? view.focusMetric;
}

/** Welcome “Start here” list: role + dashboard context (max 4). */
export function buildWelcomeStartHerePrompts(
  view: AskAriaDashboardView,
): string[] {
  const pool = ROLE_WELCOME_STARTERS[view.role];
  const focus = focusMetricForView(view);
  const metricName = metricLabel(focus);
  const platformName = platformLabel(view.platform);
  const isConsolidated = view.platform === "all";

  const contextualized = pool.map((prompt) => {
    let next = prompt;
    if (focus !== "roas" && /\bROAS\b/.test(next)) {
      next = next.replace(/\bROAS\b/g, metricName);
    }
    if (view.role === "ANALYST" && isConsolidated && next.includes("biggest movement")) {
      next = "Which platform is driving the decline?";
    }
    if (view.role === "KAM" && !isConsolidated && next.includes("key platforms")) {
      next = `What changed significantly on ${platformName}?`;
    }
    if (view.role === "KAM" && next.includes("Draft an update")) {
      next = "Draft an email to the KAM team with this insight";
    }
    return next
      .replace(/this metric/gi, metricName)
      .replace(/this platform/gi, platformName);
  });

  const unique: string[] = [];
  for (const prompt of contextualized) {
    if (!unique.includes(prompt)) unique.push(prompt);
  }
  return unique.slice(0, 4);
}

/** Contextual explore prompts for the welcome state (max 4). */
export function buildContextualExplorePrompts(
  view: AskAriaDashboardView,
): string[] {
  const focus = focusMetricForView(view);
  const metricName = metricLabel(focus);
  const platformName = platformLabel(view.platform);
  const isConsolidated = view.platform === "all";
  const singlePlatform =
    view.platform !== "all" ? PLATFORM_BY_ID[view.platform]?.name : null;

  const prompts: string[] = [];

  if (focus === "roas" || focus === "acos") {
    prompts.push(
      `Why is ${metricName} declining?`,
      isConsolidated
        ? "Which platforms are driving the change?"
        : `Which campaigns are affecting ${metricName}?`,
      isConsolidated
        ? "Show me the products affected"
        : "Show me the products affected",
      isConsolidated
        ? "Find the biggest opportunity"
        : "Where should I reallocate spend?",
    );
  } else if (focus === "gross_sales" || focus === "orders") {
    prompts.push(
      "Why did sales change?",
      isConsolidated
        ? "Which platform drove growth?"
        : `Why did ${metricName} change on ${platformName}?`,
      "Which products contributed most?",
      "Find the biggest opportunity",
    );
  } else {
    prompts.push(
      `Why did ${metricName} change?`,
      isConsolidated
        ? "Which platforms are driving the change?"
        : `Compare ${singlePlatform ?? platformName} with Amazon`,
      "Show me the products affected",
      "What should I investigate next?",
    );
  }

  if (!isConsolidated && singlePlatform) {
    prompts[2] = `Which products need attention on ${singlePlatform}?`;
    if (!prompts.some((p) => p.includes("Compare"))) {
      prompts[1] = `Compare ${singlePlatform} with Amazon`;
    }
    prompts[0] = `Why is ${singlePlatform} underperforming?`;
  }

  const unique: string[] = [];
  for (const prompt of prompts) {
    if (!unique.includes(prompt)) unique.push(prompt);
  }
  const contextual = unique.slice(0, 3);
  const capabilityIndex =
    Math.abs(view.platform.length + focus.length + metricName.length) %
    CAPABILITY_EXPLORE_EXAMPLES.length;
  const withCapability = [
    ...contextual,
    CAPABILITY_EXPLORE_EXAMPLES[capabilityIndex],
  ];
  return withCapability.slice(0, 4);
}
