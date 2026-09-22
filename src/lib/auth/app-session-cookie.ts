import { cookies } from "next/headers";

/** httpOnly mirror of client auth session user id (prototype — not full authZ). */
export const APP_USER_ID_COOKIE = "ci-app-user-id";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export function isValidAppUserId(userId: string): boolean {
  return /^[a-zA-Z0-9_-]{1,128}$/.test(userId);
}

export async function readAppUserIdFromCookie(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(APP_USER_ID_COOKIE)?.value;
  if (!raw || !isValidAppUserId(raw)) return null;
  return raw;
}

export async function writeAppUserIdCookie(userId: string): Promise<void> {
  if (!isValidAppUserId(userId)) {
    throw new Error("Invalid app user id");
  }
  const store = await cookies();
  store.set(APP_USER_ID_COOKIE, userId, cookieOptions);
}

export async function clearAppUserIdCookie(): Promise<void> {
  const store = await cookies();
  store.delete(APP_USER_ID_COOKIE);
}
