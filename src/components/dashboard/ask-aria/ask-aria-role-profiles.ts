import type { UserRole } from "@/lib/auth/types";
import type { MetricId, PlatformId } from "@/types/analytics";

import type { AskAriaHandoff } from "./ask-aria-types";

import { METRIC_BY_ID } from "@/data/metrics";
import { PLATFORM_BY_ID } from "@/data/platforms";
import { PRODUCT_BY_ID } from "@/data/products";

import { formatMetricValue } from "@/lib/ask-aria/monitors";

import { insightSection } from "./ask-aria-insight-sections";
import type { AskAriaInsightSection } from "./ask-aria-types";

export type ResponseDepth = "detailed" | "business" | "executive";

export interface RoleProfile {
  role: UserRole;
  responseDepth: ResponseDepth;
  /** Plain-language job focus for demo role-aware UX copy. */
  jobFocus: string;
  priorities: string[];
  productListLimit: number;
  includeCampaignDetail: boolean;
}

/** Demo-user role configuration (portfolio demo; not production RBAC). */
export interface DemoUserAriaConfig {
  userId: string;
  displayName: string;
  role: UserRole;
  jobFocus: string;
  ariaPriorities: string[];
}

export const DEMO_USER_ARIA_CONFIG: Record<string, DemoUserAriaConfig> = {
  "demo-raghav": {
    userId: "demo-raghav",
    displayName: "Raghav",
    role: "ANALYST",
    jobFocus:
      "Investigate performance, identify drivers, compare metrics and platforms, and diagnose anomalies.",
    ariaPriorities: [
      "investigation",
      "diagnosis",
      "comparisons",
      "affected products and platforms",
      "evidence",
      "deeper analysis",
    ],
  },
  "demo-yuga": {
    userId: "demo-yuga",
    displayName: "Yuga",
    role: "KAM",
    jobFocus:
      "Monitor account and platform performance, surface client-facing issues, and prepare follow-ups and communication.",
    ariaPriorities: [
      "account and platform health",
      "client-impacting changes",
      "risks and opportunities",
      "affected products",
      "communication",
      "follow-up actions",
      "email drafts",
    ],
  },
  "demo-sri": {
    userId: "demo-sri",
    displayName: "Sri",
    role: "CXO",
    jobFocus:
      "Understand business health, material movements, risks, growth, and decision-level implications.",
    ariaPriorities: [
      "executive summary",
      "significant changes",
      "business risks",
      "growth opportunities",
      "cross-platform performance",
      "decision-level implications",
      "leadership summaries and reports",
    ],
  },
};

export function getDemoUserAriaConfig(
  userId: string | null | undefined,
): DemoUserAriaConfig | undefined {
  if (!userId) return undefined;
  return DEMO_USER_ARIA_CONFIG[userId];
}

export interface MetricChangeEvidence {
  metricId: MetricId;
  metricLabel: string;
  platformLabel: string;
  directionWord: string;
  primaryPct: string;
  primaryCur: number;
  primaryPrev: number;
  primaryDirection: "up" | "down" | "flat";
  ordersPct: string;
  ordersDirection: "up" | "down" | "flat";
  conversionPct: string;
  conversionDirection: "up" | "down" | "flat";
  largestPlatform: PlatformId | null;
  largestPlatformName: string | null;
}

export interface RecommendationEvidence {
  metricId: MetricId;
  metricLabel: string;
  platformName: string;
  focusPct: string;
  focusDirection: "up" | "down" | "flat";
  focusCur: number;
  focusPrev: number;
  roasCur: number;
  roasPrev: number;
  topProductName: string;
  topProductId?: string;
  topPlatformId?: PlatformId;
}

