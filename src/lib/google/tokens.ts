import { cookies } from "next/headers";
import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

import { readAppUserIdFromCookie } from "@/lib/auth/app-session-cookie";

import { getGoogleOAuthConfig } from "./config";
import { refreshAccessToken } from "./oauth";
import { sealPayload, unsealPayload } from "./session-crypto";

/** Legacy global cookie — migrated away in Phase 05D.15 */
export const GOOGLE_TOKEN_COOKIE = "ci-google-oauth-tokens";
export const GOOGLE_OAUTH_STATE_COOKIE = "ci-google-oauth-state";
export const GOOGLE_OAUTH_PENDING_COOKIE = "ci-google-oauth-pending";

export type GoogleOAuthPurpose = "workspace" | "signin";

export interface GoogleTokenSession {
  userId: string;
  access_token: string;
  refresh_token?: string;
  expiry_date: number;
  email?: string;
  /** Space-separated OAuth scopes from Google token responses */
  grantedScopes?: string;
}

export interface GoogleOAuthPending {
  returnTo: string;
  conversationId?: string;
  userId?: string;
  purpose: GoogleOAuthPurpose;
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export function googleTokenCookieName(userId: string): string {
  return `ci-google-oauth-${userId}`;
}

export async function readGoogleTokenSessionForUser(
  userId: string,
): Promise<GoogleTokenSession | null> {
  const store = await cookies();
  const raw = store.get(googleTokenCookieName(userId))?.value;
  if (!raw) return null;
  const session = unsealPayload<GoogleTokenSession>(raw);
  if (!session?.access_token || session.userId !== userId) return null;
  return session;
}

export async function writeGoogleTokenSessionForUser(
  userId: string,
  session: Omit<GoogleTokenSession, "userId">,
): Promise<void> {
  const store = await cookies();
  store.set(
    googleTokenCookieName(userId),
    sealPayload({ ...session, userId }),
    {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 30,
    },
  );
}

export async function clearGoogleTokenSessionForUser(
  userId: string,
): Promise<void> {
  const store = await cookies();
  store.delete(googleTokenCookieName(userId));
}

async function clearLegacyGoogleTokenCookie(): Promise<void> {
  const store = await cookies();
  store.delete(GOOGLE_TOKEN_COOKIE);
}

export async function readGoogleTokenSession(): Promise<GoogleTokenSession | null> {
  const userId = await readAppUserIdFromCookie();
  if (!userId) return null;
  await clearLegacyGoogleTokenCookie();
  return readGoogleTokenSessionForUser(userId);
}

export async function getValidGoogleTokenSession(): Promise<GoogleTokenSession | null> {
  const userId = await readAppUserIdFromCookie();
  if (!userId) return null;
  await clearLegacyGoogleTokenCookie();
  const session = await readGoogleTokenSessionForUser(userId);
  if (!session?.access_token) return null;
  const skewMs = 60_000;
  if (Date.now() < session.expiry_date - skewMs) {
    return session;
  }
  if (!session.refresh_token) {
    await clearGoogleTokenSessionForUser(userId);
    return null;
  }
  try {
    const refreshed = await refreshAccessToken(session.refresh_token);
    const next: GoogleTokenSession = {
      userId,
      access_token: refreshed.access_token,
      refresh_token: session.refresh_token,
      expiry_date: Date.now() + refreshed.expires_in * 1000,
      email: session.email,
    };
    await writeGoogleTokenSessionForUser(userId, {
      access_token: next.access_token,
      refresh_token: next.refresh_token,
      expiry_date: next.expiry_date,
      email: next.email,
      grantedScopes: session.grantedScopes,
    });
    return next;
  } catch {
    await clearGoogleTokenSessionForUser(userId);
    return null;
  }
}

export async function getGoogleOAuth2Client(): Promise<OAuth2Client | null> {
  const session = await getValidGoogleTokenSession();
  if (!session) return null;
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  client.setCredentials({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expiry_date: session.expiry_date,
  });
  return client;
}

export async function setOAuthStateCookie(state: string): Promise<void> {
  const store = await cookies();
  store.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    ...cookieOptions,
    maxAge: 600,
  });
}

export async function setOAuthPendingCookie(
  pending: GoogleOAuthPending,
): Promise<void> {
  const store = await cookies();
  store.set(GOOGLE_OAUTH_PENDING_COOKIE, sealPayload(pending), {
    ...cookieOptions,
    maxAge: 600,
  });
}

export async function consumeOAuthPendingCookie(): Promise<GoogleOAuthPending | null> {
  const store = await cookies();
  const raw = store.get(GOOGLE_OAUTH_PENDING_COOKIE)?.value;
  store.delete(GOOGLE_OAUTH_PENDING_COOKIE);
  if (!raw) return null;
  const pending = unsealPayload<GoogleOAuthPending>(raw);
  if (!pending?.returnTo) return null;
  return {
    ...pending,
    purpose: pending.purpose === "signin" ? "signin" : "workspace",
  };
}

export async function consumeOAuthStateCookie(
  state: string,
): Promise<boolean> {
  const store = await cookies();
  const expected = store.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  store.delete(GOOGLE_OAUTH_STATE_COOKIE);
  return Boolean(expected && expected === state);
}
