# DATA_MODEL_SPEC.md — MarketBuzz Compass

## Purpose

This document defines the **canonical data model** for MarketBuzz Compass.

Goals:
- make Clover CSV ingestion safe and repeatable
- support year/month filters and MoM comparisons
- support pagination for large merchant lists
- provide stable, queryable truth for Nova (the agent)

Raw Clover data is **never exposed directly** to the UI or agent.

---

## Core Principles (Locked)

1. **Charge ID is the primary key**
2. CSV exports are **snapshots**, not event logs
3. Billing happens on the **1st of the month**
4. Status reflects the **latest lifecycle stage**
5. Historical months are **never recomputed incorrectly**
6. Canonical tables are **append-safe + idempotent**

---

## 1) Raw Ingestion Table (Internal Only)

### `charges_raw`

Stores the **latest known snapshot** per charge.

| Column | Type | Notes |
|-----|-----|-----|
| charge_id | string (PK) | Clover Charge ID |
| charge_date | date | Billing date (month anchor) |
| charge_month | date (YYYY-MM-01) | Derived |
| merchant_id | string | Clover Merchant ID |
| merchant_name | string | Snapshot value |
| app_id | string | Internal app ID |
| app_name | string | Snapshot value |
| plan_name | string | Raw plan/tier name |
| amount | decimal | Positive or negative |
| status_current | enum | BILLED / COLLECTED / DEPOSITED / ONHOLD / REFUND / OTHER (Clover lifecycle: see `CLOVER_CSV_SCHEMA.md` §2; Canceled/Failed map to OTHER) |
| uninstall_date | date (nullable) | Churn signal |
| last_seen_at | timestamp | When this row was last updated |
| source_file_id | string | Upload audit |

**Rules**
- UPSERT by `charge_id` (newest snapshot wins; same charge can appear in later CSVs with updated status — see Clover lifecycle in `CLOVER_CSV_SCHEMA.md` §2)
- If same charge appears again, overwrite mutable fields (including status_current)
- Never delete rows

**Indexes**
- (charge_month)
- (merchant_id, app_id)
- (status_current)
- (last_seen_at)

---

## 2) Monthly Revenue Lifecycle (Baseline for Growth)

### `monthly_revenue_lifecycle`

Used for:
- growth tracking
- cash reality
- MoM comparisons

| Column | Type |
|-----|-----|
| month | date (YYYY-MM-01) |
| app_id | string |
| app_name | string |
| billed_amount | decimal |
| billed_count | integer |
| collected_amount | decimal |
| deposited_amount | decimal |
| refunded_amount | decimal |
| net_statement_amount | decimal (optional) |

**Definitions** (aligned with Clover billing status lifecycle; see `CLOVER_CSV_SCHEMA.md` §2)
- **Billed** = sum of all charges in that month (includes BILLED, ONHOLD, COLLECTED, DEPOSITED; excludes REFUND for net)
- **Collected** = charges with status in (COLLECTED, DEPOSITED) — i.e. Clover collected/deposited; not BILLED/ONHOLD
- **Deposited** = status = DEPOSITED (Clover deposited your share; typically 2–3 weeks after collection)
- **Refunded** = status = REFUND (or amount < 0 as fallback)
- **ONHOLD** = billed but collection/deposit blocked (e.g. payment failed, overdue); tracked for cash reality

**Indexes**
- (month)
- (month, app_id)

---

## 3) Merchant Lifecycle Table (Customer Intelligence Core)

### `merchant_lifecycle_monthly`

Defines Active → At Risk → Lost.

| Column | Type |
|-----|-----|
| month | date |
| merchant_id | string |
| merchant_name | string |
| app_id | string |
| app_name | string |
| lifecycle_state | enum (Active, AtRisk, Lost) |

**Lifecycle Rules**
- Active → billed this month
- AtRisk → billed last month, missing this month (“gone/uninstalled” for that month comparison)
- Lost → missing ≥2 consecutive months OR refunded/uninstalled

**Two “at risk” concepts (see `MRR_AND_MANUAL_OUTPUTS.md`):**
- **At Risk (lifecycle)** = above (billing presence: billed M−1, not M). Use for “lost merchants” list.
- **At Risk (payment / ONHOLD)** = billed this month but `status_current = ONHOLD`. Use for payment/collection risk; query charges or a view by month + ONHOLD.

**Indexes**
- (month, lifecycle_state)
- (merchant_id, app_id)
- (app_id, month)

---

## 4) New Revenue Added (NRA)

### `nra_monthly`

| Column | Type |
|-----|-----|
| month | date |
| app_id | string |
| app_name | string |
| nra_amount | decimal |
| nra_count | integer |

**Definition**
- Merchant paid this month
- Did NOT pay in the previous month
- Calculated per app

---

### `nra_merchants_monthly`

| Column | Type |
|-----|-----|
| month | date |
| merchant_id | string |
| merchant_name | string |
| app_id | string |
| amount | decimal |

**Indexes**
- (month)
- (merchant_id)

---

## 5) Refunds & Uninstalls

### `refund_merchants_monthly`

| Column | Type |
|-----|-----|
| month | date |
| merchant_id | string |
| merchant_name | string |
| app_id | string |
| refund_amount | decimal |
| charge_id | string |

---

### `uninstall_merchants_monthly`

| Column | Type |
|-----|-----|
| uninstall_month | date |
| merchant_id | string |
| merchant_name | string |
| app_id | string |
| uninstall_date | date |

---

## 6) High-Risk Churn Table

### `high_risk_churn_merchants`

Intersection of:
- Refunded
- Uninstalled
- Lost

| Column | Type |
|-----|-----|
| month | date |
| merchant_id | string |
| merchant_name | string |
| app_id | string |
| refund_amount | decimal |
| uninstall_date | date |
| last_active_month | date |

---

## 7) Growth Planning Support Tables

### `package_catalog`

Admin-managed.

| Column | Type |
|-----|-----|
| app_id | string |
| app_name | string |
| plan_id | string |
| plan_name | string |
| price | decimal |
| tier | string |

---

### `growth_forecast_monthly`

| Column | Type |
|-----|-----|
| month | date |
| app_id | string |
| projected_billed | decimal |
| churn_rate | decimal |
| renewal_rate | decimal |
| assumptions | text |

---

## 8) Pagination & Query Standards

All list queries must support:
- `month`
- `app_id`
- `lifecycle_state` (where applicable)
- `page`
- `page_size`

Backend must return:
```json
{
  "data": [...],
  "page": 2,
  "page_size": 25,
  "total_rows": 312
}

9) Month / Year Filtering Rules

Month stored as YYYY-MM-01

UI filters:

Year → resolved to month range

Month → exact match

Comparisons:

Previous month

Same month last year (if exists)

10) Data Refresh Workflow

Admin uploads CSV

Ingest → charges_raw (UPSERT)

Recompute:

monthly_revenue_lifecycle

merchant_lifecycle_monthly

NRA tables

churn tables

Persist snapshots

Trigger Nova (proactive mode)

11) What Nova Is Allowed to Use

Nova can query:

all tables in this spec

prior monthly snapshots

growth forecast tables

package catalog

Nova cannot:

access charges_raw directly

infer missing data

recompute lifecycle logic

12) Scalability Notes

Expected merchants: 10k+

Years of history: multi-year

Queries are month-scoped → efficient

All lifecycle tables should be materialized

Locked Summary

Single source of truth: canonical monthly tables

Baseline growth metric: Gross Billed Amount

Customer intelligence core: Merchant lifecycle

Agent-safe: Nova reads only derived tables

This data model is final for Phase-1.