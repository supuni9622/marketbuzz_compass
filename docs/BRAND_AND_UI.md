# MarketBuzz Compass — System & Agent Identity

## System Name
**MarketBuzz Compass**

### System Tagline
**Interpret. Guide. Plan. Warn.**

### What MarketBuzz Compass Is
MarketBuzz Compass is an **internal revenue intelligence system** for the MarketBuzz Clover app suite.

It exists to:
- interpret messy billing data
- guide teams toward what matters
- plan realistic growth
- warn early about risk and churn

It is **not** a dashboard.
It is a **decision-support system**.

---

## Agent Name
**Nova**

### Agent Tagline
**Your revenue analyst, I watch the numbers so you don’t have to.**

### Short UI Tagline (recommended for headers)
**Your revenue analyst.**

### Who Nova Is
Nova is a **professional, calm, trusted analyst** — not a mascot, not a chatbot.

Nova:
- explains what changed and why
- connects trends across months
- remembers past insights
- proactively surfaces risks and opportunities
- builds growth plans when asked

Nova never:
- dumps raw data without context
- guesses numbers
- overwhelms users with technical language

---

## Voice & Tone Guidelines

Nova’s tone must always be:
- clear
- confident
- concise
- evidence-based
- non-technical

Nova speaks to:
- product managers
- marketing teams
- sales leaders
- executives
- investors

Nova avoids:
- analyst jargon
- finance-heavy explanations
- AI hype language

### Example Nova Language
- “Gross billed grew 8% this month, mainly driven by SMS renewals.”
- “Refunds increased slightly, but they did not materially affect growth.”
- “At Risk merchants increased. If this trend continues, churn will rise next month.”

---

## UI Philosophy

### Core UX Principle
> **Nova narrates → charts prove → tables enable action**

MarketBuzz Compass follows a **storytelling-first design**, not a dashboard-first design.

Users should understand:
- *what happened*
- *why it happened*
- *what to do next*

within **30–60 seconds** of opening the app.

---

## Interactive UI Principles

The UI must feel **interactive and story-led**, not a static dashboard. Apply these principles so the first implementation is clearly interactive.

### Do

- **Progressive disclosure** — Don’t show everything at once. One clear story at a time; details on demand (e.g. “Show evidence”, “See who”, “Drill into app”).
- **Narrative as the spine** — The brief text drives the flow. Numbers and charts **support** the story (e.g. “Gross billed dropped 5%” → click to see the chart; “12 At Risk merchants” → click to open the list).
- **Contextual actions** — From the brief or a scorecard, one click to the right list (At Risk, Lost, Refunds) with filters pre-filled, or “Export this list”, “Copy link”.
- **Filters drive the story** — Changing Month / Compare / App **immediately** updates narrative, KPIs, and tables (no “Apply” if possible). URL reflects state so links are shareable.
- **Inline “Who?” / “See list”** — In the narrative or next to a number: “12 merchants at risk” with a link “See who” that opens the merchants list filtered to At Risk.
- **Scorecards that expand** — KPI strip or scorecards are tappable/clickable → expand into sparkline, breakdown, or “View list”.
- **Deep links** — “Copy link” / share link that opens the Brief with that month, compare, and app. Makes the Brief a shareable story.
- **Loading and empty states** — Skeleton or brief message for “Summary pending — Nova coming soon” and for tables; small transitions when data loads.

### Avoid

- One big page with every chart and table visible at once.
- Charts that aren’t tied to a specific claim or question.
- Tables that feel like data dumps with no “See who”, “Export”, or “Why this number?”
- Filters that require “Apply” and don’t update the narrative/KPIs immediately.
- Purely decorative motion; keep motion purposeful (expand, loading, highlight).

### First implementation focus

- **One interactive flow:** KPI strip + short narrative block; each KPI or “At Risk”/“Lost” mention is clickable and either expands a small proof (sparkline/table) or opens the merchants list with the right filters.
- **Filters drive the story:** Month + Compare in the bar; on change, refetch KPIs and brief and re-render so it feels like the app is “answering” for that comparison.
- **Placeholder still interactive:** Even when the brief is “Summary pending — Nova coming soon”, the strip and “See At Risk / Lost” (or similar) can already work and open the right lists.

---

## Theme

**Vibe:** Professional, calm, trustworthy — revenue analyst, not corporate gray.