const PROFILES: Record<UserRole, RoleProfile> = {
  ANALYST: {
    role: "ANALYST",
    responseDepth: "detailed",
    jobFocus: DEMO_USER_ARIA_CONFIG["demo-raghav"].jobFocus,
    priorities: [
      "metric investigation",
      "anomalies",
      "platform and SKU evidence",
      "period comparison",
      "root-cause paths",
    ],
    productListLimit: 5,
    includeCampaignDetail: true,
  },
  KAM: {
    role: "KAM",
    responseDepth: "business",
    jobFocus: DEMO_USER_ARIA_CONFIG["demo-yuga"].jobFocus,
    priorities: [
      "brand and account health",
      "revenue risk",
      "client-facing opportunities",
      "period movement",
    ],
    productListLimit: 3,
    includeCampaignDetail: false,
  },
  CXO: {
    role: "CXO",
    responseDepth: "executive",
    jobFocus: DEMO_USER_ARIA_CONFIG["demo-sri"].jobFocus,
    priorities: [
      "business performance",
      "material risks",
      "growth drivers",
      "strategic next steps",
    ],
    productListLimit: 1,
    includeCampaignDetail: false,
  },
};

export function getRoleProfile(role: UserRole): RoleProfile {
  return PROFILES[role] ?? PROFILES.ANALYST;
}

export function cxoOperationalActionMessage(platformName: string): string {
  return `This action requires an operational role. I can explain the expected impact on ${platformName} and highlight the affected campaign for your team to execute.`;
}

export function formatInsightFromEvidence(
  role: UserRole,
  evidence: MetricChangeEvidence,
): {
  title: string;
  summary: string;
  sections: AskAriaInsightSection[];
} {
  const {
    metricId,
    metricLabel,
    platformLabel,
    directionWord,
    primaryPct,
    primaryCur,
    primaryPrev,
    ordersPct,
    ordersDirection,
    conversionPct,
    conversionDirection,
    largestPlatformName,
  } = evidence;

  const formatPrimary = (value: number) => formatMetricValue(metricId, value);

  const ordersMovementLine = formatAssociatedMetricMovement(
    "Orders",
    ordersDirection,
    ordersPct,
  );
  const conversionMovementLine = formatAssociatedMetricMovement(
    "Conversion Rate",
    conversionDirection,
    conversionPct,
  );

  const movementAssociationLine = largestPlatformName
    ? `${largestPlatformName} shows the largest associated platform movement.`
    : platformLabel !== "selected platforms"
      ? `Review ${platformLabel} for the largest associated shift.`
      : "Use platform and product views to see platform-level movement.";

  const whatChangedAlongsideLines = [
    ordersMovementLine,
    conversionMovementLine,
    ...(largestPlatformName
      ? [`${largestPlatformName} shows the largest associated platform movement.`]
      : platformLabel !== "selected platforms"
        ? [`Review ${platformLabel} for associated platform movement.`]
        : []),
  ];

  if (role === "CXO") {
    return {
      title: `Executive summary — ${metricLabel}`,
      summary: `${metricLabel} ${directionWord} ${primaryPct} versus the comparison period. The movement is relevant to overall marketing efficiency${largestPlatformName ? `, with ${largestPlatformName} showing the largest associated change` : ` on ${platformLabel}`}.`,
      sections: [
        insightSection("executive_summary", "Executive summary", [
          `${metricLabel} moved from ${formatPrimary(primaryPrev)} to ${formatPrimary(primaryCur)} (${primaryPct}) in the active workspace window.`,
        ]),
        insightSection(
          "what_changed_alongside",
          "What changed alongside it",
          whatChangedAlongsideLines,
        ),
        insightSection("business_risk", "Business risk", [
          evidence.primaryDirection === "down"
            ? "Sustained decline could pressure revenue and marketing efficiency if not addressed at the portfolio level."
            : "Monitor whether growth is concentrated in a few channels before scaling spend.",
        ]),
        insightSection("opportunity_next_step", "Opportunity / next step", [
          "Request a cross-platform summary or direct your team to validate the largest contributing channel.",
        ]),
      ],
    };
  }

  if (role === "KAM") {
    return {
      title: `${metricLabel} — account view`,
      summary: `${metricLabel} ${directionWord} ${primaryPct} versus the comparison period. ${movementAssociationLine}${largestPlatformName ? " This may warrant account follow-up." : ""}`,
      sections: [
        insightSection("business_impact", "Business impact", [
          `${metricLabel} is ${formatPrimary(primaryCur)} versus ${formatPrimary(primaryPrev)} (${primaryPct}) across the current selection.`,
        ]),
        insightSection("what_changed_alongside", "What changed alongside it", [
          ...whatChangedAlongsideLines,
          ...(largestPlatformName
            ? []
            : ["Review brand concentration within the current selection."]),
        ]),
        insightSection("opportunity_concern", "Opportunity / concern", [
          evidence.primaryDirection === "down"
            ? "Declining efficiency or demand may require a proactive client conversation."
            : "Positive movement may support a growth story with key accounts.",
        ]),
        insightSection("recommended_next_step", "Recommended next step", [
          "Validate top brands and products before your next client meeting.",
        ]),
      ],
    };
  }

  return {
    title: `${metricLabel} — investigation`,
    summary: `${metricLabel} ${directionWord} ${primaryPct} versus the comparison period. ${movementAssociationLine}`,
    sections: [
      insightSection("what_happened", "What happened", [
        `${metricLabel} changed from ${formatPrimary(primaryPrev)} to ${formatPrimary(primaryCur)} (${primaryPct}) versus the comparison period.`,
        `Orders ${ordersDirection === "down" ? "↓" : ordersDirection === "up" ? "↑" : "→"} ${ordersPct}; Conversion Rate ${conversionDirection === "down" ? "↓" : conversionDirection === "up" ? "↑" : "→"} ${conversionPct}.`,
      ]),
      insightSection("what_changed_alongside", "What changed alongside it", [
        ...whatChangedAlongsideLines,
        ...(largestPlatformName
          ? []
          : ["Use product and campaign views to see platform-level movement."]),
      ]),
      insightSection("evidence", "Evidence", [
        `Current period ${metricLabel}: ${formatPrimary(primaryCur)}`,
        `Comparison period ${metricLabel}: ${formatPrimary(primaryPrev)}`,
        `Supporting metrics: Orders ${ordersPct}, Conversion ${conversionPct}.`,
      ]),
      insightSection("what_to_investigate", "What to investigate", [
        "Product/SKU order and conversion movement on the largest contributing platform.",
        "Campaign efficiency (ROAS/ACOS) if spend remained elevated.",
        "Placement and targeting changes if available in campaign data.",
      ]),
    ],
  };
}

