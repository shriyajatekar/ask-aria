import { NextResponse } from "next/server";

import { createRateLimiter } from "@/lib/ai/rate-limit";
import {
  classifyWithOpenAI,
  composeCanonicalQuestion,
  MAX_QUESTION_LENGTH,
  openAiConfig,
} from "@/lib/ai/understand";

const allow = createRateLimiter();

/**
 * POST { text } → { question: string | null }
 * Maps a question Aria's rules couldn't read onto a canonical question.
 * The OpenAI key stays on the server. Any failure returns question: null and
 * the client falls back to Aria's "I'm not sure" reply.
 */
export async function POST(request: Request) {
  const config = openAiConfig();
  if (!config) {
    return NextResponse.json({ question: null, code: "AI_OFF" }, { status: 503 });
  }

  let text = "";
  try {
    const body = (await request.json()) as { text?: unknown };
    text = typeof body.text === "string" ? body.text.trim() : "";
  } catch {
    text = "";
  }
  if (!text || text.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json({ question: null, code: "INVALID" }, { status: 400 });
  }

  const visitor =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = allow(visitor);
  if (!limit.ok) {
    return NextResponse.json({ question: null, code: "RATE_LIMITED" }, { status: 429 });
  }

  const choice = await classifyWithOpenAI(text, config);
  const question = choice ? composeCanonicalQuestion(choice) : null;
  return NextResponse.json({ question });
}
