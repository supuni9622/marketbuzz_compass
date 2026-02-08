# AGENTS.md — MarketBuzz Compass

Human and AI agents working on this project should follow this guide for consistent behavior, architecture alignment, and quality.

---

## 1) Project Identity

| Field | Value |
|-------|-------|
| **System** | MarketBuzz Compass |
| **Tagline** | Interpret. Guide. Plan. Warn. |
| **Agent** | Nova |
| **Agent Tagline** | Your revenue analyst, I watch the numbers so you don't have to. |

**What it is:** An internal revenue intelligence system — not a dashboard, not raw analytics. A decision-support system for Clover app billing, merchant lifecycle, and growth planning.

---

## 2) Non-Negotiable Principles

### Data & Metrics
- **Charge ID** is the primary key for all charge data.
- CSV exports are **snapshots**, not event logs. UPSERT by Charge ID.
- **Gross Billed Amount** (by Charge Date month) is the baseline growth metric.
- **Merchant lifecycle:** Active → At Risk → Lost (derived from billing presence, not status).
- UI and Nova must **never** compute metrics from raw CSV. Use canonical tables only.

### Nova (Agent)
- Nova queries **only canonical tables** — never `charges_raw`, never raw CSVs.
- Nova must cite numeric evidence in all claims.
- Nova must never hallucinate metrics or invent data.
- Nova uses OpenAI models with tiered escalation: GPT-5 mini → o4-mini → o3 → GPT-5.2.
- Memory is task-based: load only what's needed per task. Never global memory dump.

### Memory & Governance
- Memory is versioned. Versions invalidate caches — not time.
- Nova may write **drafts only**. Admin approves before memory becomes active.
- Definitions (metrics, lifecycle) are locked. Admin must approve changes.

---

## 3) Code Quality Standards

### General
1. **Clean code**: Readable, well-named, single-responsibility functions.
2. **DRY**: Extract reusable logic into shared modules. No duplicated business rules.
3. **Performance**: Paginate all list endpoints. Scope recompute to affected months only.
4. **Cost**: Respect LLM workflow budgets, circuit breakers, and tier limits.
5. **Scalability**: Server-side pagination, indexed queries, materialized tables.
6. **Reliability**: Fail fast on validation. Rollback on partial failures. Version-based cache invalidation.
7. **Maintainability**: Document non-obvious logic. Follow existing patterns.

### File Organization
- Place shared utilities, constants, and types in dedicated modules.
- Keep API routes thin; business logic in services.
- Separate Nova tools, memory loaders, and router logic clearly.

---

## 4) Architecture Reference

### Stack
- **Frontend**: Next.js (App Router), Cognito Hosted UI
- **Backend**: Node.js + TypeScript (Fastify)
- **Database**: Supabase (dev) / Postgres RDS (prod)
- **Storage**: S3 (uploads + memory)
- **Queue**: SQS (ingestion jobs)
- **Cache**: Redis (optional, version-based invalidation)
- **Auth**: AWS Cognito (Admin / Viewer groups)

### Key Documents
| Topic | Doc |
|-------|-----|
| Product & data model | `docs/PRD.md`, `docs/DATA_MODEL_SPEC.md` |
| Ingestion | `docs/INGESTION_WORKFLOW.md` |
| Clover CSV input | `docs/CLOVER_CSV_SCHEMA.md` |
| Supabase & RLS | `docs/progressql_supabase_rsl_decisions.md` |
| Progress tracker | `docs/PROGRESS.md` |
| Nova agent | `docs/AGENT_SPEC.md`, `docs/NOVA_LLM_DECISION.md` |
| Memory | `docs/MEMORY_FILE_STRUCTURE.md`, `docs/NOVA_MEMORY_LOADING_ALGORITHM.md`, `docs/MEMORY_AND_CACHE_INALIDATION_STRATEGY.md` |
| LLM routing | `docs/LLM_MODEL_ROUTER_PSUDOCODE.md`, `docs/workflow_budgets.json` |
| Admin memory UI | `docs/ADMIN_MEMORY_MANAGER_UI_SPEC.md` |
| Growth planning | `docs/GROWTH_PLANNING_SPEC.md` |
| UI & Brand | `docs/BRAND_AND_UI.md`, `docs/UI_LAYOUT_SPEC.md` |
| Deployment | `docs/DEPLOYMENT_ARCHITECTURE.md`, `docs/TECHNICAL_ARCHITECTURE.md` |

