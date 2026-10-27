import { METRICS } from "@/data/metrics";
import { PLATFORM_BY_ID } from "@/data/platforms";

import { extractPlatformIdsFromText } from "./ask-aria-scope";

/**
 * Hinglish questions ("Amazon ka ROAS kyun gira?"). A fixed vocabulary of
 * common Hindi question words maps the question onto an English one Aria
 * already answers; Aria then shows "I read this as: …". Anything outside the
 * vocabulary is left alone (the AI fallback, if on, or "not sure" handles it).
 */
const HINGLISH_MARKERS =
  /\b(kyun|kyu|kyon|kya|gira|giri|gire|girna|badha|badhi|badhe|batao|bataiye|dikhao|dikhaiye|kaun|kaunsa|sabse|zyada|jyada|kaise|kaisa|karo|karna|chahiye|banao|hua|hui|raha|rahi)\b/i;

const WORD = (pattern: string) => new RegExp(`\\b(${pattern})\\b`, "i");
const WHY = WORD("kyun|kyu|kyon");
const DROPPED = WORD("gira|giri|gire|girna|kam hu(a|i|e)|kam ho gay(a|i)|down|neeche|ghata|ghati");
const ROSE = WORD("badha|badhi|badhe|zyada hu(a|i)|jyada hu(a|i)|upar|bada");
const WHAT_HAPPENED = WORD("kya hu(a|i)|kya badla|kya change");
const WHICH = WORD("kaun sa|kaunsa|kaun si|kaun");
const MOST_GROWTH = WORD("sabse zyada (badh|bad|grow)\\w*|sabse tez|fastest|sabse (achha|accha)");
const SHOW = WORD("dikhao|dikhaiye|batao|bataiye");
const TOP_PRODUCTS = WORD("top products?|best products?|sabse (achhe|acche|zyada bikne wale) products?");
const DEEP_DIVE = WORD("deep dive|gehrai se|detail mein");
const ATTENTION = WORD("dhyan|dhyaan|alert|problem kya|dikkat");
const WHAT_TO_DO = WORD("kya kar(u|un|oon|na chahiye|e)|kya karna|kya karein");
const REPORT = WORD("report bana(o|iye|do)|report chahiye");
const HOW_DOING = WORD("kaisa chal|kaise chal|kaisa ja|kaise ja");

const METRIC_ALIASES: Array<[RegExp, string]> = [
  [WORD("roas"), "ROAS"],
  [WORD("acos"), "ACOS"],
  [WORD("conversion"), "Conversion Rate"],
  [WORD("orders?"), "Orders"],
  [WORD("sessions?|traffic"), "Sessions"],
  [WORD("sales|bikri|revenue|gross sales"), "Gross Sales"],
];

const METRICS_LONGEST_FIRST = [...METRICS].sort((a, b) => b.name.length - a.name.length);

function metricIn(text: string): string | null {
  const lower = text.toLowerCase();
  const full = METRICS_LONGEST_FIRST.find((m) => lower.includes(m.name.toLowerCase()));
  if (full) return full.name;
  return METRIC_ALIASES.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

export function isLikelyHinglish(text: string): boolean {
  return HINGLISH_MARKERS.test(text);
}

/** Returns an English question Aria knows, or null if this isn't Hinglish it understands. */
export function translateHinglish(text: string): string | null {
  if (!isLikelyHinglish(text)) return null;
  const platformId = extractPlatformIdsFromText(text)[0];
  const platform = platformId ? PLATFORM_BY_ID[platformId]?.name : null;
  const on = platform ? ` on ${platform}` : "";
  const metric = metricIn(text);

  if (DEEP_DIVE.test(text)) return `Deep dive into ${metric ?? "Gross Sales"}${on}`;
  if (REPORT.test(text)) return "Create a report from this analysis";
  if (WHICH.test(text) && /platform/i.test(text)) {
    if (MOST_GROWTH.test(text) || ROSE.test(text)) return "Which platform is growing fastest?";
    if (DROPPED.test(text)) return "Which platform is driving the decline?";
  }
  if (WHY.test(text) && DROPPED.test(text)) return `Why did ${metric ?? "Gross Sales"} drop${on}?`;
  if (WHY.test(text) && ROSE.test(text)) return `Why did ${metric ?? "Gross Sales"} go up${on}?`;
  if (WHY.test(text)) return `Why did ${metric ?? "Gross Sales"} change${on}?`;
  if (WHAT_HAPPENED.test(text)) return `What changed in ${metric ?? "Gross Sales"}${on}?`;
  if (TOP_PRODUCTS.test(text) && (SHOW.test(text) || /\bkaun\b/i.test(text))) {
    return `Show me top products${on}`;
  }
  if (ATTENTION.test(text)) return `What needs my attention${on}?`;
  if (WHAT_TO_DO.test(text)) return "What should I do?";
  if (HOW_DOING.test(text)) return "How is the business performing?";
  return null;
}
