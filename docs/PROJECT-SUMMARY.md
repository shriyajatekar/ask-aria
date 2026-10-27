# Ask Aria: project summary

**Conceptual case study.** A conversational assistant inside a commerce analytics dashboard, built as a working portfolio demo on synthetic data.

- Live demo: https://ask-aria-dun.vercel.app/
- Case study: https://shriyajatekar2026.framer.ai/ask-aria
- Interview script: [GOLDEN-PATH.md](GOLDEN-PATH.md)

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
- A **Design notes** toggle that labels each answer with the principles it shows, so a reviewer can check the design against the live demo.
- A public **design system** page.
- **37 automated tests** covering question routing, follow-up context, the "say when uncertain" behaviour, the source line on every answer, answer wording, the golden path, and the Google demo-only switch.

## 5. How it works (plain language)

1. **Understanding the question.** Aria reads the question and matches it to one of about 20 question types, such as "why did X change", "compare platforms" or "draft an email". It uses keywords plus what was discussed earlier in the conversation. This is rules, not an AI model.
2. **Remembering the conversation.** After each answer, Aria remembers the metric, platform, brand and period it talked about. That's why "Why?" or "What about Flipkart?" works without repeating everything.
3. **Answering.** Aria calculates the numbers from the synthetic dataset for the exact periods compared. It writes the answer from a template that puts the finding first, then attaches the source line.
4. **Checking itself.** Before answering a "why did X drop?" question, Aria checks whether X actually dropped. If not, it says so. If a change is under 1%, it says the change is too small to explain.
5. **Actions.** Drafts are always shown for review first. On the public site, confirming an action shows a labelled simulation ("Demo only: nothing was actually sent"). Real Google Docs, Sheets and Gmail can only be switched on deliberately, on the server, with `ASK_ARIA_LIVE_GOOGLE=true` plus Google keys. Keys never reach the browser.

## 6. Honest limits

- **Not AI.** Answers are rule-based and templated over synthetic data. The demo tests the *conversation design*, not a language model. A production version would need a model behind the same answer structure, with its keys on the server, a fallback to the scripted answers when it's down, and a spending cap.
- **Synthetic data, about 10 weeks** (2 Dec 2025 – 15 Feb 2026). Patterns in it were designed for the demo, and Aria says when the history is too short to judge.
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
| 10 | Design system page | Tokens and components behind the UI | Still |

Caption every image "Synthetic data". Don't caption any time saving as a result.
