# Phase 1 Gaps — PRD vs Implementation

This document lists gaps between **docs/PRD.md** (and related specs) and the current implementation. Use it to prioritize follow-up work before or after deployment.

**Scope:** MVP + Phase 1 only. Phase 2 (internal merchant DB, usage signals, predictive pre-risk) is out of scope here.

**Cross-checked specs:** PRD, problem_statement, TECHNICAL_ARCHITECTURE, BRAND_AND_UI, UI_LAYOUT_SPEC, login_management; DATA_MODEL_SPEC, INGESTION_WORKFLOW, CLOVER_CSV_SCHEMA, AGENT_SPEC, NOVA_MEMORY_LOADING_ALGORITHM, GROWTH_PLANNING_SPEC, MRR_AND_MANUAL_OUTPUTS, MEMORY_FILE_STRUCTURE, ADMIN_MEMORY_MANAGER_UI_SPEC, DEPLOYMENT_ARCHITECTURE, LLM_MODEL_ROUTER_PSUDOCODE/workflow_budgets.json, progressql_supabase_rsl_decisions, MEMORY_AND_CACHE_INALIDATION_STRATEGY, MEMORY_CONTEXT_ITEMS.

---

## 1. Action Tables (PRD §2 C)

| PRD Item | Status | Gap |
|----------|--------|-----|
| **🔴 Critical Churn** (refunded ∩ uninstalled ∩ lost) | Table `high_risk_churn_merchants` exists and is recomputed in `recompute.ts`. | **No API** to list it (e.g. `GET /merchants/high-risk-churn`) and **no UI** (no Action Center section for "Critical Churn"). |
| **🔁 Recovered** (At Risk → Active) | Not present. | **No** derived table or API for "recovered" merchants, and **no UI** (no "Recovered" section; UI_LAYOUT_SPEC says show "0 recovered" with explanation). |

---

## 2. Home — "Revenue lifecycle" (PRD §4 Home)

- **PRD:** Key tables include **"Revenue lifecycle"** (billed → collected → deposited → refunded).
- **Current:** API returns `collected_amount` and `deposited_amount` in KPIs; the **UI** only shows Billed (Gross Billed), Active (count), and Refunded.
- **Gap:** **Collected** and **Deposited** are not shown in the UI (no KPI strip or scorecard for the full revenue lifecycle).

---

## 3. Admin — "Upload PDFs / Excel (market context, plans)" (PRD §4 Admin)

- **PRD:** Admin can **"Upload PDFs / Excel (market context, plans)"**.
- **Current:** Only **CSV upload** for Clover billing data exists.
- **Gap:** No upload flow for PDF/Excel for market context or plans (and no Reference Knowledge Store ingestion from those files).

---

## 4. Market & App Context — "Reference Knowledge Store" (PRD §5)

- **PRD:** **"Reference Knowledge Store"** — "Uploaded PDFs", "Curated CSVs", "Periodic web summaries" (used for interpretation/narratives, not revenue math).
- **Current:** File-based memory in repo (`memory/*.md`) and Admin Memory UI that **lists and views** content only (GET `/admin/memory/list`, `/admin/memory/content`). No upload of PDFs or curated CSVs into that store.
- **Gap:** Upload path for PDFs/curated CSVs into the knowledge store. The fuller **Admin Memory Manager** from ADMIN_MEMORY_MANAGER_UI_SPEC (Create/Upload Memory, Drafts, Approve workflow) is not implemented; only a simplified read-only list + view exists.

---

## 5. Naming (informational)

- PRD calls the raw table **"charges"**; implementation uses **`charges_raw`**. Column semantics match (e.g. `status_current`). No functional gap.

---

## 6. Institutional memory — expectations vs outcomes (problem statement §5)

- **Problem statement:** System should "compare expectations to outcomes" and "improve reasoning month after month."
- **Current:** Memory (definitions, playbooks, briefs) and cached monthly briefs exist; Nova uses them for context.
- **Gap:** No explicit **expectations vs outcomes** feature (e.g. compare prior month forecast or target to actuals, or track warnings over time). Trend comparison is partial (sparklines, MoM deltas) rather than a dedicated "what we expected vs what happened" view.

---

## 7. Memory & brief storage — S3 (TECHNICAL_ARCHITECTURE §3.5, §4.1, §6.4)

