# GROWTH_PLANNING_SPEC.md — MarketBuzz Compass

## Purpose

This document defines the **mathematical model, assumptions, and outputs** for
**Next Month Growth Planning** in MarketBuzz Compass, powered by **Nova**.

The goal is to:
- turn a growth % into a concrete revenue target
- estimate a realistic baseline forecast
- compute the revenue gap
- produce an actionable, explainable plan using known levers

This is **decision planning**, not forecasting theater.

---

## Locked Baseline

- **Growth metric:** Gross Billed Amount
- **Anchor month:** Last fully available month
- **Granularity:** Monthly
- **Currency:** USD (or Clover account currency)

Nova must always state which month is used as baseline.

---

## Core Inputs

### Required
- `baseline_month` (e.g. 2026-02)
- `baseline_gross_billed`
- `target_growth_pct` (e.g. 10%)

### Optional Constraints (Phase-1 supported)
- `app_focus` (All / SMS / CRM / Unlock)
- `lever_focus` (Retention / Expansion / Win-back / Acquisition)
- `exclude_discounts` (boolean)

---

## Step 1 — Compute Target Revenue

```text
target_billed =
  baseline_gross_billed × (1 + target_growth_pct / 100)

Example

Baseline (Feb): $100,000

Target growth: 10%

→ Target = $110,000

Nova must display:

baseline

target

absolute increase required

Step 2 — Baseline Forecast (No-Intervention)

Nova must estimate what happens if nothing changes.

Forecast components
projected_next_month =
  expected_renewals
+ expected_NRA
- expected_churn

2.1 Expected Renewals
expected_renewals =
  sum(last_month_active_merchants × avg_billed_amount)
  × historical_renewal_rate


Renewal rate derived from last 2–3 months

Computed per app, then summed

If insufficient history → use conservative default (e.g. 90%)

2.2 Expected NRA (New Revenue Added)
expected_NRA =
  avg(NRA_amount over last N months)


N default = 3 months

Computed per app

If zero history → default to 0

2.3 Expected Churn / Refund Impact
expected_churn =
  avg(churned_amount over last N months)


Churn inferred from Lost merchants + refunds

Refunds reduce billed projection directly

2.4 Final Baseline Projection
projected_next_month =
  renewals + NRA - churn


Nova must show:

projected amount

confidence level (High / Medium / Low)

Step 3 — Revenue Gap
gap_to_close =
  target_billed - projected_next_month


If gap ≤ 0:

Nova must state:

“Based on current trends, the target is achievable without additional intervention.”

Else:

Move to lever planning

Step 4 — Growth Levers (Ordered by ROI)

Nova must attempt to close the gap using levers in this order unless constrained:

Retention (Save At Risk)

Expansion (Upgrades / Higher tiers)

Win-back Lost

Acquisition (NRA)

Lever 1 — Retention (Save At Risk)
Available Revenue
retention_potential =
  sum(last_billed_amount of AtRisk merchants)

Expected Capture
retention_capture =
  retention_potential × historical_save_rate


Default save rate: 40–60% (configurable)

Computed per app if possible

Contribution
retention_contribution =
  min(retention_capture, gap_remaining)


Nova must:

list target merchants

state assumptions

show expected contribution

Lever 2 — Expansion (Upgrades)
Upgrade Candidates

Merchants who:

billed last month

are on lower tiers

have stable renewal history

Revenue Delta
upgrade_delta =
  target_plan_price - current_plan_price

Contribution
expansion_contribution =
  sum(upgrade_delta × expected_conversion_rate)


Default conversion rate: conservative (e.g. 10–20%)

Uses package_catalog

Lever 3 — Win-back Lost
Available Revenue
winback_potential =
  sum(last_billed_amount of Lost merchants)

Expected Capture
winback_capture =
  winback_potential × historical_winback_rate


Default winback rate: 5–15%

Lever 4 — Acquisition (NRA)
Remaining Gap
nra_needed = gap_remaining_after_other_levers

Required Merchant Count
required_merchants =
  nra_needed / avg_plan_price


Computed:

per app

per plan/tier

Nova must clearly state:

how many new merchants are required

which plans they need to buy

Step 5 — Final Plan Assembly

Nova outputs:

Summary

Target revenue

Projected baseline

Gap

Overall confidence

Lever Breakdown Table
Lever	Expected Contribution	Confidence
Retention	$X	High
Expansion	$Y	Medium
Win-back	$Z	Low
Acquisition	$W	Medium

Execution Lists

At Risk merchants to contact

Upgrade candidates

Lost merchants to target

Required NRA by plan

Assumptions (Must Be Explicit)

Nova must always list assumptions, e.g.:

renewal rates based on last 3 months

default conversion rates used where history is thin

no price changes unless specified

no external shocks (seasonality, promotions)

Guardrails

Nova must NOT:

overfit past growth spikes

assume perfect execution

exceed historical best performance

hide uncertainty

If the target is unrealistic:

“Given current trends, a 25% growth target is high risk. Here’s what would need to change.”

UI Integration
Required Charts

Line: last 6 months + target marker

Waterfall: baseline → levers → target

Required Tables

Retention candidates

Expansion candidates

Win-back candidates

NRA by plan

Success Criteria

A growth plan is considered good if:

numbers are traceable

assumptions are visible

actions are clear

confidence is realistic

A plan is not judged by optimism.