export interface BrandMovementRow {
  brandId: string;
  brandName: string;
  pct: number;
  current: number;
  previous: number;
}

export function formatBrandAnalysis(
  role: UserRole,
  rows: BrandMovementRow[],
): { title: string; summary: string; sections: AskAriaInsightSection[] } {
  const declining = rows.filter((row) => row.pct < 0).slice(0, 5);
  const growing = rows.filter((row) => row.pct > 0).slice(-3).reverse();

  if (role === "CXO") {
    const topRisk = declining[0];
    const topGrowth = growing[0];
    return {
      title: "Brands — leadership view",
      summary: topRisk
        ? `${topRisk.brandName} shows the largest revenue decline (${formatPct(topRisk.pct)}) in the current filters.`
        : "No brand-level declines exceed the current threshold in the active filters.",
      sections: [
        insightSection(
          "material_brand_movement",
          "Material brand movement",
          declining.length
            ? declining.map(
                (row) =>
                  `${row.brandName}: revenue ${formatPct(row.pct)} vs comparison period`,
              )
            : ["No significant brand-level declines in the current window."],
        ),
        insightSection(
          "growth_signal",
          "Growth signal",
          topGrowth
            ? [`${topGrowth.brandName}: revenue ${formatPct(topGrowth.pct)} vs comparison period`]
            : ["No standout brand growth in the current window."],
        ),
        insightSection("strategic_next_step", "Strategic next step", [
          "Direct commercial leads to validate account plans for the most affected brands.",
        ]),
      ],
    };
  }

  if (role === "KAM") {
    return {
      title: "Brands needing attention",
      summary: "Account-level revenue movement for the active workspace filters.",
      sections: [
        insightSection(
          "accounts_to_review",
          "Accounts to review",
          declining.length
            ? declining.map(
                (row) =>
                  `${row.brandName}: revenue ${formatPct(row.pct)} — discuss drivers with the client`,
              )
            : ["No brands require urgent attention in the current window."],
        ),
        insightSection(
          "growth_opportunities",
          "Growth opportunities",
          growing.length
            ? growing.map(
                (row) =>
                  `${row.brandName}: revenue ${formatPct(row.pct)} — potential positive client story`,
              )
            : ["Limited positive brand movement in the current filters."],
        ),
      ],
    };
  }

  return {
    title: "Brand performance investigation",
    summary: "Brands ranked by revenue change versus the comparison period.",
    sections: [
      insightSection(
        "declining_brands_evidence",
        "Declining brands (evidence)",
        declining.length
          ? declining.map(
              (row) =>
                `${row.brandName}: ${formatMetricValue("gross_sales", row.current)} vs ${formatMetricValue("gross_sales", row.previous)} (${formatPct(row.pct)})`,
            )
          : ["No brand-level declines in the current filters."],
      ),
      insightSection(
        "growing_brands",
        "Growing brands",
        growing.length
          ? growing.map(
              (row) =>
                `${row.brandName}: revenue ${formatPct(row.pct)} vs comparison period`,
            )
          : ["No material brand growth in the current filters."],
      ),
      insightSection("next_investigation", "Next investigation", [
        "Drill into products and platforms for the top declining brand.",
      ]),
    ],
  };
}

