# MarketBuzz Compass — Progress Tracker

**Last updated:** [DATE]  
**Current phase:** MVP  
**Status:** Not started

---

## Phase: MVP (First Release)

Goal: Ingestion + canonical tables + basic Monthly Brief (no Nova)

### 1. Project Setup
- [ ] Monorepo structure (`apps/web`, `apps/api`, `packages/shared`)
- [ ] Shared TypeScript config
- [ ] Shared types package
- [ ] Environment config (.env.example)

### 2. Database
- [ ] Supabase project created
- [ ] Migrations: `charges_raw`, `ingestion_uploads`, `ingestion_runs`
- [ ] Migrations: `monthly_revenue_lifecycle`, `merchant_lifecycle_monthly`
- [ ] Migrations: `nra_monthly`, `nra_merchants_monthly`
- [ ] Migrations: `refund_merchants_monthly`, `uninstall_merchants_monthly`, `high_risk_churn_merchants`
- [ ] Migrations: `monthly_briefs`, `package_catalog`
- [ ] Indexes per DATA_MODEL_SPEC

### 3. AWS Setup
- [ ] S3 bucket (uploads + memory)
- [ ] Cognito User Pool + Groups (Admin, Viewer)
- [ ] Cognito Hosted UI config

### 4. Backend API (Fastify)
- [ ] Project scaffold
- [ ] DB connection (Supabase/Postgres)
- [ ] Auth middleware (JWT validation, RBAC)
- [ ] CSV upload endpoint (validate, store S3, enqueue)
- [ ] SQS queue + Worker Lambda handler (or local worker script)
- [ ] Metrics endpoints (KPIs, MoM compare)
- [ ] Merchant list endpoints (paginated)
- [ ] Brief endpoint (placeholder narrative)

### 5. Ingestion Pipeline
- [ ] CSV parser (Clover schema)
- [ ] Validation rules
- [ ] UPSERT into `charges_raw`
- [ ] Recompute logic for canonical tables
- [ ] Audit logging (ingestion_uploads, ingestion_runs)

### 6. Frontend (Next.js)
- [ ] Project scaffold
- [ ] Cognito auth flow (Hosted UI)
- [ ] Global filters (Year, Month, Compare, App)
- [ ] Monthly Brief page skeleton
- [ ] KPI strip (Gross Billed, Active, Refunded)
- [ ] Narrative placeholder ("Summary pending — Nova coming soon")
- [ ] Scorecards + sparklines
- [ ] Action Center tables (At Risk, Lost, Refunds, Uninstalls)
- [ ] Pagination, export CSV

### 7. Admin
- [ ] Admin route guard
- [ ] CSV upload UI
- [ ] Upload status display

---

## Phase: Full Phase 1 (After MVP)

### 8. Nova
- [ ] OpenAI API key setup (guide below)
- [ ] Memory loading (task-based bundles)
- [ ] Nova tools (get_kpi, list_merchants, etc.)
- [ ] LLM router (workflow_budgets.json)
- [ ] Chat endpoint
- [ ] Growth plan endpoint
- [ ] Proactive brief generation (Worker trigger)

### 9. Full UI
- [ ] Ask MarketBuzz chat
- [ ] Growth Plan wizard
- [ ] App tabs
- [ ] Admin Memory Manager (optional for Phase 1)
- [ ] Package catalog CRUD

### 10. Deployment
- [ ] API → Lambda + API Gateway
- [ ] Worker → Lambda (SQS)
- [ ] Nova → Lambda
- [ ] Web → Vercel/Amplify
- [ ] RDS (prod) or Supabase (if staying)

---

## Completed Tasks
(Update as you go)

| Date | Task | Notes |
|------|------|-------|
| — | — | — |

---

## Blockers / Notes
- OpenAI API key: see setup guide below
- Cognito: needs User Pool + Groups setup

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