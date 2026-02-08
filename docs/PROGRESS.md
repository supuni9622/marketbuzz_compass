# MarketBuzz Compass — Progress Tracker

**Last updated:** 2026-02-08  
**Current phase:** MVP  
**Status:** Day 3 partial — ingestion pipeline code complete, API→SQS→Lambda flow wired; Lambda fails with Runtime.Unknown (blocker)

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
- [ ] Lambda Runtime.Unknown fix (currently failing)
- [ ] Metrics endpoints (KPIs, MoM compare)
- [ ] Merchant list endpoints (paginated)
- [ ] Brief endpoint (placeholder narrative)

### 5. Ingestion Pipeline
- [x] CSV parser (Clover schema)
- [x] Validation rules
- [x] UPSERT into `charges_raw`
- [x] Recompute logic for canonical tables
- [x] Audit logging (ingestion_uploads, ingestion_runs)

### 6. Frontend (Next.js)
- [x] Project scaffold
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
| Lambda Runtime.Unknown | Handler/module fails to load before execution | Ensure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, S3_BUCKET_UPLOADS in Lambda env. Try CJS build: remove `--format=esm` and output `ingestion.js` instead of `ingestion.mjs`. |
| SQS ReceiveMessage permission | Lambda role missing SQS access | Add inline policy with sqs:ReceiveMessage, sqs:DeleteMessage, sqs:GetQueueAttributes. See `docs/articles/aws-sqs-lambda-ingestion-setup.md`. |
| AWS_REGION env var error | Lambda reserves AWS_REGION | Do not set AWS_REGION in Lambda env; Lambda provides it automatically. |

## Blockers / Notes
- **Lambda Runtime.Unknown:** Ingestion Lambda fails with `Error Type: Runtime.Unknown` (~453ms). API→SQS→Lambda trigger works; Lambda receives message but crashes before handler runs. Pause: try CJS build, verify env vars, or run pipeline locally/sync for MVP.
- OpenAI API key: see setup guide below
- Cognito: complete. See `docs/login_management.md` for user/password setup

## Handoff for New Context
When starting a new chat, say: *"Continue MarketBuzz Compass Day 3: Lambda Runtime.Unknown blocker. Ingestion pipeline code is done (parser, upsert, recompute); API→SQS→Lambda wired. Lambda fails with Runtime.Unknown before handler runs. Use @docs/PROGRESS.md @AGENTS.md @docs/INGESTION_WORKFLOW.md @docs/articles/aws-sqs-lambda-ingestion-setup.md. Backend Fastify, DB Supabase, monorepo apps/api and apps/web."*

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