- **Doc:** TECHNICAL_ARCHITECTURE specifies **S3 as the canonical memory store** for Nova (definitions, playbooks, market context) and optional write of brief markdown to S3 (e.g. `/memory/briefs/YYYY-MM.md`) in addition to DB cache.
- **Current:** Memory is read from **filesystem** (repo `memory/` or `MEMORY_PATH`); briefs are **cached in DB only** (`monthly_briefs`). No S3 memory read/write; no S3 brief writes.
- **Gap:** Implement **S3-backed memory** so that:
  - All components (API, Worker/Lambda, future Nova services) share the same durable memory store.
  - Memory is available in serverless / multi-instance deployments (no dependency on repo filesystem).
  - Optionally: write generated brief markdown to S3 for audit/durability while keeping DB as the query cache.
- **When:** Implement **after cross-validation is completed** (post–Phase 1 gap list finalization).

---

## 8. UI / storytelling (BRAND_AND_UI, UI_LAYOUT_SPEC)

Gaps from cross-validation against BRAND_AND_UI.md and UI_LAYOUT_SPEC.md. The UI already follows the storytelling flow (narrative → scorecards → action tables); the items below are missing or partial.

### Narrative block actions

- **Spec:** Brief section should offer "Show evidence" (scroll/highlight to supporting chart) and "Generate growth plan" (link to `/growth-plan` with month context).
- **Current:** NarrativeBlock is narrative + avatar only; no actions in the brief section.
- **Gap:** Add "Show evidence" and "Generate growth plan" buttons to the brief section.

### Inline "Who?" / "See list"

- **Spec:** In narrative or next to a number: e.g. "12 merchants at risk" with a "See who" link that opens or scrolls to the merchants list filtered to At Risk.
- **Current:** Narrative is plain text; no clickable counts that deep-link to tables.
- **Gap:** When Nova output includes counts (e.g. at-risk), make them actionable links to the relevant table with filters.

### Global filters

- **Spec:** Year (dropdown), Month (dropdown), Compare To, App, Reset button, Last Updated (from ingestion run).
- **Current:** Month (options include year), Compare, App, Copy link. No separate Year, no Reset, no Last Updated.
- **Gap:** Optional: separate Year dropdown, Reset filters button, Last Updated timestamp when available.

### Scorecards

- **Spec:** Four cards — Gross Billed, Merchant Lifecycle (Active/At Risk/Lost), NRA, Refunds & Uninstalls — each with value + Δ + Δ%, sparkline, Explain/Breakdown/Show list.
- **Current:** Three cards — Gross Billed, Active Merchants, Refunded — with sparkline and "Show evidence" (by-app).
- **Gap:** Add NRA scorecard; consider combined Refunds & Uninstalls or Merchant Lifecycle card if desired for parity with spec.

### Tables (Action Center)

- **Spec:** Pagination (with page size 25/50/100), search, sorting, Export CSV, deep link. Optional: "Open Merchant" drawer, "Suggested next step" / "Suggested outreach template" columns from playbooks.
- **Current:** Pagination (fixed 25), Export CSV, Copy link. No search, no sorting, no page-size selector.
- **Gap:** Add search and sorting where useful; add page-size selector (25/50/100). Optional: merchant detail drawer, playbook-driven columns.

### Standalone pages

- **Spec:** Dedicated Merchants page (sub-tabs: Lifecycle, NRA, Refunds, Uninstalls, High-risk churn); dedicated Revenue page (revenue lifecycle, cash reality, statement net).
- **Current:** All on home (Brief + Scorecards + Action Center) plus Ask Nova, Growth Plan, Admin.
- **Gap:** Add Merchants and/or Revenue pages if deep-dive views are required; otherwise current consolidation is acceptable.

### Evidence zone (Section C)

- **Spec:** Standalone "What Changed" section with multiple chart types (e.g. line 12m, bar by app, stacked by plan) that expands contextually.
- **Current:** Evidence is inline in Scorecards only (expand to by-app bar per card).
- **Gap:** Optional: fuller evidence section with trend + by-app + by-plan when needed.

### Flow / smoothness (less smooth points)

