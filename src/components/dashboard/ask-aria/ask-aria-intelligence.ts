import { BRANDS } from "@/data/brands";
import { METRIC_BY_ID } from "@/data/metrics";
import { PERFORMANCE_RECORDS } from "@/data/performance";
import { PLATFORMS, PLATFORM_BY_ID } from "@/data/platforms";
import { PRODUCT_BY_ID } from "@/data/products";
import { PERFORMANCE_DATE_RANGE } from "@/data/scenarios";
import {
  calculatePercentageChange,
  getTrendDirection,
} from "@/lib/analytics/calculations";
import { aggregateMetric } from "@/lib/analytics/comparisons";
import { rankProducts } from "@/lib/analytics/rankings";
import {
  analyzeRootCause,
  type RcaDriver,
  type RcaMetricId,
} from "@/lib/analytics/root-cause";
import { assessBidRisk } from "@/lib/analytics/bid-risk";
import {
  filterPerformanceRecords,
  getMetricAggregationType,
} from "@/lib/dashboard/filter-records";
import type { MetricId, PlatformId } from "@/types/analytics";

import type { UserRole } from "@/lib/auth/types";

import type { AriaMonitor } from "@/lib/ask-aria/monitors";
import { formatMetricValue } from "@/lib/ask-aria/monitors";

import {
  enrichReportDraftFromThread,
  extractLastWorkspaceArtifact,
  extractThreadAnalysisContext,
  textReferencesArtifact,
  textReferencesSendOrEmail,
} from "./ask-aria-artifacts";
import { CAPABILITY_DISCOVERY_CHIPS } from "./ask-aria-command-center-data";
import {
  buildActionDraft,
  buildClientUpdateDraftPartial,
  enrichClientUpdateDraft,
  enrichEmailDraft,
  isClientUpdateDraftPartial,
  enrichMonitorDraft,
  enrichSpreadsheetDraft,
  parseActionRequest,
  tryRefineEmailDraft,
  tryRefineMonitorDraft,
  tryRefineSpreadsheetDraft,
  validateActionDraft,
} from "./ask-aria-actions";
import {
  classifyIntent,
  isCapabilityDiscoveryQuery,
  isGrowthQuestion,
  isRcaQuery,
  isMonitorListingQuery,
  isSendThisConfirmPhrase,
  metricDefinitionTerm,
} from "./ask-aria-intent";
import { goldenPathChips } from "./ask-aria-golden-path";
import { buildSituationMessage } from "./ask-aria-situations";
import {
  buildHistoricalSectionLines,
  findHistoricalMetricDeclines,
} from "./ask-aria-historical";
import {
  buildActiveAnalysisContext,
  buildPeriodTransparencySection,
  extractPlatformIdsFromText,
  resolveQueryScope,
  type ResolvedQueryScope,
} from "./ask-aria-scope";
import {
  buildRolePrioritizedInsightHandoffs,
  cxoOperationalActionMessage,
  formatBrandAnalysis,
  formatInsightFromEvidence,
  formatProductsFollowUp,
  formatRecommendationFromEvidence,
  type MetricChangeEvidence,
  type RecommendationEvidence,
} from "./ask-aria-role-profiles";
import { canConfirmAction } from "./ask-aria-permissions";
import {
  buildClarificationResponse,
  buildGoogleGmailRequiredClarification,
  buildGoogleSheetsRequiredClarification,
  buildToolRequiredClarification,
} from "./ask-aria-clarification";
import {
  actionRequiresWorkspaceTool,
  isWorkspaceToolSatisfiedForAction,
  type WorkspaceConnectionState,
} from "./ask-aria-tool-mapping";
import {
  insightSection,
  mapInsightSectionForAccordion,
} from "./ask-aria-insight-sections";
import { createMessageId } from "./ask-aria-storage";
import type {
  AskAriaActionDraft,
  AskAriaFullContext,
  AskAriaInvestigationMemory,
  AskAriaMessage,
  AskAriaTemporalWindow,
} from "./ask-aria-types";

function metricName(id: MetricId): string {
  return METRIC_BY_ID[id]?.name ?? id;
}

function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function filterForScope(
  context: AskAriaFullContext,
  scope: ResolvedQueryScope,
) {
  const catalog = {
    brandId: context.brandId,
    category: context.category,
    subcategory: context.subcategory,
    productId: context.productId,
  };

  const selectedPlatforms =
    scope.platformIds.length > 0
      ? scope.platformIds
      : PLATFORMS.map((platform) => platform.id);

  const platformFilter =
    scope.mode === "single_platform" && selectedPlatforms.length === 1
      ? selectedPlatforms[0]
      : undefined;

  const current = filterPerformanceRecords(PERFORMANCE_RECORDS, {
    ...catalog,
    platformId: platformFilter,
    dateRange: context.dateRange,
  }).filter((record) =>
    scope.mode === "single_platform" && platformFilter
      ? true
      : selectedPlatforms.includes(record.platformId),
  );

  const comparison = filterPerformanceRecords(PERFORMANCE_RECORDS, {
    ...catalog,
    platformId: platformFilter,
    dateRange: context.comparisonPeriod,
  }).filter((record) =>
    scope.mode === "single_platform" && platformFilter
      ? true
      : selectedPlatforms.includes(record.platformId),
  );

  return { current, comparison, selectedPlatforms, scope };
}

function enrichInsightContentSections(
  context: AskAriaFullContext,
  scope: ResolvedQueryScope,
  metricId: MetricId,
  sections: import("./ask-aria-types").AskAriaInsightSection[],
): import("./ask-aria-types").AskAriaInsightSection[] {
  const events = findHistoricalMetricDeclines(context, scope, metricId);
  const historicalLines = buildHistoricalSectionLines(
    events,
    metricName(metricId),
  );

  const mapped = sections.map((section) =>
    mapInsightSectionForAccordion(section),
  );

  const evidenceIndex = mapped.findIndex(
    (section) => section.id === "evidence",
  );
  const historicalSection = insightSection(
    "what_happened_historically",
    "What happened historically",
    historicalLines,
  );

  if (evidenceIndex >= 0) {
    return [
      ...mapped.slice(0, evidenceIndex),
      historicalSection,
      ...mapped.slice(evidenceIndex),
    ];
  }

  return [...mapped, historicalSection];
}

function prependAnalysisSections(
  context: AskAriaFullContext,
  scope: ResolvedQueryScope,
  sections: import("./ask-aria-types").AskAriaInsightSection[],
): import("./ask-aria-types").AskAriaInsightSection[] {
  return [
    buildPeriodTransparencySection(context),
    insightSection("scope", "Scope", [`Analyzed: ${scope.scopeLabel}`]),
    ...sections,
  ];
}

function metricDelta(
  current: ReturnType<typeof filterForScope>["current"],
  comparison: ReturnType<typeof filterForScope>["comparison"],
  metricId: MetricId,
) {
  const aggregation = getMetricAggregationType(metricId);
  const cur = aggregateMetric(current, metricId, aggregation);
  const prev = aggregateMetric(comparison, metricId, aggregation);
  const pct = calculatePercentageChange(cur, prev);
  return { cur, prev, pct, direction: getTrendDirection(cur, prev) };
}

function resolveFocusMetric(
  context: AskAriaFullContext,
  memory: AskAriaInvestigationMemory,
  text: string,
): MetricId {
  const lower = text.toLowerCase();
  if (lower.includes("roas")) return "roas";
  if (lower.includes("conversion")) return "conversion_rate";
  if (lower.includes("gross sales")) return "gross_sales";
  if (lower.includes("orders")) return "orders";
  if (lower.includes("acos")) return "acos";
  if (memory.activeAnalysisContext?.metricId) {
    return memory.activeAnalysisContext.metricId;
  }
  if (memory.lastMetric) return memory.lastMetric;
  if (memory.metricId) return memory.metricId;
  return context.platform === "all"
    ? context.consolidatedChartMetric
    : context.focusMetric;
}

function resolveTemporalWindow(text: string): AskAriaTemporalWindow {
  const lower = text.toLowerCase();
  if (
    lower.includes("last 30") ||
    lower.includes("30 day") ||
    lower.includes("this month")
  ) {
    return "last_30_days";
  }
  if (lower.includes("weekend")) return "weekend";
  if (lower.includes("last 7") || lower.includes("7 day")) return "last_7_days";
  if (lower.includes("previous week") || lower.includes("last week")) {
    return "previous_week";
  }
  if (lower.includes("declin") && lower.includes("start")) return "decline_onset";
  return "yesterday";
}

function buildBrandAnalysisMessage(
  context: AskAriaFullContext,
  role: UserRole,
  scope: ResolvedQueryScope,
): { message: AskAriaMessage; weakest?: { brandId: string; brandName: string } } {
  const { current, comparison } = filterForScope(context, scope);
  const rows = BRANDS.map((brand) => {
    const curRecords = current.filter((record) => record.brandId === brand.id);
    const prevRecords = comparison.filter((record) => record.brandId === brand.id);
    const cur = aggregateMetric(curRecords, "gross_sales", "sum");
    const prev = aggregateMetric(prevRecords, "gross_sales", "sum");
    const pct = calculatePercentageChange(cur, prev);
    return {
      brandId: brand.id,
      brandName: brand.name,
      pct,
      current: cur,
      previous: prev,
    };
  }).sort((a, b) => a.pct - b.pct);

  const formatted = formatBrandAnalysis(role, rows);
  const weakest = rows[0] && rows[0].pct < 0 ? rows[0] : undefined;

  return {
    message: {
      id: createMessageId(),
      kind: "insight",
      title: formatted.title,
      summary: formatted.summary,
      sections: prependAnalysisSections(context, scope, formatted.sections),
      createdAt: Date.now(),
    },
    weakest: weakest
      ? { brandId: weakest.brandId, brandName: weakest.brandName }
      : undefined,
  };
}

