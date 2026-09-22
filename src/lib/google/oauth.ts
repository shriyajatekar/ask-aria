import {
  type GoogleOAuthScopeMode,
  resolveGoogleOAuthScopes,
} from "./scopes";
import { getGoogleOAuthConfig } from "./config";

export function buildGoogleAuthorizationUrl(
  state: string,
  options?: { scopeMode?: GoogleOAuthScopeMode; incremental?: boolean },
): string {
  const { clientId, redirectUri, configured } = getGoogleOAuthConfig();
  if (!configured) {
    throw new Error("Google OAuth is not configured");
  }
  const scopeMode = options?.scopeMode ?? "workspace";
  const scopes = resolveGoogleOAuthScopes(scopeMode);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  if (
    options?.incremental ||
    scopeMode === "sheets" ||
    scopeMode === "gmail"
  ) {
    params.set("include_granted_scopes", "true");
  }
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

export async function exchangeCodeForTokens(
  code: string,
): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret, redirectUri, configured } =
    getGoogleOAuthConfig();
  if (!configured) {
    throw new Error("Google OAuth is not configured");
  }
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${text}`);
  }
  return (await res.json()) as GoogleTokenResponse;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret, configured } = getGoogleOAuthConfig();
  if (!configured) {
    throw new Error("Google OAuth is not configured");
  }
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${text}`);
  }
  return (await res.json()) as GoogleTokenResponse;
}