- **"What do I do next?" from the brief:** When the narrative says e.g. "12 merchants at risk," there is no in-context "See who" or "Generate growth plan." The user must scroll to find the At Risk table or use the nav for Growth Plan. **Gap:** Add in-context actions (See who, Generate growth plan) so the next step is one click from the narrative.
- **Long scroll on home:** All four Action Center tables (At Risk, Lost, Refunds, Uninstalls) are stacked on one page. On small screens or with many rows, the scroll can feel long. **Gap:** Consider collapse/expand per section, anchor links from the brief, or a compact "impact" summary with "View list" to reduce scroll.
- **Tables: finding one merchant or "show more":** No search or sort on merchant tables; page size is fixed at 25. Finding a specific merchant or viewing more per page is clunky. **Gap:** Add search and sort where useful; add page-size selector (25/50/100) as in § Tables above.

### Mobile responsiveness

- **App header (AppHeader.tsx ~49–71):** The header is a single row with `flex justify-between`: logo, tagline (“Interpret. Guide. Plan. Warn.”), nav links (Brief, Ask Nova, Growth Plan, Admin), and user menu. On narrow screens (e.g. iPhone 12 Pro 390px):
  - There is no `flex-wrap`, no breakpoint that hides or shortens the tagline, and no hamburger/mobile nav. The tagline wraps onto multiple lines; nav and user menu are squeezed; the email in the user menu is heavily truncated.
  - **Gap:** Add mobile breakpoints: e.g. hide or shorten the tagline on small viewports, and introduce a hamburger menu that reveals nav (and optionally user menu) in a drawer or dropdown so the header does not overflow or cramp.
- **Viewport:** The root layout does not set a viewport meta tag in the snippet. If the framework does not add one by default, small devices may not get proper scaling (e.g. 1:1 zoom), and the UI can look like a squeezed desktop layout. **Gap:** Ensure the built HTML includes `<meta name="viewport" content="width=device-width, initial-scale=1">` (or equivalent), either via Next.js metadata/viewport export or explicitly in the root layout.

---

## 9. Error handling & loading

Users currently see technical or raw API messages in many places. Loading is partially consistent; error handling should be centralized and user-friendly.

### API client (lib/api/client.ts)

- **Current:** On non-OK response, the client throws `Error(\`API ${res.status}: ${text || res.statusText}\`)` with `text = await res.text()`. So users see raw status and full response body (e.g. JSON string, HTML, or server error text).
- **Gap:**
  - For 4xx/5xx, try to parse JSON and use `body.error` or `body.message` when present.
  - Map status codes to short, user-facing messages (e.g. 401 → "Please sign in again.", 403 → "You don't have access.", 404 → "This wasn't found.", 5xx → "Something went wrong. Try again in a moment.") and throw an Error with that message (optionally attach status/body for logging only).
  - Do not expose raw response body or HTML to the UI.

### UI error display

- **Current:** Components show "Failed to load …" (or similar) plus `error.message`. So "API 500: …" or backend JSON/HTML can appear. Some places use "Unknown error." when error is not an Error instance; others do not. Mutation errors (e.g. Admin packages create) show `error?.message` raw.
- **Gap:**
  - Ensure every error path shows a **user-friendly message** (from the client or a fallback), not raw API text.
  - Use a single generic fallback (e.g. "Something went wrong. Please try again.") when the error cannot be turned into a safe message.
  - For mutations, show the same style of friendly message (and optionally a retry action), not raw `error?.message`.

### Loading

- **Current:** KpiStrip, Scorecards, and ActionCenterTables use skeletons/loading state. BriefSection shows NarrativeBlock with `isUpdating` (pulse) while loading. Admin packages shows "Loading…". Growth plan and Ask Nova use local loading and disabled buttons.
- **Gap:** Optional: make loading patterns consistent (e.g. BriefSection could use a small skeleton or "Loading…" so every data section has an explicit loading UI). Ensure no flash of empty or wrong content during refetch.

---

## 10. DATA_MODEL_SPEC

