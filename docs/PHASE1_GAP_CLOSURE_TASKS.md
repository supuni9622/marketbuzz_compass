# Phase 1 Gap Closure — Ordered Tasks

**Purpose:** Step-by-step tasks to close gaps in [docs/phase1_gaps.md](./phase1_gaps.md) without harming current functionality.

**Source of truth for gaps:** [docs/phase1_gaps.md](./phase1_gaps.md)  
**Project state & completed log:** [docs/PROGRESS.md](./PROGRESS.md)

Work in order by wave. Mark tasks `[x]` when done and add a row to PROGRESS.md **Completed Tasks**.

---

## Wave 1 — Quick wins (parser + API + minimal UI)

Low-risk; no change to existing UI flows except adding one table section.

| Done | Task | phase1_gaps | Area | No-regression note |
|------|------|-------------|------|--------------------|
| [x] | Parser: normalize "ON HOLD" (and variants) to ONHOLD so CSV "On Hold" does not map to OTHER | §12 | API (ingestion/parser) | Add one branch in mapStatus(); existing ONHOLD/OTHER rows unchanged |
| [x] | Critical Churn API: GET /merchants/high-risk-churn (paginated, month, app_id) | §1 | API | New route; reuse merchant list pattern; table already exists |
| [x] | Critical Churn UI: Action Center section for "Critical Churn" using new endpoint | §1 | UI | New section + table; same pattern as At Risk / Lost |
| [x] | Admin: Retry Nova — endpoint or button to re-run brief for a run’s latest month | §11 | API (+ optional UI) | Call existing brief generation; idempotent |

---

## Wave 2 — API + small UI (KPIs, errors, list types)

| Done | Task | phase1_gaps | Area | No-regression note |
|------|------|-------------|------|--------------------|
| [x] | Surface Collected and Deposited in UI (KPI strip or scorecards; API already returns them) | §2 | UI | Add two values to existing KPI/brief context; read-only |
| [x] | API client: map 4xx/5xx to user-friendly messages; parse JSON error body; do not expose raw body | §9 | API client | Change throw message only; same status codes |
| [x] | UI: show user-friendly error messages everywhere; consistent fallback; mutation errors same style | §9 | UI | Replace raw error.message with mapped/fallback text |
| [x] | Nova list_merchants: add type NRA (from nra_merchants_monthly) | §13 | API (Nova tools + services) | New branch in toolListMerchants; existing types unchanged |
| [x] | Nova list_merchants: add type HighRiskChurn (from high_risk_churn_merchants) | §13 | API (Nova tools + services) | New branch; reuse or add merchant service for high-risk churn list |
| [x] | ONHOLD (payment at risk): API to list merchants with status ONHOLD for a month (+ optional UI) | §16 | API (+ optional UI) | New endpoint or reuse charges/revenue view; MRR doc §3 |

---

## Wave 3 — UI storytelling & tables

| Done | Task | phase1_gaps | Area | No-regression note |
|------|------|-------------|------|--------------------|
| [ ] | Brief section: add "Show evidence" and "Generate growth plan" buttons | §8 | UI | Links/actions only; no change to narrative content |
| [ ] | In-context "See who" / deep links from brief (e.g. "12 at risk" → scroll/filter to At Risk table) | §8 | UI | URL or anchor + filter; existing tables unchanged |
| [ ] | Action Center tables: add page-size selector (25/50/100) | §8 | UI + API | API already supports page_size; add dropdown |
| [ ] | Action Center tables: add search and sort where useful | §8 | UI + API | Optional; preserve default sort and pagination |
| [ ] | Add NRA scorecard (4th card); optional Refunds & Uninstalls or Lifecycle card | §8 | UI | New card(s); existing three cards unchanged |
| [ ] | Optional: Year dropdown, Reset filters, Last Updated (from ingestion run) | §8 | UI | Add to GlobalFilters; existing month/compare/app unchanged |
| [ ] | Mobile: header breakpoints (tagline, hamburger nav); viewport meta | §8 | UI | Responsive only; desktop layout unchanged |

---

## Wave 4 — Growth plan & Nova memory

| Done | Task | phase1_gaps | Area | No-regression note |
|------|------|-------------|------|--------------------|
| [ ] | Growth plan: structured Lever Breakdown Table + Execution Lists (from Nova or API) | §15 | API + UI | Structure in response or parse markdown; display table |
| [ ] | Growth plan: line chart (last 6 months + target) and waterfall (baseline → levers → target) | §15 | UI | New charts; existing markdown result still shown |
| [ ] | MONTHLY_BRIEF memory bundle: load last 2 briefs (from files or monthly_briefs) | §14 | API (memoryLoader) | Add dynamic brief paths or DB fetch; existing bundles unchanged |
| [ ] | Memory loader: token budget and truncation for assembled bundle | §14 | API (memoryLoader) | Truncate by token count; existing content order preserved |

---

## Wave 5 — Memory & Admin Manager (larger)

| Done | Task | phase1_gaps | Area | No-regression note |
|------|------|-------------|------|--------------------|
| [ ] | memory_index.json (or equivalent) + GET /memory/index for discovery | §17 | API | New endpoint; existing list/content by path still work |
| [ ] | Admin Memory: full API (items, item/{id}, versions?status=draft, create, upload, approve, reject, change-log) | §4, §18 | API | New routes; existing GET list/content remain |
| [ ] | Admin Memory UI: tabs Active / Drafts / Change History / Create-Upload; review screen with diff | §4, §18 | UI | Extend current Memory page; keep list + view |

---

## Wave 6 — Optional / later

Defer until Wave 1–5 are done or as needed.

| Done | Task | phase1_gaps | Area |
|------|------|-------------|------|
| [ ] | Recovered merchants: derivation + API + UI ("0 recovered" empty state) | §1 | API + UI |
| [ ] | Expectations vs outcomes view (e.g. prior forecast vs actuals) | §6 | UI + optional API |
| [ ] | LLM router: escalation (tier_b/tier_c) and circuit breaker + safe-mode | §20 | API (Nova router) |
| [ ] | Memory: L1/L2 cache + version-based invalidation (when S3/DB memory exists) | §22 | API |
| [ ] | Optional: recompute growth_forecast_monthly in pipeline | §10 | API |
| [ ] | Nova knowledge tools: get_definition, get_playbook, get_market_context, get_prior_briefs | §13 | API (Nova tools) |
| [ ] | Admin: upload PDF/Excel for market context and plans | §3 | API + UI |
| [ ] | S3-backed memory + optional S3 brief writes (see phase1_gaps §7) | §7 | API + infra |

---

## Done in this file only

When a task is completed:

1. Mark it `[x]` in the table above.
2. Add a row to **Completed Tasks** in [docs/PROGRESS.md](./PROGRESS.md) (date, task, notes).
3. Optionally add "Closed: YYYY-MM-DD" under the relevant section in [docs/phase1_gaps.md](./phase1_gaps.md).
