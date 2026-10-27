# Ask Aria: interview script (golden path)

A tested path through the demo: 4 questions per role, asked in order, plus one vague question. Each step shows one of the six conversation principles. Every step is checked automatically by `tests/ask-aria/golden-path.test.ts`, so if a step changes, a test fails before the demo breaks.

**Before you start**
- Open the demo, choose **Try the demo**, then pick a role.
- Stay on **Consolidated View** (the first tab). The first question below is the first suggestion in the chat.
- Turn on **Design notes** (top of the chat panel) if you want each answer labelled with the principles it shows.
- Start a **New** conversation between roles, so follow-ups don't carry over.

The numbers below come from the synthetic dataset (17 Jan – 15 Feb 2026 vs the 30 days before). They are demo data, not results.

---

## Analyst (Raghav): from "why" to a report

| # | Ask | What Aria opens with | Point to |
|---|---|---|---|
| 1 | Why did ROAS drop on Amazon? | "ROAS on Amazon fell 11.5% to 3.13 vs the comparison period." | **Leads with the insight**; the **Source** line under it names the data, scope and both periods |
| 2 | Which products caused it? | "Daily Radiance Serums moved most: ROAS −13.2% on Amazon." | **Context kept**: no need to repeat ROAS, Amazon or the dates |
| 3 | Has this happened before? | A note first: the dataset covers about 10 weeks, too short to call a pattern | **Says when uncertain** instead of inventing history |
| 4 | Create a report from this analysis | A report preview with a **Confirm** button | **Insight → action**, **confirm before acting**. Confirming shows "Demo only: no real document was created." |

## Key Account Manager (Yuga): from brands to a client email

| # | Ask | What Aria opens with | Point to |
|---|---|---|---|
| 1 | Which brands need attention? | "Haven Wellness needs attention first: revenue −19.3% … 3 other brands are also down." | **Role-specific**: a KAM sees accounts, not channels |
| 2 | Why? | "Gross Sales fell 19.3% … IndiaMART moved most, worth raising with the account." (title names Haven Wellness) | A one-word follow-up explains the brand from the previous answer |
| 3 | Draft a client update | An email draft to "Client account (demo)" for review | **Insight → action** as a draft, not a send |
| 4 | Send this | A send preview with a **Confirm** button | **Confirm before acting**. Confirming says "Demo only: nothing was actually sent." |

## CXO (Sri): one answer, then a guardrail

| # | Ask | What Aria opens with | Point to |
|---|---|---|---|
| 1 | What's the biggest risk this month? | "Biggest risk: Amazon Gross Sales fell 22.0% (₹2.99L lost), the largest drop of any platform." | **One answer per response**, ranked by rupee impact, not by % |
| 2 | Why? (or tap **Why did Amazon drop?**) | "Gross Sales on Amazon fell 22.0% to ₹10.63L vs the comparison period." | **Offers a next step**: a single button, not a menu |
| 3 | Which platform is growing fastest? | "Myntra grew fastest: Gross Sales +14.8% vs the comparison period." | Executive-length answer |
| 4 | Pause the Amazon campaign Hydra Glow | "This action requires an operational role…" | **Role guardrail**: a CXO can't change campaigns from chat |

## Any role: the vague question

| Ask | What Aria does | Point to |
|---|---|---|
| Why is Amazon bad? | Asks what "bad" means and offers Revenue / ROAS / Conversion / Traffic | **Clarifying question** instead of guessing |

## Extra moments if there's time

- **Why did ROAS drop on Flipkart?** Aria corrects the question: "ROAS on Flipkart didn't drop — it rose +0.1%…" (**says when uncertain**).
- **Hello** or an off-topic question: Aria says it isn't sure and offers suggestions instead of making up an analysis.
- **What is ACOS?** gives a definition, then offers the trend.

## What to say if asked "is this AI?"

No. Aria is a scripted prototype: rule-based routing over synthetic data, built to test the conversation design (what to say, in what order, when to ask, when to stop). Using rules was deliberate: the same question always gives the same answer in a demo, and every answer can be traced to the data. A production version would put a language model behind the same answer structure. See `docs/PROJECT-SUMMARY.md` → "Honest limits".