| Spec | Implementation | Gap |
|------|-----------------|-----|
| §8 Pagination response | API returns `data`, `page`, `page_size`, `total_rows`. | **Aligned.** No gap. |
| §10 Data refresh: recompute list includes `growth_forecast_monthly` (optional Phase-1) | `recompute.ts` recomputes 6 tables only; **does not** call `growth_forecast_monthly`. | **Gap (optional):** No recompute of `growth_forecast_monthly`; doc says optional Phase-1. |
| §9 Month/Year filtering | Doc says "Year → resolved to month range; Month → exact match." | **Partial:** API has `month`; no separate Year filter or explicit resolution to month range in API. |

---

## 11. INGESTION_WORKFLOW

| Spec | Implementation | Gap |
|------|-----------------|-----|
| S3 key format `clover_csv/{yyyy}/{mm}/{upload_id}.csv` | `apps/api/src/services/s3.ts` uses that format. | **Aligned.** |
| `ingestion_runs`: `months_affected`, `recompute_status`, `nova_status` | Pipeline and upload routes set/read these. | **Aligned.** |
| Recompute scope: "previous month" for At Risk | `recompute.ts` uses `expandMonthsScope` (months detected + prev). | **Aligned.** |
| §11 Error handling: "Retry Nova" from Admin | No "Retry Nova" or retry-recompute UI/endpoint. | **Gap:** No Admin retry for Nova or recompute for `months_affected`. |

---

## 12. CLOVER_CSV_SCHEMA

| Spec | Implementation | Gap |
|------|-----------------|-----|
| §2 "On Hold" → normalize to ONHOLD | Parser `mapStatus()` only accepts literal `ONHOLD`; CSV "On Hold" becomes `"ON HOLD"` after `toUpperCase()` and maps to **OTHER**. | **Gap:** Normalize `"ON HOLD"` (and variants) to `ONHOLD` in parser so ONHOLD rows are not lumped into OTHER. |

---

## 13. AGENT_SPEC (Nova tools)

| Spec | Implementation | Gap |
|------|-----------------|-----|
| Tool contract: `list_merchants(type, …)` with types **Active, AtRisk, Lost, NRA, Refunded, Uninstalled, HighRiskChurn** | `tools.ts` supports Active, AtRisk, Lost, Refunded, Uninstalled. **No NRA or HighRiskChurn** list types. | **Gap:** Add `list_merchants` types **NRA** and **HighRiskChurn** (and corresponding API/merchant services if missing). |
| Tools: `compare_kpi`, `get_definition`, `get_playbook`, `get_market_context`, `get_prior_briefs` | Not implemented; Nova has only `get_kpi`, `list_merchants`, `get_trend`, `get_growth_baseline`. | **Gap:** Knowledge/memory tools from spec not implemented (or covered only via pre-loaded memory context). |
| Tools: `forecast_next_month`, `build_growth_plan` | Only `get_growth_baseline` exists; growth plan is generated in-agent from baseline + tools. | **Partial:** Acceptable if growth plan is produced in-agent; doc's `forecast_next_month` / `build_growth_plan` are not separate tools. |

---

## 14. NOVA_MEMORY_LOADING_ALGORITHM

| Spec | Implementation | Gap |
|------|-----------------|-----|
| §3 DB-backed registry (`memory_items`, `memory_versions`, S3 content) | Memory is **file-based** only (`memoryLoader.ts` reads from `memory/` or `MEMORY_PATH`). No DB tables, no S3 reads. | **Gap:** Algorithm doc assumes DB + S3 memory registry; implementation uses filesystem only (already called out in §4 and §7). |
| Task classification + bundle map | `classifyTask()` and `MEMORY_BUNDLES` exist and align with doc (MONTHLY_BRIEF, GROWTH_PLAN, etc.). | **Aligned.** |
| Briefs in bundle: "last 2 briefs" for MONTHLY_BRIEF | Bundles reference static paths only; **no dynamic "last 2 briefs"** loading from `briefs/YYYY-MM.md`. | **Gap:** MONTHLY_BRIEF bundle does not include "last 2 briefs" from file or DB; only fixed definition/playbook paths. |
| Token budget / truncation (doc §5) | `loadMemoryBundle` does not truncate to token budget. | **Gap:** No token budget or truncation. |

---

## 15. GROWTH_PLANNING_SPEC

