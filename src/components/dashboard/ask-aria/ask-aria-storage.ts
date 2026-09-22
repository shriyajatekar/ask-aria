import type { UserRole } from "@/lib/auth/types";
import type { PlatformId } from "@/types/analytics";

import type {
  AskAriaActionLogEntry,
  AskAriaConversation,
  AskAriaConversationSnapshot,
  AskAriaFullContext,
  AskAriaInvestigationMemory,
  AskAriaMessage,
} from "./ask-aria-types";
import {
  activeConversationStorageKey,
  actionLogStorageKey,
  conversationsStorageKey,
  resolveAskAriaWorkspaceId,
} from "./ask-aria-user-scope";

/** Pre–05D.14 global bucket; migrated once into the first signed-in user. */
const LEGACY_GLOBAL_CONVERSATIONS_KEY = "ci-ask-aria-conversations-v1";
const LEGACY_CONVERSATIONS_KEY = "ci-ask-aria-conversations";
const LEGACY_GLOBAL_ACTIVE_KEY = "ci-ask-aria-active-conversation-v1";
const LEGACY_MIGRATION_FLAG = "ci-ask-aria-legacy-migrated-v1";

const MAX_CONVERSATIONS = 24;
const MAX_ACTION_LOG = 40;

const DEFAULT_ROLE: UserRole = "ANALYST";

function defaultSavedContext(): AskAriaFullContext {
  return {
    role: DEFAULT_ROLE,
    analyticsMode: "summary",
    platform: "all",
    focusMetric: "gross_sales",
    chartMetrics: ["gross_sales"],
    consolidatedChartMetric: "gross_sales",
    consolidatedSelectedPlatformIds: [],
    dateRangePreset: "30",
    dateRange: { start: "2026-01-01", end: "2026-01-31" },
    comparisonPeriod: { start: "2025-12-01", end: "2025-12-31" },
    brandId: null,
    category: null,
    subcategory: null,
    productId: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function snapshotToSavedContext(
  snapshot: AskAriaConversationSnapshot,
  role: UserRole,
): AskAriaFullContext {
  const base = defaultSavedContext();
  return {
    ...base,
    role,
    platform: snapshot.platform,
    analyticsMode: snapshot.analyticsMode,
    dateRange: snapshot.dateRange,
    comparisonPeriod: snapshot.comparisonPeriod,
    focusMetric: snapshot.focusMetric,
    consolidatedChartMetric: snapshot.focusMetric,
    brandId: snapshot.brandId,
    productId: snapshot.productId,
  };
}

function normalizeMemory(value: unknown): AskAriaInvestigationMemory {
  if (!isRecord(value)) return {};
  return value as AskAriaInvestigationMemory;
}

function normalizeMessages(value: unknown): AskAriaMessage[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => isRecord(item) && typeof item.id === "string");
}

function normalizeConversation(
  raw: unknown,
  fallbackUserId?: string,
): AskAriaConversation | null {
  if (!isRecord(raw) || typeof raw.id !== "string") return null;

  const userId =
    typeof raw.userId === "string" && raw.userId.trim()
      ? raw.userId
      : fallbackUserId;
  if (!userId) return null;

  const workspaceId =
    typeof raw.workspaceId === "string" && raw.workspaceId.trim()
      ? raw.workspaceId
      : resolveAskAriaWorkspaceId();

  const updatedAt =
    typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now();
  const createdAt =
    typeof raw.createdAt === "number" ? raw.createdAt : updatedAt;
  const role =
    raw.role === "ANALYST" || raw.role === "KAM" || raw.role === "CXO"
      ? raw.role
      : DEFAULT_ROLE;

  let savedContext: AskAriaFullContext;
  if (isRecord(raw.savedContext)) {
    savedContext = {
      ...defaultSavedContext(),
      ...(raw.savedContext as unknown as AskAriaFullContext),
      role,
    };
  } else if (isRecord(raw.snapshot)) {
    savedContext = snapshotToSavedContext(
      raw.snapshot as unknown as AskAriaConversationSnapshot,
      role,
    );
  } else {
    savedContext = { ...defaultSavedContext(), role };
  }

  const title =
    typeof raw.title === "string" && raw.title.trim()
      ? raw.title
      : "New conversation";

  const lastCapabilityKind =
    typeof raw.lastCapabilityKind === "string"
      ? (raw.lastCapabilityKind as AskAriaConversation["lastCapabilityKind"])
      : undefined;

  return {
    id: raw.id,
    title,
    createdAt,
    updatedAt,
    role,
    userId,
    workspaceId,
    messages: normalizeMessages(raw.messages),
    memory: normalizeMemory(raw.memory),
    savedContext,
    lastCapabilityKind,
  };
}

function readLegacyGlobalConversations(): unknown[] {
  if (typeof window === "undefined") return [];
  const keys = [LEGACY_GLOBAL_CONVERSATIONS_KEY, LEGACY_CONVERSATIONS_KEY];
  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed;
    } catch {
      continue;
    }
  }
  return [];
}