/** Below this, a period-over-period move is treated as noise, not a trend. */
export const MATERIAL_CHANGE_PCT = 1;

/**
 * "Say when uncertain": flags questions whose premise the data contradicts
 * ("why did ROAS drop?" when it rose) and moves too small to explain.
 */
export function buildPremiseCaveat(
  question: string,
  metricLabel: string,
  scopeLabel: string,
  pct: number,
): string | undefined {
  const lower = question.toLowerCase();
  const claimsDown = /\b(drop|dropp|fall|fell|declin|decreas|down|worse|lower)/.test(lower);
  const claimsUp = /\b(rise|rose|grow|grew|increas|go up|went up|up\b|better|higher|improv)/.test(lower);
  const actual = pct > 0 ? "rose" : pct < 0 ? "fell" : "did not change";
  const where = scopeLabel === "all platforms" ? "" : ` on ${scopeLabel}`;

  if (claimsDown && !claimsUp && pct > 0) {
    return `${metricLabel}${where} didn't drop — it ${actual} ${formatPct(pct)} vs the comparison period. Here's the full picture.`;
  }
  if (claimsUp && !claimsDown && pct < 0) {
    return `${metricLabel}${where} didn't go up — it ${actual} ${formatPct(pct)} vs the comparison period. Here's the full picture.`;
  }
  if (Math.abs(pct) < MATERIAL_CHANGE_PCT) {
    return `${metricLabel}${where} moved only ${formatPct(pct)} — too small to treat as a real change, so I can't point to a clear cause.`;
  }
  return undefined;
}

function singlePlatformScope(platformId: PlatformId): ResolvedQueryScope {
  return {
    mode: "single_platform",
    platformIds: [platformId],
    scopeLabel: PLATFORM_BY_ID[platformId]?.name ?? platformId,
    usedDashboardDefault: false,
  };
}

function buildPlatformSummaryMessage(
  context: AskAriaFullContext,
  memory: AskAriaInvestigationMemory,
  metricId: MetricId,
  scope: ResolvedQueryScope,
): { message: AskAriaMessage; memory: AskAriaInvestigationMemory } {
  const { current, comparison } = filterForScope(context, scope);
  const primary = metricDelta(current, comparison, metricId);
  const mName = metricName(metricId);
  const directionWord =
    primary.direction === "down"
      ? "declined"
      : primary.direction === "up"
        ? "increased"
        : "held steady";
  const inheritedNote =
    memory.activeAnalysisContext &&
    memory.activeAnalysisContext.metricId === metricId
      ? `Continuing from your ${mName} investigation with the same comparison periods.`
      : `Using your dashboard focus metric (${mName}) for this scope.`;

  const activePlatform = memoryPlatformFromScope(scope, context);

  return {
    message: {
      id: createMessageId(),
      kind: "insight",
      title: `Scope — ${scope.scopeLabel}`,
      summary: `${scope.scopeLabel}: ${mName} ${directionWord} ${formatPct(primary.pct)} versus the comparison period. ${inheritedNote}`,
      sections: prependAnalysisSections(context, scope, [
        insightSection("scope_confirmation", "Scope", [
          `Platform scope set to ${scope.scopeLabel}.`,
          `Focus metric: ${mName} (${formatMetricValue(metricId, primary.cur)} vs comparison).`,
          "Ask what changed, which products moved, or draft a client update from here.",
        ]),
      ]),
      createdAt: Date.now(),
    },
    memory: {
      ...memory,
      topic: "metric_change",
      metricId,
      platformId: activePlatform,
      lastMetric: metricId,
      lastPlatform: activePlatform,
      lastTopic: "platform_summary",
      activeAnalysisContext: buildActiveAnalysisContext(
        context,
        scope,
        metricId,
        primary.direction,
      ),
    },
  };
}

function buildPlatformComparisonMessage(
  context: AskAriaFullContext,
  memory: AskAriaInvestigationMemory,
  text: string,
  role: UserRole,
  scope: ResolvedQueryScope,
): AskAriaMessage {
  const { current, comparison, selectedPlatforms } = filterForScope(
    context,
    scope,
  );
  const metricId = resolveFocusMetric(context, memory, text);
  const growthQuestion = isGrowthQuestion(text);

  const rows = selectedPlatforms
    .map((platformId) => {
      const curRecords = current.filter((r) => r.platformId === platformId);
      const prevRecords = comparison.filter((r) => r.platformId === platformId);
      const delta = metricDelta(curRecords, prevRecords, metricId);
      return {
        platformId,
        name: PLATFORM_BY_ID[platformId]?.name ?? platformId,
        pct: delta.pct,
        cur: delta.cur,
      };
    })
    .sort((a, b) =>
      growthQuestion ? b.pct - a.pct : Math.abs(b.pct) - Math.abs(a.pct),
    );

  const top = rows[0];
  const lines =
    role === "CXO"
      ? top
        ? [
            growthQuestion
              ? `${top.name} grew fastest: ${metricName(metricId)} ${formatPct(top.pct)} vs the comparison period.`
              : `${top.name} shows the largest ${metricName(metricId)} movement (${formatPct(top.pct)}) among selected platforms.`,
          ]
        : ["No platform movement available in the current filters."]
      : rows.slice(0, 5).map(
          (row) =>
            `${row.name}: ${metricName(metricId)} ${formatPct(row.pct)} vs comparison period`,
        );

  return {
    id: createMessageId(),
    kind: "insight",
    title:
      role === "CXO"
        ? "Platform movement — summary"
        : "Platform comparison",
    summary: top
      ? growthQuestion
        ? `${top.name} grew fastest: ${metricName(metricId)} ${formatPct(top.pct)} vs the comparison period.`
        : `${top.name} moved most: ${metricName(metricId)} ${formatPct(top.pct)} vs the comparison period.`
      : `No ${metricName(metricId)} data for ${scope.scopeLabel} in the current filters.`,
    sections: prependAnalysisSections(context, scope, [
      insightSection("platforms", "Platforms", lines),
    ]),
    createdAt: Date.now(),
  };
}

function memoryPlatformFromScope(
  scope: ResolvedQueryScope,
  context: AskAriaFullContext,
): import("@/contexts/dashboard-context").DashboardPlatform {
  if (scope.mode === "single_platform" && scope.platformIds.length === 1) {
    return scope.platformIds[0];
  }
  if (scope.platformIds.length > 1) return "all";
  return context.platform;
}

function buildInsightMessage(
  context: AskAriaFullContext,
  metricId: MetricId,
  memory: AskAriaInvestigationMemory,
  role: UserRole,
  scope: ResolvedQueryScope,
  question?: string,
): { message: AskAriaMessage; memory: AskAriaInvestigationMemory } {
  const { current, comparison, selectedPlatforms } = filterForScope(
    context,
    scope,
  );
  const primary = metricDelta(current, comparison, metricId);
  const caveat = question
    ? buildPremiseCaveat(question, metricName(metricId), scope.scopeLabel, primary.pct)
    : undefined;
  const orders = metricDelta(current, comparison, "orders");
  const conversion = metricDelta(current, comparison, "conversion_rate");

  const mName = metricName(metricId);
  const directionWord =
    primary.direction === "down" ? "declined" : primary.direction === "up" ? "increased" : "held steady";

  let largestPlatform: PlatformId | null = null;
  let largestShift = 0;
  if (selectedPlatforms.length > 1 || scope.mode !== "single_platform") {
    for (const platformId of selectedPlatforms) {
      const platCurrent = current.filter((r) => r.platformId === platformId);
      const platComparison = comparison.filter(
        (r) => r.platformId === platformId,
      );
      const shift = Math.abs(
        metricDelta(platCurrent, platComparison, metricId).pct,
      );
      if (shift > largestShift) {
        largestShift = shift;
        largestPlatform = platformId;
      }
    }
  }

  const platformLabel = scope.scopeLabel;

  const evidence: MetricChangeEvidence = {
    metricId,
    metricLabel: mName,
    platformLabel,
    directionWord,
    primaryPct: formatPct(primary.pct),
    primaryCur: primary.cur,
    primaryPrev: primary.prev,
    primaryDirection: primary.direction,
    ordersPct: formatPct(orders.pct),
    ordersDirection: orders.direction,
    conversionPct: formatPct(conversion.pct),
    conversionDirection: conversion.direction,
    largestPlatform,
    largestPlatformName: largestPlatform
      ? PLATFORM_BY_ID[largestPlatform]?.name ?? null
      : null,
  };

  const formatted = formatInsightFromEvidence(role, evidence);

  const contentSections = enrichInsightContentSections(
    context,
    scope,
    metricId,
    formatted.sections,
  );

  const monitorPrompt = `Monitor ${scope.scopeLabel} ROAS and alert me if it falls below 3`;
  const handoffPlatformId =
    largestPlatform ??
    (scope.mode === "single_platform" ? scope.platformIds[0] : undefined);
  const handoffs = buildRolePrioritizedInsightHandoffs(role, {
    scopeLabel: scope.scopeLabel,
    platformId: handoffPlatformId,
    monitorPrompt,
  });

  const activePlatform = memoryPlatformFromScope(scope, context);

  return {
    message: {
      id: createMessageId(),
      kind: "insight",
      title: formatted.title,
      summary: formatted.summary,
      sections: prependAnalysisSections(context, scope, contentSections),
      metrics: [
        {
          label: mName,
          value: formatMetricValue(metricId, primary.cur),
          change: formatPct(primary.pct),
          direction: primary.direction,
        },
        {
          label: "Orders",
          value: formatMetricValue("orders", orders.cur),
          change: formatPct(orders.pct),
          direction: orders.direction,
        },
        {
          label: "Conversion Rate",
          value: formatMetricValue("conversion_rate", conversion.cur),
          change: formatPct(conversion.pct),
          direction: conversion.direction,
        },
      ],
      handoffs,
      caveat,
      createdAt: Date.now(),
    },
    memory: {
      topic: "metric_change",
      metricId,
      platformId: activePlatform,
      lastMetric: metricId,
      lastPlatform: activePlatform,
      lastTopic: "metric_change",
      activeAnalysisContext: buildActiveAnalysisContext(
        context,
        scope,
        metricId,
        primary.direction,
      ),
    },
  };
}

