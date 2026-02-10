# MarketBuzz Compass — Progress Tracker

**Last updated:** 2026-02-10  
**Current phase:** Phase 1 complete (Full UI + optional + proactive brief)  
**Status:** MVP + Nova + Ask MarketBuzz (chat UI: avatars, empty state, example chips, teal gradient), Growth Plan, App tabs, Framer Motion, trend sparklines, Evidence zone, Admin Packages/Memory, proactive brief. Run `pnpm install` for framer-motion.  
**Next task:** Deployment.

### What's done
- **MVP:** Monorepo, Supabase, ingestion (CSV → S3 → SQS → Lambda), canonical tables, Fastify API (metrics, merchants, brief, admin upload), Next.js (Cognito, filters, KPI strip, Scorecards, Action Center tables, Admin CSV upload + status), GET /brief (reads monthly_briefs or placeholder).
- **Phase 1 Nova (backend):** OpenAI config; memory/ + task-based loader; Nova tools (get_kpi, list_merchants, get_trend, get_growth_baseline); LLM router (workflow_budgets.json); POST /nova/chat, POST /nova/growth-plan, POST /admin/brief/generate (Admin, upserts monthly_briefs); brief.upsertBrief.
- **Full UI:** Ask MarketBuzz chat (`/ask` — POST /nova/chat, conversation + avatars, empty state with Nova + example chips, teal gradient, Framer Motion); Growth Plan wizard (`/growth-plan`); App tabs (AppTabs on home); nav links (Brief, Ask MarketBuzz, Growth Plan) in AppHeader.
- **UI polish:** Framer Motion (framer-motion in web package; entrance on home sections + Scorecards stagger; useReducedMotion); GET /metrics/trend (billed_amount, active_merchants, refunded_amount); TrendSparkline component; Scorecards use 12-month trend sparklines.
- **Proactive brief trigger:** (A) After upload: pipeline calls Nova brief after recompute and updates ingestion_runs.nova_status. (B) Scheduled: internal auth (X-Internal-Brief-Key); Lambda scheduledBrief.ts + EventBridge cron(0 2 1 * ? *); doc scheduled-brief-lambda-eventbridge.md.
- **Optional done:** Admin Memory Manager (GET /admin/memory/list, GET /admin/memory/content; Admin Memory page — list by category, view content); Package catalog CRUD (backend GET/POST/PATCH/DELETE /admin/packages; Admin Packages page — list, add, edit, delete); Evidence zone (GET /metrics/by-app; Scorecards “Show evidence” expand with by-app bar chart + AnimatePresence; useReducedMotion); API client patch/delete; Admin layout nav (Upload, Packages, Memory).
- **Docs:** Nova architecture (`docs/articles/nova-architecture-and-business-value.md`); proactive brief trigger architecture (`docs/articles/proactive-brief-trigger-architecture.md`); scheduled brief setup (`docs/articles/scheduled-brief-lambda-eventbridge.md`); docs/articles/README.md table updated.

### What's remaining

- **Deployment:** API → Lambda + API Gateway; ingestion Worker → Lambda (SQS); optional scheduled-brief Lambda + EventBridge; Web → Vercel/Amplify; prod DB (RDS or Supabase).
- **Optional setup:** Create scheduled-brief Lambda and EventBridge rule per `docs/articles/scheduled-brief-lambda-eventbridge.md` (API_URL, INTERNAL_BRIEF_API_KEY in Lambda env).
---

## Phase: MVP (First Release)

Goal: Ingestion + canonical tables + basic Monthly Brief (no Nova)

### 1. Project Setup
- [x] Monorepo structure (`apps/web`, `apps/api`, `packages/shared`)
- [x] Shared TypeScript config
- [x] Shared types package
- [x] Environment config (.env.example)

### 2. Database
- [x] Supabase project created
- [x] Migrations: `charges_raw`, `ingestion_uploads`, `ingestion_runs`
- [x] Migrations: `monthly_revenue_lifecycle`, `merchant_lifecycle_monthly`
- [x] Migrations: `nra_monthly`, `nra_merchants_monthly`
- [x] Migrations: `refund_merchants_monthly`, `uninstall_merchants_monthly`, `high_risk_churn_merchants`
- [x] Migrations: `monthly_briefs`, `package_catalog`, `growth_forecast_monthly`
- [x] Migration: RLS tripwire (000009_enable_rls_tripwire.sql)
- [x] Migration: add ONHOLD to charge_status enum (20240210000001_add_charge_status_onhold.sql)
- [x] Indexes per DATA_MODEL_SPEC

