"use client";

import type { AskAriaActionDraft } from "./ask-aria-types";

export type GoogleWorkspaceStatus =
  | "unknown"
  | "not_configured"
  | "disconnected"
  | "connected";

export interface GoogleStatusResponse {
  configured: boolean;
  connected: boolean;
  docsConnected?: boolean;
  sheetsConnected?: boolean;
  gmailConnected?: boolean;
  status: string;
  message?: string;
  services: string[];
}

import { oauthResumeStorageKey } from "./ask-aria-user-scope";

export interface OAuthResumePayload {
  conversationId?: string;
  pendingActionDraft?: AskAriaActionDraft;
}

export async function fetchGoogleWorkspaceStatus(): Promise<GoogleStatusResponse> {
  try {
    const res = await fetch("/api/google/status", { credentials: "same-origin" });
    if (!res.ok) {
      return {
        configured: false,
        connected: false,
        docsConnected: false,
        sheetsConnected: false,
        gmailConnected: false,
        status: "not_configured",
        services: [],
      };
    }
    return (await res.json()) as GoogleStatusResponse;
  } catch {
    return {
      configured: false,
      connected: false,
      docsConnected: false,
      sheetsConnected: false,
      gmailConnected: false,
      status: "unknown",
      services: [],
    };
  }
}

export function mapGoogleStatus(
  data: GoogleStatusResponse,
): GoogleWorkspaceStatus {
  if (!data.configured) return "not_configured";
  return data.connected ? "connected" : "disconnected";
}

export function startGoogleOAuthFlow(options?: {
  returnTo?: string;
  conversationId?: string;
  resume?: OAuthResumePayload;
  /** Required for user-scoped OAuth resume in sessionStorage (prototype isolation). */
  userId?: string;
  /** Incremental re-auth for Google Sheets */
  scopes?: "workspace" | "sheets" | "gmail";
}): void {
  if (options?.resume && options.userId) {
    try {
      sessionStorage.setItem(
        oauthResumeStorageKey(options.userId),
        JSON.stringify(options.resume),
      );
    } catch {
      /* ignore */
    }
  }
  const returnTo =
    options?.returnTo ??
    `${window.location.pathname}${window.location.search}`;
  const params = new URLSearchParams({
    purpose: "workspace",
    returnUrl: returnTo,
  });
  if (options?.conversationId) {
    params.set("conversationId", options.conversationId);
  }
  if (options?.userId) {
    params.set("userId", options.userId);
  }
  if (options?.scopes === "sheets") {
    params.set("scopes", "sheets");
  }
  if (options?.scopes === "gmail") {
    params.set("scopes", "gmail");
  }
  window.location.href = `/api/auth/google?${params.toString()}`;
}

export function readOAuthResumePayload(
  userId: string,
): OAuthResumePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const key = oauthResumeStorageKey(userId);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    sessionStorage.removeItem(key);
    return JSON.parse(raw) as OAuthResumePayload;
  } catch {
    return null;
  }
}

export async function createReportViaApi(
  draft: AskAriaActionDraft,
  context: {
    dateRange: { start: string; end: string };
    comparisonPeriod: { start: string; end: string };
    platformId?: string;
    brandId?: string | null;
    productId?: string | null;
  },
): Promise<
  | { ok: true; docUrl: string }
  | { ok: false; code?: string; error: string }
> {
  const res = await fetch("/api/ask-aria/create-report", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: draft.reportTitle ?? "Commerce analysis report",
      reportPeriodLabel: draft.reportPeriodLabel,
      platformId: draft.platformId ?? context.platformId ?? "all",
      dateRange: context.dateRange,
      comparisonRange: context.comparisonPeriod,
      brandId: context.brandId,
      productId: context.productId ?? draft.productId,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    docUrl?: string;
    error?: string;
    code?: string;
  };
  if (!res.ok) {
    return {
      ok: false,
      code: data.code,
      error: data.error ?? "I couldn't create the Google Doc.",
    };
  }
  if (!data.docUrl) {
    return { ok: false, error: "Google Doc URL was not returned." };
  }
  return { ok: true, docUrl: data.docUrl };
}

export async function createSpreadsheetViaApi(
  draft: AskAriaActionDraft,
  context: {
    dateRange: { start: string; end: string };
    comparisonPeriod: { start: string; end: string };
    platformId?: string;
    brandId?: string | null;
    productId?: string | null;
  },
): Promise<
  | { ok: true; spreadsheetUrl: string }
  | { ok: false; code?: string; error: string }
> {
  const res = await fetch("/api/ask-aria/create-spreadsheet", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: draft.spreadsheetTitle ?? "Performance export",
      reportPeriodLabel: draft.reportPeriodLabel,
      platformId: draft.platformId ?? context.platformId ?? "all",
      dateRange: context.dateRange,
      comparisonRange: context.comparisonPeriod,
      brandId: context.brandId,
      productId: context.productId ?? draft.productId,
      dataset: draft.spreadsheetDataset ?? "export_performance",
      roasMax: draft.spreadsheetRoasMax,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    spreadsheetUrl?: string;
    error?: string;
    code?: string;
  };
  if (!res.ok) {
    return {
      ok: false,
      code: data.code,
      error: data.error ?? "I couldn't create the Google Sheet.",
    };
  }
  if (!data.spreadsheetUrl) {
    return { ok: false, error: "Google Sheets URL was not returned." };
  }
  return { ok: true, spreadsheetUrl: data.spreadsheetUrl };
}

export async function sendEmailViaApi(
  draft: AskAriaActionDraft,
): Promise<
  | { ok: true; messageId: string; viewUrl?: string }
  | { ok: false; code?: string; error: string }
> {
  const bodyText = draft.emailPreviewLines?.join("\n") ?? "";
  const res = await fetch("/api/ask-aria/send-email", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: draft.emailToAddresses ?? [],
      subject: draft.emailSubject ?? "",
      body: bodyText,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    messageId?: string;
    viewUrl?: string;
    error?: string;
    code?: string;
  };
  if (!res.ok) {
    return {
      ok: false,
      code: data.code,
      error: data.error ?? "I couldn't send the email.",
    };
  }
  if (!data.messageId) {
    return { ok: false, error: "Gmail did not return a message id." };
  }
  return {
    ok: true,
    messageId: data.messageId,
    viewUrl: data.viewUrl,
  };
}
