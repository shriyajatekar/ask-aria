import type { AskAriaInsightSection } from "./ask-aria-types";

export type NormalizedAskAriaInsightSection = AskAriaInsightSection & {
  id: string;
};

export const META_SECTION_IDS = new Set(["periods_analyzed", "scope"]);

export function insightSection(
  id: string,
  heading: string,
  lines: string[],
): AskAriaInsightSection {
  return { id, heading, lines };
}

export function slugInsightSectionId(heading: string, index: number): string {
  const slug = heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || `section_${index}`;
}

/** Ensures every section has a stable React key; dedupes repeated ids within one message. */
export function normalizeAccordionSections(
  sections: AskAriaInsightSection[],
): NormalizedAskAriaInsightSection[] {
  const idCounts = new Map<string, number>();

  return sections.map((section, index) => {
    let id = section.id?.trim();
    if (!id) {
      id = slugInsightSectionId(section.heading, index);
    }
    const seen = idCounts.get(id) ?? 0;
    idCounts.set(id, seen + 1);
    const uniqueId = seen > 0 ? `${id}_${seen}` : id;
    return { ...section, id: uniqueId } as NormalizedAskAriaInsightSection;
  });
}

export function mapInsightSectionForAccordion(
  section: AskAriaInsightSection,
): AskAriaInsightSection {
  const id = section.id ?? "";
  const heading = section.heading;

  const isNextAction =
    id === "what_to_investigate" ||
    id === "recommended_next_step" ||
    id === "opportunity_next_step" ||
    id === "next_investigation" ||
    id === "strategic_next_step" ||
    heading === "What to investigate" ||
    heading === "Recommended next step" ||
    heading === "Opportunity / next step" ||
    heading === "Next investigation" ||
    heading === "Strategic next step";

  if (isNextAction) {
    return insightSection("next_action", "What can I do now?", section.lines);
  }

  const isWhatHappened =
    id === "executive_summary" ||
    id === "business_impact" ||
    id === "what_happened" ||
    heading === "Executive summary" ||
    heading === "Business impact" ||
    heading === "What happened";

  if (isWhatHappened) {
    return insightSection("what_happened", "What happened", section.lines);
  }

  const isWhatChangedAlongside =
    id === "what_changed_alongside" ||
    id === "primary_driver" ||
    id === "key_drivers" ||
    id === "why_it_likely_happened" ||
    heading === "What changed alongside it" ||
    heading === "Primary driver" ||
    heading === "Key drivers" ||
    heading === "Why it likely happened";

  if (isWhatChangedAlongside) {
    return insightSection(
      "what_changed_alongside",
      "What changed alongside it",
      section.lines,
    );
  }

  const isWhyItMatters =
    id === "business_risk" ||
    id === "opportunity_concern" ||
    heading === "Business risk" ||
    heading === "Opportunity / concern";

  if (isWhyItMatters) {
    return insightSection("why_it_matters", "Why it matters", section.lines);
  }

  if (id === "evidence" || heading === "Evidence") {
    return insightSection("evidence", "Evidence", section.lines);
  }

  if (section.id) {
    return section;
  }

  return insightSection(
    slugInsightSectionId(heading, 0),
    heading,
    section.lines,
  );
}