### 3. AWS Setup
- [x] S3 bucket (marketbuzz-compass-uploads)
- [x] Cognito User Pool + Groups (Admin, Viewer)
- [x] Cognito Managed login (Hosted UI, callback URLs, OAuth)
- [x] IAM user + access keys for S3
- [x] Test user (Admin) with confirmed password
- [x] SQS queue (marketbuzz-compass-ingestion)
- [x] Lambda function (marketbuzz-compass-ingestion-worker)

### 4. Backend API (Fastify)
- [x] Project scaffold
- [x] DB connection (Supabase/Postgres)
- [x] Auth middleware (JWT validation, RBAC)
- [x] CSV upload endpoint (validate, store S3, enqueue)
- [x] SQS queue + Lambda handler (SQS created, Lambda created, code deployed)
- [x] Lambda ingestion worker (init fix, role-only credentials, ONHOLD enum; pipeline running)
- [x] Metrics endpoints (KPIs, MoM compare: current, compare, delta, delta_pct)
- [x] Merchant list endpoints (paginated)
- [x] Brief endpoint (placeholder narrative)

### 5. Ingestion Pipeline
- [x] CSV parser (Clover schema)
- [x] Clover billing status lifecycle (Billed, On Hold, Collected, Deposited, Refund, Canceled, Failed) — docs + parser STATUS_OTHER, ON HOLD normalization
- [x] Validation rules
- [x] UPSERT into `charges_raw`
- [x] Recompute logic for canonical tables
- [x] Audit logging (ingestion_uploads, ingestion_runs)

### 6. Frontend (Next.js)
- [x] Project scaffold
- [x] Nova avatar (public: nova_avatar_transparent_bg.png, nova_avatar_with_bg.png; use transparent in narrative block)
- [x] Monthly Brief section on home (NarrativeBlock + NovaAvatar; placeholder text)
- [x] Cognito auth flow (Hosted UI, PKCE, /login, /auth/callback)
- [x] Global filters (Month, Compare, App) — URL state, sticky bar
- [x] KPI strip (Gross Billed, Active, Refunded) — wire GET /metrics/kpis
- [x] Narrative from API — wire GET /brief (NarrativeBlock content + placeholder flag)
- [x] Scorecards + sparklines (3 cards: Gross Billed, Active, Refunded; minimal 2-point bar; same KPI data)
- [x] Action Center tables (At Risk, Lost) — wire GET /merchants/lifecycle; pagination
- [x] Refunds/Uninstalls tables (GET /merchants/refunds, GET /merchants/uninstalls; Action Center sections + Export CSV)
- [x] Export CSV (Action Center: Export current page as CSV for At Risk, Lost, Refunds, Uninstalls)
- [x] Copy link / deep links (Copy link button in GlobalFilters; URL restores month, compare, app)

### 7. Admin
- [x] Admin route guard (layout checks isAdmin)
- [x] CSV upload UI (POST /admin/upload/csv)
- [x] Upload status display (GET /admin/uploads, Recent uploads table on Admin page)

---

## Phase: Full Phase 1 (After MVP)

### 8. Nova
- [x] OpenAI API key setup (OPENAI_API_KEY in .env; config + .env.example)
- [x] Memory loading (task-based bundles from repo memory/; NOVA_MEMORY_LOADING_ALGORITHM)
- [x] Nova tools (get_kpi, list_merchants, get_trend, get_growth_baseline) — canonical only
- [x] LLM router (workflow_budgets.json; model map gpt-5-mini→gpt-4o-mini, o4-mini→o1-mini, etc.)
- [x] Chat endpoint (POST /nova/chat; JWT; month/compare_month/app_id context)
- [x] Growth plan endpoint (POST /nova/growth-plan; month, growth_pct, app_id)
- [x] Proactive brief generation (POST /admin/brief/generate; Admin; upsert monthly_briefs)

