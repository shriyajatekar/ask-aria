import { NextResponse } from "next/server";

import { readAppUserIdFromCookie } from "@/lib/auth/app-session-cookie";
import { isGoogleOAuthConfigured } from "@/lib/google/config";
import { grantedScopesIncludeSheets } from "@/lib/google/scopes";
import {
  buildSpreadsheetData,
  defaultSpreadsheetTitle,
  type SpreadsheetDataset,
} from "@/lib/google/sheet-content";
import { createSpreadsheetFromData } from "@/lib/google/sheets";
import { getValidGoogleTokenSession } from "@/lib/google/tokens";
import type { DateRange, PlatformId } from "@/types/analytics";

interface CreateSpreadsheetBody {
  title?: string;
  reportPeriodLabel?: string;
  platformId?: PlatformId | "all";
  dateRange?: DateRange;
  comparisonRange?: DateRange;
  brandId?: string | null;
  productId?: string | null;
  dataset?: SpreadsheetDataset;
  roasMax?: number;
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
        error: "Sign in before creating spreadsheets.",
        code: "NO_APP_SESSION",
      },
      { status: 401 },
    );
  }
  if (!session || session.userId !== appUserId) {
    return NextResponse.json(
      {
        error: "Connect Google Workspace to create spreadsheets.",
        code: "NOT_CONNECTED",
      },
      { status: 401 },
    );
  }

  if (!grantedScopesIncludeSheets(session.grantedScopes)) {
    return NextResponse.json(
      {
        error: "Connect Google Sheets to export data.",
        code: "SHEETS_SCOPE_REQUIRED",
      },
      { status: 403 },
    );
  }

  let body: CreateSpreadsheetBody = {};
  try {
    body = (await request.json()) as CreateSpreadsheetBody;
  } catch {
    body = {};
  }

  const dataset = body.dataset ?? "export_performance";
  const title =
    body.title?.trim() || defaultSpreadsheetTitle(dataset);
  const sheetData = buildSpreadsheetData({
    title,
    periodLabel: body.reportPeriodLabel,
    platformId: body.platformId,
    dateRange: body.dateRange,
    comparisonRange: body.comparisonRange,
    brandId: body.brandId,
    productId: body.productId,
    dataset,
    roasMax: body.roasMax,
  });

  try {
    const { spreadsheetUrl, spreadsheetId } = await createSpreadsheetFromData(
      title,
      sheetData,
    );
    return NextResponse.json({ spreadsheetUrl, spreadsheetId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create Google Sheet";
    return NextResponse.json({ error: message, code: "API_ERROR" }, { status: 502 });
  }
}