function rankProductsForInvestigation(
  current: ReturnType<typeof filterForScope>["current"],
  comparison: ReturnType<typeof filterForScope>["comparison"],
  metricId: MetricId,
  investigationDirection?: "up" | "down" | "flat",
  limit = 8,
): {
  rows: Array<{
    productId: string;
    platformId: PlatformId;
    pct: number;
    metricPct: number;
  }>;
  productLevelCausality: boolean;
  rankingDimension: "metric" | "revenue";
} {
  const productIds = new Set<string>();
  for (const record of current) productIds.add(record.productId);
  for (const record of comparison) productIds.add(record.productId);

  const rows = [...productIds].map((productId) => {
    const curRecords = current.filter((r) => r.productId === productId);
    const prevRecords = comparison.filter((r) => r.productId === productId);
    const aggregation = getMetricAggregationType(metricId);
    const curMetric = aggregateMetric(curRecords, metricId, aggregation);
    const prevMetric = aggregateMetric(prevRecords, metricId, aggregation);
    const metricPct = calculatePercentageChange(curMetric, prevMetric);
    const curRev = aggregateMetric(curRecords, "revenue", "sum");
    const prevRev = aggregateMetric(prevRecords, "revenue", "sum");
    const revenuePct = calculatePercentageChange(curRev, prevRev);
    const platformId =
      curRecords[0]?.platformId ?? prevRecords[0]?.platformId ?? "amazon";
    return { productId, platformId, metricPct, revenuePct };
  });

  const useMetricRanking =
    metricId === "roas" ||
    metricId === "acos" ||
    metricId === "conversion_rate";

  if (useMetricRanking && investigationDirection === "down") {
    const worse = rows
      .filter((row) =>
        metricId === "acos" ? row.metricPct >= 0 : row.metricPct <= 0,
      )
      .sort((a, b) =>
        metricId === "acos" ? b.metricPct - a.metricPct : a.metricPct - b.metricPct,
      );
    if (worse.length > 0) {
      return {
        productLevelCausality: true,
        rankingDimension: "metric",
        rows: worse.slice(0, limit).map((row) => ({
          productId: row.productId,
          platformId: row.platformId,
          pct: row.metricPct,
          metricPct: row.metricPct,
        })),
      };
    }
    const byMovement = [...rows].sort((a, b) =>
      metricId === "acos" ? b.metricPct - a.metricPct : a.metricPct - b.metricPct,
    );
    return {
      productLevelCausality: false,
      rankingDimension: "metric",
      rows: byMovement.slice(0, limit).map((row) => ({
        productId: row.productId,
        platformId: row.platformId,
        pct: row.metricPct,
        metricPct: row.metricPct,
      })),
    };
  }

  const byRevenue = [...rows]
    .sort((a, b) => a.revenuePct - b.revenuePct)
    .slice(0, limit);

  return {
    productLevelCausality: !useMetricRanking,
    rankingDimension: "revenue",
    rows: byRevenue.map((row) => ({
      productId: row.productId,
      platformId: row.platformId,
      pct: row.revenuePct,
      metricPct: row.metricPct,
    })),
  };
}

function buildProductsFollowUp(
  context: AskAriaFullContext,
  metricId: MetricId,
  role: UserRole,
  scope: ResolvedQueryScope,
  investigation?: Pick<
    import("./ask-aria-types").AskAriaActiveAnalysisContext,
    "metricDirection"
  >,
): AskAriaMessage {
  const { current, comparison } = filterForScope(context, scope);
  const {
    rows: declining,
    productLevelCausality,
    rankingDimension,
  } = rankProductsForInvestigation(
    current,
    comparison,
    metricId,
    investigation?.metricDirection,
    8,
  );

  const formatted = formatProductsFollowUp(
    role,
    metricName(metricId),
    declining.map((row) => ({
      productId: row.productId,
      platformId: row.platformId,
      pct: row.pct,
    })),
    {
      scopeLabel: scope.scopeLabel,
      metricId,
      productLevelCausality,
      investigationDirection: investigation?.metricDirection,
      rankingDimension,
    },
  );

  const top = declining[0];
  const sectionHeading = formatted.sectionHeading ?? "Products to investigate";

  return {
    id: createMessageId(),
    kind: "insight",
    title: formatted.title,
    summary: formatted.summary,
    sections: prependAnalysisSections(context, scope, [
      insightSection("contributors", sectionHeading, formatted.lines),
    ]),
    handoffs: top
      ? [
          {
            label: "View product analysis",
            productId: top.productId,
            platformId: top.platformId,
          },
        ]
      : [],
    createdAt: Date.now(),
  };
}

function clampDate(iso: string): string {
  if (iso < PERFORMANCE_DATE_RANGE.start) return PERFORMANCE_DATE_RANGE.start;
  if (iso > PERFORMANCE_DATE_RANGE.end) return PERFORMANCE_DATE_RANGE.end;
  return iso;
}

function buildTemporalMessage(
  context: AskAriaFullContext,
  memory: AskAriaInvestigationMemory,
  text: string,
  role: UserRole,
  scope: ResolvedQueryScope,
): AskAriaMessage {
  const window = resolveTemporalWindow(text);
  const focusMetric =
    memory.lastMetric ??
    memory.metricId ??
    (context.platform === "all"
      ? context.consolidatedChartMetric
      : context.focusMetric);

  const end: string = PERFORMANCE_DATE_RANGE.end;
  let rangeStart: string = addDays(end, -1);
  let rangeEnd: string = end;
  let baselineStart: string = addDays(end, -2);
  let baselineEnd: string = addDays(end, -2);
  let title = `Yesterday — ${formatDisplayDate(addDays(end, -1))}`;

  if (window === "last_7_days") {
    rangeStart = clampDate(addDays(end, -6));
    rangeEnd = end;
    baselineStart = clampDate(addDays(rangeStart, -7));
    baselineEnd = clampDate(addDays(rangeStart, -1));
    title = `Last 7 days — ${formatDisplayDate(rangeStart)} to ${formatDisplayDate(rangeEnd)}`;
  } else if (window === "last_30_days") {
    rangeStart = clampDate(addDays(end, -29));
    rangeEnd = end;
    baselineStart = clampDate(addDays(rangeStart, -30));
    baselineEnd = clampDate(addDays(rangeStart, -1));
    title = `Last 30 days — ${formatDisplayDate(rangeStart)} to ${formatDisplayDate(rangeEnd)}`;
  } else if (window === "previous_week") {
    rangeEnd = clampDate(addDays(end, -7));
    rangeStart = clampDate(addDays(rangeEnd, -6));
    baselineEnd = clampDate(addDays(rangeStart, -1));
    baselineStart = clampDate(addDays(baselineEnd, -6));
    title = `Previous week — ${formatDisplayDate(rangeStart)} to ${formatDisplayDate(rangeEnd)}`;
  } else if (window === "weekend") {
    // Latest Saturday–Sunday in the dataset vs the weekend before it
    // (same number of days, so totals compare fairly).
    const endDay = new Date(`${end}T00:00:00.000Z`).getUTCDay();
    rangeEnd = addDays(end, endDay === 0 ? 0 : -endDay);
    rangeStart = addDays(rangeEnd, -1);
    baselineEnd = addDays(rangeEnd, -7);
    baselineStart = addDays(rangeStart, -7);
    title = `Weekend — ${formatDisplayDate(rangeStart)} to ${formatDisplayDate(rangeEnd)} vs the weekend before`;
  } else if (window === "decline_onset") {
    return buildDeclineOnsetMessage(context, focusMetric, scope);
  } else {
    rangeStart = addDays(end, -1);
    rangeEnd = addDays(end, -1);
    baselineStart = addDays(end, -2);
    baselineEnd = addDays(end, -2);
  }

  const catalog = {
    brandId: context.brandId,
    category: context.category,
    subcategory: context.subcategory,
    productId: context.productId,
    platformId:
      scope.mode === "single_platform" && scope.platformIds.length === 1
        ? scope.platformIds[0]
        : undefined,
  };

  const currentRecords = filterPerformanceRecords(PERFORMANCE_RECORDS, {
    ...catalog,
    dateRange: { start: rangeStart, end: rangeEnd },
  });
  const baselineRecords = filterPerformanceRecords(PERFORMANCE_RECORDS, {
    ...catalog,
    dateRange: { start: baselineStart, end: baselineEnd },
  });

  const metrics = (
    [
      focusMetric,
      "gross_sales",
      "orders",
      "conversion_rate",
      "roas",
    ] as MetricId[]
  ).filter((id, index, arr) => arr.indexOf(id) === index);

  const metricLines = metrics.map((metricId) => {
    const aggregation = getMetricAggregationType(metricId);
    const cur = aggregateMetric(currentRecords, metricId, aggregation);
    const prev = aggregateMetric(baselineRecords, metricId, aggregation);
    const pct = calculatePercentageChange(cur, prev);
    return {
      label: metricName(metricId),
      value: formatMetricValue(metricId, cur),
      change: formatPct(pct),
      direction: getTrendDirection(cur, prev),
    };
  });

  const platformLabel = scope.scopeLabel;

  const interpretationLines =
    role === "CXO"
      ? [
          `${metricName(focusMetric)} moved ${metricLines[0]?.change ?? "within range"} versus the baseline window.`,
          "Focus on whether the movement is material to overall business performance.",
        ]
      : role === "KAM"
        ? [
            `${metricName(focusMetric)} moved ${metricLines[0]?.change ?? "within range"} for ${platformLabel}.`,
            "Consider account-level implications before discussing changes with the client.",
          ]
        : [
            `The data indicates ${metricName(focusMetric)} moved ${metricLines[0]?.change ?? "within range"} versus the comparison window.`,
            "Use campaign and product views to validate the evidence before taking action.",
          ];

  // Cite the window actually analysed, not the dashboard's date range.
  const windowContext = {
    ...context,
    dateRange: { start: rangeStart, end: rangeEnd },
    comparisonPeriod: { start: baselineStart, end: baselineEnd },
  };
  const lead = metricLines[0];

  return {
    id: createMessageId(),
    kind: "insight",
    title,
    summary: lead
      ? `${lead.label} was ${lead.value} for ${platformLabel} (${lead.change} vs the window before).`
      : `No data for ${platformLabel} in this window.`,
    sections: prependAnalysisSections(windowContext, scope, [
      insightSection("interpretation", "Interpretation", interpretationLines),
    ]),
    metrics: metricLines,
    createdAt: Date.now(),
  };
}

