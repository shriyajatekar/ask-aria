import { classifyIntent } from "@/components/dashboard/ask-aria/ask-aria-intent";
import { processAskAriaMessage } from "@/components/dashboard/ask-aria/ask-aria-intelligence";
import type {
  AskAriaFullContext,
  AskAriaInvestigationMemory,
  AskAriaMessage,
} from "@/components/dashboard/ask-aria/ask-aria-types";
import type { WorkspaceConnectionState } from "@/components/dashboard/ask-aria/ask-aria-tool-mapping";
import type { UserRole } from "@/lib/auth/types";
import { getRegistryPlatformIds } from "@/lib/dashboard/consolidated-platforms";
import { getDefaultDashboardRanges } from "@/lib/dashboard/date-ranges";

export function makeContext(
  overrides: Partial<AskAriaFullContext> = {},
): AskAriaFullContext {
  const ranges = getDefaultDashboardRanges();
  return {
    role: "ANALYST",
    analyticsMode: "summary",
    platform: "all",
    focusMetric: "gross_sales",
    chartMetrics: ["gross_sales"],
    consolidatedChartMetric: "gross_sales",
    consolidatedSelectedPlatformIds: getRegistryPlatformIds(),
    dateRangePreset: "30",
    dateRange: ranges.dateRange,
    comparisonPeriod: ranges.comparisonPeriod,
    brandId: null,
    category: null,
    subcategory: null,
    productId: null,
    ...overrides,
  };
}

/** Demo workspace already connected, as after the simulated Connect Google step. */
export const DEMO_CONNECTED: WorkspaceConnectionState = {
  googleOAuthConfigured: false,
  googleOAuthConnected: false,
  googleDemoConnected: true,
  microsoftDemoConnected: false,
};

export interface Turn {
  text: string;
  intent: string;
  reply: AskAriaMessage[];
  memory: AskAriaInvestigationMemory;
}

/** Runs a multi-turn conversation through the same function the chat panel uses. */
export function converse(
  role: UserRole,
  texts: string[],
  context: AskAriaFullContext = makeContext({ role }),
  connection: WorkspaceConnectionState = DEMO_CONNECTED,
): Turn[] {
  let memory: AskAriaInvestigationMemory = {};
  let history: AskAriaMessage[] = [];
  return texts.map((text) => {
    const intent = classifyIntent(text, memory, context);
    const result = processAskAriaMessage(text, context, memory, role, connection, {
      recentMessages: history,
    });
    history = [...history, ...result.messages];
    memory = result.memory;
    return {
      text,
      intent,
      reply: result.messages.filter((m) => m.kind !== "user"),
      memory,
    };
  });
}

export function ask(role: UserRole, text: string, context?: AskAriaFullContext) {
  return converse(role, [text], context)[0];
}

export function titleOf(message: AskAriaMessage | undefined): string {
  if (!message) return "";
  return "title" in message && typeof message.title === "string"
    ? message.title
    : "";
}
