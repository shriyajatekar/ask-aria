const GOOGLE_KEY_PREFIX = "ci-ask-aria-google-workspace-demo";
const MICROSOFT_KEY_PREFIX = "ci-ask-aria-microsoft-365-demo";

export type DemoWorkspaceTool =
  | "google_workspace"
  | "microsoft_365"
  | "monitoring";

function storageKey(tool: DemoWorkspaceTool, userId: string): string {
  const prefix =
    tool === "google_workspace" ? GOOGLE_KEY_PREFIX : MICROSOFT_KEY_PREFIX;
  return `${prefix}:${userId}`;
}

export function isDemoWorkspaceConnected(
  tool: DemoWorkspaceTool,
  userId?: string | null,
): boolean {
  if (typeof window === "undefined" || !userId) return false;
  try {
    return window.sessionStorage.getItem(storageKey(tool, userId)) === "connected";
  } catch {
    return false;
  }
}

export function connectDemoWorkspace(
  tool: DemoWorkspaceTool,
  userId: string,
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey(tool, userId), "connected");
  } catch {
    /* ignore */
  }
}

export function hasAnyWorkspaceConnected(
  googleOAuthConnected = false,
  googleOAuthConfigured = false,
  userId?: string | null,
): boolean {
  if (googleOAuthConfigured && googleOAuthConnected) return true;
  if (!userId) return false;
  return (
    isDemoWorkspaceConnected("google_workspace", userId) ||
    isDemoWorkspaceConnected("microsoft_365", userId)
  );
}

export function isGoogleWorkspaceEffectivelyConnected(
  googleOAuthConnected: boolean,
  googleOAuthConfigured: boolean,
  userId?: string | null,
): boolean {
  if (googleOAuthConfigured) return googleOAuthConnected;
  return isDemoWorkspaceConnected("google_workspace", userId);
}

export function preferredWorkspaceLabel(userId?: string | null): string {
  if (isDemoWorkspaceConnected("google_workspace", userId)) {
    return "Google Workspace";
  }
  if (isDemoWorkspaceConnected("microsoft_365", userId)) {
    return "Microsoft 365";
  }
  return "Google Workspace";
}
