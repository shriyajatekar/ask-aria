/**
 * Asks the server to map a question Aria's rules couldn't read onto one Aria
 * knows. Returns null when the AI is off, rate-limited, slow or unsure, so
 * the caller keeps the rules' own reply.
 */
export async function understandWithAi(text: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch("/api/ask-aria/understand", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { question?: unknown };
    return typeof data.question === "string" && data.question ? data.question : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
