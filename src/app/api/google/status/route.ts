import { NextResponse } from "next/server";

import { readAppUserIdFromCookie } from "@/lib/auth/app-session-cookie";
import {
  GOOGLE_OAUTH_MISSING_MESSAGE,
  isGoogleOAuthConfigured,
} from "@/lib/google/config";
import {
  GOOGLE_GMAIL_SEND_SCOPE,
  GOOGLE_WORKSPACE_OAUTH_SCOPES,
  inferDocsConnected,
  inferGmailConnected,
  inferSheetsConnected,
} from "@/lib/google/scopes";
import { getValidGoogleTokenSession } from "@/lib/google/tokens";

export async function GET() {
  const configured = isGoogleOAuthConfigured();
  if (!configured) {
    return NextResponse.json({
      configured: false,
      connected: false,
      docsConnected: false,
      sheetsConnected: false,
      gmailConnected: false,
      status: "not_configured",
      message: GOOGLE_OAUTH_MISSING_MESSAGE,
      services: [] as string[],
      scopes: GOOGLE_WORKSPACE_OAUTH_SCOPES,
    });
  }

  const appUserId = await readAppUserIdFromCookie();
  if (!appUserId) {
    return NextResponse.json({
      configured: true,
      connected: false,
      docsConnected: false,
      sheetsConnected: false,
      gmailConnected: false,
      status: "disconnected",
      userId: null,
      services: [],
      scopes: GOOGLE_WORKSPACE_OAUTH_SCOPES,
    });
  }

  const session = await getValidGoogleTokenSession();
  const hasSession = Boolean(
    session?.access_token && session.userId === appUserId,
  );
  const docsConnected = inferDocsConnected(hasSession, session?.grantedScopes);
  const sheetsConnected = inferSheetsConnected(
    hasSession,
    session?.grantedScopes,
  );
  const gmailConnected = inferGmailConnected(
    hasSession,
    session?.grantedScopes,
  );
  const connected = docsConnected || sheetsConnected || gmailConnected;

  const services: string[] = [];
  if (docsConnected) services.push("Drive", "Docs");
  if (sheetsConnected) services.push("Sheets");
  if (gmailConnected) services.push("Gmail");

  return NextResponse.json({
    configured: true,
    connected,
    docsConnected,
    sheetsConnected,
    gmailConnected,
    status: connected ? "connected" : "disconnected",
    userId: appUserId,
    services,
    scopes: [...GOOGLE_WORKSPACE_OAUTH_SCOPES, GOOGLE_GMAIL_SEND_SCOPE],
  });
}
