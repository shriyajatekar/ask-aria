import { NextResponse } from "next/server";

import {
  clearAppUserIdCookie,
  isValidAppUserId,
  writeAppUserIdCookie,
} from "@/lib/auth/app-session-cookie";

export async function POST(request: Request) {
  let body: { userId?: string } = {};
  try {
    body = (await request.json()) as { userId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const userId = body.userId?.trim();
  if (!userId || !isValidAppUserId(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }
  await writeAppUserIdCookie(userId);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearAppUserIdCookie();
  return NextResponse.json({ ok: true });
}