| Spec | Implementation | Gap |
|------|-----------------|-----|
| Step 5: Lever breakdown table, execution lists (At Risk to contact, upgrade candidates, win-back, NRA by plan) | Growth plan UI shows Nova markdown result only; no structured lever table or execution lists. | **Gap:** No structured **Lever Breakdown Table** or **Execution Lists** (retention/expansion/win-back/NRA) as in spec; narrative only. |
| UI: "Required Charts — Line: last 6 months + target; Waterfall: baseline → levers → target" | No line chart (last 6 months + target) or waterfall chart. | **Gap:** Missing required charts (line + waterfall) on Growth Plan page. |

---

## 16. MRR_AND_MANUAL_OUTPUTS

| Spec | Implementation | Gap |
|------|-----------------|-----|
| Manual outputs → canonical tables | KPIs and merchant endpoints use `monthly_revenue_lifecycle`, `merchant_lifecycle_monthly`, NRA, refund/uninstall tables. | **Aligned.** |
| Two at-risk definitions (lifecycle vs ONHOLD) | Lifecycle At Risk is implemented; ONHOLD (payment at risk) requires querying charges by `status_current = ONHOLD` — no dedicated endpoint or UI. | **Partial:** ONHOLD "at risk" list/API/UI not present (could be tracked under "Revenue lifecycle" or separate list). |

---

## 17. MEMORY_FILE_STRUCTURE

| Spec | Implementation | Gap |
|------|-----------------|-----|
| `memory_index.json` registry; GET `/memory/index` | No registry file or index endpoint; Admin memory uses `getMemoryFileList()` from bundle paths. | **Gap:** No `memory_index.json` or GET `/memory/index`. |
| POST `/admin/memory/upload`, POST `/admin/memory/approve` | Only GET `/admin/memory/list` and GET `/admin/memory/content`. | **Gap:** Already in §4 (full Admin Memory Manager). |
| Versioning model (`_versions/`, pointer file, change_log) | No versioning; files read directly. | **Gap:** No memory versioning or change log (aligns with §4). |

---

## 18. ADMIN_MEMORY_MANAGER_UI_SPEC

| Spec | Implementation | Gap |
|------|-----------------|-----|
| §10 Minimal API: GET items, GET item/{id}, GET versions?status=draft, POST create, upload, approve, reject, GET change-log | Only GET `/admin/memory/list` (file paths) and GET `/admin/memory/content?path=`. | **Gap:** Same as §4; full API surface (items, versions, create, upload, approve, reject, change-log) not implemented. |

---

## 19. DEPLOYMENT_ARCHITECTURE

- **Doc** describes Lambda, API Gateway, RDS, S3, SQS, optional Redis, Cognito.
- **Current:** PROGRESS: deployment not done (API/Worker/Web/DB prod).
- **No new gap:** Deployment is "remaining"; doc is target architecture.

---

## 20. LLM_MODEL_ROUTER_PSUDOCODE & workflow_budgets.json

| Spec | Implementation | Gap |
|------|-----------------|-----|
| Router: workflow-specific caps and escalation | `router.ts` loads JSON and uses `compass_chat_qa` / `insight_summary_monthly` by workflow name; **only tier_a** used (no escalation to tier_b/tier_c). | **Gap:** No escalation along `escalation_path`, no tier_b/tier_c usage, no validation-triggered escalation. |
| Circuit breaker (monthly/24h budget, tier_c %, output spike) | No circuit breaker; `evaluate_circuit_breaker` and safe-mode overrides not implemented. | **Gap:** Circuit breaker and safe-mode behavior from pseudo-code not implemented. |
| workflow_budgets.json workflow IDs | Chat uses `compass_chat_qa`, brief uses `insight_summary_monthly`. Other workflows in JSON unused. | **Partial:** Acceptable for Phase 1; only chat + monthly brief workflows wired. |

---

## 21. progressql_supabase_rsl_decisions

| Spec | Implementation | Gap |
|------|-----------------|-----|
| RLS tripwire on internal tables; migration `000009_enable_rls_tripwire.sql` | Migration exists and enables RLS + deny-all policies on listed tables. | **Aligned.** No gap. |

---

## 22. MEMORY_AND_CACHE_INALIDATION_STRATEGY

| Spec | Implementation | Gap |
|------|-----------------|-----|
| L1 (in-process) + L2 (Redis/KV) + version-based invalidation | Memory is read from filesystem only; no L1/L2 cache, no version keying, no invalidation. | **Gap:** No memory cache layers or version-based invalidation (consistent with S3/memory store not implemented). |
| DB as source of truth for current version; S3 for content | No DB/S3 memory store. | Already covered by §4 and §7. |