/**
 * One-time migration of pre-scoped localStorage into the first user who loads Ask Aria.
 * Prototype-only; production would use server-backed tenancy.
 */
function migrateLegacyGlobalToUser(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(LEGACY_MIGRATION_FLAG)) return;

    const userKey = conversationsStorageKey(userId);
    if (window.localStorage.getItem(userKey)) {
      window.localStorage.setItem(LEGACY_MIGRATION_FLAG, userId);
      return;
    }

    const legacyItems = readLegacyGlobalConversations();
    if (legacyItems.length === 0) {
      window.localStorage.setItem(LEGACY_MIGRATION_FLAG, "none");
      return;
    }

    const workspaceId = resolveAskAriaWorkspaceId();
    const migrated = legacyItems
      .map((item) => normalizeConversation(item, userId))
      .filter((item): item is AskAriaConversation => item !== null)
      .map((item) => ({ ...item, userId, workspaceId }));

    if (migrated.length > 0) {
      window.localStorage.setItem(userKey, JSON.stringify(migrated));
    }

    const legacyActive = window.localStorage.getItem(LEGACY_GLOBAL_ACTIVE_KEY);
    if (legacyActive && migrated.some((c) => c.id === legacyActive)) {
      window.localStorage.setItem(
        activeConversationStorageKey(userId),
        legacyActive,
      );
    }

    window.localStorage.removeItem(LEGACY_GLOBAL_CONVERSATIONS_KEY);
    window.localStorage.removeItem(LEGACY_CONVERSATIONS_KEY);
    window.localStorage.removeItem(LEGACY_GLOBAL_ACTIVE_KEY);
    window.localStorage.setItem(LEGACY_MIGRATION_FLAG, userId);
  } catch {
    window.localStorage.setItem(LEGACY_MIGRATION_FLAG, "error");
  }
}

function readUserConversationsRaw(userId: string): unknown[] {
  if (typeof window === "undefined") return [];
  migrateLegacyGlobalToUser(userId);
  try {
    const raw = window.localStorage.getItem(conversationsStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadConversations(userId: string): AskAriaConversation[] {
  const normalized = readUserConversationsRaw(userId)
    .map((item) => normalizeConversation(item))
    .filter(
      (item): item is AskAriaConversation =>
        item !== null && item.userId === userId,
    )
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_CONVERSATIONS);

  if (typeof window !== "undefined" && normalized.length > 0) {
    saveConversations(userId, normalized);
  }

  return normalized;
}

export function saveConversations(
  userId: string,
  conversations: AskAriaConversation[],
): void {
  if (typeof window === "undefined") return;
  const workspaceId = resolveAskAriaWorkspaceId();
  const trimmed = conversations
    .filter((item) => item.userId === userId)
    .map((item) => ({
      ...item,
      userId,
      workspaceId: item.workspaceId || workspaceId,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_CONVERSATIONS);
  try {
    window.localStorage.setItem(
      conversationsStorageKey(userId),
      JSON.stringify(trimmed),
    );
  } catch {
    // ignore quota errors
  }
}

export function loadActiveConversationId(userId: string): string | null {
  if (typeof window === "undefined") return null;
  migrateLegacyGlobalToUser(userId);
  try {
    const id = window.localStorage.getItem(
      activeConversationStorageKey(userId),
    );
    return id && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

export function saveActiveConversationId(
  userId: string,
  id: string | null,
): void {
  if (typeof window === "undefined") return;
  try {
    const key = activeConversationStorageKey(userId);
    if (!id) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, id);
  } catch {
    // ignore
  }
}

function normalizeActionLogEntry(raw: unknown): AskAriaActionLogEntry | null {
  if (!isRecord(raw) || typeof raw.id !== "string") return null;
  if (typeof raw.label !== "string") return null;
  if (typeof raw.timestamp !== "number") return null;
  const status = raw.status;
  if (
    status !== "blocked" &&
    status !== "cancelled" &&
    status !== "confirmed" &&
    status !== "scheduled" &&
    status !== "running" &&
    status !== "executing" &&
    status !== "completed" &&
    status !== "failed"
  ) {
    return null;
  }
  return {
    id: raw.id,
    label: raw.label,
    platformId:
      typeof raw.platformId === "string"
        ? (raw.platformId as PlatformId)
        : undefined,
    status,
    timestamp: raw.timestamp,
  };
}

export function loadActionLog(userId: string): AskAriaActionLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(actionLogStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeActionLogEntry(item))
      .filter((item): item is AskAriaActionLogEntry => item !== null)
      .slice(0, MAX_ACTION_LOG);
  } catch {
    return [];
  }
}

export function saveActionLog(
  userId: string,
  entries: AskAriaActionLogEntry[],
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      actionLogStorageKey(userId),
      JSON.stringify(entries.slice(0, MAX_ACTION_LOG)),
    );
  } catch {
    // ignore
  }
}

export function createConversationId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