### 9. Full UI
- [x] Ask MarketBuzz chat (/ask; POST /nova/chat; conversation + filters context)
- [x] Growth Plan wizard (/growth-plan; steps + POST /nova/growth-plan; result)
- [x] App tabs (AppTabs on home; sets app filter via URL)
- [x] Admin Memory Manager (GET /admin/memory/list, /content; Admin Memory page — list by category, view content)
- [x] Package catalog CRUD (backend + Admin Packages page — list, add, edit, delete; API client patch/delete)
- [x] Framer Motion (entrance, Scorecards stagger; useReducedMotion; Evidence zone expand/collapse)
- [x] GET /metrics/trend + TrendSparkline on Scorecards (12-month sparklines)
- [x] Evidence zone (GET /metrics/by-app; Scorecards “Show evidence” → by-app bar chart; AnimatePresence)

- [x] Ask MarketBuzz chat UI/UX: UserAvatar + NovaAvatar (size, withBg); empty state with Nova avatar + example question chips; teal gradient, rounded bubbles, Framer Motion (useReducedMotion)

### 9b. Proactive brief trigger
- [x] After upload: pipeline calls runNovaProactiveBrief + upsertBrief after recompute; ingestion_runs.nova_status (success/failure)
- [x] Internal auth: requireAdminOrInternalBriefKey; X-Internal-Brief-Key or Bearer; POST /admin/brief/generate accepts Admin JWT or internal key
- [x] Scheduled: Lambda scheduledBrief.ts (previous month); EventBridge cron(0 2 1 * ? *); doc scheduled-brief-lambda-eventbridge.md
- [x] Docs: proactive-brief-trigger-architecture.md (after upload + scheduled, shared endpoint, Mermaid diagrams)

### 10. Deployment
- [ ] API → Lambda + API Gateway
- [ ] Worker → Lambda (SQS)
- [ ] Optional: scheduled-brief Lambda + EventBridge (see docs/articles/scheduled-brief-lambda-eventbridge.md)
- [ ] Nova → Lambda
- [ ] Web → Vercel/Amplify
- [ ] RDS (prod) or Supabase (if staying)

---

## Completed Tasks
(Update as you go)

