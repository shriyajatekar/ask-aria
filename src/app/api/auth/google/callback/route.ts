import { NextResponse } from "next/server";

import { isValidAppUserId } from "@/lib/auth/app-session-cookie";
import { isGoogleOAuthConfigured } from "@/lib/google/config";
import { exchangeCodeForTokens } from "@/lib/google/oauth";
import { mergeGrantedScopes } from "@/lib/google/scopes";
import {
  consumeOAuthPendingCookie,
  consumeOAuthStateCookie,
  readGoogleTokenSessionForUser,
  writeGoogleTokenSessionForUser,
} from "@/lib/google/tokens";

function redirectWithError(
  request: Request,
  message: string,
  returnTo: string,
): NextResponse {
  const origin = new URL(request.url).origin;
  const target = new URL(returnTo, origin);
  target.searchParams.set("googleOAuth", "error");
  target.searchParams.set("googleOAuthMessage", message.slice(0, 200));
  return NextResponse.redirect(target.toString());
}

export async function GET(request: Request) {
  const pending = await consumeOAuthPendingCookie();
  const returnTo = pending?.returnTo ?? "/dashboard/kam";
  const purpose = pending?.purpose ?? "workspace";

  if (!isGoogleOAuthConfigured()) {
    return redirectWithError(request, "Google OAuth is not configured", returnTo);
  }

  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error) {
    const description =
      url.searchParams.get("error_description") ??
      "Google sign-in was cancelled.";
    return redirectWithError(request, description, returnTo);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return redirectWithError(request, "Missing authorization code", returnTo);
  }

  const stateValid = await consumeOAuthStateCookie(state);
  if (!stateValid) {
    return redirectWithError(request, "Invalid OAuth state", returnTo);
  }

  const origin = new URL(request.url).origin;
  const target = new URL(returnTo, origin);

  if (purpose === "signin") {
    target.searchParams.set("googleSignIn", "attempted");
    return NextResponse.redirect(target.toString());
  }

  const userId = pending?.userId;
  if (!userId || !isValidAppUserId(userId)) {
    return redirectWithError(
      request,
      "Workspace connect requires a signed-in user.",
      returnTo,
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const existing = await readGoogleTokenSessionForUser(userId);
    const grantedScopes = mergeGrantedScopes(
      existing?.grantedScopes,
      tokens.scope,
    );
    await writeGoogleTokenSessionForUser(userId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? existing?.refresh_token,
      expiry_date: Date.now() + tokens.expires_in * 1000,
      email: existing?.email,
      grantedScopes: grantedScopes || undefined,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Token exchange failed";
    return redirectWithError(request, message, returnTo);
  }

  target.searchParams.set("googleWorkspace", "connected");
  if (pending?.conversationId) {
    target.searchParams.set("askAriaResume", "1");
    target.searchParams.set("conversationId", pending.conversationId);
  }
  return NextResponse.redirect(target.toString());
}