function buildDeclineOnsetMessage(
  context: AskAriaFullContext,
  metricId: MetricId,
  scope: ResolvedQueryScope,
): AskAriaMessage {
  const catalog = {
    brandId: context.brandId,
    category: context.category,
    subcategory: context.subcategory,
    productId: context.productId,
    platformId:
      scope.mode === "single_platform" && scope.platformIds.length === 1
        ? scope.platformIds[0]
        : undefined,
  };

  const end: string = PERFORMANCE_DATE_RANGE.end;
  let onset: string = end;
  for (let offset = 1; offset <= 21; offset += 1) {
    const day = addDays(end, -offset);
    const dayRecords = filterPerformanceRecords(PERFORMANCE_RECORDS, {
      ...catalog,
      dateRange: { start: day, end: day },
    });
    const prevRecords = filterPerformanceRecords(PERFORMANCE_RECORDS, {
      ...catalog,
      dateRange: { start: addDays(day, -1), end: addDays(day, -1) },
    });
    const delta = metricDelta(dayRecords, prevRecords, metricId);
    if (delta.direction === "down" && delta.pct < -3) {
      onset = day;
      break;
    }
  }

  return {
    id: createMessageId(),
    kind: "insight",
    title: `When ${metricName(metricId)} decline accelerated`,
    summary: `Within the available dataset, the earliest notable day-over-day decline for ${metricName(metricId)} appears around ${formatDisplayDate(onset)}.`,
    sections: [
      insightSection("what_to_investigate", "What to investigate", [
        "Review order volume and conversion on and after this date.",
        "Check campaign spend efficiency if ROAS or ACOS moved in the same window.",
      ]),
    ],
    createdAt: Date.now(),
  };
}

function buildRecommendation(
  context: AskAriaFullContext,
  metricId: MetricId,
  role: UserRole,
  scope: ResolvedQueryScope,
): AskAriaMessage {
  const { current, comparison } = filterForScope(context, scope);
  const roas = metricDelta(current, comparison, "roas");
  const platformName = scope.scopeLabel;

  const topProduct = rankProducts(current, 1)[0];
  const productName = topProduct
    ? PRODUCT_BY_ID[topProduct.productId]?.name
    : "priority SKUs";

  const focus = metricDelta(current, comparison, metricId);
  const evidence: RecommendationEvidence = {
    metricId,
    metricLabel: metricName(metricId),
    platformName,
    focusPct: formatPct(focus.pct),
    focusDirection: focus.direction,
    focusCur: focus.cur,
    focusPrev: focus.prev,
    roasCur: roas.cur,
    roasPrev: roas.prev,
    topProductName: productName ?? "priority SKUs",
    topProductId: topProduct?.productId,
    topPlatformId: topProduct?.platformId,
  };

  const formatted = formatRecommendationFromEvidence(role, evidence);
  const period = buildPeriodTransparencySection(context);
  const evidenceLines = [
    `${period.lines[0]} ${period.lines[1]}`,
    `${metricName(metricId)}: ${focus.cur.toFixed(2)} vs ${focus.prev.toFixed(2)} (${formatPct(focus.pct)}).`,
    `ROAS: ${roas.cur.toFixed(2)} vs ${roas.prev.toFixed(2)}.`,
    `Orders and conversion in the same window support whether efficiency or demand drove the change.`,
  ];

  return {
    id: createMessageId(),
    kind: "recommendation",
    title: "Recommended next steps",
    observation: formatted.observation,
    why: formatted.why,
    evidence: evidenceLines.join(" "),
    recommendation: formatted.recommendation,
    expectedConsideration: formatted.expectedConsideration,
    nextAction: formatted.nextAction,
    handoffs: buildRolePrioritizedInsightHandoffs(role, {
      scopeLabel: scope.scopeLabel,
      platformId:
        scope.platformIds[0] ?? topProduct?.platformId ?? undefined,
      productId: topProduct?.productId,
      productPlatformId: topProduct?.platformId,
      monitorPrompt: `Monitor ${scope.scopeLabel} ROAS and alert me if it falls below 3`,
    }),
    createdAt: Date.now(),
  };
}

function buildExecutiveSummary(
  context: AskAriaFullContext,
  scope: ResolvedQueryScope,
): { message: AskAriaMessage; riskPlatformId?: PlatformId } {
  const { current, comparison, selectedPlatforms } = filterForScope(
    context,
    scope,
  );
  const revenue = metricDelta(current, comparison, "gross_sales");
  const roas = metricDelta(current, comparison, "roas");

  // Rank platforms by rupee impact, not %, so a small platform's big swing
  // doesn't outrank a large platform's real loss.
  const platformRows = selectedPlatforms
    .map((platformId) => {
      const delta = metricDelta(
        current.filter((r) => r.platformId === platformId),
        comparison.filter((r) => r.platformId === platformId),
        "gross_sales",
      );
      return { platformId, delta, impact: delta.cur - delta.prev };
    })
    .sort((a, b) => a.impact - b.impact);
  const risk = platformRows[0]?.impact < 0 ? platformRows[0] : undefined;
  const growth =
    platformRows.length > 1 && platformRows[platformRows.length - 1].impact > 0
      ? platformRows[platformRows.length - 1]
      : undefined;
  const nameOf = (id: PlatformId) => PLATFORM_BY_ID[id]?.name ?? id;
  const rupees = (value: number) => formatMetricValue("gross_sales", Math.abs(value));

  const lead = risk
    ? `Biggest risk: ${nameOf(risk.platformId)} Gross Sales fell ${formatPct(risk.delta.pct).replace(/^-/, "")} (${rupees(risk.impact)} lost), the largest drop of any platform.`
    : `No platform lost Gross Sales in ${scope.scopeLabel} this period.`;

  return {
    message: {
      id: createMessageId(),
      kind: "insight",
      title: "Business summary",
      summary: lead,
      sections: prependAnalysisSections(context, scope, [
        insightSection("major_changes", "Overall", [
          `Gross Sales ${formatPct(revenue.pct)} and ROAS ${formatPct(roas.pct)} vs the comparison period.`,
        ]),
        insightSection(
          "risks",
          "Risks",
          platformRows
            .filter((row) => row.impact < 0)
            .slice(0, 3)
            .map(
              (row) =>
                `${nameOf(row.platformId)}: ${formatPct(row.delta.pct)} (${rupees(row.impact)} lost)`,
            ),
        ),
        insightSection(
          "growth",
          "Growth",
          growth
            ? [
                `${nameOf(growth.platformId)}: ${formatPct(growth.delta.pct)} (${rupees(growth.impact)} gained)`,
              ]
            : ["No platform grew Gross Sales this period."],
        ),
      ]),
      handoffs: risk
        ? [
            {
              label: `Why did ${nameOf(risk.platformId)} drop?`,
              prompt: "Why?",
            },
          ]
        : [],
      createdAt: Date.now(),
    },
    riskPlatformId: risk?.platformId,
  };
}

const METRIC_ALIASES: Record<string, MetricId> = {
  conversion: "conversion_rate",
  ctr: "click_through_rate",
  aov: "average_order_value",
  "buy box": "buy_box_share",
  spend: "ad_spend",
};

function findMetricByTerm(term: string): MetricId | undefined {
  const normalized = term.toLowerCase().trim();
  const byName = Object.values(METRIC_BY_ID).find(
    (metric) =>
      metric.name.toLowerCase() === normalized ||
      metric.id.replace(/_/g, " ") === normalized,
  );
  return byName?.id ?? METRIC_ALIASES[normalized];
}

