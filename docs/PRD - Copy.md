Revenue Intelligence Hub (CSV Ingest + Canonical Metrics + Analytics Agent)


✅ System We’re Building (Clear Definition)
An internal Revenue & Merchant Intelligence System
that ingests recurring Clover CSV snapshots, deduplicates them, reconstructs billing lifecycle + merchant lifecycle, and exposes human-readable insights via tables + an intelligent assistant.

**Product context:** CSV on 1st of month; total billed = MRR. We need last vs this month MRR, lost/added amounts and merchants, app-wise recurring revenue, lifecycle counts, uninstalled list. “Lost” for a month = in last month’s billed, not this month’s (lifecycle At Risk). ONHOLD = payment at risk. Goal: manual work in ~1 minute + AI proactive/post-action suggestions; calculations accurate; DB and AI cost-conscious. See `docs/MRR_AND_MANUAL_OUTPUTS.md`.

Not a dashboard.
Not raw analytics.
A decision-support system.

🧱 Core Principles (Non-negotiable)
These are locked based on our discoveries:

Each CSV row = one charge (snapshot, not event log)

Charge ID = primary key

Billing always happens first (1st of month)

Status is latest known stage (BILLED / ONHOLD → COLLECTED → DEPOSITED; REFUND). ONHOLD = billed but not yet collected/deposited; tracked for future calculations.

Marketing should NEVER reason about statuses

Merchant lifecycle > revenue numbers for actionability

Everything below follows from this.

🏗️ High-Level Architecture (Simple & Scalable)


CSV Upload (monthly)
        ↓
Ingestion + Deduplication
        ↓
Canonical Data Store
        ↓
Materialized Business Tables
        ↓
Intelligence Layer (Agent)
        ↓
Web UI (tables + narratives)
1️⃣ Ingestion Layer (CSV-safe, duplicate-proof)
Input
Monthly CSV upload

Logic
UPSERT by Charge ID

Keep latest snapshot only

Track last_seen_at for observability

Canonical Raw Table
charges

column

purpose

charge_id (PK)

dedupe

charge_date

billing month

merchant_id

lifecycle

merchant_name

UI

app_id / app_name

segmentation

amount

revenue

status_current

lifecycle stage

uninstall_date

churn signal

last_seen_at

snapshot control

This table is append-safe forever.

2️⃣ Canonical Business Tables (THIS is the magic)
Marketing & Product never touch charges.

They only see derived, opinionated tables.

A. Monthly Revenue Lifecycle (we already built this)
monthly_revenue_lifecycle

month

billed_amt

collected_amt

deposited_amt

refunded_amt

Rules:

Billed = all charges in that month

Collected ⊆ Billed

Deposited ⊆ Collected

Used for:

Growth

Cash expectations

Finance sanity checks

B. Merchant Lifecycle Table (the most important)
merchant_lifecycle_monthly

month

merchant_id

merchant_name

app

lifecycle_state

2025-12

XYZ

ABC Salon

SMS

Active

2026-01

XYZ

ABC Salon

SMS

At Risk

2026-02

XYZ

ABC Salon

SMS

Lost

Lifecycle logic (locked):

Active → billed this month

At Risk → billed last month, missing this month

Lost → missing ≥2 months OR refunded/uninstalled

This table:

Drives churn

Drives marketing actions

Drives alerts

C. Action Tables (auto-generated)
These are what teams actually use.

🔴 Critical Churn
refunded ∩ uninstalled ∩ lost

Already built ✔️

🟡 At Risk (outreach list)
lifecycle_state = At Risk

🧊 Silent Churn
uninstalled WITHOUT refund

🔁 Recovered
At Risk → Active
(Currently empty, which is itself an insight)

3️⃣ Intelligence Layer (Agent, not chatbot)
This is NOT a generic LLM.

It is a tool-using analytics agent with strict rules.

What it can do
Query only canonical tables

Explain:

“Why did Active drop in Feb?”

“Which app drives most At Risk merchants?”

Generate:

Monthly summaries

Executive narratives

Risk explanations

What it CANNOT do
Guess numbers

Read raw CSVs

Invent metrics

Memory
Stores:

Past month summaries

Known patterns (“At Risk never recovers”)

Business definitions (locked rules)

4️⃣ Web UI (Minimal, Effective)
Remember: used 1–2× per month.

Home
Last month summary (text first)

Key tables:

Revenue lifecycle

Merchant lifecycle counts

Merchant Lifecycle
Month selector

Filter by:

Active / At Risk / Lost

Exportable tables

Ask the System
Examples:

“Why did Feb churn spike?”

“Which merchants should marketing contact this week?”

“Is SMS or Unlock causing more churn?”

Admin
Upload CSV

Upload PDFs / Excel (market context, plans)

Edit app metadata

5️⃣ Market & App Context (Controlled, Not Messy)
You were clear:

System should know Clover market, SMB categories, salons, vape shops, etc.

Correct way to do this:

Reference Knowledge Store
Uploaded PDFs

Curated CSVs

Periodic web summaries (manual or scheduled)

Used for:
Interpretation

Narratives

Segmentation ideas

❌ Never mixed into revenue math.

6️⃣ Phase Roadmap (Realistic)
Phase 1 (what we’re basically done designing)
CSV ingestion

Dedup

Revenue lifecycle

Merchant lifecycle

Action tables

Basic agent

Phase 2
Join internal merchant DB

Usage signals

Predictive “pre-risk” detection

🔒 Why this system will NOT break
Immune to Clover export limits

Immune to status confusion

Immune to timing lag

Marketing sees facts + actions, not raw data

You never have to re-explain “BILLED vs COLLECTED” again