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
  enrichEmailDraft,
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
  isMonitorListingQuery,
} from "./ask-aria-intent";
import {
  buildHistoricalSectionLines,
  findHistoricalMetricDeclines,
} from "./ask-aria-historical";
import {
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
  if (memory.metricId) return memory.metricId;
  return context.platform === "all"
    ? context.consolidatedChartMetric
    : context.focusMetric;
}

function resolveTemporalWindow(text: string): AskAriaTemporalWindow {
  const lower = text.toLowerCase();
  if (lower.includes("last 30") || lower.includes("30 day")) return "last_30_days";
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
): AskAriaMessage {
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

  return {
    id: createMessageId(),
    kind: "insight",
    title: formatted.title,
    summary: formatted.summary,
    sections: prependAnalysisSections(context, scope, formatted.sections),
    createdAt: Date.now(),
  };
}

function buildPlatformComparisonMessage(
  context: AskAriaFullContext,
  role: UserRole,
  scope: ResolvedQueryScope,
): AskAriaMessage {
  const { current, comparison, selectedPlatforms } = filterForScope(
    context,
    scope,
  );
  const metricId =
    context.platform === "all"
      ? context.consolidatedChartMetric
      : context.focusMetric;

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
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));

  const top = rows[0];
  const lines =
    role === "CXO"
      ? top
        ? [
            `${top.name} shows the largest ${metricName(metricId)} movement (${formatPct(top.pct)}) among selected platforms.`,
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
    summary: `Largest ${metricName(metricId)} shifts across ${scope.scopeLabel} in the workspace.`,
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
): { message: AskAriaMessage; memory: AskAriaInvestigationMemory } {
  const { current, comparison, selectedPlatforms } = filterForScope(
    context,
    scope,
  );
  const primary = metricDelta(current, comparison, metricId);
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
      createdAt: Date.now(),
    },
    memory: {
      topic: "metric_change",
      metricId,
      platformId: activePlatform,
      lastMetric: metricId,
      lastPlatform: activePlatform,
      lastTopic: "metric_change",
    },
  };
}

function buildProductsFollowUp(
  context: AskAriaFullContext,
  metricId: MetricId,
  role: UserRole,
  scope: ResolvedQueryScope,
): AskAriaMessage {
  const { current, comparison } = filterForScope(context, scope);
  const ranked = rankProducts(current, 8);
  const declining = ranked
    .map((row) => {
      const prevRecords = comparison.filter(
        (r) => r.productId === row.productId,
      );
      const curRev = row.revenue;
      const prevRev = aggregateMetric(prevRecords, "revenue", "sum");
      const pct = calculatePercentageChange(curRev, prevRev);
      return { ...row, pct };
    })
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 8);

  const formatted = formatProductsFollowUp(
    role,
    metricName(metricId),
    declining.map((row) => ({
      productId: row.productId,
      platformId: row.platformId,
      pct: row.pct,
    })),
  );

  const top = declining[0];

  return {
    id: createMessageId(),
    kind: "insight",
    title: formatted.title,
    summary: `${formatted.summary} Scope: ${scope.scopeLabel}.`,
    sections: prependAnalysisSections(context, scope, [
      insightSection("contributors", "Contributors", formatted.lines),
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

  return {
    id: createMessageId(),
    kind: "insight",
    title,
    summary: `${metricName(focusMetric)} and related metrics for ${platformLabel}, compared with the prior baseline window in the synthetic dataset.`,
    sections: prependAnalysisSections(context, scope, [
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
): AskAriaMessage {
  const { current, comparison } = filterForScope(context, scope);
  const revenue = metricDelta(current, comparison, "gross_sales");
  const roas = metricDelta(current, comparison, "roas");

  return {
    id: createMessageId(),
    kind: "insight",
    title: "Business summary",
    summary: `Executive view for ${scope.scopeLabel}.`,
    sections: prependAnalysisSections(context, scope, [
      insightSection("major_changes", "Major changes", [
        `Gross Sales ${formatPct(revenue.pct)} vs comparison period.`,
        `ROAS ${formatPct(roas.pct)} vs comparison period.`,
      ]),
      insightSection("risks", "Risks", [
        "Platforms with simultaneous order and conversion pressure.",
        "Accounts with declining revenue concentration in top SKUs.",
      ]),
      insightSection("growth", "Growth", [
        "Platforms with positive revenue and stable ROAS in the current window.",
      ]),
    ]),
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

export function buildProactiveInsight(
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

export function processAskAriaMessage(
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

  const intent = classifyIntent(trimmed, memory);
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
    const draft = memory.pendingActionDraft;
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
      partial = enrichEmailDraft(partial, context, {
        artifact,
        userEmail: options?.appUserEmail,
        includeArtifact,
      });
    }

    const draft = buildActionDraft(partial);
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
    return {
      messages: [userMessage, buildBrandAnalysisMessage(context, role, scope)],
      memory: {
        topic: "metric_change",
        lastTopic: "brand_analysis",
        platformId: scopedPlatform,
        lastPlatform: scopedPlatform,
      },
    };
  }

  if (intent === "platform_analysis") {
    return {
      messages: [
        userMessage,
        buildPlatformComparisonMessage(context, role, scope),
      ],
      memory: {
        topic: "metric_change",
        lastTopic: "platform_analysis",
        platformId: scopedPlatform,
        lastPlatform: scopedPlatform,
      },
    };
  }

  if (intent === "product_analysis") {
    const followMetric = memory.lastMetric ?? memory.metricId ?? metricId;
    const productScope = resolveQueryScope(trimmed, memory, context, intent);
    return {
      messages: [
        userMessage,
        buildProductsFollowUp(context, followMetric, role, productScope),
      ],
      memory: {
        ...memory,
        topic: "products",
        metricId: followMetric,
        lastMetric: followMetric,
        lastTopic: "metric_change",
        lastPlatform: memoryPlatformFromScope(productScope, context),
        platformId: memoryPlatformFromScope(productScope, context),
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
          summary: `Prior ${metricName(focusMetric)} declines in the available workspace history for ${scope.scopeLabel}.`,
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

  if (intent === "executive_summary") {
    if (role === "CXO") {
      return {
        messages: [userMessage, buildExecutiveSummary(context, scope)],
        memory: {
          topic: "metric_change",
          metricId,
          platformId: scopedPlatform,
          lastTopic: "executive_summary",
        },
      };
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
      return {
        messages: [userMessage, buildExecutiveSummary(context, scope)],
        memory: {
          topic: "metric_change",
          metricId,
          platformId: scopedPlatform,
          lastTopic: "general_performance",
        },
      };
    }
    if (role === "KAM") {
      return {
        messages: [userMessage, buildBrandAnalysisMessage(context, role, scope)],
        memory: {
          topic: "metric_change",
          lastTopic: "brand_analysis",
          platformId: scopedPlatform,
          lastPlatform: scopedPlatform,
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