---

## 23. MEMORY_CONTEXT_ITEMS

| Spec | Implementation | Gap |
|------|-----------------|-----|
| Doc lists 12 categories and paths (e.g. `/memory/definitions/metrics.md`, playbooks, briefs, admin). | `memoryLoader.ts` bundles use the same path structure (definitions, apps, market, playbooks, admin). Briefs are not loaded dynamically. | **Partial:** Structure aligned; "last briefs" and admin/context content depend on files existing and brief-loading logic (see §14 NOVA_MEMORY_LOADING_ALGORITHM). |

---

## Summary

| Area | Missing or partial |
|------|--------------------|
| Action tables | Critical Churn: API + UI. Recovered: derivation + API + UI (including "0 recovered" empty state). |
| Home — Revenue lifecycle | Collected and Deposited not surfaced in UI (API already returns them). |
| Admin | Upload PDFs/Excel for market context and plans. |
| Reference Knowledge Store | Upload path for PDFs/curated CSVs; full Admin Memory Manager (upload, drafts, approve). |
| Institutional memory (problem statement) | Expectations vs outcomes / trend-comparison view not implemented. |
| Memory & brief storage (TECHNICAL_ARCHITECTURE) | S3 as canonical memory store + optional S3 brief writes; implement after cross-validation. |
| UI / storytelling (BRAND_AND_UI, UI_LAYOUT_SPEC) | Narrative actions (Show evidence, Generate growth plan, See who); optional filters (Year, Reset, Last Updated); NRA/4th scorecard; table search/sort/page size; optional Merchants/Revenue pages and evidence zone. Flow/smoothness: in-context next steps from brief, reduce long scroll (e.g. collapse/expand or anchor links), table search/sort/page size. |
| Mobile responsiveness | App header: no breakpoints for tagline, no hamburger/mobile nav; header row squeezes/overflows on narrow screens. Viewport: confirm viewport meta tag in built HTML for proper mobile scaling. |
| Error handling & loading | API client: map status codes to user-friendly messages; parse JSON error body; do not expose raw API/HTML. UI: show friendly messages everywhere; consistent fallback; mutation errors same style. Optional: consistent loading UI (e.g. BriefSection skeleton). |
| DATA_MODEL_SPEC | Optional recompute of `growth_forecast_monthly`; Year/month resolution (API) partial. |
| INGESTION_WORKFLOW | No Admin "Retry Nova" or retry recompute for affected months. |
| CLOVER_CSV_SCHEMA | Parser: normalize "ON HOLD" (and variants) to ONHOLD. |
| AGENT_SPEC (Nova tools) | Add list_merchants types NRA and HighRiskChurn; knowledge tools (get_definition, get_playbook, etc.) not implemented. |
| NOVA_MEMORY_LOADING_ALGORITHM | DB/S3 memory registry not implemented (file-based only); MONTHLY_BRIEF bundle does not load "last 2 briefs"; no token truncation. |
| GROWTH_PLANNING_SPEC | No structured lever table or execution lists; no line or waterfall charts on Growth Plan page. |
| MRR_AND_MANUAL_OUTPUTS | ONHOLD (payment at risk) list/API/UI not implemented. |
| MEMORY_FILE_STRUCTURE | No memory_index.json or GET /memory/index; versioning and change log not implemented (overlap with §4). |
| ADMIN_MEMORY_MANAGER_UI_SPEC | Full API (items, versions, create, upload, approve, reject, change-log) not implemented (same as §4). |
| DEPLOYMENT_ARCHITECTURE | No gap; deployment remaining per PROGRESS. |
| LLM_MODEL_ROUTER / workflow_budgets | No escalation (tier_b/tier_c); no circuit breaker or safe-mode. |
| progressql_supabase_rsl_decisions | Aligned; no gap. |
| MEMORY_AND_CACHE_INALIDATION_STRATEGY | No L1/L2 cache or version-based invalidation. |
| MEMORY_CONTEXT_ITEMS | Structure aligned; brief-loading and token budget gaps as in Nova memory algorithm. |