| Element | Value | Use |
|--------|--------|-----|
| **Accent** | Teal (e.g. `#0d9488` / Tailwind `teal-600`) | Primary actions, links, Nova accent, key highlights. |
| **Neutrals** | Slate/stone (e.g. `slate-700` text, `stone-100` surfaces) | Body text, borders, cards. |
| **Semantic** | Green = positive/growth; amber = at-risk/warning; red = loss/alert | Deltas, lifecycle, alerts (Interpret. Guide. Plan. **Warn.**). |
| **Background** | Off-white / very light gray (e.g. `#fafafa` / `slate-50`) | Page and narrative block. |
| **Typography** | Clear sans (Inter, Geist, or system-ui) | Readable for numbers and narrative. |
| **Mode** | Light first; dark optional later | Keeps implementation and tone calm. |

Use CSS variables or design tokens so theme stays consistent across the app.

---

## Primary UI Structure

### 1. Monthly Brief (Default Landing)
A guided narrative for the selected month.

Sections:
1. Headline summary (no charts)
2. Scorecards with trends (mini charts)
3. Evidence breakdown (charts)
4. Action center (tables)
5. App health (tabs per app)
6. Next month growth plan

Nova provides a written summary at the top of the brief.

---

### 2. Charts — When and Why
Charts are used only when they:
- prove a claim Nova makes
- show trends over time (MoM / YoY)
- help compare apps, plans, or lifecycle states

Standard chart types:
- Line → trends over months
- Bar → comparisons
- Stacked bar → plan or tier mix
- Waterfall → growth plan composition
- Sparkline → scorecards only

Charts never appear without context.

---

### 3. Tables — For Action
Tables are the **primary action surface**.

Used for:
- At Risk merchants
- Lost merchants
- Refunded merchants
- Uninstalled merchants
- NRA (new revenue added)
- Growth plan execution lists

All tables must support:
- pagination
- search
- sorting
- CSV export
- deep linking with filters

---

## Global Filters & Comparisons

Every view must support:
- Year
- Month
- Compare To (previous month by default)
- App (All / SMS / CRM / Unlock)

All KPIs and charts must show:
- current value
- comparison value
- absolute delta
- percentage delta

---

## Growth Planning Experience

Nova supports **Next Month Growth Planning** using:

- baseline: **Gross Billed Amount**
- user input: target growth percentage (e.g. 10%)
- output:
  - revenue target
  - projected baseline
  - gap to close
  - plan broken into levers:
    - retention
    - expansion
    - win-back
    - acquisition (NRA)

Nova must clearly state:
- assumptions
- constraints
- confidence level

Growth plans are realistic, not aspirational.

---

## Avatar Usage

Nova may be represented with a subtle avatar.

Rules:
- avatar never blocks content
- avatar never animates excessively
- avatar speaks only when useful
- avatar can be collapsed

Nova is a **guide**, not a distraction.

### Nova Animations

All Nova motion is **purposeful** — no looping bounces or constant motion. Respect `prefers-reduced-motion`: reduce or disable non-essential animation when the user prefers reduced motion.

| Animation | When | How |
|-----------|------|-----|
| **Entrance** | When the narrative block (or Nova) first appears | Short fade-in or soft scale-in (200–300 ms). |
| **Idle** | When Nova is visible but not "speaking" | Very subtle: e.g. very slow, tiny opacity or position shift, or a single slow blink. Easy to disable if distracting. |
| **Nova is updating** | When brief/narrative is loading or refetching | Gentle pulse or a small activity indicator near the avatar (not the whole avatar bouncing). |
| **New content** | When new narrative text replaces placeholder | Brief highlight or fade on the text block; no big avatar motion. |

**Avoid:** Looping bounces, constant movement, mascot-style wiggles. Nova stays calm and professional.

---

## What This File Guarantees

By following this spec:
- the system remains understandable to non-analysts
- insights stay grounded and trustworthy
- UI and agent behavior stay aligned
- MarketBuzz Compass remains a decision tool, not a reporting tool

This file is the **single source of truth** for:
- naming
- tone
- theme (accent teal, neutrals, semantic colors, typography)
- UI philosophy
- Nova avatar and animations
- agent behavior expectations

---

## Locked Names Summary

- **System:** MarketBuzz Compass  
- **System Tagline:** Interpret. Guide. Plan. Warn.  
- **Agent:** Nova  
- **Agent Tagline:** Your revenue analyst, I watch the numbers so you don’t have to.

