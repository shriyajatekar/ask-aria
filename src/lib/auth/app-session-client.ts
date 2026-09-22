/** Sync local auth session user id to httpOnly cookie for server API routes. */
export async function syncAppSessionCookie(userId: string | null): Promise<void> {
  try {
    if (!userId) {
      await fetch("/api/auth/app-session", {
        method: "DELETE",
        credentials: "same-origin",
      });
      return;
    }
    await fetch("/api/auth/app-session", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
  } catch {
    /* ignore — status APIs fall back to disconnected */
  }
}
