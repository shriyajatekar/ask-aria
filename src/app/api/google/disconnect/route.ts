import { NextResponse } from "next/server";

import { readAppUserIdFromCookie } from "@/lib/auth/app-session-cookie";
import { clearGoogleTokenSessionForUser } from "@/lib/google/tokens";

export async function POST() {
  const userId = await readAppUserIdFromCookie();
  if (!userId) {
    return NextResponse.json(
      { error: "No signed-in user.", code: "NO_APP_SESSION" },
      { status: 401 },
    );
  }
  await clearGoogleTokenSessionForUser(userId);
  return NextResponse.json({ ok: true });
}
