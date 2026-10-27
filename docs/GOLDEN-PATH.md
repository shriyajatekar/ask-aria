# Ask Aria: interview script (golden path)

A tested path through the demo: 4 questions per role, asked in order, plus one vague question. Each step shows one of the six conversation principles. Every step is checked automatically by `tests/ask-aria/golden-path.test.ts`, so if a step changes, a test fails before the demo breaks.

**Before you start**
- Open the demo, choose **Try the demo**, then pick a role.
- Stay on **Consolidated View** (the first tab). The first question below is the first suggestion in the chat.
- Turn on **Design notes** (top of the chat panel) if you want each answer labelled with the principles it shows.
- Start a **New** conversation between roles, so follow-ups don't carry over.

The numbers below come from the synthetic dataset: the last 30 complete days (ending on the last day every platform has reported) vs the 30 before. The timeline rolls forward (the data always ends yesterday), so dates change daily; the story stays the same and figures may shift by about a percentage point as real weekends rotate. They are demo data, not results.

---

## Analyst (Raghav): from "why" to a root-cause report

| # | Ask | What Aria opens with | Point to |
|---|---|---|---|
| 1 | Why did ROAS drop on Amazon? | "ROAS on Amazon fell 9.7% to 3.15 vs the comparison period." | **Leads with the insight**; the **Source** line names the data, scope and both periods |
| 2 | Run a root-cause analysis (or tap the button) | "Cost per click drives 74% of the ROAS drop on Amazon: it rose 7.8% (₹53.64 → ₹57.83)." | **Driver tree**: ROAS = sales per click ÷ cost per click, a waterfall of what explains the drop, the products where it happened, what was ruled out, and a confidence level. Follow-up kept Amazon and ROAS |
| 3 | Has this happened before? | A note first: the dataset covers about 11 weeks, too short to call a pattern | **Says when uncertain** instead of inventing history |
| 4 | Create an RCA report | A preview of "Root-cause analysis — ROAS (Amazon)" with a **Confirm** button | **Insight → action**, **confirm before acting**. Confirming shows "Demo only: no real document was created." |

## Key Account Manager (Yuga): from brands to a client email

| # | Ask | What Aria opens with | Point to |
|---|---|---|---|
| 1 | Which brands need attention? | "Haven Wellness needs attention first: revenue −15.0% … 3 other brands are also down." | **Role-specific**: a KAM sees accounts, not channels |
| 2 | Why? | "Gross Sales fell 15.0% … IndiaMART moved most, worth raising with the account." (title names Haven Wellness) | A one-word follow-up explains the brand from the previous answer |
| 3 | Draft a client update | An email draft to "Client account (demo)" for review | **Insight → action** as a draft, not a send |
| 4 | Send this | A send preview with a **Confirm** button | **Confirm before acting**. Confirming says "Demo only: nothing was actually sent." |

## CXO (Sri): one answer, then a guardrail

| # | Ask | What Aria opens with | Point to |
|---|---|---|---|
| 1 | What's the biggest risk this month? | "Biggest risk: Amazon Gross Sales fell 18.8% (₹2.52L lost), the largest drop of any platform." | **One answer per response**, ranked by rupee impact, not by % |
| 2 | Why? (or tap **Why did Amazon drop?**) | "Gross Sales on Amazon fell 18.8% to ₹10.90L vs the comparison period." | **Offers a next step**: a single button, not a menu |
| 3 | Which platform is growing fastest? | "Myntra grew fastest: Gross Sales +16.2% vs the comparison period." | Executive-length answer |
| 4 | Pause the Amazon campaign Hydra Glow | "This action requires an operational role…" | **Role guardrail**: a CXO can't change campaigns from chat |

## Any role: the vague question

| Ask | What Aria does | Point to |
|---|---|---|
| Why is Amazon bad? | Asks what "bad" means and offers Revenue / ROAS / Conversion / Traffic | **Clarifying question** instead of guessing |

## Extra moments if there's time

- **Show on dashboard.** Under any analysis answer, tap **Show on dashboard**: the chart switches to that metric, the platform turns copper, and the KPI card and table row are highlighted, so the answer can be checked.
- **Did it work?** Shows a before/after check on confirmed bid, budget and keyword changes (plus a labelled example), always with the caveat that a before/after isn't proof.
- **Amazon ka ROAS kyun gira?** Aria shows "I read this as: Why did ROAS drop on Amazon?" and answers.
- **Thumbs down** under an answer, pick a reason, then ask **Show feedback**.
- **Data freshness.** Open "Data complete through…" under the period: each platform's latest day, and why the period ends where it does.

- **One-click deep dive.** On the dashboard, click the small search icon on the **ROAS** card (or "Deep dive" on an alert, or in the bell). Aria opens with one card in five steps: what happened → why (driver tree) → where → has it happened before → what to do, with Export report, Create a task and Share on Slack.

- **What needs my attention?** An alert card: "Amazon Gross Sales fell 18.8% … mainly because conversion rate fell 11.4%", then **Last time** (a smaller, roughly 5% drop about two months earlier recovered within 7 days as sessions rose; Aria flags it as only a rough guide), a **suggested next step**, and the next alerts. The bell at the top shows the same alerts.
- **Set bid to ₹5 at 11:50 pm on Amazon campaign Hydra Glow.** The confirm card warns: "₹5.00 is well below what clicks cost here (₹56.91 on average over the last 7 days), so the ads may stop showing", with a suggestion. The button reads **Confirm anyway**.
- **Share this on Slack** / **Schedule a review with the client tomorrow at 3pm** / **Create a Jira task and assign it to Raghav** / **Send me a weekly digest.** Each builds its content from the latest finding, previews it, and is clearly simulated.

- **Why did ROAS drop on Flipkart?** Aria corrects the question: "ROAS on Flipkart didn't drop — it rose +0.1%…" (**says when uncertain**).
- **Hello** or an off-topic question: Aria says it isn't sure and offers suggestions instead of making up an analysis.
- **What is ACOS?** gives a definition, then offers the trend.

## What to say if asked "is this AI?"

Mostly no, by design. Every answer, number and suggestion is calculated from the synthetic data by Aria's own rules, so the same question always gives the same answer and every figure can be traced. An OpenAI model is used only as a fallback to understand unusual phrasing: it picks a question type from a fixed list and Aria shows "I read this as: …". It never writes answer text or numbers. See `docs/PROJECT-SUMMARY.md` → "Honest limits".