export function formatRecommendationFromEvidence(
  role: UserRole,
  evidence: RecommendationEvidence,
): {
  observation: string;
  why: string;
  recommendation: string;
  expectedConsideration: string;
  nextAction: string;
} {
  const {
    metricLabel,
    platformName,
    focusPct,
    focusDirection,
    focusCur,
    focusPrev,
    roasCur,
    roasPrev,
    topProductName,
  } = evidence;

  const evidenceText = `${metricLabel}: ${focusCur.toFixed(2)} vs ${focusPrev.toFixed(2)} (${focusPct}). ROAS: ${roasCur.toFixed(2)} vs ${roasPrev.toFixed(2)}.`;

  if (role === "CXO") {
    return {
      observation: `${metricLabel} on ${platformName} moved ${focusPct} period-over-period in the current workspace.`,
      why:
        focusDirection === "down"
          ? "The data indicates efficiency or demand pressure that leadership should monitor."
          : "Momentum is positive relative to the comparison window.",
      recommendation:
        "Prioritize a leadership review of the largest revenue and efficiency movers before committing additional spend.",
      expectedConsideration:
        "Validate cross-platform concentration and major account risks with your commercial team.",
      nextAction:
        "Request an executive summary or direct your team to validate drivers on priority platforms.",
    };
  }

  if (role === "KAM") {
    return {
      observation: `Account performance on ${platformName} shows ${focusPct} movement in ${metricLabel}.`,
      why:
        focusDirection === "down"
          ? "Recent performance suggests declining efficiency or demand that may affect client outcomes."
          : "Performance is improving; reinforce what is working with the client.",
      recommendation: `Discuss ${topProductName} and related campaigns with the client before changing spend.`,
      expectedConsideration:
        "Frame changes around revenue risk and growth opportunities, not only campaign mechanics.",
      nextAction: `Review brand and product contributors on ${platformName}, then align on next steps with the client.`,
    };
  }

  return {
    observation: `${metricLabel} on ${platformName} shows ${focusPct} period-over-period movement in the current workspace.`,
    why:
      focusDirection === "down"
        ? "Recent performance shows declining efficiency or demand while spend may still be elevated."
        : "Momentum is positive; the data suggests reinforcing what is already working before broad changes.",
    recommendation: `Review campaigns with declining ROAS before increasing spend. Prioritize ${topProductName} for conversion and assortment checks.`,
    expectedConsideration:
      "Validate inventory, buy box share, and campaign bids before committing budget changes.",
    nextAction: `Investigate product-level contributors on ${platformName}, then consider a bid review — or set a monitor on ${platformName} ROAS with a threshold you choose.`,
  };
}

