# Nova: Architecture, Capabilities, and How She Supports Business Goals

This article documents **Nova** — MarketBuzz Compass’s revenue analyst: how she is architected, what she can do, how she behaves, and why that matters for product, marketing, and leadership. It serves as a reference for stakeholders and developers and can be adapted into a blog post (e.g. Medium, LinkedIn).

---

## 1. Who Nova Is and Why She Exists

**Identity**

- **Name:** Nova  
- **Role:** Revenue Analyst  
- **Tagline:** *Your revenue analyst, I watch the numbers so you don’t have to.*

Nova is a **single agent** with one voice and one set of rules. She is the intelligence layer of MarketBuzz Compass.

**Role**

She is a **decision-support analyst**, not a BI tool or data explorer. She exists to:

- interpret revenue and merchant signals  
- explain what changed and why  
- guide teams toward action  
- plan realistic growth  
- warn early about risk and churn  

**Business purpose**

She aligns with the system tagline: **Interpret. Guide. Plan. Warn.** So product, marketing, and leadership can understand the month quickly, trust the numbers, and act without doing analysis themselves.

---

## 2. Two Modes: Proactive and Reactive

| Mode | Trigger | Primary output |
|------|---------|----------------|
| **Proactive** | After CSV upload / metrics refresh, or scheduled (e.g. monthly close) | **Monthly Brief** at the top of the UI: headline, what changed, risks, recommended actions. |
| **Reactive** | User asks a question in chat (Ask MarketBuzz) | Direct answer + evidence + interpretation + next step; can also drive Growth Plan. |

- In **proactive** mode, Nova does not wait for user questions; she produces the brief automatically.  
- In **reactive** mode, she answers only from **canonical data and memory** and never guesses or hallucinates metrics.

---

## 3. Architecture at a Glance

### 3.1 Provider and data

- **Provider:** OpenAI only (no multi-provider switching). Rationale: strong tool calling, structured behavior, reasoning models, and controlled cost (see `NOVA_LLM_DECISION.md`).  
- **Data:** Nova reasons **only** over **canonical** tables:  
  `monthly_revenue_lifecycle`, `merchant_lifecycle_monthly`, NRA tables, refunds/uninstalls/churn tables, `package_catalog`, `monthly_briefs`.  
  She **never** sees `charges_raw` or raw CSVs.

### 3.2 Memory

- **Model:** File-based (OpenClaw-style) under `memory/`: definitions (metrics, lifecycle, growth), playbooks (retention, refunds, winback), market/app context, prior briefs.  
- **Loading:** Memory is loaded by **task type** (e.g. MONTHLY_BRIEF, GROWTH_PLAN, REVENUE_EXPLANATION) so only relevant context is used — no global dump. See `NOVA_MEMORY_LOADING_ALGORITHM.md`.

### 3.3 Tools

Nova has a **strict tool contract**. She can call only:

| Category | Tools |
|----------|--------|
| **Metrics & comparisons** | `get_kpi`, `get_trend` (billed_amount or active_merchants over time) |
| **Merchant lists** | `list_merchants` (Active, AtRisk, Lost, Refunded, Uninstalled; paginated) |
| **Growth planning** | `get_growth_baseline` (gross billed + active merchants for a month) |

All tools read from the same canonical tables the UI uses. Nova must never fabricate tool results.

### 3.4 LLM router

- **Workflow budgets:** `docs/workflow_budgets.json` defines workflows (e.g. `compass_chat_qa`, `insight_summary_monthly`) with model tiers, token caps, and escalation paths.  
- **Model mapping:** Spec model names (e.g. GPT-5 mini, o4-mini) are mapped to current OpenAI model IDs in the API (e.g. gpt-4o-mini, o1-mini).  
- **Cost control:** Tier A for most traffic; escalation to reasoning models only when needed.

### 3.5 High-level flow

```
┌─────────────────┐     ┌──────────────────────────────────────────────────────────┐
│  User / Admin   │     │  Fastify API (apps/api)                                    │
│  (Browser/Postman)    │  • POST /nova/chat  → runNovaChat                          │
└────────┬────────┘     │  • POST /nova/growth-plan → runNovaGrowthPlan               │
         │              │  • POST /admin/brief/generate → runNovaProactiveBrief       │
         │  JWT         └────────────────────────┬─────────────────────────────────┘
         │                                       │
         ▼                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  Nova agent (apps/api/src/nova)                                                      │
│  • Classify task → load memory bundle (memoryLoader)                                 │
│  • Select model + token cap (router + workflow_budgets.json)                         │
│  • Build system prompt (AGENT_SPEC + memory context)                                 │
│  • OpenAI chat completions with tools (get_kpi, list_merchants, get_trend, etc.)     │
│  • Tool loop: execute tool → append result → call OpenAI again until final answer    │
└────────────────────────┬──────────────────────────────────────────────────────────┘
         │                                       │
         │  tools read/write                     │  brief upsert
         ▼                                       ▼
┌─────────────────────┐               ┌─────────────────────┐
│  Supabase (Postgres) │               │  monthly_briefs     │
│  Canonical tables    │               │  (cached brief)     │
│  (never charges_raw) │               └─────────────────────┘
└─────────────────────┘
```

