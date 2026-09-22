/** Minimal scopes: app-created Drive files + Docs content updates */
export const GOOGLE_DOCS_SCOPE = "https://www.googleapis.com/auth/documents";
export const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
export const GOOGLE_GMAIL_SEND_SCOPE =
  "https://www.googleapis.com/auth/gmail.send";
export const GOOGLE_DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export const GOOGLE_OAUTH_IDENTITY_SCOPES = ["openid", "email"];

export const GOOGLE_DOCS_OAUTH_SCOPES = [
  GOOGLE_DRIVE_FILE_SCOPE,
  GOOGLE_DOCS_SCOPE,
  ...GOOGLE_OAUTH_IDENTITY_SCOPES,
];

/** Full workspace connect (Docs + Sheets) */
export const GOOGLE_WORKSPACE_OAUTH_SCOPES = [
  ...GOOGLE_DOCS_OAUTH_SCOPES,
  GOOGLE_SHEETS_SCOPE,
];

/** @deprecated Use GOOGLE_WORKSPACE_OAUTH_SCOPES or GOOGLE_DOCS_OAUTH_SCOPES */
export const GOOGLE_OAUTH_SCOPES = GOOGLE_WORKSPACE_OAUTH_SCOPES;

export type GoogleOAuthScopeMode = "workspace" | "sheets" | "gmail";

export function resolveGoogleOAuthScopes(mode: GoogleOAuthScopeMode): string[] {
  if (mode === "gmail") {
    return [GOOGLE_GMAIL_SEND_SCOPE, ...GOOGLE_OAUTH_IDENTITY_SCOPES];
  }
  if (mode === "sheets") {
    return GOOGLE_WORKSPACE_OAUTH_SCOPES;
  }
  return GOOGLE_WORKSPACE_OAUTH_SCOPES;
}

export function parseGrantedScopeString(scope?: string | null): Set<string> {
  if (!scope?.trim()) return new Set();
  return new Set(scope.split(/\s+/).filter(Boolean));
}

export function mergeGrantedScopes(
  existing?: string | null,
  incoming?: string | null,
): string {
  const merged = new Set([
    ...parseGrantedScopeString(existing),
    ...parseGrantedScopeString(incoming),
  ]);
  return [...merged].join(" ");
}

export function grantedScopesIncludeDocs(granted?: string | null): boolean {
  const set = parseGrantedScopeString(granted);
  if (set.size === 0) return false;
  return set.has(GOOGLE_DOCS_SCOPE);
}

export function grantedScopesIncludeSheets(granted?: string | null): boolean {
  const set = parseGrantedScopeString(granted);
  if (set.size === 0) return false;
  return set.has(GOOGLE_SHEETS_SCOPE);
}

export function grantedScopesIncludeGmailSend(
  granted?: string | null,
): boolean {
  const set = parseGrantedScopeString(granted);
  if (set.size === 0) return false;
  return set.has(GOOGLE_GMAIL_SEND_SCOPE);
}

export function inferGmailConnected(
  hasSession: boolean,
  granted?: string | null,
): boolean {
  if (!hasSession) return false;
  return grantedScopesIncludeGmailSend(granted);
}

/** Legacy sessions stored before scope tracking — treat as Docs-only. */
export function inferDocsConnected(
  hasSession: boolean,
  granted?: string | null,
): boolean {
  if (!hasSession) return false;
  const set = parseGrantedScopeString(granted);
  if (set.size === 0) return true;
  return grantedScopesIncludeDocs(granted);
}

export function inferSheetsConnected(
  hasSession: boolean,
  granted?: string | null,
): boolean {
  if (!hasSession) return false;
  return grantedScopesIncludeSheets(granted);
}
