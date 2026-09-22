import Link from "next/link";

import { Button } from "@/components/ui/button";

import {
  BodyCopy,
  CaseStudyHeader,
  CaseStudySection,
  CaseStudyShell,
  HorizontalCompare,
  LeadQuote,
  ProgressionList,
  SubtleSimLabel,
  VerticalFlow,
} from "./case-study-primitives";
import {
  MockActionChain,
  MockAmbiguityFlow,
  MockFlow01SalesChange,
  MockFlow02WeeklyReport,
  MockFlow03Spreadsheet,
  MockFlow04Email,
  MockFlow05Monitor,
  MockHitlMatrix,
  MockPermissions,
  MockTrustInsight,
} from "./case-study-flow-mocks";

const BEFORE_WORKFLOW = [
  "Question",
  "Find the right dashboard",
  "Select platform",
  "Choose metric",
  "Change date range",
  "Inspect chart",
  "Compare data",
  "Find product/platform driver",
  "Form conclusion",
  "Share manually",
];

const INTENT_FLOW = [
  "Ask",
  "Understand context",
  "Analyze",
  "Explain",
  "Recommend",
  "Act",
];

const AGENT_LOOP = [
  "Understand",
  "Analyze",
  "Decide",
  "Create / act",
  "Confirm",
  "Execute",
  "Monitor",
  "Retain conversational context",
];

const CAPABILITIES = [
  { title: "Understand", example: "What changed?" },
  { title: "Analyze", example: "Why did it change?" },
  { title: "Create", example: "Turn this into a report." },
  { title: "Communicate", example: "Send this to the KAM team." },
  { title: "Monitor", example: "Alert me if this happens again." },
];

const PRINCIPLES = [
  "Lead with the answer.",
  "Ask when uncertain.",
  "Show evidence.",
  "Preserve context.",
  "Confirm consequential actions.",
  "Ask for permissions contextually.",
  "Never fabricate unavailable data.",
  "Keep the conversation breathable.",
];

const ROLE_ITEMS = [
  "Problem framing",
  "Conversation architecture",
  "Intent and ambiguity handling",
  "Response hierarchy",
  "Trust patterns",
  "Agent handoffs",
  "Confirmation patterns",
  "Permission UX",
  "Artifact workflows",
  "Monitoring workflows",
  "Interaction design",
  "Prototype implementation",
];

const OUTCOMES = [
  "Reduced navigation burden",
  "Context-aware answers",
  "Clearer AI trust model",
  "Direct artifact creation",
  "Human-controlled actions",
  "Persistent conversation context",
  "Proactive monitoring concept",
];