export interface ProductsFollowUpFormatOptions {
  scopeLabel: string;
  metricId: MetricId;
  productLevelCausality: boolean;
  investigationDirection?: "up" | "down" | "flat";
  rankingDimension?: "metric" | "revenue";
}

export function formatProductsFollowUp(
  role: UserRole,
  metricLabel: string,
  rows: Array<{
    productId: string;
    platformId: PlatformId;
    pct: number;
  }>,
  options?: ProductsFollowUpFormatOptions,
): {
  title: string;
  summary: string;
  lines: string[];
  sectionHeading?: string;
} {
  const profile = getRoleProfile(role);
  const limited = rows.slice(0, profile.productListLimit);
  const scopeLabel = options?.scopeLabel ?? "this scope";
  const metricId = options?.metricId;
  const useMetricLines =
    metricId === "roas" ||
    metricId === "acos" ||
    metricId === "conversion_rate";
  const rankingByRevenue =
    options?.rankingDimension === "revenue" && useMetricLines;
  const valueLabel = rankingByRevenue
    ? "revenue"
    : useMetricLines
      ? metricLabel
      : "revenue";
  const honestMovement =
    options &&
    !options.productLevelCausality &&
    options.investigationDirection === "down" &&
    useMetricLines &&
    !rankingByRevenue;
  const revenueWithinInvestigationSummary = rankingByRevenue
    ? `Products with the largest revenue movement within this ${metricLabel} investigation in ${scopeLabel}.`
    : null;

  if (role === "CXO") {
    const top = limited[0];
    const topName = top
      ? PRODUCT_BY_ID[top.productId]?.name ?? top.productId
      : "priority SKU";
    return {
      title: "Product movement (summary)",
      sectionHeading: "Products to investigate",
      summary:
        revenueWithinInvestigationSummary ??
        (honestMovement
          ? `No SKU-level ${metricLabel} decline is clear in ${scopeLabel}; ${topName} shows the largest ${metricLabel} movement in scope.`
          : `${rows.length} product${rows.length === 1 ? "" : "s"} with notable ${valueLabel} movement in ${scopeLabel}.`),
      lines: top
        ? [
            `${topName}: ${valueLabel} ${formatPct(top.pct)} vs comparison period (largest movement in scope).`,
            "Ask for a detailed product list if you need SKU-level evidence for your team.",
          ]
        : ["No product-level variance found in the current filters."],
    };
  }

  if (role === "KAM") {
    return {
      title: "Products to investigate",
      sectionHeading: "Products to investigate",
      summary:
        revenueWithinInvestigationSummary ??
        (honestMovement
          ? `Product-level ${metricLabel} does not clearly explain the account move; these SKUs show the largest ${metricLabel} movement within ${scopeLabel}.`
          : `Largest ${valueLabel} movement related to ${metricLabel} within ${scopeLabel}.`),
      lines: limited.length
        ? limited.map((row) => {
            const name = PRODUCT_BY_ID[row.productId]?.name ?? row.productId;
            const platform =
              PLATFORM_BY_ID[row.platformId]?.name ?? row.platformId;
            return `${name} (${platform}): ${valueLabel} ${formatPct(row.pct)} vs comparison period`;
          })
        : ["No product-level variance found in the current filters."],
    };
  }

  return {
    title: honestMovement ? "Products to investigate" : "Products to investigate",
    sectionHeading: "Products to investigate",
    summary:
      revenueWithinInvestigationSummary ??
      (honestMovement
        ? `No clear product-level ${metricLabel} decline in ${scopeLabel}; listed SKUs show the largest ${metricLabel} movement in this scope (not necessarily the driver of the change).`
        : `Largest ${valueLabel} movement for ${metricLabel} within ${scopeLabel}.`),
    lines: limited.length
      ? limited.map((row) => {
          const name = PRODUCT_BY_ID[row.productId]?.name ?? row.productId;
          return `${name}: ${valueLabel} ${formatPct(row.pct)} vs comparison period`;
        })
      : ["No product-level variance found in the current filters."],
  };
}

