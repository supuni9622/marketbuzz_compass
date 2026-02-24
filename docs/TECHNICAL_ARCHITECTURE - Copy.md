# TECHNICAL_ARCHITECTURE.md — MarketBuzz Compass (Internal Revenue Intelligence)

## 1) Overview

**MarketBuzz Compass** is an internal system that ingests overlapping Clover billing CSV snapshots, deduplicates by **Charge ID**, materializes monthly revenue + merchant intelligence tables, and powers a dual-mode agent (**Nova**) that produces proactive monthly briefs and answers questions via chat.

**Core product promise**
> Interpret. Guide. Plan. Warn.

**Baseline growth metric**
- **Gross Billed Amount** (by Charge Date month)

---

## 2) High-Level Architecture

```mermaid
flowchart LR
  U[Admin / Users\nWeb UI] -->|Login| C[Cognito Hosted UI]
  C -->|JWT| U
  U -->|JWT| API[Backend API\n(Node/TS)]
  API --> DB[(Postgres / RDS)]
  API --> S3[(S3: uploads + memory)]
  U -->|Read| API

  subgraph Ingestion
    U -->|Upload CSV| API
    API -->|Store file| S3
    API -->|Upsert by Charge ID| DB
    API -->|Publish job| Q[SQS Queue]
    Q --> W[Worker\nRecompute + Brief Trigger]
    W --> DB
    W --> Nova[Nova Service\n(Proactive Brief)]
    Nova --> DB
    Nova --> S3
  end

  subgraph Chat
    U -->|Ask| API
    API --> Nova
    Nova --> DB
    Nova --> S3
    Nova --> API
  end

3) Components
3.1 Web UI (Frontend)

Next.js (recommended) + UI components

Story-first “Monthly Brief” experience:

Scorecards + evidence charts + action tables

Year/month filters and MoM comparisons

Server-side pagination for merchant lists

Growth planning wizard (+% → plan)

Auth

Uses Cognito Hosted UI login flow

Receives JWT tokens and calls backend with Authorization header

Hides Admin UI unless user in Cognito Admin group (backend enforces too)

3.2 Authentication (AWS Cognito)

Cognito User Pool (email/password, email verification)

Groups:

Admin: uploads + config

Viewer: read-only

Backend verifies JWT via Cognito JWKS and enforces group-based access.

3.3 Backend API (Application Layer)

Node.js + TypeScript (Express/Fastify/NestJS — choose one)

Responsibilities:

Auth middleware (JWT validation + RBAC)

CSV upload endpoints (Admin only)

Query endpoints for charts/tables (paginated)

Growth plan endpoint orchestration

Chat endpoint (forward to Nova)

Presigned S3 URLs (optional) for upload scalability

Audit logging

Rule: UI and Nova only consume canonical tables, not raw CSV.

3.4 Data Store (Postgres / RDS)

Primary truth for:

charges_raw (deduped by Charge ID, latest snapshot)

canonical monthly tables (materialized)

cached monthly briefs

ingestion/audit logs

package catalog

Why Postgres

Strong indexing for month/app/merchant queries

Pagination and filtering are straightforward

Future joins with internal merchant DB (Phase-2)

3.5 Object Store (S3)

Used for:

Uploaded files

Clover CSV snapshots

PDFs/CSVs knowledge packs

Nova memory store (OpenClaw-style file memory)

/memory/definitions/*.md

/memory/playbooks/*.md

/memory/market/*.md

/memory/briefs/YYYY-MM.md

S3 is the durable store. Backend/Nova reads/writes to it.

3.6 Queue + Worker (Asynchronous Compute)

SQS queue decouples uploads from recompute.

Worker responsibilities

Parse & normalize file (if not already done in API)

Upsert into charges_raw (transactional)

Recompute affected months into canonical tables

Trigger Nova proactive generation for latest month

Update ingestion_runs status + metrics

This avoids long request timeouts and keeps uploads reliable.

3.7 Nova Service (Agent Layer)

Nova is a single agent with two modes:

Proactive: triggered after ingestion refresh → generates Monthly Brief

Reactive: answers chat questions with evidence

Nova’s constraints:

Can query only canonical tables

Uses S3 file memory for definitions/playbooks/market context

Must not hallucinate metrics

Must cite numeric evidence in output payload

Nova outputs:

Markdown brief (stored in S3 memory + cached in DB)

Structured “evidence links” so UI can deep-link to charts/tables

4) Data Flow
4.1 CSV Upload → Canonical Tables → Nova Brief
sequenceDiagram
  participant Admin as Admin (UI)
  participant API as Backend API
  participant S3 as S3
  participant DB as Postgres (RDS)
  participant Q as SQS
  participant W as Worker
  participant Nova as Nova

  Admin->>API: Upload CSV (JWT + Admin group)
  API->>S3: Store raw CSV (uploads bucket)
  API->>DB: Create ingestion_upload + ingestion_run (pending)
  API->>Q: Enqueue recompute job (months detected)
  API-->>Admin: Upload accepted (shows pending)

  Q->>W: Job received
  W->>DB: UPSERT charges_raw by charge_id
  W->>DB: Recompute canonical monthly tables (months_scope)
  W->>Nova: Trigger Proactive Brief (latest month)
  Nova->>DB: Read canonical tables + prior briefs
  Nova->>S3: Read memory (definitions/playbooks/market)
  Nova->>S3: Write brief markdown /memory/briefs/YYYY-MM.md
  Nova->>DB: Cache brief in monthly_briefs table
  W->>DB: Mark ingestion_run success + stats

4.2 Chat → Evidence-Based Answer
sequenceDiagram
  participant User as User (UI)
  participant API as Backend API
  participant Nova as Nova
  participant DB as Postgres
  participant S3 as S3 Memory

  User->>API: Ask question (JWT)
  API->>Nova: Forward question + filter context
  Nova->>DB: Query canonical tables (only)
  Nova->>S3: Load definitions/playbooks if needed
  Nova-->>API: Answer + evidence payload
  API-->>User: Render answer + buttons to open tables

5) Canonical Data Layers (What the UI + Nova rely on)
Layer 0 (internal only)

charges_raw: latest snapshot per Charge ID

Layer 1 (materialized)

monthly_revenue_lifecycle

merchant_lifecycle_monthly

nra_monthly, nra_merchants_monthly

refund_merchants_monthly, uninstall_merchants_monthly

high_risk_churn_merchants

Layer 2 (planning)

package_catalog (admin-managed)

growth_forecast_monthly (optional Phase-1)

Layer 3 (narrative cache)

monthly_briefs (Nova output cache)

6) Key Technical Decisions
6.1 Deduplication

Primary key: Charge ID

Strategy: UPSERT latest snapshot into charges_raw

Recompute materialized months affected by upload

6.2 Month Model

Store months as YYYY-MM-01 (date)

Comparisons:

default: previous month

optional: same month last year (when data exists)

6.3 Pagination

All merchant list endpoints return:

data, page, page_size, total_rows

Server-side pagination only (DB indexed queries)

6.4 “File-based memory” (OpenClaw-like)

Use S3 as canonical memory store

Keep memory versioned (path prefix + timestamps if needed)

Memory stores context only (definitions, playbooks, summaries)

Transaction data stays in DB

7) AWS Deployment Options (Cost-effective)
Option A: ECS Fargate (recommended for control)

API service on ECS

Worker service on ECS (polls SQS)

Nova service on ECS (or colocated with worker)

Pros: predictable, scalable, simple networking
Cons: always-on cost (small but non-zero)

Option B: Lambda + Step Functions (ultra cost-efficient for low frequency)

API can be Lambda behind API Gateway

Worker can be Lambda triggered by SQS

Nova can be Lambda invoked by worker

Pros: pay-per-use, great for 1–2 runs/month
Cons: packaging + cold starts + runtime limits (be careful with CSV size)

Given your usage (1–2×/month), Option B is very attractive if CSV sizes are reasonable.

8) Security & Compliance

Cognito JWT validation on every request

RBAC enforced server-side (Admin vs Viewer)

S3 buckets private; access via backend role

Audit log:

who uploaded what

file hash

inserted/updated counts

recompute status

brief generation status

9) Observability

Minimum required:

ingestion_run status dashboard in Admin

logs:

parsing errors

recompute timing per table

Nova brief generation time

metrics:

job queue depth (SQS)

API latency p95

DB query p95 for list endpoints

10) Phase Roadmap Alignment
Phase-1 (now)

manual CSV upload

dedupe + canonical tables

Nova proactive monthly brief + reactive chat

growth planning based on packages + historical trends

Phase-2 (later)

integrate internal merchant DB (names, segmentation, transactions)

add usage signals → earlier churn prediction (“Pre-Risk”)

automated market updates (controlled)

role expansion (Sales/Finance) if needed

11) Interfaces (API Contract Summary)
Auth

All endpoints require JWT

Admin endpoints require cognito:groups includes Admin

Core endpoints (examples)

GET /brief?month=YYYY-MM&compare=YYYY-MM&app=...

GET /metrics/kpi?...

GET /merchants?month=...&state=AtRisk&page=...

POST /admin/upload/csv (Admin)

GET /admin/packages / POST /admin/packages (Admin)

POST /chat (Nova reactive)

POST /growth-plan (Nova + math)

12) Non-Negotiable Guardrails (System-wide)

UI and Nova must never compute metrics from raw CSV directly

Canonical tables are the source of truth

Growth baseline is Gross Billed

All “insights” must be traceable to stored metrics or lists

Every list is paginated; every table export is filtered