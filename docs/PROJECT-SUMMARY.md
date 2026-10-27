# Ask Aria: project summary

**Conceptual case study.** A conversational assistant inside a commerce analytics dashboard, built as a working portfolio demo on synthetic data.

- Live demo: https://ask-aria-dun.vercel.app/
- Case study: https://shriyajatekar2026.framer.ai/ask-aria
- Interview script: [GOLDEN-PATH.md](GOLDEN-PATH.md)
- Usability test kit (not yet run): [USABILITY-TEST-KIT.md](USABILITY-TEST-KIT.md)

---

## 1. The problem

Brands selling on Amazon, Flipkart, Blinkit and other marketplaces get huge, complex data from each one: sales, ads, ROAS, conversion, inventory. A dashboard can show all of it, but answering a simple question like *"Why did ROAS change?"* means a long hunt across filters, platforms and charts. Even a senior analyst takes a long time to get there.

The data wasn't missing. The step from data to an answer was.

## 2. Who it's for

| Role | What they need from an answer |
|---|---|
| **Analyst** (primary) | The cause, the evidence, and where to look next |
| **Key Account Manager** | Which client accounts need attention, and something to send them |
| **CXO** | The one number that matters most, and no operational controls |

## 3. My role and decisions

Ask Aria started as a project assigned to me at Infytrix, with only a few pointers. I defined the experience and extended the concept. It stayed at the idea stage there and was never built. Afterwards I rebuilt it on my own as this coded demo, in Cursor with help from ChatGPT, because I no longer had the original screens.

The design decisions:

1. **Suggestions based on what you're viewing.** The chat opens with questions about the metric and platform on screen, which solves the blank-prompt problem.
2. **Six conversation principles**, applied to every answer:
   - Lead with the insight
   - Always show the source
   - One answer per response
   - Offer a next step
   - Confirm before action
   - Say when uncertain
3. **A clarifying question for vague asks.** "Why is Amazon bad?" gets "bad could mean several things" and a choice of metrics, not a guess.
4. **Follow-ups keep context.** "Which products caused it?" or just "Why?" carries over the metric, platform and period.
5. **Insight → action, with confirmation.** Aria drafts a report or client email, and nothing runs until the person confirms.
6. **Role-based answers and guardrails.** The same question gives a different depth per role, and a CXO can't change campaigns from chat.

## 4. What's built

- Role-based sign-in (Analyst, KAM, CXO) into a full analytics dashboard: KPI cards, platform chart, platform breakdown, top/bottom products, and a product table with sort, search and paging.
- Synthetic data across **12 ecommerce & quick-commerce platforms**: Amazon, Flipkart, Myntra, Ajio, Tata CLiQ, IndiaMART, Nykaa, Purple, BigBasket, Blinkit, Zepto, Swiggy Instamart.
- The **Ask Aria** chat panel, which includes:
  - starter suggestions
  - answer cards with a visible source line
  - corrections when a question's premise is wrong
  - follow-ups that keep context
  - report, spreadsheet and email drafts with confirm-before-send
  - monitors (simulated)
- **Did it work?** Confirmed bid, budget and keyword changes get a before/after check (7 days before vs up to 7 after), with a verdict and a caveat that it isn't proof.
- **Answer feedback**: thumbs up/down with a reason under every analysis answer, a log of questions Aria couldn't answer, and "Show feedback" to review both.
- **Show on dashboard**: every analysis answer can switch the chart to its metric and highlight its platform, so the user can check it.
- **Data freshness**: each platform reports on its own delay; periods end on the last day every platform has reported, and answers flag partial data.
- **Hinglish**: common Hinglish questions ("Amazon ka ROAS kyun gira?") are understood, with "I read this as: …".
- **One-click deep dive** from any KPI card, alert or the bell: what happened → why → where → has it happened before → what to do, in one card with report, task and share actions.
- **Root-cause analysis**: a driver tree (Gross Sales = sessions × conversion × sales per order; ROAS = sales per click ÷ cost per click) that splits a change exactly between drivers, traces it to platforms and products, lists what was ruled out, and states its confidence. Exportable as a report.
- **Situation alerts** in the notification bell and the chat: material drops, what happened the last time something similar happened in the data (and how it recovered), and a suggested next step. When there is no precedent, Aria says so.
- **Risky-bid warning**: a bid change (for example ₹5 at 11:50 PM) is checked against the last 7 days before you confirm.
- **Team actions**: Slack or Teams post, calendar invite, Jira or Asana task, weekly digest, all previewed and simulated.
- **AI understanding fallback** (OpenAI, optional): only for questions the rules can't read; the model picks from a fixed menu and never writes answers or numbers.
- A **Design notes** toggle that labels each answer with the principles it shows, so a reviewer can check the design against the live demo.
- A **graphite and copper** visual system: IBM Plex type, WCAG AA text contrast everywhere, chart colours at 3:1, calm motion that turns off for reduced-motion users.
- A public **design system** page.
- **109 automated tests** covering question routing, follow-up context, the "say when uncertain" behaviour, the source line on every answer, answer wording, the golden path, the Google demo-only switch, the root-cause maths (parts add up to the whole), alerts, bid risk, team actions, the AI fallback and its rate limits, and colour contrast.