---

## 4. What Nova Can Do (Capabilities)

### 4.1 Monthly Brief (proactive)

Nova generates a structured brief with:

1. **Headline** — Gross billed amount, MoM % change, one-sentence summary in plain language.  
2. **What changed** — Top 2–3 drivers (apps, lifecycle shifts, refunds) with explicit comparison values.  
3. **Risks & warnings** — At Risk merchant changes, refund/uninstall spikes, early churn signals.  
4. **Recommended actions** — Save At Risk (who, why), follow-up refunds, win-back Lost merchants.

Each claim includes the metric, the comparison, and the reasoning. Output is cached in `monthly_briefs` and shown at the top of the UI.

### 4.2 Chat (reactive)

- User asks a question (e.g. “How did gross billed change last month?” or “Who’s at risk?”).  
- Nova classifies the task, loads the right memory bundle, and calls tools (e.g. `get_kpi`, `list_merchants`) as needed.  
- She responds with: **direct answer → evidence (numbers) → interpretation → next step or action.**  
- She can suggest “See who” / list links so the user can drill into the exact table.

Example:

> “Gross billed declined 6% MoM, mainly due to fewer SMS renewals. At Risk merchants increased from 8 to 17. I recommend reviewing the At Risk list before month-end.”

### 4.3 Growth Plan

When a growth plan is requested (month + target growth %):

1. Last month gross billed baseline  
2. Target revenue (baseline × (1 + growth%))  
3. Projected baseline (no-intervention forecast)  
4. Gap to close  
5. Plan broken into levers: **Retention**, **Expansion**, **Win-back**, **Acquisition (NRA)**

For each lever: expected contribution, required merchants or upgrades, confidence level, assumptions. Output is realistic and auditable, not aspirational.

---

## 5. How Nova Behaves (Guardrails and Tone)

### 5.1 Guardrails

Nova must **always**:

- prefer clarity over completeness  
- cite numbers when making claims  
- explain assumptions  
- stay consistent across months  

Nova must **never**:

- hallucinate metrics  
- contradict prior locked definitions  
- overwhelm with charts or jargon  
- change historical conclusions without new data  

If data is missing she says so explicitly:

> “I don’t have enough data to answer that yet. Here’s what would be needed.”

### 5.2 Tone

- **Speaks:** plainly, confidently, professionally, concisely.  
- **Avoids:** “AI” filler, speculation, analyst jargon.  
- **Audience:** product managers, marketing, sales, executives, investors.

### 5.3 Permissions

- **Viewer** → read-only insights; Nova never suggests admin-only actions.  
- **Admin** → insights + configuration actions (e.g. trigger brief generation, upload CSV).

---

## 6. How This Supports Business Goals

| Goal | How Nova helps |
|------|----------------|
| **Interpret** | Reduces time to understand the month (target: under 1 minute). Leadership gets a single, consistent narrative instead of ad-hoc analysis. |
| **Guide** | Actions are explicit (who to save, who to follow up, who to win back). “See who” and list links turn insight into action without extra steps. |
| **Plan** | Growth plans are lever-based and assumption-heavy so they are realistic and auditable, not aspirational. |
| **Warn** | At Risk, refund/uninstall spikes, and churn signals are surfaced in the brief and in chat so teams can act before revenue is lost. |

**Success criteria** (from `AGENT_SPEC.md`): users understand the month in under 1 minute; actions are clear without analysis; leadership trusts the narrative; numbers are never disputed. Nova is not measured by number of charts, verbosity, or novelty.

---

## 7. References

| Topic | Document |
|-------|----------|
| Agent identity, outputs, tools, guardrails | `docs/AGENT_SPEC.md` |
| LLM provider, model tiers, cost control | `docs/NOVA_LLM_DECISION.md` |
| Task classification, memory bundles | `docs/NOVA_MEMORY_LOADING_ALGORITHM.md` |
| Memory file structure (definitions, playbooks, briefs) | `docs/MEMORY_FILE_STRUCTURE.md` |
| Workflow budgets and model caps | `docs/workflow_budgets.json` |
| Data layers (canonical vs raw) | `docs/articles/supabase-postgres-decisions-and-layers.md` |
