import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import {
  isValidAppUserId,
  readAppUserIdFromCookie,
} from "@/lib/auth/app-session-cookie";
import {
  GOOGLE_OAUTH_MISSING_MESSAGE,
  isGoogleOAuthConfigured,
} from "@/lib/google/config";
import { buildGoogleAuthorizationUrl } from "@/lib/google/oauth";
import type { GoogleOAuthPurpose } from "@/lib/google/tokens";
import {
  setOAuthPendingCookie,
  setOAuthStateCookie,
} from "@/lib/google/tokens";

function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/")) {
    return "/dashboard/kam";
  }
  if (value.startsWith("//")) return "/dashboard/kam";
  return value;
}

function resolvePurpose(value: string | null): GoogleOAuthPurpose {
  return value === "signin" ? "signin" : "workspace";
}

export async function GET(request: Request) {
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json(
      { error: GOOGLE_OAUTH_MISSING_MESSAGE, code: "NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const purpose = resolvePurpose(url.searchParams.get("purpose"));
  const returnTo = safeReturnTo(
    url.searchParams.get("returnUrl") ?? url.searchParams.get("returnTo"),
  );
  const conversationId = url.searchParams.get("conversationId") ?? undefined;
  const queryUserId = url.searchParams.get("userId")?.trim() ?? undefined;
  const appUserId = await readAppUserIdFromCookie();

  let workspaceUserId: string | undefined;
  if (purpose === "workspace") {
    const userId = appUserId ?? queryUserId;
    if (!userId || !isValidAppUserId(userId)) {
      return NextResponse.json(
        {
          error: "Sign in before connecting Google Workspace.",
          code: "NO_APP_SESSION",
        },
        { status: 401 },
      );
    }
    if (appUserId && queryUserId && appUserId !== queryUserId) {
      return NextResponse.json(
        { error: "Session user does not match.", code: "USER_MISMATCH" },
        { status: 403 },
      );
    }
    workspaceUserId = userId;
  }

  const state = randomBytes(24).toString("base64url");

  await setOAuthStateCookie(state);
  await setOAuthPendingCookie({
    returnTo,
    conversationId,
    userId: workspaceUserId,
    purpose,
  });

  const scopesParam = url.searchParams.get("scopes");
  const scopeMode =
    scopesParam === "sheets"
      ? ("sheets" as const)
      : scopesParam === "gmail"
        ? ("gmail" as const)
        : ("workspace" as const);
  const authUrl = buildGoogleAuthorizationUrl(state, {
    scopeMode,
    incremental: scopeMode === "sheets" || scopeMode === "gmail",
  });
  return NextResponse.redirect(authUrl);
}
