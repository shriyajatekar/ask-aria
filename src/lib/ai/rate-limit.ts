/**
 * Small in-memory limiter for the AI route. It caps requests per visitor
 * (per minute and per day) and per server instance per day. Limits live in
 * memory, so each serverless instance counts separately — the hard spending
 * ceiling must also be set as a monthly budget in the OpenAI project.
 */
export const AI_LIMITS = {
  perVisitorPerMinute: 6,
  perVisitorPerDay: 40,
  perInstancePerDay: 500,
};

interface Bucket {
  minuteStart: number;
  minuteCount: number;
  dayStart: number;
  dayCount: number;
}

const MINUTE = 60_000;
const DAY = 86_400_000;

export function createRateLimiter(limits = AI_LIMITS) {
  const visitors = new Map<string, Bucket>();
  let instanceDayStart = 0;
  let instanceCount = 0;

  return function allow(visitor: string, now = Date.now()): { ok: boolean; reason?: string } {
    if (now - instanceDayStart >= DAY) {
      instanceDayStart = now;
      instanceCount = 0;
    }
    if (instanceCount >= limits.perInstancePerDay) {
      return { ok: false, reason: "daily_cap" };
    }

    const bucket = visitors.get(visitor) ?? {
      minuteStart: now,
      minuteCount: 0,
      dayStart: now,
      dayCount: 0,
    };
    if (now - bucket.minuteStart >= MINUTE) {
      bucket.minuteStart = now;
      bucket.minuteCount = 0;
    }
    if (now - bucket.dayStart >= DAY) {
      bucket.dayStart = now;
      bucket.dayCount = 0;
    }
    if (bucket.minuteCount >= limits.perVisitorPerMinute) {
      return { ok: false, reason: "too_fast" };
    }
    if (bucket.dayCount >= limits.perVisitorPerDay) {
      return { ok: false, reason: "visitor_daily_cap" };
    }

    bucket.minuteCount += 1;
    bucket.dayCount += 1;
    instanceCount += 1;
    visitors.set(visitor, bucket);
    // Keep memory bounded on a long-lived instance.
    if (visitors.size > 5000) visitors.delete(visitors.keys().next().value as string);
    return { ok: true };
  };
}
