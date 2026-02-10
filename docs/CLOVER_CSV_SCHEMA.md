# Clover CSV Schema — MarketBuzz Compass

Reference for the Clover billing export CSV format. This is the **primary input** to the ingestion pipeline.

**Source:** Clover app market export (rolling ~3 months).  
**Example filename:** `Evidence Ventures, LLC Nov 3, 2025 - Feb 2, 2026.csv`

---

## 1) Column Layout

| Column | Type | Example | Notes |
|--------|------|---------|-------|
| Charge ID | string | REKQ6Z7CV6J48 | Primary key; alphanumeric |
| Charge Date | datetime | 01-Jan-2026 12:32 AM +0000 | Use for `charge_month` (YYYY-MM-01) |
| Install Date | datetime | 27-Apr-2016 05:34 PM +0000 | Optional |
| Uninstall Date | datetime | (empty or 02-Jan-2026 11:15 AM +0000) | Churn signal; null when active |
| Merchant ID | string | Y71SYYW8GPN9R | Clover merchant ID |
| Merchant Name | string | ECHO CANYON SPA RESORT | Snapshot value |
| App ID | string | 9YKVENN6B24YM | Internal app identifier |
| App Name | string | Email Marketing with UMarket | Snapshot value |
| Charge Type | string | SUBSCRIPTION / PARTIAL_MONTH / PRORATED_SUBSCRIPTION | Charge type |
| Currency | string | USD | |
| Amount | decimal | 59.95 or -37.74 | Negative for refunds |
| Status | string | See §2 Clover Billing Status Lifecycle | Normalized to REFUND, BILLED, ONHOLD, COLLECTED, DEPOSITED, OTHER |
| Export Month | string | 2026-01 | Export run identifier |

---

## 2) Clover Billing Status Lifecycle

Clover billing statuses and their meanings. A single charge progresses through this lifecycle; CSV exports are **snapshots** of the latest status per charge. See `INGESTION_WORKFLOW.md` for upsert (newest snapshot wins).

| Status | Meaning |
|--------|---------|
| **Billed** | Charge is requested or scheduled but not yet collected. Sub-statuses: Requested, Resubmitted, Upcoming Invoice. |
| **On Hold** | Something prevented collection or deposit — e.g. merchant's payment failed, deposit failed to your bank, or merchant is overdue. |
| **Collected** | Clover successfully collected the payment from the merchant's bank. |
| **Deposited** | Clover successfully deposited your share into your bank. Generally happens after collection (often 2–3 weeks later). |
| **Refund** | Refund in progress or completed (prorated subscription changes, merchant refunds, developer-initiated refunds). |
| **Canceled** | Charge was stopped/canceled before it processed. Examples: Cancelled, Reversed, Uncollectible, Waived. |
| **Failed** | The refund attempt failed (e.g. refund rejected by bank). |

**Lifecycle flow:** Billed → (On Hold / Collected / Refund / Canceled) → Collected → Deposited. Same `Charge ID` can appear in later CSV exports with an updated status; we upsert by Charge ID so the latest status overwrites the previous one.

---

## 3) Parsing Rules

### Charge Date → charge_month

- Format: `DD-Mon-YYYY HH:MM AM/PM +0000`
- Example: `01-Jan-2026 12:32 AM +0000` → `charge_month` = `2026-01-01`
- Derive month from the date portion; normalize to first day of month.

### Status mapping (to `status_current`)

- REFUNDED / REFUND → **REFUND**
- BILLED, COLLECTED, DEPOSITED, ONHOLD → kept as-is (Clover definitions in §2).
- **Canceled**-type values (Cancelled, Reversed, Uncollectible, Waived) → **OTHER**
- **Failed** (e.g. refund failed) → **OTHER**
- Any other CSV value → **OTHER**

### Amount

- Positive: billed / collected / deposited
- Negative: refunds (common with PRORATED_SUBSCRIPTION)

### Uninstall Date

- Empty = no uninstall
- Present = uninstall date (churn signal)

---

## 4) App Names (Observed)

- SMS Marketing
- Email Marketing with UMarket
- Small Business CRM & Customer Engagement for Clover
- Unlock Insights – Sales & Customer Analytics (ChatGPT Enabled)
- Unlock Insights - Sales, Product & Customer Data Analytics
- Customer Referral Reward
- Social Media Marketing with BeSocial
- Local Ads

**Note:** Unlock app has two display-name variants; normalize when mapping to `app_id` / `app_name`.

---

## 5) Charge Types

| Value | Description |
|-------|-------------|
| SUBSCRIPTION | Standard monthly charge |
| PARTIAL_MONTH | Prorated for partial month |
| PRORATED_SUBSCRIPTION | Often refunds or adjustments |

---

## 6) Constraints

- Clover export covers **rolling ~3 months** only
- Same Charge ID can appear in overlapping exports (repeated uploads)
- Each row = **snapshot** of the latest status for that charge
- Deduplication: UPSERT by Charge ID (keep latest)
- `Export Month` indicates which export run; useful for audit

---

## 7) Required Fields for Ingestion

Per `INGESTION_WORKFLOW.md`, minimum required:

- Charge ID
- Charge Date
- Merchant ID
- Merchant Name
- App Name (or App ID)
- Amount
- Status
- Uninstall Date (optional)

---

## 8) Mapping to charges_raw

| CSV Column | charges_raw Column |
|------------|-------------------|
| Charge ID | charge_id (PK) |
| Charge Date | charge_date |
| (derived) | charge_month (YYYY-MM-01) |
| Merchant ID | merchant_id |
| Merchant Name | merchant_name |
| App ID | app_id |
| App Name | app_name |
| Amount | amount |
| Status | status_current (normalized) |
| Uninstall Date | uninstall_date |
| — | last_seen_at (set on upsert) |
| — | source_file_id (upload_id) |

---

## 9) Related Docs

- `INGESTION_WORKFLOW.md` — validation, upsert, recompute
- `DATA_MODEL_SPEC.md` — `charges_raw` and canonical tables
