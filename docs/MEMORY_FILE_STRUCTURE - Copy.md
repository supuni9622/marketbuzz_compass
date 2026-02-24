Memory file templates (ready-to-create)

Use this structure in S3 (or repo) exactly:

/memory
  /definitions
    metrics.md
    lifecycle.md
    growth.md
    pricing.md
    patterns.md
    guardrails.md
    ux_rules.md

  /apps
    sms_marketing.md
    crm.md
    insight_unlock.md

  /market
    clover_market.md
    verticals.md
    updates.md

  /playbooks
    retention.md
    refunds.md
    winback.md

  /briefs
    2025-11.md
    2025-12.md
    2026-01.md
    ...

  /admin
    context.md
    change_log.md

Template: /memory/definitions/metrics.md

Purpose: lock metric meanings and UI rules

# Metrics Definitions (Locked)

## Gross Billed Amount (BASELINE)
Definition:
- Sum of all charge amounts where charge_month == M
Notes:
- Derived from charge_date month, not status
- Used for growth targets

## Collected Amount
Definition:
- Sum where status_current in (COLLECTED, DEPOSITED). BILLED and ONHOLD are not collected; they are tracked separately for future calculations.

## Deposited Amount
Definition:
- Sum where status_current == DEPOSITED

## Refunded Amount
Definition:
- Sum where status_current == REFUND (fallback: amount < 0)

## Charge status values (for calculations)
- BILLED, ONHOLD, COLLECTED, DEPOSITED, REFUND, OTHER. ONHOLD = billed but not yet moved to COLLECTED/DEPOSITED.

## Statement Net Revenue (Optional)
Definition:
- gross_billed × 0.70 (if statement logic confirmed)

## Comparison Rules
- MoM compare: previous month by default
- YoY compare: same month last year if available

Template: /memory/definitions/lifecycle.md

# Lifecycle Definitions (Locked)

## Charge lifecycle (snapshot)
- Clover export is a snapshot of current status for a Charge ID.

## Merchant lifecycle
Active:
- billed exists for month M

At Risk:
- billed exists in month M-1 but not M

Lost:
- not billed in M and not billed in M-1
- includes refunded/uninstalled cases

Recovered:
- At Risk in M-1 and Active in M
(Currently may be empty; do not hide.)

High-risk churn:
- Refunded ∩ Uninstalled ∩ Lost


Template: /memory/apps/sms_marketing.md

# App: SMS Marketing

## Positioning
Short description.

## Typical merchant types
(e.g., restaurants, salons)

## Known pricing/tier behavior
- sticky tiers
- common downgrade triggers

## Known churn signals
- refunds followed by uninstall
- missing billing rarely recovers

Template: /memory/definitions/growth.md

# Growth Planning Rules

Baseline metric:
- Gross Billed Amount

Target:
- baseline × (1 + growth%)

Projection:
- renewals + expected_NRA - expected_churn

Lever priority:
1) Retention
2) Expansion
3) Win-back
4) Acquisition (NRA)

Defaults (conservative):
- save_rate: 0.5
- winback_rate: 0.1
- upgrade_rate: 0.15
- renewal_rate fallback: 0.9

Template: /memory/playbooks/retention.md

# Retention Playbook (At Risk)

## Goal
Save merchants before they become Lost.

## Suggested steps
1) Identify At Risk list
2) Prioritize by last billed amount + tenure
3) Outreach script suggestions
4) Offer type (education, setup help, limited-time credits)
5) Close loop: mark outcome

Template: /memory/briefs/YYYY-MM.md

# Nova Monthly Brief — YYYY-MM

## Headline
- Gross billed: $X (Δ$ / Δ%)

## Drivers
- Driver 1
- Driver 2

## Risks
- At Risk ↑
- Refunds ↑

## Actions
- Save At Risk: <link/list>
- Refund follow-up: <link/list>
- Win-back: <link/list>

## Notes / Observations
- Anything important for future months

Template: /memory/admin/context.md

# Admin Context (Internal)

## Strategic notes
- e.g., “Focus on CRM expansion in Q2”

## Known events
- promotions, outages, pricing tests

## Known data caveats
- export quirks, missing months, etc.

2) Memory versioning + update rules (how to keep this sane)

You want memory to be:

editable

auditable

safe from silent drift

easy to roll back

2.1 Every memory file must have metadata header

All memory markdown files begin with:

---
id: mem-def-metrics
type: definitions
owner: admin|nova
status: active
version: 1
created_at: 2026-02-06
updated_at: 2026-02-06
source: manual|upload|nova_summary|web_update
tags: [metrics, definitions]
---

2.2 Versioning model (recommended)

Use immutable versions + alias pointer:

Immutable file:

/memory/_versions/definitions/metrics/v0001.md

/memory/_versions/definitions/metrics/v0002.md

Active pointer file (small):

/memory/definitions/metrics.md

contains only a pointer to latest version (or is a copy of latest)

This allows:

safe rollback

diffing

“who changed what”

2.3 Change log (mandatory)

Append-only log:

📁 /memory/admin/change_log.md

Each change entry:

timestamp

who (admin email or “nova”)

file id

what changed

why

2.4 Guardrails for updates
What Admin can change

packages/pricing context

market/vertical notes

playbooks

strategic context

UX rules

What only Admin should change (locked)

definitions: metrics + lifecycle
Nova may propose edits, but cannot directly change these unless you allow it.

What Nova can write freely

monthly briefs (/memory/briefs)

pattern observations (patterns.md as “candidate notes” section)

summaries of uploaded documents

3) How Nova decides what memory to load per task
3.1 Memory loading is “task-based”, not global

Nova should never load everything; it should load by routing.

Task router categories

Monthly Brief generation

Revenue explanation

Merchant lifecycle / churn

NRA / acquisition

Growth planning

Market context question

Admin/config question

3.2 Memory bundles per task (exact)
A) Proactive Monthly Brief

Load:

/definitions/metrics.md

/definitions/lifecycle.md

/definitions/patterns.md

last 2–3 briefs: /briefs/YYYY-MM.md

relevant playbooks:

/playbooks/retention.md

/playbooks/refunds.md

/playbooks/winback.md

/admin/context.md

B) Churn or lifecycle question

Load:

/definitions/lifecycle.md

/definitions/patterns.md

/playbooks/retention.md (if At Risk)

/playbooks/winback.md (if Lost)

last 1–2 briefs (context)

C) Growth plan

Load:

/definitions/growth.md

/definitions/pricing.md

/apps/*.md (only for app(s) in scope)

/definitions/patterns.md

last 2 briefs (for trend context)

D) Market / vertical behavior question

Load:

/market/clover_market.md

/market/verticals.md

/market/updates.md (if exists)

/admin/context.md (if strategy-linked)

E) Admin asks to change rules

Load:

/definitions/guardrails.md

/admin/change_log.md

✅ The correct mechanism: memory_index.json (registry)

Add a single registry file:

📁 /memory/memory_index.json

It lists every “known” memory item:

{
  "items": [
    {
      "id": "mem-def-metrics",
      "path": "/memory/definitions/metrics.md",
      "type": "definitions",
      "tags": ["metrics", "baseline", "comparison"],
      "owner": "admin",
      "status": "active",
      "version": 2,
      "updated_at": "2026-02-06"
    }
  ]
}

How a new file gets added (Admin flow)

Admin uploads/creates a memory file in Admin UI

Backend stores it in S3 under:

/memory/<category>/<name>.md and /memory/_versions/...

Backend updates memory_index.json (append new item)

Backend writes to /memory/admin/change_log.md

Nova can now discover it by:

reading memory_index.json

selecting by type/tags

How a new file gets added (Nova flow)

Nova should not silently add knowledge as “facts”.
So we do:
Nova can create:

candidate notes

summaries

drafts

Stored under a special folder:

📁 /memory/_drafts/

Example:

/memory/_drafts/market_update_2026-02.md

Then:

Nova writes draft + adds it to registry with status: "draft"

Admin reviews in Admin UI

Admin approves → system promotes draft to active

Change log records the approval

This prevents “AI wrote a rule and it became policy” mistakes.

Implementation requirements (minimal)

To make this work, you need 3 small APIs:

GET /memory/index → returns memory_index.json

POST /admin/memory/upload → store file + update index + change log

POST /admin/memory/approve → promote draft to active

Nova tools:

list_memory_items(tags|type)

read_memory(path)

write_memory_draft(path, content) (draft-only)

Final: Quick rules to keep memory trustworthy

DB is truth for numbers

Memory is truth for definitions and narratives

Nova writes drafts; Admin approves permanent rules

Everything is versioned + logged