/** Greetings, metric definitions and questions Aria can't answer — no analysis card. */
function buildNonAnalysisReply(
  intent: "greeting" | "metric_definition" | "unknown",
  text: string,
  role: UserRole,
): AskAriaMessage {
  const chips = goldenPathChips(role);
  let reply: string;
  if (intent === "greeting") {
    reply =
      "Hi — I answer questions about sales, ads and platform performance in this demo workspace. Try one of these:";
  } else if (intent === "metric_definition") {
    const term = metricDefinitionTerm(text) ?? "";
    const metricId = findMetricByTerm(term);
    const metric = metricId ? METRIC_BY_ID[metricId] : undefined;
    reply = metric
      ? `${metric.name}: ${metric.description}.`
      : `I don't have a definition for "${term}" in this workspace.`;
    if (metric) {
      chips.unshift({
        label: `How is ${metric.name} trending?`,
        prompt: `What changed in ${metric.name}?`,
      });
    }
  } else {
    reply =
      "I'm not sure what you're asking, so I won't guess. I can explain changes in sales, ROAS, conversion and orders across the 12 platforms, compare platforms, brands and products, or draft a report. For example:";
  }
  return {
    id: createMessageId(),
    kind: "assistant_text",
    text: reply,
    suggestionChips: chips.slice(0, 3),
    createdAt: Date.now(),
  };
}

/** Bid changes get a trend check before the user confirms them. */
export function withBidRisk(draft: AskAriaActionDraft): AskAriaActionDraft {
  const isBid = draft.type === "campaign_bid" || draft.type === "schedule_bid_change";
  if (!isBid || draft.newBid === undefined || !draft.platformId) return draft;
  const risk = assessBidRisk(PERFORMANCE_RECORDS, {
    platformId: draft.platformId,
    productId: draft.productId,
    newBid: draft.newBid,
    currentBid: draft.currentBid,
    asOf: PERFORMANCE_DATE_RANGE.end,
  });
  return {
    ...draft,
    bidRisk: { level: risk.level, reasons: risk.reasons, suggestion: risk.suggestion },
  };
}

/** RCA covers two driver trees; other metrics map to the tree they sit in. */
export function rcaMetricFor(text: string, memoryMetric?: MetricId): RcaMetricId {
  if (/\b(roas|acos|cpc|ad spend|ads?)\b/i.test(text)) return "roas";
  if (/\b(sales|revenue|orders|conversion|sessions|traffic)\b/i.test(text)) {
    return "gross_sales";
  }
  return memoryMetric === "roas" || memoryMetric === "acos" || memoryMetric === "cpc"
    ? "roas"
    : "gross_sales";
}

const RCA_FORMULA: Record<RcaMetricId, string> = {
  gross_sales: "Gross Sales = Sessions × Conversion rate × Sales per order",
  roas: "ROAS = Ad sales per click ÷ Cost per click",
};

function formatRcaValue(format: RcaDriver["format"], value: number): string {
  if (format === "percentage") return `${value.toFixed(2)}%`;
  if (format === "integer") return Math.round(value).toLocaleString("en-IN");
  if (format === "currency") {
    return value < 100
      ? `₹${value.toFixed(2)}`
      : formatMetricValue("gross_sales", value);
  }
  return value.toFixed(2);
}

function formatRcaContribution(metric: RcaMetricId, value: number): string {
  const sign = value >= 0 ? "+" : "−";
  return metric === "roas"
    ? `${sign}${Math.abs(value).toFixed(2)}`
    : `${sign}${formatMetricValue("gross_sales", Math.abs(value))}`;
}

function signedPct(value: number): string {
  return `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}%`;
}

/** Root-cause analysis answer: driver waterfall, where it happened, what was ruled out. */
function buildRcaMessage(
  context: AskAriaFullContext,
  scope: ResolvedQueryScope,
  metric: RcaMetricId,
): AskAriaMessage {
  const { current, comparison } = filterForScope(context, scope);
  const rca = analyzeRootCause(metric, current, comparison);
  const metricLabel = metricName(metric);
  const valueOf = (v: number) =>
    metric === "roas" ? v.toFixed(2) : formatMetricValue("gross_sales", v);
  const where = scope.scopeLabel === "all platforms" ? "" : ` on ${scope.scopeLabel}`;
  const moved = rca.change < 0 ? "drop" : "rise";
  const top = rca.topDriver;

  const summary = top
    ? `${top.label} drives ${Math.abs(top.sharePct).toFixed(0)}% of the ${metricLabel} ${moved}${where}: it ${top.changePct >= 0 ? "rose" : "fell"} ${Math.abs(top.changePct).toFixed(1)}% (${formatRcaValue(top.format, top.previous)} → ${formatRcaValue(top.format, top.current)}).`
    : `${metricLabel}${where} barely moved (${signedPct(rca.changePct)}), so there is no cause to trace.`;

  return {
    id: createMessageId(),
    kind: "rca",
    title: `Root-cause analysis — ${metricLabel}${where}`,
    summary,
    rcaMetric: metric,
    metricLabel,
    scopeLabel: scope.scopeLabel,
    totalLine: `${metricLabel} ${valueOf(rca.previous)} → ${valueOf(rca.current)} (${signedPct(rca.changePct)})`,
    formula: RCA_FORMULA[metric],
    drivers: rca.drivers.map((d) => ({
      label: d.label,
      from: formatRcaValue(d.format, d.previous),
      to: formatRcaValue(d.format, d.current),
      changePct: signedPct(d.changePct),
      contribution: formatRcaContribution(metric, d.contribution),
      sharePct: d.sharePct,
      role: d === top ? "cause" : d.sharePct < 0 ? "offset" : Math.abs(d.sharePct) < 10 ? "minor" : "cause",
    })),
    // A single-platform analysis would only show "Amazon 100%".
    platforms: (scope.mode === "single_platform" ? [] : rca.platforms).map((p) => ({
      label: PLATFORM_BY_ID[p.platformId]?.name ?? p.platformId,
      sharePct: p.sharePct,
    })),
    products: rca.products.map((p) => ({
      label: `${PRODUCT_BY_ID[p.productId]?.name ?? p.productId} (${PLATFORM_BY_ID[p.platformId]?.name ?? p.platformId})`,
      sharePct: p.sharePct,
    })),
    ruledOut: rca.ruledOut,
    otherSignals: rca.otherSignals,
    confidence: rca.confidence,
    confidenceReason: rca.confidenceReason,
    caveat: rca.confidence === "low" ? rca.confidenceReason : undefined,
    handoffs: top ? [{ label: "Export RCA report", prompt: "Create an RCA report" }] : [],
    createdAt: Date.now(),
  };
}

function executiveSummaryTurn(
  userMessage: AskAriaMessage,
  context: AskAriaFullContext,
  scope: ResolvedQueryScope,
  metricId: MetricId,
): { messages: AskAriaMessage[]; memory: AskAriaInvestigationMemory } {
  const summary = buildExecutiveSummary(context, scope);
  const focusPlatform = summary.riskPlatformId ?? memoryPlatformFromScope(scope, context);
  return {
    messages: [userMessage, summary.message],
    memory: {
      topic: "metric_change",
      metricId,
      platformId: focusPlatform,
      lastPlatform: focusPlatform,
      lastTopic: "executive_summary",
    },
  };
}

function buildTopProductsMessage(
  context: AskAriaFullContext,
  metricId: MetricId,
  scope: ResolvedQueryScope,
  text: string,
): AskAriaMessage {
  const { current } = filterForScope(context, scope);
  const worst = /\b(worst|bottom|lowest)\b/i.test(text);
  const ranked = rankProducts(current).sort((a, b) =>
    worst ? a.revenue - b.revenue : b.revenue - a.revenue,
  );
  const rows = ranked.slice(0, 5);
  const label = worst ? "Lowest-selling products" : "Top products";
  const lines = rows.map((row, index) => {
    const name = PRODUCT_BY_ID[row.productId]?.name ?? row.productId;
    const platform = PLATFORM_BY_ID[row.platformId]?.name ?? row.platformId;
    return `${index + 1}. ${name} (${platform}): ${formatMetricValue("gross_sales", row.revenue)} · ROAS ${row.roas.toFixed(2)}`;
  });
  const first = rows[0];
  return {
    id: createMessageId(),
    kind: "insight",
    title: `${label} by Gross Sales — ${scope.scopeLabel}`,
    summary: first
      ? `${PRODUCT_BY_ID[first.productId]?.name ?? first.productId} ${worst ? "sold the least" : "sold the most"}: ${formatMetricValue("gross_sales", first.revenue)} this period.`
      : "No product sales in the current filters.",
    sections: prependAnalysisSections(context, scope, [
      insightSection("contributors", label, lines),
    ]),
    handoffs: first
      ? [
          {
            label: "View product analysis",
            productId: first.productId,
            platformId: first.platformId,
          },
        ]
      : [],
    createdAt: Date.now(),
  };
}