export function AskAriaCaseStudyPage() {
  return (
    <CaseStudyShell>
      <CaseStudyHeader />

      <section className="border-b border-border/60 py-14 sm:py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="type-label tracking-wide text-text-tertiary uppercase">
            Conceptual product redesign
          </p>
          <h1 className="mt-6 type-h1 text-balance">Ask Aria</h1>
          <p className="mt-4 type-h3 font-normal text-text-secondary">
            Commerce intelligence, from question to action.
          </p>
          <BodyCopy className="mt-6 max-w-2xl">
            An AI-native intelligence layer designed to help commerce teams
            understand performance, turn insights into work, and act without
            leaving the workflow.
          </BodyCopy>
          <p className="mt-8 type-small text-text-tertiary">
            This page is a portfolio case study. It is not the live production
            dashboard.
          </p>
          <div className="mt-8">
            <Link href="/dashboard/analyst">
              <Button variant="tertiary" size="sm">
                Open live product shell
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <CaseStudySection eyebrow="The problem" title="The problem">
        <LeadQuote className="mt-0">
          The dashboard had the data.
          <br />
          Finding the answer was the problem.
        </LeadQuote>
        <BodyCopy className="mt-6">
          Commerce teams could access performance across platforms, products,
          advertising and sales metrics — but answering one business question
          often meant navigating multiple views and manually connecting the dots.
        </BodyCopy>
        <blockquote className="mt-8 border-l-2 border-border pl-4">
          <p className="type-body font-medium text-text-primary">
            &ldquo;What caused Amazon ROAS to fall?&rdquo;
          </p>
          <p className="mt-2 type-small text-text-secondary">
            The information existed. The workflow to reach the answer was the
            problem.
          </p>
        </blockquote>
      </CaseStudySection>

      <CaseStudySection eyebrow="Before" title="Target workflow">
        <BodyCopy className="mb-8">
          Observed workflow in the project context — a conceptual benchmark, not a
          measured production KPI.
        </BodyCopy>
        <VerticalFlow steps={BEFORE_WORKFLOW} caption="20–25 minutes" />
      </CaseStudySection>

      <CaseStudySection eyebrow="The insight" title="The insight">
        <LeadQuote className="mt-0">
          The data wasn&apos;t missing.
          <br />
          The intelligence layer was.
        </LeadQuote>
        <BodyCopy className="mt-6">
          Instead of making users learn how to navigate the dashboard, Aria
          should understand what they are trying to accomplish.
        </BodyCopy>
      </CaseStudySection>

      <CaseStudySection eyebrow="Design shift" title="From dashboard-first to intent-first">
        <HorizontalCompare
          before={{
            label: "Dashboard-first",
            detail: "User navigates data.",
          }}
          after={{
            label: "Intent-first",
            detail: "User asks a business question.",
          }}
        />
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div>
            <p className="type-label text-text-tertiary">Before</p>
            <VerticalFlow steps={["Dashboard", "Ask"]} />
          </div>
          <div>
            <p className="type-label text-text-tertiary">After</p>
            <VerticalFlow steps={INTENT_FLOW} />
          </div>
        </div>
      </CaseStudySection>

      <CaseStudySection eyebrow="Product model" title="Aria as a progression">
        <BodyCopy className="mb-8">
          Five capabilities in sequence — not a feature grid.
        </BodyCopy>
        <ProgressionList items={CAPABILITIES} />
      </CaseStudySection>

      <CaseStudySection
        eyebrow="Hard problem 01"
        title="Ambiguity"
        id="problem-ambiguity"
      >
        <BodyCopy>
          Aria cannot safely assume what &ldquo;bad&rdquo; means.
        </BodyCopy>
        <div className="mt-8">
          <MockAmbiguityFlow />
        </div>
        <LeadQuote className="mt-10 text-text-primary">
          A good agent doesn&apos;t just answer. It knows when not to answer yet.
        </LeadQuote>
      </CaseStudySection>

      <CaseStudySection eyebrow="Hard problem 02" title="Trust">
        <BodyCopy>
          AI-generated insight is only useful if users can understand where it
          came from.
        </BodyCopy>
        <div className="mt-8">
          <MockTrustInsight />
        </div>
        <p className="mt-6 type-small text-text-tertiary">
          Answer, evidence, period, scope, and source stay visible — without
          overclaiming model confidence.
        </p>
      </CaseStudySection>

      <CaseStudySection eyebrow="Hard problem 03" title="Action">
        <BodyCopy className="mb-6">
          Aria can act, but the user remains in control of consequential
          actions.
        </BodyCopy>
        <MockActionChain />
      </CaseStudySection>

      <CaseStudySection eyebrow="Permission design" title="Google Workspace">
        <BodyCopy className="mb-6">
          Permissions are requested at the moment the capability is needed,
          rather than during initial setup.
        </BodyCopy>
        <MockPermissions />
      </CaseStudySection>

      <CaseStudySection eyebrow="Agent loop" title="From question to follow-through">
        <VerticalFlow steps={AGENT_LOOP} />
        <p className="mt-6 type-small text-text-tertiary">
          The system retains conversational context across turns — it does not
          imply autonomous learning.
        </p>
      </CaseStudySection>

      <CaseStudySection eyebrow="Curated flows" title="Showcase real flows">
        <BodyCopy className="mb-8">
          Selected end-to-end stories from the prototype. Static presentation
          panels — not wired to production Ask Aria.
        </BodyCopy>
        <div className="space-y-8">
          <div>
            <p className="mb-3 type-label text-text-tertiary">
              &ldquo;Why did sales change?&rdquo;
            </p>
            <MockFlow01SalesChange />
          </div>
          <div>
            <p className="mb-3 type-label text-text-tertiary">
              &ldquo;Create a weekly performance report.&rdquo;
            </p>
            <MockFlow02WeeklyReport />
          </div>
          <div>
            <p className="mb-3 type-label text-text-tertiary">
              &ldquo;Create a spreadsheet of underperforming products.&rdquo;
            </p>
            <MockFlow03Spreadsheet />
          </div>
          <div>
            <p className="mb-3 type-label text-text-tertiary">
              &ldquo;Email it to the KAM team.&rdquo;
            </p>
            <MockFlow04Email />
          </div>
          <div>
            <p className="mb-3 type-label text-text-tertiary">
              &ldquo;Let me know if Amazon ROAS drops below 3.&rdquo;{" "}
              <SubtleSimLabel />
            </p>
            <MockFlow05Monitor />
          </div>
        </div>
      </CaseStudySection>

      <CaseStudySection eyebrow="Principles" title="Aria design principles">
        <ol className="space-y-4">
          {PRINCIPLES.map((principle, i) => (
            <li key={principle} className="flex gap-4 type-body text-text-secondary">
              <span className="type-label tabular-nums text-text-tertiary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{principle}</span>
            </li>
          ))}
        </ol>
      </CaseStudySection>

      <CaseStudySection eyebrow="Human in the loop" title="Intentional agent UX">
        <MockHitlMatrix />
      </CaseStudySection>

      <CaseStudySection eyebrow="My role" title="What I designed">
        <BodyCopy>
          I owned the conversational experience end-to-end:
        </BodyCopy>
        <ul className="mt-6 space-y-2">
          {ROLE_ITEMS.map((item) => (
            <li
              key={item}
              className="flex gap-2 type-body text-text-secondary before:content-['•']"
            >
              {item}
            </li>
          ))}
        </ul>
      </CaseStudySection>

      <CaseStudySection eyebrow="Collaboration" title="Technical collaboration">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="type-label text-text-tertiary">AI / product</p>
            <ul className="mt-3 space-y-1 type-small text-text-secondary">
              <li>Conversational UX</li>
              <li>Agent workflows</li>
              <li>Contextual intelligence</li>
              <li>Human-in-the-loop</li>
            </ul>
          </div>
          <div>
            <p className="type-label text-text-tertiary">Prototype</p>
            <ul className="mt-3 space-y-1 type-small text-text-secondary">
              <li>Next.js</li>
              <li>TypeScript</li>
              <li>Tailwind</li>
              <li>Google APIs · OAuth</li>
            </ul>
          </div>
        </div>
      </CaseStudySection>

      <CaseStudySection eyebrow="Outcome" title="Product outcomes">
        <BodyCopy className="mb-6">
          Qualitative outcomes only — no invented business metrics.
        </BodyCopy>
        <ul className="space-y-2">
          {OUTCOMES.map((item) => (
            <li
              key={item}
              className="type-body text-text-secondary before:mr-2 before:content-['•']"
            >
              {item}
            </li>
          ))}
        </ul>
      </CaseStudySection>

      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-6">
          <LeadQuote>
            Aria isn&apos;t another chatbot layered onto a dashboard.
          </LeadQuote>
          <BodyCopy className="mt-6 max-w-2xl">
            It&apos;s an intelligence layer that connects a question to an
            answer, an answer to a piece of work, and a piece of work to the next
            action.
          </BodyCopy>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-3xl px-6 type-small text-text-tertiary">
          Ask Aria · Conceptual product redesign · Portfolio showcase
        </div>
      </footer>
    </CaseStudyShell>
  );
}
