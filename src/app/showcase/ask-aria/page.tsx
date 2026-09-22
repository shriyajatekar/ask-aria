import type { Metadata } from "next";

import { AskAriaShowcasePage } from "@/components/showcase/ask-aria-showcase-page";

export const metadata: Metadata = {
  title: "Ask Aria · Case Study · Commerce Intelligence",
  description:
    "Portfolio case study: conversational commerce intelligence from question to action. Conceptual product redesign.",
};

export default function ShowcaseAskAriaRoutePage() {
  return <AskAriaShowcasePage />;
}
