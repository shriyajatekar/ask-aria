import { NextResponse } from "next/server";

import { readAppUserIdFromCookie } from "@/lib/auth/app-session-cookie";
import { isGoogleOAuthConfigured } from "@/lib/google/config";
import { gmailSentMessageUrl, sendGmailMessage } from "@/lib/google/gmail";
import { grantedScopesIncludeGmailSend } from "@/lib/google/scopes";
import { getValidGoogleTokenSession } from "@/lib/google/tokens";

interface SendEmailBody {
  to?: string[];
  subject?: string;
  body?: string;
}

export async function POST(request: Request) {
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json(
      {
        error: "Google OAuth is not configured on the server.",
        code: "NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const session = await getValidGoogleTokenSession();
  const appUserId = await readAppUserIdFromCookie();
  if (!appUserId) {
    return NextResponse.json(
      {
        error: "Sign in before sending email.",
        code: "NO_APP_SESSION",
      },
      { status: 401 },
    );
  }
  if (!session || session.userId !== appUserId) {
    return NextResponse.json(
      {
        error: "Connect Google Workspace to send email.",
        code: "NOT_CONNECTED",
      },
      { status: 401 },
    );
  }

  if (!grantedScopesIncludeGmailSend(session.grantedScopes)) {
    return NextResponse.json(
      {
        error: "Connect Gmail send permission to deliver email.",
        code: "GMAIL_SCOPE_REQUIRED",
      },
      { status: 403 },
    );
  }

  let body: SendEmailBody = {};
  try {
    body = (await request.json()) as SendEmailBody;
  } catch {
    body = {};
  }

  const to = (body.to ?? []).map((e) => e.trim()).filter(Boolean);
  const subject = body.subject?.trim() ?? "";
  const plainBody = body.body?.trim() ?? "";

  if (!to.length) {
    return NextResponse.json(
      { error: "Who should receive this email?", code: "VALIDATION" },
      { status: 400 },
    );
  }
  if (!subject) {
    return NextResponse.json(
      { error: "Email subject is required.", code: "VALIDATION" },
      { status: 400 },
    );
  }
  if (!plainBody) {
    return NextResponse.json(
      { error: "Email body is required.", code: "VALIDATION" },
      { status: 400 },
    );
  }

  try {
    const sent = await sendGmailMessage({ to, subject, body: plainBody });
    const viewUrl = gmailSentMessageUrl(sent);
    return NextResponse.json({
      messageId: sent.messageId,
      threadId: sent.threadId,
      viewUrl,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send email via Gmail";
    return NextResponse.json({ error: message, code: "API_ERROR" }, { status: 502 });
  }
}
