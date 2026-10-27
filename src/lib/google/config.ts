export function getGoogleRedirectUri(): string {
  return (
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    "http://localhost:3001/api/auth/google/callback"
  );
}

/**
 * Live Google (real Docs, Sheets and Gmail sends) is opt-in. The public demo
 * runs without it: every Google route answers NOT_CONFIGURED and Aria shows
 * clearly labelled simulated results. Set ASK_ARIA_LIVE_GOOGLE=true plus the
 * OAuth keys on a private deployment to turn it on.
 */
export function isLiveGoogleEnabled(): boolean {
  return process.env.ASK_ARIA_LIVE_GOOGLE?.trim().toLowerCase() === "true";
}

export function isGoogleOAuthConfigured(): boolean {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return isLiveGoogleEnabled() && Boolean(clientId && clientSecret);
}

export function getGoogleOAuthConfig(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  configured: boolean;
} {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
  const redirectUri = getGoogleRedirectUri();
  return {
    clientId,
    clientSecret,
    redirectUri,
    configured: isGoogleOAuthConfigured(),
  };
}

export const GOOGLE_OAUTH_MISSING_MESSAGE =
  "Google Workspace OAuth is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to your server environment (see .env.example).";