| Date | Task | Notes |
|------|------|-------|
| 2026-02-07 | Monorepo structure | pnpm workspaces, apps/api, apps/web, packages/shared |
| 2026-02-07 | Shared package | Types, constants, Zod schemas |
| 2026-02-07 | Supabase migrations | 9 migration files (8 tables + RLS tripwire) |
| 2026-02-07 | API scaffold | Fastify + Swagger + health routes + DB connection |
| 2026-02-07 | Next.js scaffold | Minimal app with App Router |
| 2026-02-07 | Config fix | .env loads from monorepo root (apps/api/src → ../../../.env) |
| 2026-02-07 | Swagger fix | Removed jsonSchemaTransform; docs at /docs work |
| 2026-02-07 | React Query fix | Use @tanstack/react-query, not react-query |
| 2026-02-08 | S3 bucket | marketbuzz-compass-uploads, IAM user + keys |
| 2026-02-08 | Cognito User Pool | marketbuzz-compass-pool, Groups Admin/Viewer |
| 2026-02-08 | Cognito Managed login | OAuth code grant, callback/sign-out URLs, scopes |
| 2026-02-08 | Test user | supuni in Admin group, confirmed password |
| 2026-02-08 | .env | COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, COGNITO_REGION |
| 2026-02-08 | Auth middleware | JWT via Cognito JWKS, requireAdmin hook |
| 2026-02-08 | CSV upload endpoint | POST /admin/upload/csv, multipart, S3, ingestion_uploads/runs |
| 2026-02-08 | CSV upload E2E test | Postman + S3 verified; file in clover_csv/2026/02/ |
| 2026-02-08 | SQS queue | marketbuzz-compass-ingestion created |
| 2026-02-08 | Lambda function | marketbuzz-compass-ingestion-worker, handler ingestion.handler |
| 2026-02-08 | Ingestion pipeline code | parser, validator, upsert, recompute, pipeline (apps/api/src/ingestion/) |
| 2026-02-08 | SQS service | sendIngestionJob() in apps/api/src/services/sqs.ts |
| 2026-02-08 | S3 getCsv | For Lambda to fetch CSV from S3 |
| 2026-02-08 | Lambda handler | apps/api/src/lambda/ingestion.ts, SQS-triggered |
| 2026-02-08 | Upload → SQS | API sends message after S3 upload; env SQS_QUEUE_URL |
| 2026-02-08 | Lambda IAM | SQS ReceiveMessage, S3 GetObject, CloudWatch Logs |
| 2026-02-08 | API IAM | SQS SendMessage for upload |
| 2026-02-10 | charge_status ONHOLD | Migration 20240210000001_add_charge_status_onhold.sql; shared type; docs (DATA_MODEL_SPEC, INGESTION_WORKFLOW, CLOVER_CSV_SCHEMA, MEMORY_FILE_STRUCTURE, PRD, day3) |
| 2026-02-10 | Clover billing status lifecycle | CLOVER_CSV_SCHEMA.md §2 (Billed, On Hold, Collected, Deposited, Refund, Canceled, Failed); INGESTION_WORKFLOW + DATA_MODEL_SPEC aligned; parser: STATUS_OTHER (Canceled/Failed→OTHER), "ON HOLD"→ONHOLD, regex capture narrowing (parseChargeDate/parseUninstallDate) |
| 2026-02-10 | @marketbuzz/shared resolution | Build shared package so dist/ exists: `pnpm --filter @marketbuzz/shared build`; API types resolve from package "types" field |
| 2026-02-10 | MRR & manual outputs doc | docs/MRR_AND_MANUAL_OUTPUTS.md: cadence, MRR definition, manual outputs → canonical tables, two at-risk definitions, most valuable/recurring, performance & cost principles; PRD + AGENTS + DATA_MODEL_SPEC updated |
| 2026-02-10 | Metrics endpoint GET /metrics/kpis | month (required), compare_month (optional, default prev), app_id (optional); every KPI: current, compare, delta, delta_pct; auth required |
| 2026-02-10 | Merchant list GET /merchants/lifecycle | month (required), app_id, lifecycle_state (Active/AtRisk/Lost), page, page_size; response: data, page, page_size, total_rows; auth required |
| 2026-02-10 | Brief endpoint GET /brief | month (required); reads monthly_briefs; placeholder brief_markdown if no row; response includes placeholder flag; auth required |
| 2026-02-10 | Interactive UI principles | BRAND_AND_UI.md § Interactive UI Principles: progressive disclosure, narrative spine, contextual actions, filters drive story, deep links; first implementation focus; UI_LAYOUT_SPEC pointer |
| 2026-02-10 | Nova avatar + narrative block | apps/web/public: nova_avatar_transparent_bg.png, nova_avatar_with_bg.png; NovaAvatar.tsx (transparent, 56px); NarrativeBlock.tsx (avatar + content + placeholder); home page Monthly Brief section with NarrativeBlock placeholder |
| 2026-02-10 | Theme + Nova animations in BRAND_AND_UI | Theme section: teal accent (#0d9488/teal-600), neutrals, semantic colors (green/amber/red), background, typography, light first. Nova Animations subsection: entrance, idle, "Nova is updating", new content; purposeful only; prefers-reduced-motion. Single source of truth updated. |
| 2026-02-10 | Cognito auth (Hosted UI) | apps/web: PKCE flow, /login redirect to Cognito, /auth/callback exchange code, sessionStorage token; AuthProvider, AuthGuard; API client with Bearer token; .env.example NEXT_PUBLIC_COGNITO_DOMAIN, NEXT_PUBLIC_COGNITO_CLIENT_ID, NEXT_PUBLIC_API_URL. |
| 2026-02-10 | Global filters + KPI + Brief + Action Center | GlobalFilters (Month, Compare, App) with URL state; KpiStrip → GET /metrics/kpis; BriefSection → GET /brief; ActionCenterTables (At Risk, Lost) → GET /merchants/lifecycle with pagination; useFilters, useApiClient. |
| 2026-02-10 | Admin CSV upload UI | Admin layout (isAdmin guard), Admin page with file input and POST /admin/upload/csv; success/error feedback. Theme: teal accent, slate neutrals, semantic green/amber/red in KPI strip and tables. |
| 2026-02-10 | Upload status display | GET /admin/uploads (list ingestion_uploads with latest run status); Admin page UploadStatusList component; invalidate on new upload. |
| 2026-02-10 | Export CSV | Action Center tables: Export CSV button per table (At Risk, Lost); downloads current page as CSV (merchant_id, merchant_name, app_id, app_name, lifecycle_state, month). |
| 2026-02-10 | Nova animations | globals.css: entrance (fade-in), updating (pulse), new content (highlight); prefers-reduced-motion disables. NarrativeBlock: isUpdating, hasNewContent; BriefSection shows NarrativeBlock when loading with pulse. |
| 2026-02-10 | Scorecards + sparklines | Scorecards.tsx: 3 cards (Gross Billed, Active, Refunded) with value + Δ + Δ%; minimal 2-point bar (compare → current); shared KPIs query; home page between Brief and Action Center. |
| 2026-02-10 | Refunds/Uninstalls tables | Backend: GET /merchants/refunds, GET /merchants/uninstalls (paginated, month, app_id). Frontend: RefundTable, UninstallTable in Action Center; Export CSV each. |
| 2026-02-10 | Copy link / deep links | GlobalFilters: "Copy link" button copies current URL (origin + pathname + params); ensures month, compare, app in URL; "Copied!" feedback 2s. |
| 2026-02-10 | Phase 1 Nova backend | OpenAI config; memory/ + task-based loader (memoryLoader.ts); Nova tools (get_kpi, list_merchants, get_trend, get_growth_baseline); LLM router (workflow_budgets.json); POST /nova/chat, POST /nova/growth-plan, POST /admin/brief/generate; brief.upsertBrief. |
| 2026-02-10 | Nova article | docs/articles/nova-architecture-and-business-value.md — architecture, capabilities, behavior, business value; docs/articles/README.md table updated. |
| 2026-02-10 | Full UI: Ask MarketBuzz | /ask page; POST /nova/chat; conversation; filters (month, compare, app) in body; nav link. |
| 2026-02-10 | Full UI: Growth Plan wizard | /growth-plan page; steps (baseline → target % → generate); POST /nova/growth-plan; result; nav link. |
| 2026-02-10 | Full UI: App tabs | AppTabs component; All Apps / SMS / CRM / Unlock tabs set app URL param; home page. |
| 2026-02-10 | API client post | lib/api/client.ts: post(path, body?, params?) for Nova chat/growth-plan. |
| 2026-02-10 | GET /metrics/trend | metrics service getTrend(); route GET /metrics/trend (metric, months_back, app_id); billed_amount, active_merchants, refunded_amount. |
| 2026-02-10 | Trend sparklines + Framer Motion | TrendSparkline component (GET /metrics/trend); Scorecards use trend sparklines; Framer Motion entrance + stagger; useReducedMotion; framer-motion in web package. |
| 2026-02-10 | Optional: Admin Packages UI | Admin Packages page (list, add, edit, delete); API client patch/delete; Admin layout nav (Upload, Packages, Memory). |
| 2026-02-10 | Optional: Admin Memory UI | Admin Memory page (GET /admin/memory/list, /content; list by category, view file content). |
| 2026-02-10 | Optional: Evidence zone | GET /metrics/by-app (billed_amount, active_merchants, refunded_amount by app); ByAppBarChart; Scorecards “Show evidence” expand with by-app chart; AnimatePresence + useReducedMotion. |
| 2026-02-10 | Proactive brief trigger | (A) After upload: pipeline runNovaProactiveBrief + upsertBrief; nova_status. (B) Scheduled: INTERNAL_BRIEF_API_KEY; requireAdminOrInternalBriefKey; Lambda scheduledBrief.ts + EventBridge; doc scheduled-brief-lambda-eventbridge.md. |
| 2026-02-10 | Proactive brief architecture article | docs/articles/proactive-brief-trigger-architecture.md — after upload + scheduled, shared endpoint, internal auth, month selection, Mermaid diagrams; added to docs/articles/README.md. |
| 2026-02-10 | Ask MarketBuzz chat UI/UX | UserAvatar component; NovaAvatar size + withBg (nova_avatar_with_bg.png in empty state); empty state with large Nova + welcome text + 4 example question chips (click to send); teal gradient chat area, rounded bubbles, Framer Motion entrance/stagger (useReducedMotion). |

---

## Troubleshooting (Day 1 fixes)
| Issue | Cause | Fix |
|-------|-------|-----|
| `db: "not_configured"` | .env loaded from `cwd` (apps/api) | Load `.env` from monorepo root in `apps/api/src/config.ts` |
| Swagger "Failed to load API definition" | `jsonSchemaTransform` expects Zod schemas | Remove `transform: jsonSchemaTransform` from Swagger config |
| `react-query` not found | Wrong package name | Use `@tanstack/react-query` |

## Troubleshooting (Day 3 – Lambda)
| Issue | Cause | Fix (to try) |
|-------|-------|--------------|
| Lambda Runtime.Unknown / Init Error | `fileURLToPath(import.meta.url)` is undefined in CJS bundle | In `config.ts`, skip dotenv when `process.env.AWS_LAMBDA_FUNCTION_NAME` is set (Lambda gets env from console). |
| AWS Access Key "does not exist" | Explicit or inlined credentials in Lambda | In `s3.ts` and `sqs.ts`, use `credentials: undefined` when `AWS_LAMBDA_FUNCTION_NAME` is set so SDK uses execution role only. |
| invalid enum charge_status: ONHOLD | DB enum missing ONHOLD | Run migration `20240210000001_add_charge_status_onhold.sql`; add ONHOLD to shared `ChargeStatus` type. |
| SQS ReceiveMessage permission | Lambda role missing SQS access | Add inline policy with sqs:ReceiveMessage, sqs:DeleteMessage, sqs:GetQueueAttributes, s3:GetObject. See `docs/articles/aws-sqs-lambda-ingestion-setup.md`. |
| AWS_REGION env var error | Lambda reserves AWS_REGION | Do not set AWS_REGION in Lambda env; Lambda provides it automatically. |

## Troubleshooting (Monorepo / API)
| Issue | Cause | Fix (to try) |
|-------|-------|---------------|
| Cannot find module '@marketbuzz/shared' | Shared package types point to dist/; dist not built | Run `pnpm --filter @marketbuzz/shared build` from repo root so `packages/shared/dist` exists. |
| Type 'undefined' cannot be used as an index type (parser) | Regex capture groups m[1], m[2], m[3] are `string \| undefined` | Assign to variables, check for undefined, then use (narrows to string). |

## Blockers / Notes
- **Ingestion pipeline:** Working. Day 3 fixes applied: config.ts (skip dotenv in Lambda), s3/sqs (role-only credentials in Lambda), ONHOLD in enum + docs, pipeline error serialization for CloudWatch.
- **Clover lifecycle:** Documented in CLOVER_CSV_SCHEMA.md §2; parser maps Canceled/Failed→OTHER, normalizes "ON HOLD" to ONHOLD.
- **@marketbuzz/shared:** API type-checking needs shared package built (`pnpm --filter @marketbuzz/shared build`) so dist/ and type declarations exist.
- OpenAI API key: see setup guide below
- Cognito: complete. See `docs/login_management.md` for user/password setup

## Handoff for New Context
When starting a new chat, paste this:

*"Continue MarketBuzz Compass. Backend: GET /metrics/kpis, GET /metrics/trend, GET /metrics/by-app, GET /merchants/lifecycle, GET /merchants/refunds, GET /merchants/uninstalls (paginated), GET /brief, POST /nova/chat, POST /nova/growth-plan, POST /admin/brief/generate (Admin or X-Internal-Brief-Key), POST /admin/upload/csv, GET /admin/uploads, GET/POST/PATCH/DELETE /admin/packages, GET /admin/memory/list, GET /admin/memory/content. Frontend: Cognito Hosted UI (PKCE), global filters + Copy link, App tabs, KPI strip, narrative, Scorecards (12-month sparklines + Evidence zone “Show evidence” by-app chart), Action Center (At Risk, Lost, Refunds, Uninstalls) with Export CSV, /ask (Ask MarketBuzz chat: avatars, empty state + example chips, teal gradient), /growth-plan (wizard), Admin upload + status, Admin Packages (/admin/packages), Admin Memory (/admin/memory), Framer Motion (entrance, Evidence expand/collapse, useReducedMotion). Phase 1 complete (Full UI + optional + proactive brief: after upload + scheduled). Docs: proactive-brief-trigger-architecture.md, scheduled-brief-lambda-eventbridge.md. Use @docs/PROGRESS.md @AGENTS.md @docs/INGESTION_WORKFLOW.md @docs/BRAND_AND_UI.md @docs/AGENT_SPEC.md. Backend Fastify, DB Supabase, monorepo apps/api and apps/web. Run pnpm install for framer-motion."*

---

## OpenAI API Key Setup

1. Go to https://platform.openai.com/
2. Sign up or log in
3. **Billing** → Add payment method (required for API access)
4. **API Keys** → Create new secret key
5. Copy key and store in `.env` as `OPENAI_API_KEY`
6. Never commit the key to git

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