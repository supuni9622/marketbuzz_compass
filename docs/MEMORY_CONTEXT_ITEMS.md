Memory Context Items — Nova (MarketBuzz Compass)
1️⃣ Metric & Business Definitions (Foundational)

These must never drift.

Gross Billed Amount (baseline growth metric)

Collected Amount

Deposited Amount

Refunded Amount

Statement Net Revenue (e.g., 70% share)

Billing month definition (1st of month rule)

Charge lifecycle semantics (snapshot vs event)

NRA (New Revenue Added) definition

MoM comparison rules

YoY comparison rules

Currency rules

Rounding rules

📁 /memory/definitions/metrics.md

2️⃣ Merchant Lifecycle Logic

Used constantly by Nova.

Active definition

At Risk definition

Lost definition

Recovered definition (At Risk → Active)

High-risk churn definition (Refund ∩ Uninstall ∩ Lost)

How refunds affect lifecycle

How uninstall dates affect lifecycle

Edge cases (paused billing, delayed deposit)

📁 /memory/definitions/lifecycle.md

3️⃣ App Knowledge (MarketBuzz Suite)

One file per app.

For each app:

App purpose & positioning

Target merchant types

Typical pricing sensitivity

Known churn patterns

Sticky vs non-sticky plans

Known seasonality signals

Historical behavior notes

Examples:
📁 /memory/apps/sms_marketing.md
📁 /memory/apps/crm.md
📁 /memory/apps/insight_unlock.md

4️⃣ Subscription & Pricing Context

Used for growth planning.

Package catalog (high-level explanation, not raw prices)

Entry-level vs premium plans

Typical upgrade paths

Common downgrade triggers

Pricing psychology notes

Which plans drive retention vs expansion

📁 /memory/definitions/pricing.md

5️⃣ Growth Planning Assumptions

These guide Nova’s math explanations.

Default renewal rates

Default save rates (At Risk)

Default win-back rates

Default upgrade conversion rates

Conservative vs optimistic thresholds

When Nova should warn that a target is unrealistic

📁 /memory/definitions/growth.md

6️⃣ Market & Industry Context (Clover-specific)

This gives Nova real-world awareness.

What Clover marketplace is

SMB merchant behavior patterns

Common verticals:

salons

barbers

small retail

vape shops

bakeries

Seasonality patterns by vertical

Macroeconomic sensitivity notes (high-level)

Known Clover billing quirks

📁 /memory/market/clover_market.md
📁 /memory/market/verticals.md

7️⃣ Playbooks (Action Intelligence)

Used in “What to do next”.

Retention playbooks

At Risk outreach guidance

Timing recommendations

Messaging tone (non-salesy vs salesy)

When to escalate

📁 /memory/playbooks/retention.md

Refund playbooks

Refund follow-up guidance

Common refund causes

Recovery likelihood

📁 /memory/playbooks/refunds.md

Win-back playbooks

Lost merchant outreach

Time windows for win-back

Signals when win-back is unlikely

📁 /memory/playbooks/winback.md

8️⃣ Historical Monthly Briefs (Narrative Memory)

This is critical for Nova’s context awareness.

For each month:

Headline summary

Key drivers

Warnings issued

Actions recommended

Outcomes observed later

📁 /memory/briefs/2025-11.md
📁 /memory/briefs/2025-12.md
📁 /memory/briefs/2026-01.md

Nova uses these to say:

“Last month I warned that At Risk was rising — this month Lost increased.”

9️⃣ Known Patterns & Heuristics

Accumulated intelligence over time.

“Refund spike usually precedes uninstall”

“VIP plan churn is rare but high impact”

“Unlock app churn often lags SMS churn”

“Growth driven by expansion is more stable than NRA”

📁 /memory/definitions/patterns.md

🔟 System Constraints & Guardrails

To keep Nova honest.

What Nova is allowed to say

What Nova must not infer

When Nova must say “I don’t know”

Evidence citation rules

Role-based limitations (Viewer vs Admin)

📁 /memory/definitions/guardrails.md

1️⃣1️⃣ Admin-Provided Context (Uploadable)

Manually maintained but long-lived.

Internal notes from leadership

Strategic goals (e.g., “Focus on SMS in Q2”)

Pricing experiments context

One-off events (promotions, outages)

📁 /memory/admin/context.md

1️⃣2️⃣ UI & Communication Rules (Optional but Useful)

Keeps Nova aligned with UX.

Tone guidelines

Length limits for summaries

When to suggest drill-down vs stop

When to suggest growth planning

📁 /memory/definitions/ux_rules.md

🧠 Summary: Why this matters

With this memory set:

Nova becomes consistent over months

Insights don’t contradict past statements

Growth plans feel grounded

Teams trust the system

You avoid “AI amnesia”

This is the difference between:

“a smart dashboard”
and
“an internal analyst that knows your business”