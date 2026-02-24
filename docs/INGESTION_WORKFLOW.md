# INGESTION_WORKFLOW.md — CSV → DB → Nova (MarketBuzz Compass)

## Purpose
Define a repeatable, idempotent ingestion pipeline that:
- accepts Clover CSV uploads (past 3 months only)
- deduplicates safely (Charge ID)
- refreshes canonical monthly tables
- triggers Nova to generate the Monthly Brief + insights

This is Phase-1 ingestion: **manual upload (Admin)**.

---

## Key Constraints (Locked)
1. Clover export covers only **past 3 months**
2. Uploads overlap → duplicates are expected
3. **Charge ID** is the unique identifier
4. CSV is a **snapshot** of latest status, not an event log
5. Baseline growth metric = **Gross Billed (by Charge Date month)**

---

## High-Level Flow

1) **Admin uploads CSV**  
2) Validate + parse  
3) Store upload audit record  
4) Upsert rows into `charges_raw` (dedupe by charge_id)  
5) Recompute canonical monthly tables (materialized)  
6) Mark ingestion run complete  
7) Trigger Nova proactive summary  
8) UI updates “Last Updated” + shows the new Monthly Brief

---

## 1) Admin Upload UX (Web UI)

### Entry point
`Admin → Upload Clover CSV`

### What Admin sees after upload
- Upload status: success/failure
- Rows received
- Charge IDs: inserted vs updated vs skipped
- Date range detected (months)
- Recompute duration
- Nova brief generation status

### Permissions
Only Cognito Group: **Admin**

---

## 2) File Handling & Audit

### Storage
Store uploaded files in S3:
- bucket: `marketbuzz-compass-uploads`
- key format: `clover_csv/{yyyy}/{mm}/{upload_id}.csv`

### Upload audit table
`ingestion_uploads`

| column | notes |
|---|---|
| upload_id (PK) | UUID |
| uploaded_by_user_id | Cognito `sub` |
| uploaded_by_email | |
| uploaded_at | UTC |
| file_s3_key | |
| file_sha256 | integrity + dedupe |
| source_system | "clover" |
| rows_received | |
| months_detected | array of YYYY-MM |
| status | pending/success/failure |
| error_message | nullable |

**Rule:** never delete upload records.

---

## 3) Validation Rules (Fail Fast)

Reject upload if:
- required columns are missing
- Charge ID column missing/empty
- Charge Date unparsable for majority
- Amount not numeric
- file is empty

Warn (but allow) if:
- months detected are outside expected range (not last 3 months)
- merchant_name or app_name missing in some rows

### Required CSV fields (minimum)
- Charge ID
- Charge Date
- Merchant ID
- Merchant Name
- App Name (or App ID)
- Amount
- Status
- Uninstall Date (optional)

---

## 4) Parsing & Normalization

### Canonical normalization
- `charge_id`: string trimmed
- `charge_date`: parsed date
- `charge_month`: `YYYY-MM-01`
- `amount`: decimal
- `status_current`: uppercased and mapped (see **Clover Billing Status Lifecycle** in `CLOVER_CSV_SCHEMA.md` §2):
  - REFUND/REFUNDED → REFUND
  - BILLED, COLLECTED, DEPOSITED, ONHOLD → kept as-is
  - Canceled-type (Cancelled, Reversed, Uncollectible, Waived) → OTHER
  - Failed (e.g. refund failed) → OTHER
  - unknown → OTHER
- `uninstall_date`: parsed date or null
- `last_seen_at`: now()
- `source_file_id`: upload_id

### Status mapping
We treat statuses as **snapshot** only. Clover lifecycle: Billed → On Hold / Collected / Refund / Canceled → Collected → Deposited. Lifecycle is derived from months, not status history.

---

## 5) Upsert Strategy (Dedup by Charge ID)

### Target table
`charges_raw` (latest snapshot per charge)

### Upsert rule
- If `charge_id` not present → INSERT
- If present → UPDATE fields:
  - status_current
  - merchant_name (latest)
  - app_name (latest)
  - amount (latest)
  - uninstall_date (latest)
  - last_seen_at
  - source_file_id

**Rationale**
Clover status evolves (Billed → On Hold → Collected → Deposited, or Refund/Canceled). Same charge_id can appear in later CSVs with a different status; we upsert by charge_id so the **newest snapshot wins**. ONHOLD = billed but not yet collected/deposited (e.g. payment or deposit failed); tracked for cash reality.

### Output counts
Track:
- inserted_count
- updated_count
- skipped_count (invalid rows)

Store in `ingestion_runs` (below).

---

## 6) Ingestion Run Tracking

### Table: `ingestion_runs`
Each upload creates one ingestion run.

| column | notes |
|---|---|
| run_id (PK) | UUID |
| upload_id (FK) | |
| started_at | |
| finished_at | |
| inserted_count | |
| updated_count | |
| skipped_count | |
| months_affected | array of YYYY-MM |
| recompute_status | pending/success/failure |
| nova_status | pending/success/failure |
| error_message | nullable |

---

## 7) Canonical Table Recompute (Materialized)

### Recompute scope
Only recompute **months affected** by the upload:
- months detected in file (charge_month)
- plus **previous month** (needed for At Risk)
- plus **next month** (optional, if you precompute forward views)