---

## 5) Canonical Tables (Nova & UI)

Allowed data sources:
- `monthly_revenue_lifecycle`
- `merchant_lifecycle_monthly`
- `nra_monthly`, `nra_merchants_monthly`
- `refund_merchants_monthly`, `uninstall_merchants_monthly`
- `high_risk_churn_merchants`
- `package_catalog`, `growth_forecast_monthly`
- `monthly_briefs` (cached Nova output)

**Never** expose `charges_raw` to UI or Nova.

---

## 6) Nova Memory Model

### Memory Types
- `definitions` (metrics, lifecycle, growth, patterns, guardrails)
- `apps` (per-app knowledge)
- `market` (Clover context, verticals)
- `playbooks` (retention, refunds, winback)
- `briefs` (prior monthly briefs)
- `admin` (strategic context)

### Loading Rules
- Classify task first, then load memory.
- Use task-specific bundles (see `docs/NOVA_MEMORY_LOADING_ALGORITHM.md`).
- Truncate to token budget. Prefer definitions > briefs > playbooks > market.

---

## 7) API Conventions

- All endpoints require JWT. Admin endpoints require `cognito:groups` includes `Admin`.
- List endpoints: `page`, `page_size`, `total_rows`, `data`.
- Filters: `month`, `app_id`, `lifecycle_state` where applicable.
- Month format: `YYYY-MM-01`.

---

## 8) Security & Audit

- Admin-only: CSV upload, memory create/approve, package catalog.
- Log: who uploaded, when, file hash, rows processed.
- Backend must enforce RBAC; UI checks are convenience only.

---

## 9) When Implementing Features

1. **Read the spec** for that domain (ingestion, memory, growth, etc.).
2. **Follow existing patterns** in the codebase.
3. **Extract shared logic** instead of duplicating.
4. **Respect budgets** for LLM workflows (`workflow_budgets.json`).
5. **Test** with realistic data (overlapping months, edge cases).

---

## 10) Locked Summary

- **Baseline metric:** Gross Billed Amount
- **Source of truth:** Canonical monthly tables
- **Agent:** Nova — proactive + reactive, evidence-based
- **Memory:** Versioned, admin-approved, task-based loading
- **Auth:** Cognito Admin / Viewer
- **Philosophy:** Institutional analyst, not a clever demo.

## Tech Stack Additions
- Zod: validation (API + frontend)
- Zustand: frontend state management
- @tanstack/react-query: server state, caching
- Lazy loading: dynamic imports for routes/components
- Error boundaries: layout-level + fallback UI
- Swagger: API documentation via @fastify/swagger


Implementation Plan Summary
Decision	Choice
Structure	--> Monorepo (frontend + backend)
Backend	--> Standalone Fastify
Database (dev)--> 	Supabase (Postgres)
S3 (dev) -->	Real S3 bucket
Auth -->	Cognito (to be set up)
Deployment	--> Lambda + API Gateway
Nova	--> Placeholder until wired; no mock
MVP scope -->	Ingestion + canonical tables + basic Monthly Brief
Phase 1	--> Full UI + Nova
Timeline -->	~1 week
Progress tracking -->	Separate file

Build Order (Week Plan)
Day	Focus
1	Monorepo + Supabase + migrations + basic API (health, DB)
2	S3 + Cognito + auth middleware + CSV upload endpoint
3	Ingestion pipeline (parse, upsert, recompute) + Worker
4	Frontend scaffold + auth + Monthly Brief + KPIs + tables
5	Admin CSV upload UI + polish + end-to-end test
6	Nova (if time) or deployment prep
7	Nova / deployment / buffer