function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatAssociatedMetricMovement(
  label: string,
  direction: "up" | "down" | "flat",
  pct: string,
): string {
  if (direction === "up") {
    return `${label} increased ${pct}.`;
  }
  if (direction === "down") {
    const magnitude = pct.startsWith("-") || pct.startsWith("+")
      ? pct.slice(1)
      : pct;
    return `${label} declined ${magnitude}.`;
  }
  return `${label} was flat (${pct}).`;
}

export function metricLabel(id: MetricId): string {
  return METRIC_BY_ID[id]?.name ?? id;
}

const MAX_ROLE_HANDOFFS = 4;

/** Prioritize (not hide) post-insight handoffs by demo role. */
export function buildRolePrioritizedInsightHandoffs(
  role: UserRole,
  options: {
    scopeLabel: string;
    platformId?: PlatformId;
    productId?: string;
    productPlatformId?: PlatformId;
    monitorPrompt: string;
  },
): AskAriaHandoff[] {
  const platformName =
    options.platformId
      ? PLATFORM_BY_ID[options.platformId]?.name ?? options.scopeLabel
      : options.scopeLabel;
  const monitorHandoff: AskAriaHandoff | null = options.platformId
    ? {
        label: "Monitor this metric",
        platformId: options.platformId,
        prompt: options.monitorPrompt,
      }
    : {
        label: "Monitor this metric",
        prompt: options.monitorPrompt,
      };

  let ordered: AskAriaHandoff[] = [];

  if (role === "ANALYST") {
    ordered = [
      ...(options.platformId
        ? [
            {
              label: "Break down platform",
              platformId: options.platformId,
              prompt: `Break down ${platformName}`,
            },
            {
              label: "View affected platform",
              platformId: options.platformId,
            },
          ]
        : []),
      { label: "Compare platform ROAS", prompt: "Compare platform ROAS" },
      {
        label: "Show affected products",
        prompt: "Which products are affecting performance?",
      },
      {
        label: "Create analysis report",
        prompt: "Create a report from this analysis",
      },
      ...(monitorHandoff ? [monitorHandoff] : []),
    ];
  } else if (role === "KAM") {
    ordered = [
      {
        label: "Show account impact",
        prompt: `Show account impact for ${platformName}`,
      },
      {
        label: "Draft client update",
        prompt: "Draft a client update",
      },
      { label: "Compare key platforms", prompt: "Compare platform ROAS" },
      {
        label: "Show affected products",
        prompt: "Which products are affecting account performance?",
      },
      ...(options.platformId
        ? [{ label: "View platform", platformId: options.platformId }]
        : []),
      {
        label: "Create report",
        prompt: "Create a report from this analysis",
      },
      ...(monitorHandoff ? [monitorHandoff] : []),
    ];
  } else {
    ordered = [
      {
        label: "Summarize business impact",
        prompt: "Give me an executive summary.",
      },
      {
        label: "Show biggest risks",
        prompt: "What are our biggest risks?",
      },
      {
        label: "Compare platform performance",
        prompt: "Compare platform ROAS",
      },
      {
        label: "Create leadership summary",
        prompt: "Create a report from this analysis",
      },
      ...(options.platformId
        ? [{ label: "View platform", platformId: options.platformId }]
        : []),
      ...(monitorHandoff ? [monitorHandoff] : []),
    ];
  }

  if (options.productId) {
    ordered.unshift({
      label: "View product analysis",
      productId: options.productId,
      platformId: options.productPlatformId,
    });
  }

  const unique: AskAriaHandoff[] = [];
  for (const handoff of ordered) {
    const key = `${handoff.label}-${handoff.platformId ?? ""}-${handoff.productId ?? ""}-${handoff.prompt ?? ""}`;
    if (!unique.some((item) => `${item.label}-${item.platformId ?? ""}-${item.productId ?? ""}-${item.prompt ?? ""}` === key)) {
      unique.push(handoff);
    }
    if (unique.length >= MAX_ROLE_HANDOFFS) break;
  }
  return unique;
}
