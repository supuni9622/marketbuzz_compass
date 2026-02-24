# MRR, Manual Outputs & Product Context — MarketBuzz Compass

**Purpose:** Capture how monthly recurring revenue (MRR), lost/added merchants, app-wise revenue, and lifecycle views map to the system. This is the product context the intelligent system automates (manual work in ~1 minute) with accurate calculations and cost-conscious architecture.

---

## 1) Cadence & MRR Definition

- **CSV cadence:** We plan to get the Clover CSV on the **1st of every month**.
- **Monthly recurring revenue (MRR):** The **total billed amount** for that month = MRR. In the system this is `monthly_revenue_lifecycle.billed_amount` for the month (sum of all charges where `charge_month` = that month).
- **Last month vs this month:** “Last month recurring revenue” = `billed_amount` for month M−1; “this month’s recurring revenue” = `billed_amount` for month M. Compare to get how much we lost, how much we added.

---

## 2) Manual Outputs → Canonical Tables

| Manual output | Source in system | Notes |
|---------------|------------------|--------|
| **Revenue $ (MRR)** | `monthly_revenue_lifecycle.billed_amount` | Total billed for month; CSV on 1st feeds that month. |
| **Addition to revenue $ (MoM)** | Current month billed − prior month billed | Or derive from NRA amount − “lost” amount. |
| **Expected 10% growth / Growth %** | Derived in API or UI | From `monthly_revenue_lifecycle` for current + compare month. |
| **Lost merchants** (in last month’s billed, not this month’s) | `merchant_lifecycle_monthly` with `lifecycle_state = 'AtRisk'` for **this** month | AtRisk = billed last month, missing this month (“gone/uninstalled” for that comparison). |
| **New / added merchants** (in this month, not last month) | `nra_merchants_monthly` (and `nra_monthly` for app-wise totals) | NRA = paid this month, did not pay previous month. |
| **App-wise merchant count + billed** | `monthly_revenue_lifecycle` (billed_amount, billed_count) + `merchant_lifecycle_monthly` by app_id | Aggregate by (month, app_id). |
| **Uninstalled merchants** | `uninstall_merchants_monthly` | By uninstall_month, merchant_id, app_name, uninstall_date. |
| **Lifecycle state counts** (Active / At Risk / Lost) | `merchant_lifecycle_monthly` grouped by (month, lifecycle_state) | Active = billed this month; AtRisk = billed last month not this; Lost = 2+ months missing or refunded/uninstalled. |

**Rule:** If a merchant is in **last month’s billed** but **not in this month’s billed**, they are treated as **gone/uninstalled** for that comparison; in the model that is **At Risk (lifecycle)** for this month. **Lost** is for merchants missing ≥2 consecutive months or refunded/uninstalled.

---

## 3) Two “At Risk” Definitions

The product uses “at risk” in two ways; the system supports both.

| Term | Definition | Source |
|------|------------|--------|
| **At Risk (lifecycle)** | Billed last month, **missing this month**. “Gone” for that month-over-month comparison. | `merchant_lifecycle_monthly.lifecycle_state = 'AtRisk'` for the current month. |
| **At Risk (payment / ONHOLD)** | Still in this month’s billed list but **status = ONHOLD** (collection or deposit blocked). Merchant is at risk of not paying / needs follow-up. | Query charges (or a view) where `charge_month` = month and `status_current = 'ONHOLD'`; aggregate by merchant/app as needed. |

- **Lost merchants list** (e.g. “in Jan billed, not in Feb”) → use **At Risk (lifecycle)** for the **later** month (Feb).
- **“Who is ONHOLD”** / payment at risk → use **At Risk (payment / ONHOLD)** (status-based).

---

## 4) Most Valuable & Recurring Merchants

- **Recurring merchants over months:** Merchants that appear as Active (or billed) in multiple months. Derive by querying `merchant_lifecycle_monthly` (or equivalent) by (merchant_id, app_id) across months (e.g. “months active” or tenure).
- **Most valuable merchants:** Rank by total billed (or collected) over a chosen window; derive from `monthly_revenue_lifecycle` (and/or charge-level aggregates) by merchant/app. Prefer materialized or indexed aggregates for performance; avoid ad-hoc full scans of raw charges for analytics.

---

## 5) Goal of the Intelligent System

- **Automate manual work** so the above views (revenue table, lost/new merchants, app-wise, uninstalled, lifecycle counts) are available in **~1 minute** after the CSV is processed.
- **AI suggestions** in a **proactive** (e.g. before month-end) and **post-action** (e.g. after a drop) way.
- **Accuracy:** All calculations must be correct; metric definitions live in `INGESTION_WORKFLOW.md` and `DATA_MODEL_SPEC.md`; recompute and API use the same definitions.
- **CPU and cost:** Database and AI usage must stay efficient when deployed (see §6).

---

## 6) Performance & Cost Principles

### Database

- **Canonical tables only** for UI and Nova; no ad-hoc analytics on `charges_raw`.
- **Indexes** per `DATA_MODEL_SPEC.md`: (month), (month, app_id), (month, lifecycle_state), (merchant_id, app_id).
- **Pagination** on all list endpoints (lost/added merchants, ONHOLD list, etc.).
- **Recompute scope:** Only months affected by each upload (see `INGESTION_WORKFLOW.md`).

### AI (Nova)

- **Targeted queries:** Prefer small, specific queries (e.g. “KPIs for month M”, “At Risk list for month M”) over large context dumps.
- **Workflow budgets:** Use tiered models and budgets (e.g. `workflow_budgets.json`) so simple summaries use cheaper models.
- **Task-based memory:** Load only definitions/playbooks needed for the task; avoid global memory dump.
- **Cache:** Store Nova outputs (e.g. monthly brief) in `monthly_briefs` so the UI does not regenerate on every request.

### Calculations

- **Compute in the DB:** Sums and counts in SQL; avoid pulling large result sets and aggregating in application code.
- **Single source of truth:** Metric definitions in one place so recompute and API stay in sync and accurate.

---

## 7) Related Docs

| Topic | Doc |
|-------|-----|
| Data model & canonical tables | `DATA_MODEL_SPEC.md` |
| Metric definitions & recompute | `INGESTION_WORKFLOW.md` |
| Clover status lifecycle | `CLOVER_CSV_SCHEMA.md` §2 |
| Nova agent | `AGENT_SPEC.md` |
| Progress | `PROGRESS.md` |
