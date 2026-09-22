/**
 * Client-side prototype isolation for Ask Aria memory (Phase 05D.14).
 * Keys are partitioned by auth session user id — not server-enforced authZ.
 * Demo portfolio users (05D.23) also partition by ephemeral browser session id.
 */

export const DEMO_WORKSPACE_ID = "demo-workspace";

const DEMO_PORTFOLIO_SESSION_KEY = "ci-demo-portfolio-session-v1";

/** Stable workspace id for the demo product surface until multi-workspace exists. */
export function resolveAskAriaWorkspaceId(): string {
  return DEMO_WORKSPACE_ID;
}

export function isDemoPortfolioUser(userId: string): boolean {
  return userId.startsWith("demo-");
}

/** Fresh ephemeral session for each demo sign-in (stored in sessionStorage). */
export function beginDemoPortfolioSession(): string {
  const sessionId = `sess-${crypto.randomUUID()}`;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(DEMO_PORTFOLIO_SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function clearDemoPortfolioSession(): void {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(DEMO_PORTFOLIO_SESSION_KEY);
  }
}

export function getDemoPortfolioSessionId(): string | null {
  if (typeof window === "undefined") return null;
  const id = window.sessionStorage.getItem(DEMO_PORTFOLIO_SESSION_KEY);
  return id && id.length > 0 ? id : null;
}

/**
 * Storage partition for Ask Aria local data.
 * Non-demo users: userId only. Demo users: userId + active demo session.
 */
export function resolveAskAriaStorageScope(userId: string): string {
  if (!isDemoPortfolioUser(userId)) return userId;
  const sessionId = getDemoPortfolioSessionId();
  return sessionId ? `${userId}@${sessionId}` : userId;
}

export function conversationsStorageKey(userId: string): string {
  return `ci-ask-aria-conversations-v1:${resolveAskAriaStorageScope(userId)}`;
}

export function activeConversationStorageKey(userId: string): string {
  return `ci-ask-aria-active-conversation-v1:${resolveAskAriaStorageScope(userId)}`;
}

export function actionLogStorageKey(userId: string): string {
  return `ci-ask-aria-action-log-v1:${resolveAskAriaStorageScope(userId)}`;
}

export function oauthResumeStorageKey(userId: string): string {
  return `ci-ask-aria-oauth-resume:${resolveAskAriaStorageScope(userId)}`;
}

export function monitorsStorageKey(userId: string): string {
  return `aria-monitors:${resolveAskAriaStorageScope(userId)}`;
}