function addDays(iso: string, delta: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Shown when an empty conversation opens: the most urgent situation alert,
 * with what happened last time and a suggestion. Falls back to the older
 * ROAS nudge when nothing crosses the alert thresholds.
 */
export function buildProactiveInsight(
  context: AskAriaFullContext,
): AskAriaMessage | null {
  const situation = buildSituationMessage(
    context,
    context.platform === "all" ? undefined : context.platform,
  );
  if (situation) return attachSource(situation, context, {});
  return buildRoasNudge(context);
}

function buildRoasNudge(
  context: AskAriaFullContext,
): AskAriaMessage | null {
  const platformId =
    context.platform === "all" ? "amazon" : context.platform;
  const catalog = {
    brandId: context.brandId,
    category: context.category,
    subcategory: context.subcategory,
    productId: context.productId,
    platformId,
  };
  const current = filterPerformanceRecords(PERFORMANCE_RECORDS, {
    ...catalog,
    dateRange: context.dateRange,
  });
  const comparison = filterPerformanceRecords(PERFORMANCE_RECORDS, {
    ...catalog,
    dateRange: context.comparisonPeriod,
  });
  const roas = metricDelta(current, comparison, "roas");
  if (Math.abs(roas.pct) < 8) return null;

  const name = PLATFORM_BY_ID[platformId]?.name ?? "the active platform";
  return {
    id: createMessageId(),
    kind: "proactive",
    title: "Aria noticed something",
    body: `ROAS on ${name} changed ${formatPct(roas.pct)} compared with the previous period.`,
    prompt: `Why did ${name} ROAS change?`,
    createdAt: Date.now(),
  };
}

export interface ProcessAskAriaMessageOptions {
  /** Current thread messages only — not other Recent conversations. */
  recentMessages?: AskAriaMessage[];
  appUserEmail?: string;
  activeMonitors?: AriaMonitor[];
}

function buildCapabilityDiscoveryResponse(): AskAriaMessage {
  return {
    id: createMessageId(),
    kind: "assistant_text",
    text:
      "I help you understand commerce performance, create Google Docs and Sheets, draft and send Gmail, set simulated monitors, and prepare campaign actions — all from this conversation.",
    suggestionChips: CAPABILITY_DISCOVERY_CHIPS.map((chip) => ({
      label: chip.group,
      prompt: chip.prompt,
    })),
    createdAt: Date.now(),
  };
}

function buildMonitorListingResponse(monitors: AriaMonitor[]): AskAriaMessage {
  const active = monitors.filter((m) => m.status === "active");
  if (!active.length) {
    return {
      id: createMessageId(),
      kind: "clarification",
      variant: "needs_clarification",
      title: "No active monitors",
      body:
        "You don't have any active monitors yet. Ask me to monitor a metric (for example ROAS on Amazon) or open Manage monitors.",
      choices: [
        {
          label: "Manage monitors",
          followUpText: "",
          action: "open_monitors_panel",
        },
        {
          label: "Monitor Amazon ROAS below 3",
          followUpText:
            "Monitor Amazon ROAS and alert me if it falls below 3",
        },
      ],
      createdAt: Date.now(),
    };
  }

  const lines = active
    .slice(0, 8)
    .map((m) => {
      const metricName =
        METRIC_BY_ID[m.metric]?.name ?? m.metric;
      const platform = m.platformId
        ? PLATFORM_BY_ID[m.platformId]?.name
        : null;
      const name =
        m.label ??
        (platform ? `${platform} ${metricName}` : metricName);
      return `• ${name} — ${m.frequency} checks (simulated)`;
    })
    .join("\n");

  return {
    id: createMessageId(),
    kind: "clarification",
    variant: "needs_clarification",
    title: "Active monitors",
    body: `${active.length} monitor${active.length === 1 ? "" : "s"}:\n${lines}`,
    choices: [
      {
        label: "Manage monitors",
        followUpText: "",
        action: "open_monitors_panel",
      },
    ],
    createdAt: Date.now(),
  };
}

export const DEMO_DATASET_LABEL = "Synthetic demo data";

/**
 * "Always show the source": every analysis answer cites the dataset, scope
 * and the exact periods compared, taken from the sections it was built from.
 */
function attachSource(
  message: AskAriaMessage,
  context: AskAriaFullContext,
  memory: AskAriaInvestigationMemory,
): AskAriaMessage {
  if (
    message.kind !== "insight" &&
    message.kind !== "recommendation" &&
    message.kind !== "rca" &&
    message.kind !== "situation"
  ) {
    return message;
  }
  if (message.source) return message;
  const sections = message.kind === "insight" ? message.sections : [];
  const periods = sections.find((s) => s.id === "periods_analyzed")?.lines ?? [];
  const scopeLine = sections.find((s) => s.id === "scope")?.lines[0];
  const fallback = buildPeriodTransparencySection(context).lines;
  const strip = (line: string | undefined) =>
    (line ?? "").replace(/^[^:]+:\s*/, "").replace(" → ", " – ");
  const platform = memory.lastPlatform ?? memory.platformId ?? context.platform;
  const scope = message.kind === "rca" || message.kind === "situation"
    ? message.scopeLabel
    : scopeLine
    ? strip(scopeLine)
    : platform && platform !== "all"
      ? PLATFORM_BY_ID[platform]?.name ?? platform
      : "all platforms";
  return {
    ...message,
    source: {
      dataset: DEMO_DATASET_LABEL,
      scope,
      period: strip(periods[0] ?? fallback[0]),
      comparison: strip(periods[1] ?? fallback[1]),
    },
  };
}

export function processAskAriaMessage(
  text: string,
  context: AskAriaFullContext,
  memory: AskAriaInvestigationMemory,
  role: UserRole = "ANALYST",
  workspaceConnection?: WorkspaceConnectionState,
  options?: ProcessAskAriaMessageOptions,
): {
  messages: AskAriaMessage[];
  memory: AskAriaInvestigationMemory;
} {
  const result = routeAskAriaMessage(
    text,
    context,
    memory,
    role,
    workspaceConnection,
    options,
  );
  return {
    ...result,
    messages: result.messages.map((message) =>
      attachSource(message, context, result.memory),
    ),
  };
}

function routeAskAriaMessage(
  text: string,
  context: AskAriaFullContext,
  memory: AskAriaInvestigationMemory,
  role: UserRole = "ANALYST",
  workspaceConnection: WorkspaceConnectionState = {
    googleOAuthConfigured: false,
    googleOAuthConnected: false,
    googleDemoConnected: false,
    microsoftDemoConnected: false,
  },
  options?: ProcessAskAriaMessageOptions,
): {
  messages: AskAriaMessage[];
  memory: AskAriaInvestigationMemory;
} {
  const trimmed = text.trim();
  if (!trimmed) return { messages: [], memory };

  const userMessage: AskAriaMessage = {
    id: createMessageId(),
    kind: "user",
    text: trimmed,
    createdAt: Date.now(),
  };

  const recentMessages = options?.recentMessages ?? [];
  const artifact = extractLastWorkspaceArtifact(recentMessages);
  const includeArtifact =
    textReferencesArtifact(trimmed) ||
    textReferencesSendOrEmail(trimmed) ||
    Boolean(artifact);

  if (isCapabilityDiscoveryQuery(trimmed)) {
    return {
      messages: [userMessage, buildCapabilityDiscoveryResponse()],
      memory,
    };
  }

  if (isMonitorListingQuery(trimmed)) {
    return {
      messages: [
        userMessage,
        buildMonitorListingResponse(options?.activeMonitors ?? []),
      ],
      memory,
    };
  }

  if (isSendThisConfirmPhrase(trimmed) && !memory.pendingActionDraft) {
    return {
      messages: [
        userMessage,
        {
          id: createMessageId(),
          kind: "assistant_text",
          text:
            "There is no email draft ready to send yet. Draft a client update or team email first, then say “Send this” to confirm.",
          createdAt: Date.now(),
        },
      ],
      memory,
    };
  }

  const lowerTrimmed = trimmed.toLowerCase();
  if (
    artifact &&
    (/^open (the )?report$/i.test(trimmed) ||
      /^open (the )?(spread)?sheet$/i.test(trimmed) ||
      lowerTrimmed === "open spreadsheet")
  ) {
    const title =
      artifact.kind === "doc"
        ? extractThreadAnalysisContext(recentMessages, memory).lastInsightTitle ??
          "Commerce report"
        : "Performance spreadsheet";
    return {
      messages: [
        userMessage,
        {
          id: createMessageId(),
          kind: "workspace_artifact",
          title,
          artifactKind: artifact.kind,
          ctaUrl: artifact.url,
          createdAt: Date.now(),
        },
      ],
      memory,
    };
  }

  if (
    memory.pendingActionDraft?.type === "create_monitor" ||
    memory.pendingActionDraft?.type === "create_alert"
  ) {
    const refined = tryRefineMonitorDraft(
      trimmed,
      memory.pendingActionDraft,
      context,
    );
    if (refined) {
      return {
        messages: [
          userMessage,
          {
            id: createMessageId(),
            kind: "action_preview",
            draft: refined,
            createdAt: Date.now(),
          },
        ],
        memory: {
          ...memory,
          topic: "action",
          pendingActionDraft: refined,
        },
      };
    }
  }

  if (memory.pendingActionDraft?.type === "create_spreadsheet") {
    const refined = tryRefineSpreadsheetDraft(
      trimmed,
      memory.pendingActionDraft,
      context,
    );
    if (refined) {
      return {
        messages: [
          userMessage,
          {
            id: createMessageId(),
            kind: "action_preview",
            draft: refined,
            createdAt: Date.now(),
          },
        ],
        memory: {
          ...memory,
          topic: "action",
          pendingActionDraft: refined,
        },
      };
    }
  }

  if (
    memory.pendingActionDraft?.type === "draft_email" ||
    memory.pendingActionDraft?.type === "send_email"
  ) {
    const refined = tryRefineEmailDraft(
      trimmed,
      memory.pendingActionDraft,
      context,
      {
        artifact,
        userEmail: options?.appUserEmail,
      },
    );
    if (refined) {
      return {
        messages: [
          userMessage,
          {
            id: createMessageId(),
            kind: "action_preview",
            draft: refined,
            createdAt: Date.now(),
          },
        ],
        memory: {
          ...memory,
          topic: "action",
          pendingActionDraft: refined,
        },
      };
    }
  }

  const intent = classifyIntent(trimmed, memory, context);
  const scope = resolveQueryScope(trimmed, memory, context, intent);
  const metricId = resolveFocusMetric(context, memory, trimmed);
  const scopedPlatform = memoryPlatformFromScope(scope, context);
  const memoryForAction = {
    ...memory,
    pendingActionDraft: undefined,
  };

  if (intent === "action_clarification") {
    const parsed = parseActionRequest(trimmed, context);
    const clarificationText =
      parsed.kind === "clarification"
        ? parsed.message
        : "I need more details before I can prepare this action.";
    let pendingFromClarification = memory.pendingActionDraft;
    if (parsed.kind === "clarification" && parsed.partial.type) {
      const enriched =
        parsed.partial.type === "create_monitor" ||
        parsed.partial.type === "create_alert"
          ? enrichMonitorDraft(parsed.partial, context)
          : parsed.partial;
      pendingFromClarification = buildActionDraft(enriched);
    }
    return {
      messages: [
        userMessage,
        {
          id: createMessageId(),
          kind: "assistant_text",
          text: clarificationText,
          createdAt: Date.now(),
        },
      ],
      memory: {
        ...memoryForAction,
        topic: "action",
        lastTopic: "action",
        pendingActionDraft: pendingFromClarification,
      },
    };
  }

  if (intent === "confirm_action" && memory.pendingActionDraft) {
    let draft = memory.pendingActionDraft;
    if (draft.type === "draft_email") {
      draft = buildActionDraft({ ...draft, type: "send_email" });
    }
    const permission = canConfirmAction(role, draft.type);
    if (!permission.allowed) {
      const platformName =
        PLATFORM_BY_ID[draft.platformId ?? "amazon"]?.name ??
        "the selected platform";
      const message =
        role === "CXO" && permission.reason
          ? cxoOperationalActionMessage(platformName)
          : permission.reason ?? "Action blocked for your role.";
      return {
        messages: [
          userMessage,
          {
            id: createMessageId(),
            kind: "action_result",
            draft,
            status: "blocked",
            message,
            createdAt: Date.now(),
          },
        ],
        memory: { ...memory, pendingActionDraft: draft },
      };
    }
    return {
      messages: [
        userMessage,
        {
          id: createMessageId(),
          kind: "action_preview",
          draft,
          createdAt: Date.now(),
        },
      ],
      memory: { ...memory, topic: "action", pendingActionDraft: draft },
    };
  }

  if (intent === "action_request") {
    const parsed = parseActionRequest(trimmed, context);
    if (parsed.kind !== "ready") {
      return {
        messages: [
          userMessage,
          {
            id: createMessageId(),
            kind: "assistant_text",
            text: "I could not parse that action request. Please specify platform, campaign, and numeric bid or budget.",
            createdAt: Date.now(),
          },
        ],
        memory: memoryForAction,
      };
    }

    let partial =
      parsed.partial.type === "create_spreadsheet"
        ? enrichSpreadsheetDraft(parsed.partial, context)
        : parsed.partial.type === "create_monitor" ||
            parsed.partial.type === "create_alert"
          ? enrichMonitorDraft(parsed.partial, context)
          : parsed.partial;

    if (
      partial.type === "generate_report" ||
      partial.type === "schedule_report"
    ) {
      partial = enrichReportDraftFromThread(
        partial,
        recentMessages,
        memory,
        isRcaQuery(trimmed)
          ? { rcaMetric: rcaMetricFor(trimmed, memory.lastMetric ?? memory.metricId) }
          : undefined,
      );
    }

    if (
      partial.type === "draft_email" ||
      partial.type === "send_email"
    ) {
      if (
        partial.type === "send_email" &&
        memory.pendingActionDraft?.type === "draft_email"
      ) {
        partial = {
          ...memory.pendingActionDraft,
          ...partial,
          type: "send_email",
        };
      }
      const enrichOptions = {
        artifact,
        userEmail: options?.appUserEmail,
        includeArtifact,
        memory,
        messages: recentMessages,
      };
      partial =
        partial.emailRecipientGroupId === "client_account" ||
        isClientUpdateDraftPartial(partial)
          ? enrichClientUpdateDraft(partial, context, enrichOptions)
          : enrichEmailDraft(partial, context, enrichOptions);
    }

    const draft = withBidRisk(buildActionDraft(partial));
    if (
      actionRequiresWorkspaceTool(draft.type) &&
      !isWorkspaceToolSatisfiedForAction(draft.type, workspaceConnection)
    ) {
      const docsConnected =
        workspaceConnection.googleOAuthDocsConnected ??
        workspaceConnection.googleOAuthConnected;
      if (
        draft.type === "create_spreadsheet" &&
        workspaceConnection.googleOAuthConfigured &&
        docsConnected &&
        !workspaceConnection.googleOAuthSheetsConnected
      ) {
        return {
          messages: [userMessage, buildGoogleSheetsRequiredClarification()],
          memory: {
            ...memoryForAction,
            topic: "action",
            pendingActionDraft: draft,
          },
        };
      }
      if (
        draft.type === "send_email" &&
        workspaceConnection.googleOAuthConfigured &&
        !workspaceConnection.googleOAuthGmailConnected
      ) {
        return {
          messages: [userMessage, buildGoogleGmailRequiredClarification()],
          memory: {
            ...memoryForAction,
            topic: "action",
            pendingActionDraft: draft,
          },
        };
      }
      return {
        messages: [
          userMessage,
          buildToolRequiredClarification(draft.type, {
            googleOAuthConfigured: workspaceConnection.googleOAuthConfigured,
          }),
        ],
        memory: {
          ...memoryForAction,
          topic: "action",
          pendingActionDraft: draft,
        },
      };
    }
    const validationError = validateActionDraft(draft);
    if (validationError) {
      const blockedDraft = { ...draft, validationError };
      return {
        messages: [
          userMessage,
          {
            id: createMessageId(),
            kind: "action_preview",
            draft: blockedDraft,
            createdAt: Date.now(),
          },
        ],
        memory: {
          ...memoryForAction,
          topic: "action",
          pendingActionDraft: blockedDraft,
        },
      };
    }
    const permission = canConfirmAction(role, draft.type);
    if (!permission.allowed) {
      const platformName =
        PLATFORM_BY_ID[draft.platformId ?? "amazon"]?.name ??
        "the selected platform";
      const message =
        role === "CXO"
          ? cxoOperationalActionMessage(platformName)
          : permission.reason ?? "Action blocked.";
      return {
        messages: [
          userMessage,
          {
            id: createMessageId(),
            kind: "action_result",
            draft,
            status: "blocked",
            message,
            createdAt: Date.now(),
          },
        ],
        memory: { ...memoryForAction, pendingActionDraft: undefined },
      };
    }
    return {
      messages: [
        userMessage,
        {
          id: createMessageId(),
          kind: "action_preview",
          draft,
          createdAt: Date.now(),
        },
      ],
      memory: {
        ...memoryForAction,
        topic: "action",
        pendingActionDraft: draft,
      },
    };
  }

  const clarification = buildClarificationResponse(trimmed);
  if (clarification) {
    const platformIds = extractPlatformIdsFromText(trimmed);
    const scopedPlatform =
      platformIds.length > 0
        ? platformIds[0]
        : context.platform === "all"
          ? "amazon"
          : context.platform;
    return {
      messages: [userMessage, clarification],
      memory: {
        ...memoryForAction,
        lastPlatform: scopedPlatform,
        platformId: scopedPlatform,
        lastTopic: "clarification",
      },
    };
  }

  if (
    intent === "greeting" ||
    intent === "metric_definition" ||
    intent === "unknown"
  ) {
    return {
      messages: [userMessage, buildNonAnalysisReply(intent, trimmed, role)],
      memory,
    };
  }

  if (intent === "temporal_follow_up") {
    const temporalMemory = {
      topic: "temporal" as const,
      metricId,
      platformId: scopedPlatform,
      lastMetric: metricId,
      lastPlatform: scopedPlatform,
      temporalWindow: resolveTemporalWindow(trimmed),
    };
    return {
      messages: [
        userMessage,
        buildTemporalMessage(context, memory, trimmed, role, scope),
      ],
      memory: temporalMemory,
    };
  }

  if (intent === "brand_analysis") {
    const brands = buildBrandAnalysisMessage(context, role, scope);
    return {
      messages: [userMessage, brands.message],
      memory: {
        topic: "metric_change",
        lastTopic: "brand_analysis",
        platformId: scopedPlatform,
        lastPlatform: scopedPlatform,
        lastBrandId: brands.weakest?.brandId,
        lastBrandName: brands.weakest?.brandName,
      },
    };
  }

  if (intent === "platform_analysis") {
    return {
      messages: [
        userMessage,
        buildPlatformComparisonMessage(context, memory, trimmed, role, scope),
      ],
      memory: {
        topic: "metric_change",
        lastTopic: "platform_analysis",
        platformId: scopedPlatform,
        lastPlatform: scopedPlatform,
      },
    };
  }

  if (intent === "platform_summary") {
    const summary = buildPlatformSummaryMessage(
      context,
      memory,
      metricId,
      scope,
    );
    return {
      messages: [userMessage, summary.message],
      memory: summary.memory,
    };
  }

  if (intent === "client_update") {
    let partial = buildClientUpdateDraftPartial();
    partial = enrichClientUpdateDraft(partial, context, {
      artifact,
      userEmail: options?.appUserEmail,
      includeArtifact,
      memory,
      messages: recentMessages,
    });
    const draft = buildActionDraft(partial);
    if (
      workspaceConnection.googleOAuthConfigured &&
      !workspaceConnection.googleOAuthGmailConnected
    ) {
      return {
        messages: [userMessage, buildGoogleGmailRequiredClarification()],
        memory: {
          ...memory,
          topic: "action",
          pendingActionDraft: draft,
        },
      };
    }
    return {
      messages: [
        userMessage,
        {
          id: createMessageId(),
          kind: "action_preview",
          draft,
          createdAt: Date.now(),
        },
      ],
      memory: {
        ...memory,
        topic: "action",
        pendingActionDraft: draft,
      },
    };
  }

  if (intent === "product_analysis") {
    const followMetric =
      memory.activeAnalysisContext?.metricId ??
      memory.lastMetric ??
      memory.metricId ??
      metricId;
    const productScope = resolveQueryScope(trimmed, memory, context, intent);
    const investigationContext =
      memory.activeAnalysisContext ??
      (memory.lastMetric || memory.metricId
        ? {
            metricId: followMetric,
            metricDirection: undefined,
            scopeLabel: productScope.scopeLabel,
            dateRange: context.dateRange,
            comparisonPeriod: context.comparisonPeriod,
          }
        : undefined);
    const analysisContext = investigationContext
      ? {
          ...context,
          dateRange: investigationContext.dateRange,
          comparisonPeriod: investigationContext.comparisonPeriod,
          focusMetric: followMetric,
          consolidatedChartMetric: followMetric,
        }
      : context;
    return {
      messages: [
        userMessage,
        buildProductsFollowUp(
          analysisContext,
          followMetric,
          role,
          productScope,
          investigationContext,
        ),
      ],
      memory: {
        ...memory,
        topic: "products",
        metricId: followMetric,
        lastMetric: followMetric,
        lastTopic: "metric_change",
        lastPlatform: memoryPlatformFromScope(productScope, context),
        platformId: memoryPlatformFromScope(productScope, context),
        activeAnalysisContext: buildActiveAnalysisContext(
          context,
          productScope,
          followMetric,
          memory.activeAnalysisContext?.metricDirection,
        ),
      },
    };
  }

  if (intent === "metric_follow_up") {
    const followMetric = trimmed.toLowerCase().includes("roas")
      ? "roas"
      : metricId;
    const result = buildInsightMessage(
      context,
      followMetric,
      memory,
      role,
      scope,
    );
    return {
      messages: [userMessage, result.message],
      memory: result.memory,
    };
  }

  if (intent === "historical_pattern") {
    const focusMetric = memory.lastMetric ?? memory.metricId ?? metricId;
    const events = findHistoricalMetricDeclines(context, scope, focusMetric);
    const lines = buildHistoricalSectionLines(events, metricName(focusMetric));
    return {
      messages: [
        userMessage,
        {
          id: createMessageId(),
          kind: "insight",
          title: `Historical pattern — ${metricName(focusMetric)}`,
          summary: events.length
            ? `${metricName(focusMetric)} on ${scope.scopeLabel} has dropped like this ${events.length} time${events.length === 1 ? "" : "s"} before in the available history.`
            : `No comparable ${metricName(focusMetric)} drop on ${scope.scopeLabel} in the available history.`,
          caveat: events.length
            ? undefined
            : "The synthetic dataset covers about 10 weeks (2 Dec 2025 – 15 Feb 2026), too short to tell whether this is a recurring pattern.",
          sections: prependAnalysisSections(context, scope, [
            insightSection("what_happened_historically", "What happened historically", lines),
          ]),
          createdAt: Date.now(),
        },
      ],
      memory: {
        ...memory,
        topic: "metric_change",
        metricId: focusMetric,
        lastMetric: focusMetric,
        lastTopic: "metric_change",
        platformId: scopedPlatform,
        lastPlatform: scopedPlatform,
      },
    };
  }

  if (intent === "recommendation") {
    return {
      messages: [userMessage, buildRecommendation(context, metricId, role, scope)],
      memory: {
        topic: "recommendation",
        metricId,
        platformId: scopedPlatform,
        lastMetric: metricId,
        lastPlatform: scopedPlatform,
        lastTopic: "recommendation",
      },
    };
  }

  if (intent === "root_cause") {
    // A bare "why?" explains whatever the previous answer pointed at.
    const isBareWhy = /^\s*why\b[\s?.!]*(is that|did that happen|so)?[\s?.!]*$/i.test(
      trimmed,
    );
    if (isBareWhy && memory.lastTopic === "brand_analysis" && memory.lastBrandId) {
      const brandContext = { ...context, brandId: memory.lastBrandId };
      const insight = buildInsightMessage(
        brandContext,
        "gross_sales",
        memory,
        role,
        scope,
      );
      const message =
        insight.message.kind === "insight"
          ? { ...insight.message, title: `${insight.message.title} — ${memory.lastBrandName}` }
          : insight.message;
      return {
        messages: [userMessage, message],
        memory: {
          ...insight.memory,
          lastBrandId: memory.lastBrandId,
          lastBrandName: memory.lastBrandName,
        },
      };
    }
    const followScope =
      isBareWhy &&
      memory.lastTopic === "executive_summary" &&
      memory.lastPlatform &&
      memory.lastPlatform !== "all"
        ? singlePlatformScope(memory.lastPlatform)
        : scope;
    const insight = buildInsightMessage(
      context,
      metricId,
      memory,
      role,
      followScope,
      trimmed,
    );
    return {
      messages: [userMessage, insight.message],
      memory: insight.memory,
    };
  }

  if (intent === "situation_alerts") {
    const platformIds = extractPlatformIdsFromText(trimmed);
    const situation = buildSituationMessage(context, platformIds[0]);
    if (!situation) {
      return {
        messages: [
          userMessage,
          {
            id: createMessageId(),
            kind: "assistant_text",
            text: platformIds.length
              ? `Nothing on ${PLATFORM_BY_ID[platformIds[0]]?.name ?? "that platform"} crosses the alert thresholds this period (Gross Sales −10%, ROAS or conversion −8%).`
              : "Nothing crosses the alert thresholds this period (Gross Sales −10%, ROAS or conversion −8%).",
            createdAt: Date.now(),
          },
        ],
        memory,
      };
    }
    const alertPlatform =
      situation.kind === "situation"
        ? extractPlatformIdsFromText(situation.scopeLabel)[0]
        : undefined;
    return {
      messages: [userMessage, situation],
      memory: {
        ...memory,
        topic: "metric_change",
        lastTopic: "situation",
        platformId: alertPlatform ?? memory.platformId,
        lastPlatform: alertPlatform ?? memory.lastPlatform,
      },
    };
  }

  if (intent === "root_cause_analysis") {
    const rcaMetric = rcaMetricFor(
      trimmed,
      memory.activeAnalysisContext?.metricId ?? memory.lastMetric ?? memory.metricId,
    );
    // "Run a root-cause analysis" right after an answer analyses the same
    // platform that answer was about, unless the question names one.
    const rcaScope =
      extractPlatformIdsFromText(trimmed).length === 0 &&
      memory.lastPlatform &&
      memory.lastPlatform !== "all"
        ? singlePlatformScope(memory.lastPlatform)
        : scope;
    const rcaPlatform = memoryPlatformFromScope(rcaScope, context);
    return {
      messages: [userMessage, buildRcaMessage(context, rcaScope, rcaMetric)],
      memory: {
        ...memory,
        topic: "metric_change",
        metricId: rcaMetric,
        lastMetric: rcaMetric,
        lastTopic: "rca",
        platformId: rcaPlatform,
        lastPlatform: rcaPlatform,
        activeAnalysisContext: buildActiveAnalysisContext(context, rcaScope, rcaMetric, undefined),
      },
    };
  }

  if (intent === "product_ranking") {
    return {
      messages: [userMessage, buildTopProductsMessage(context, metricId, scope, trimmed)],
      memory: {
        ...memory,
        topic: "products",
        metricId,
        lastMetric: metricId,
        lastTopic: "product_ranking",
        platformId: scopedPlatform,
        lastPlatform: scopedPlatform,
      },
    };
  }

  if (intent === "executive_summary") {
    if (role === "CXO") {
      return executiveSummaryTurn(userMessage, context, scope, metricId);
    }
    if (role === "KAM") {
      return {
        messages: [
          userMessage,
          buildRecommendation(context, metricId, role, scope),
        ],
        memory: {
          topic: "recommendation",
          metricId,
          platformId: scopedPlatform,
          lastMetric: metricId,
          lastPlatform: scopedPlatform,
          lastTopic: "recommendation",
        },
      };
    }
    const insight = buildInsightMessage(
      context,
      metricId,
      memory,
      role,
      scope,
    );
    return {
      messages: [userMessage, insight.message],
      memory: insight.memory,
    };
  }

  if (intent === "general_performance") {
    if (role === "CXO") {
      return executiveSummaryTurn(userMessage, context, scope, metricId);
    }
    const insight = buildInsightMessage(
      context,
      metricId,
      memory,
      role,
      scope,
    );
    return {
      messages: [userMessage, insight.message],
      memory: insight.memory,
    };
  }

  const insight = buildInsightMessage(
    context,
    metricId,
    memory,
    role,
    scope,
  );
  return {
    messages: [userMessage, insight.message],
    memory: insight.memory,
  };
}

export { mockExecuteAction } from "./ask-aria-actions";
