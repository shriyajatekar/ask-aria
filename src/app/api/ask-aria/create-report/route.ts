import { NextResponse } from "next/server";

import { readAppUserIdFromCookie } from "@/lib/auth/app-session-cookie";
import { isGoogleOAuthConfigured } from "@/lib/google/config";
import { createDocFromReportContent } from "@/lib/google/docs";
import { buildReportDocumentText } from "@/lib/google/report-content";
import { getValidGoogleTokenSession } from "@/lib/google/tokens";
import type { DateRange, PlatformId } from "@/types/analytics";

interface CreateReportBody {
  title?: string;
  reportPeriodLabel?: string;
  platformId?: PlatformId | "all";
  dateRange?: DateRange;
  comparisonRange?: DateRange;
  brandId?: string | null;
  productId?: string | null;
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
        error: "Sign in before creating reports.",
        code: "NO_APP_SESSION",
      },
      { status: 401 },
    );
  }
  if (!session || session.userId !== appUserId) {
    return NextResponse.json(
      {
        error: "Connect Google Workspace to create reports.",
        code: "NOT_CONNECTED",
      },
      { status: 401 },
    );
  }

  let body: CreateReportBody = {};
  try {
    body = (await request.json()) as CreateReportBody;
  } catch {
    body = {};
  }

  const title = body.title?.trim() || "Commerce analysis report";
  const content = buildReportDocumentText({
    title,
    periodLabel: body.reportPeriodLabel,
    platformId: body.platformId,
    dateRange: body.dateRange,
    comparisonRange: body.comparisonRange,
    brandId: body.brandId,
    productId: body.productId,
  });

  try {
    const { docUrl, documentId } = await createDocFromReportContent(
      title,
      content,
    );
    return NextResponse.json({ docUrl, documentId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create Google Doc";
    return NextResponse.json({ error: message, code: "API_ERROR" }, { status: 502 });
  }
}