## 5. How it works (plain language)

1. **Understanding the question.** Aria reads the question and matches it to one of about 20 question types, such as "why did X change", "compare platforms" or "draft an email". It uses keywords plus what was discussed earlier in the conversation. This is rules, not an AI model.
2. **Remembering the conversation.** After each answer, Aria remembers the metric, platform, brand and period it talked about. That's why "Why?" or "What about Flipkart?" works without repeating everything.
3. **Answering.** Aria calculates the numbers from the synthetic dataset for the exact periods compared. It writes the answer from a template that puts the finding first, then attaches the source line.
4. **Root cause.** For "why" questions that need depth, Aria breaks the metric into the parts that multiply to make it and measures how much of the change each part explains. The parts always add up exactly to the total change.
5. **Alerts.** Aria scans each platform for material drops, looks back through the history for the last similar drop, and checks what changed when it recovered, using the same root-cause method.
6. **Checking itself.** Before answering a "why did X drop?" question, Aria checks whether X actually dropped. If not, it says so. If a change is under 1%, it says the change is too small to explain.
7. **Actions.** Drafts are always shown for review first. On the public site, confirming an action shows a labelled simulation ("Demo only: nothing was actually sent"). Real Google Docs, Sheets and Gmail can only be switched on deliberately, on the server, with `ASK_ARIA_LIVE_GOOGLE=true` plus Google keys. Keys never reach the browser.

## 6. Honest limits

- **Answers are not AI-generated.** They are calculated and templated from synthetic data. An optional OpenAI model only maps unusual phrasing onto Aria's question types. Its usage limits are kept in server memory per running instance, so the real spending ceiling must be set as a monthly budget in the OpenAI project. The default model name (`gpt-4o-mini`) should be checked against OpenAI's current list.
- **Root cause is arithmetic, not causation.** The driver tree shows which parts of the formula moved, not why customers behaved differently. Stock and Buy Box are shown as "also moved" signals, not proven causes.
- **Alerts and past playbooks come from about 11 weeks of synthetic data,** so precedents are few and sometimes much smaller than today's drop (Aria says so).
- **"Did it work?" is a before/after comparison, not proof**, and the synthetic data doesn't react to actions, so in this demo it shows how the check works. The built-in example is labelled as one.
- **Feedback and tracked actions live in the browser** (per demo user); nothing is collected centrally.
- **Reporting delays are illustrative**, not measured from real marketplaces.
- **Hinglish uses a fixed vocabulary** of common question words; other phrasing needs the optional AI fallback. Not yet tested with native speakers.
- **Bid checks use daily data only.** There is no hourly data, so Aria makes no claims about late-night traffic, and no real current bids are stored; it compares against the actual cost per click.
- **Synthetic data, about 11 weeks, rolling.** The timeline always ends yesterday so the dashboard shows the real last 30 days, but the numbers are a fixed synthetic story replayed on current dates (each day keeps its original random seed); only weekends follow the real calendar. Patterns were designed for the demo, and Aria says when the history is too short to judge.
- **Never tested with real users.** There are no usage numbers or research results from this demo.
- **Time saved is an estimate, not a result.** "20–25 minutes to under a minute" was the goal I estimated for the original concept. Nothing in this demo measures it.
- **Questions outside the script** get an honest "I'm not sure" with suggestions. Free-form phrasing works only as far as the rules cover it.
- **Actions are simulated** on the public site. Monitors don't run in the background.
- **Not yet covered:** dark mode, automated accessibility audits, and some older lint warnings in code that predates this revision.

## 7. Screenshots & recording plan for the portfolio

Record at 1440×900 (desktop) and 390×844 (phone), with **Design notes** on for the stills. Use the golden-path questions so every shot is repeatable.

| # | Shot | Shows | Format |
|---|---|---|---|
| 1 | Landing page | Name, "Conceptual case study", honest one-line description | Still |
| 2 | Analyst dashboard with Aria open on the welcome screen | Suggestions based on the current view | Still |
| 3 | "Why did ROAS drop on Amazon?" answer, Design notes on | Insight first, source line, one next step | Still (hero) |
| 4 | "Why is Amazon bad?" | Clarifying question | Still |
| 5 | "Why did ROAS drop on Flipkart?" | Correction when the premise is wrong | Still |
| 6 | Analyst path, steps 1→4 | Context kept, then confirm-before-action | 30–40 s screen recording |
| 7 | KAM path, steps 1→4 | Role-specific answer → draft → confirm send | 30–40 s screen recording |
| 8 | CXO path on a phone | Biggest risk → why → guardrail | 20–30 s phone recording |
| 9 | Side by side: same question as Analyst vs CXO | Role-based depth | Still (two panels) |
| 10 | Design system page | Colours with contrast ratios, chart palette, motion | Still |
| 11 | RCA card, Design notes on | Driver tree waterfall, where it happened, ruled out, confidence | Still (hero 2) |
| 12 | Notification bell open, then the alert card | Situation, what happened last time, suggestion | Still pair |
| 13 | ₹5 bid at 11:50 PM | Risk warning before confirm, "Confirm anyway" | 15 s screen recording |

Caption every image "Synthetic data". Don't caption any time saving as a result.