Example:
Upload months: Dec, Jan, Feb  
Recompute: Nov–Feb (Nov needed for Dec At Risk logic)

### Tables to recompute
1) `monthly_revenue_lifecycle`
2) `merchant_lifecycle_monthly`
3) `nra_monthly`
4) `nra_merchants_monthly`
5) `refund_merchants_monthly`
6) `uninstall_merchants_monthly`
7) `high_risk_churn_merchants`
8) `growth_forecast_monthly` (optional Phase-1)

### Recompute order (recommended)
1. monthly revenue lifecycle
2. merchant lifecycle
3. refunds/uninstalls
4. NRA
5. high-risk churn
6. forecast (if enabled)

### Idempotency rule
Recompute uses `DELETE WHERE month IN months_scope` then `INSERT` results
(or materialized view refresh) to avoid duplicates.

---

## 8) Metric Definitions Used in Recompute

### Gross Billed (Baseline)
For month M:
- **billed_amount** = sum(amount) of all charges where charge_month == M
- billed_count = count(distinct charge_id) in month M

### Collected
Month M:
- collected_amount = sum(amount) where month == M and status_current in (COLLECTED, DEPOSITED)
- BILLED and ONHOLD are **not** counted as collected; they are billed-only until moved to COLLECTED/DEPOSITED.

### Deposited
Month M:
- deposited_amount = sum(amount) where month == M and status_current == DEPOSITED

### Refunded
Month M:
- refunded_amount = sum(amount) where month == M and status_current == REFUND
  - (or amount < 0 as fallback)

### Charge status values (aligned with Clover lifecycle; see `CLOVER_CSV_SCHEMA.md` §2)
- **BILLED** — charge requested/scheduled, not yet collected
- **ONHOLD** — collection or deposit blocked (e.g. payment failed, deposit failed, overdue)
- **COLLECTED** — Clover collected payment from merchant's bank
- **DEPOSITED** — Clover deposited your share (typically 2–3 weeks after collection)
- **REFUND** — refund in progress or completed
- **OTHER** — unknown, or Canceled (Reversed/Uncollectible/Waived), or Failed (refund attempt failed)

---

## 9) Merchant Lifecycle Derivation

Per merchant_id + app_id + month:

- Active: billed exists in month
- AtRisk: billed exists in month-1 but not month
- Lost: not billed in month and not billed in month-1
  - optionally force Lost if refunded/uninstalled is present

**Important:** lifecycle is derived from **billing presence**, not status_current.

---

## 10) Trigger Nova (Proactive Mode)

### Trigger point
After recompute succeeds.

### Inputs to Nova
Nova should be given:
- current selected month (latest month in scope)
- compare month (previous month by default)
- global filters (app=All)
- pointers to canonical tables

### Nova outputs
- `briefs/{YYYY-MM}.md` written to file memory store
- `brief_summary` record stored in DB for fast UI loading

### DB table for brief cache
`monthly_briefs`

| column | notes |
|---|---|
| month (PK) | YYYY-MM-01 |
| created_at | |
| created_by | "nova" |
| headline_gross_billed | decimal |
| mom_delta | decimal |
| mom_delta_pct | decimal |
| brief_markdown | text |
| evidence_links | json |
| flags | json (risk indicators) |

**UI always loads from this table first.**

---

## 11) Error Handling & Recovery

### If parsing fails
- mark upload failure
- do not touch DB

### If upsert fails mid-way
- rollback transaction
- mark run failure

### If recompute fails
- keep `charges_raw` updates (since they are valid)
- mark recompute failure
- do not trigger Nova
- Admin can retry recompute for months_affected

### If Nova generation fails
- keep metrics updated
- show “Insights pending” in UI
- allow “Retry Nova” from Admin

---

## 12) Observability (Minimum)

Log and expose:
- upload_id, run_id
- months_affected
- inserted/updated/skipped
- recompute duration per table
- Nova generation duration
- last successful ingestion timestamp

Add dashboards later; phase-1: store in DB + show in Admin UI.

---

## 13) Security

- CSV uploads restricted to Cognito Group **Admin**
- Files stored in private S3 bucket
- Every ingestion action written to audit log
- Backend validates JWT and group claims

---

## 14) Performance Notes

- Scope recompute to months_affected only
- Ensure indexes exist on:
  - charges_raw(charge_month)
  - charges_raw(merchant_id, app_id)
  - merchant_lifecycle_monthly(month, lifecycle_state)
- Always paginate merchant list queries server-side

---

## 15) Acceptance Criteria (Phase-1)

A successful upload should:
- avoid duplicates automatically
- update changed statuses correctly
- update monthly tables correctly
- generate Nova brief for the latest month
- enable UI filters across months/years
- show correct MoM deltas for all KPIs

---

## Appendix: Example End-to-End Run

1) Admin uploads Feb CSV (covers Dec–Feb)
2) System detects months: 2025-12, 2026-01, 2026-02
3) Upsert 1,200 charges:
   - inserted: 150
   - updated: 1,050
4) Recompute months scope: 2025-11 → 2026-02
5) Nova writes brief for 2026-02 with compare 2026-01
6) Monthly Brief UI updates and lists are queryable/paginated

