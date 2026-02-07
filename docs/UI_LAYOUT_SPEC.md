UI_LAYOUT_SPEC.md — MarketBuzz (Phase-1)
0) Goal

A storytelling monthly brief that:

shows Gross Billed growth clearly (MoM/YoY)

surfaces merchant actions (At Risk, Lost, Refunded, Uninstalled)

supports year/month filters, comparisons, pagination

includes Next Month Growth Plan generator (target % → plan)

Rule: Agent narrates → charts prove → tables enable action.

1) Global UX Rules
1.1 Global Filters (sticky top bar)

Shown on every page/section.

Year (dropdown)

Month (dropdown)

Compare To (dropdown)

default: Previous Month

options: Same Month Last Year (enabled only if data exists), Custom Month

App (dropdown)

default: All Apps

options: SMS Marketing, Small Business CRM, Insight Unlock

Reset button

Last Updated timestamp (from ingestion run)

All charts/tables use these filters unless explicitly overridden.

1.2 Comparison Fields (always shown)

Every KPI, chart tooltip, and table header should support:

current value

compare value

Δ absolute

Δ %

1.3 Pagination

All merchant lists must support server-side pagination:

default page size: 25

options: 25 / 50 / 100

controls: next/prev, page number, total count

search + filters must preserve pagination state

1.4 Exports

Every table view must offer:

Export CSV (current filters + current sort)

Copy link (deep link to filtered state)

1.5 Trust (“show receipts”)

Any agent insight must have a “Show evidence” link that scrolls/highlights the exact chart/table that supports it.

2) App Shell & Navigation
2.1 Primary nav (left sidebar or top tabs)

Monthly Brief (default landing)

Merchants

Revenue

Growth Plan

Ask MarketBuzz

Admin (restricted)

(We keep it minimal. Monthly Brief is the main storytelling hub.)

3) Page: Monthly Brief (Primary Story)
3.1 Section A — Headline (no charts/tables)

Components

Title: MarketBuzz Monthly Brief — {Month Year}

KPI Strip (3 items, large numbers):

Gross Billed (Total) (baseline growth metric)

Active Merchants

Refunded Amount

Each KPI shows: value + Δ + Δ%.

Agent Narrative Block (Avatar + text)

4–8 bullets max:

what changed (2 bullets)

why likely (2 bullets)

what to do (2–3 bullets)

Buttons:

Show evidence

Generate growth plan (jumps to Growth Plan section with same month context)

Data

monthly_kpis(month, compare_month, app)

3.2 Section B — Scorecards (mini charts)

4 interactive cards (click expands Section C):

Gross Billed

Merchant Lifecycle (Active / At Risk / Lost)

NRA (New Revenue Added)

Refunds & Uninstalls

Each card includes

Big value + Δ + Δ%

Sparkline (last 6–12 months)

Buttons:

Explain (agent mini explanation tooltip)

Breakdown (expand to Section C)

Show list (jump to relevant table section)

Charts

Sparkline line chart (no legend)

Hover tooltip shows month + value

Data

trend_series(metric, months_back, app)

lifecycle_counts(month, compare_month, app)

nra_summary(month, compare_month, app)

refund_uninstall_summary(month, compare_month, app)

3.3 Section C — What Changed (Evidence Zone)

This section expands contextually based on which scorecard user interacted with.

C1: Gross Billed Evidence

Charts

Line: Gross Billed — last 12 months

Bar: Gross Billed by App — current vs compare

Stacked Bar: Gross Billed by Tier/Plan (if plan mapping exists)

Tables

“Top Movers (Apps)” small table:

App, Current, Compare, Δ, Δ%

Data

gross_billed_trend(12m)

gross_billed_by_app(month, compare_month)

gross_billed_by_plan(month, compare_month) (optional if plan mapping)

C2: Merchant Lifecycle Evidence

Charts

Bar: Active / At Risk / Lost — current vs compare

Line: At Risk trend — last 6 months

Tables (buttons open)

View At Risk list (goes to Merchants page, prefiltered)

View Lost list

Data

merchant_lifecycle_counts(month, compare_month, app)

merchant_lifecycle_trend(state="At Risk", 6m)

C3: NRA Evidence

Charts

Bar: NRA Amount by App — current vs compare

Line: NRA Amount trend — last 12 months

Tables

NRA Merchants (paginated):

Merchant Name, Merchant ID, App, Amount, Charge Date

Data

nra_amount_by_app(month, compare_month)

nra_trend(12m)

nra_merchants(month, app, page)

C4: Refunds & Uninstalls Evidence

Charts

Bar: Refund Amount by App — current vs compare

Bar: Uninstalls by App — current vs compare

Line: Refund trend — last 12 months

Tables

Refunded merchants (paginated)

Uninstalled merchants (paginated)

High-risk churn table (intersection) (paginated)

Data

refunds_by_app(month, compare_month)

uninstalls_by_app(month, compare_month)

refund_trend(12m)

refund_merchants(month, page)

uninstall_merchants(month, page)

high_risk_churn(month_range?, page) (supports month filter)

3.4 Section D — Action Center (Tables-first)

Three action panels with tables and a small “impact” counter.

D1: Save At Risk

Table (paginated)

Merchant Name

Merchant ID

App

Last Billed Month

Last Billed Amount (if available)

Notes/Reason (derived: “missed current month” / “refund activity” / “uninstall flag”)

Buttons:

Export list

“Open Merchant” drawer

Data

at_risk_merchants(month, app, page)

D2: Follow-up Refunds

Table (paginated)

Merchant Name

App

Refund Amount

Refund Month

Charge ID (hidden by default, expandable)

Suggested next step (from playbook)

Data

refund_merchants(month, app, page)

D3: Win-back Lost

Table (paginated)

Merchant Name

App

Last Active Month

Suggested reason tag (from rules/heuristics)

Suggested outreach template link (from playbook)

Data

lost_merchants(month, app, page)

3.5 Section E — App Health (3 App Tabs)

Tabs: SMS Marketing / CRM / Insight Unlock / All Apps

Each tab shows:

Charts

Line: Gross billed (12m) for this app

Bar: Lifecycle counts (Active/AtRisk/Lost) current vs compare

Bar/Stacked: Plan mix (if available)

Optional: Refund rate trend

Tables

Top merchants by billed amount (paginated)

Lost merchants this month (paginated)

Refunds this month (paginated)

Data

app-filtered versions of metrics endpoints

4) Page: Merchants (Deep Dive)

Used when user wants lists; still story-friendly.

4.1 Sub-tabs

Lifecycle

NRA

Refunds

Uninstalls

High-risk churn

Each tab is basically the table + filters + pagination + export.

Merchant Detail Drawer (click any merchant)

Shows:

Merchant name + ID

Apps subscribed

Billing timeline (last 6 months)

Status snapshot per month

Flags: refunded/uninstalled

Actions: copy ID, open in internal tools (Phase-2 integration)

5) Page: Revenue (Finance-friendly, still simple)
5.1 Revenue Lifecycle (gross billed baseline)

Charts

Line: Gross billed (12m)

Bar: By app current vs compare

5.2 Cash Reality

Charts

Collected vs Deposited vs Refunded (current vs compare)

Trend of Deposited (12m)

5.3 Statement Net (70% view)

If statement/net is supported (manual upload in Admin):

Line: Net revenue trend

Table: Month, Gross, Net (70%), Δ

6) Page: Growth Plan (Next Month Target)
6.1 Wizard (single flow)

Step 1: “Last month gross billed was $X.”
Step 2: Input target growth % (buttons + custom)
Step 3: Output target & plan

Inputs

Growth %

Optional constraints:

prioritize a specific app (optional)

“avoid discounts” toggle (optional)

“only retention” toggle (optional)

Outputs

Target billed $ for next month

Forecast billed $ (baseline)

Gap $ to close

Charts

Line: last 6 months + next month target marker

Waterfall: baseline → levers → target

Tables (paginated)

Retention candidates (At Risk / early warning)

Expansion candidates (upgrade candidates if plan mapping exists)

Win-back candidates (Lost list)

NRA needed by package (computed counts per tier)

Data

growth_target(last_month, growth_pct)

forecast_next_month(last_month, app?)

growth_lever_plan(last_month, growth_pct, constraints)

packages_catalog() (admin-managed)

7) Page: Ask MarketBuzz (Chat)

Chat UI + “Quick questions” buttons.

Must support

“Why did revenue change?”

“Who are At Risk merchants this month?”

“Generate 10% growth plan”

“Show NRA merchants for Unlock”

Guardrails

Answers must cite:

KPI values used

the list/table source

Provide buttons:

“Open table”

“Apply filters”

8) Page: Admin (Phase-1)

Restricted to admins.

8.1 Uploads

Upload Clover CSV (last 3 months)

shows: rows processed, new vs updated Charge IDs, duplicates avoided

Upload knowledge pack (PDF/CSV/Excel)

tags: market, pricing, playbook, apps

Upload statement net data (optional)

month, gross, net, notes

8.2 App & Package Catalog

Manage apps (names, IDs, descriptions)

Manage packages (tiers, prices, mapping rules)

Mapping rules: plan names in CSV → internal plan IDs

8.3 Web Updates (optional Phase-1.5)

Button: “Fetch market update”

Stores summary + sources in knowledge store

9) Chart Types (standardized)

Line: trends (6–12 months)

Bar: comparisons current vs compare (by app, by state)

Stacked bar: plan mix

Waterfall: growth plan levers

Sparkline: scorecards only

No chart clutter. One purpose per chart.

10) Table Schemas (standardized)
10.1 At Risk Table

merchant_name

merchant_id

app_name

last_billed_month

last_billed_amount (optional)

flags: refunded?, uninstalled?

recommended_action (string)

10.2 Lost Table

merchant_name

merchant_id

app_name

last_active_month

last_amount (optional)

reason_tag (heuristic)

recommended_action

10.3 Refunds Table

merchant_name

merchant_id

app_name

refund_month

refund_amount

charge_id (hidden)

notes

10.4 Uninstalls Table

merchant_name

merchant_id

app_name

uninstall_month

uninstall_date

10.5 NRA Table

merchant_name

merchant_id

app_name

charge_month

amount

All tables must support:

search by merchant name/id

sort by amount, name, app

pagination + export

11) Empty States (important)

“No data for this month yet”

show last available month + prompt to upload

“No recovered merchants”

show “0 recovered” with explanation (don’t hide it)

Missing plan mapping

hide plan mix charts and show admin prompt: “Upload package mapping”

12) Performance Notes

All aggregations should be precomputed (materialized monthly tables)

Lists should be query-indexed by:

month, app_name, lifecycle_state

Use server-side pagination always

13) Deep-linking

Every view has a URL state:

/brief?year=2026&month=02&compare=2026-01&app=All

/merchants?month=2026-02&state=AtRisk&app=SMS&page=2

Agent “Show list” buttons route using these links.

14) Minimal Build Order (Phase-1)

Monthly Brief page skeleton + filters

Gross billed + lifecycle counts + MoM compare

Action Center tables (At Risk, Lost, Refunds, Uninstalls)

App tabs

Growth Plan wizard

Ask MarketBuzz chat

Admin uploads + package catalog

15) Authentication & Authorization (AWS Cognito)
15.1 Authentication Provider

AWS Cognito User Pool is the single authentication mechanism

Login method:

Email + password

Email verification required

MFA:

Optional by default

Recommended: enforced for Admin group

Authentication happens before any UI is rendered.

15.2 User Roles (Cognito Groups)

Authorization is handled via Cognito Groups, passed in JWT claims.

Supported Groups
🛠️ Admin

Access:

All pages

Admin page

CSV uploads (Clover exports)

Knowledge uploads (PDF / CSV / Excel)

App & package catalog management

Market knowledge updates

👀 Viewer

Access:

Monthly Brief

Revenue

Merchants

Growth Plan

Ask MarketBuzz

Restrictions:

No uploads

No configuration changes

No admin controls visible in UI

15.3 UI Behavior Based on Role
Navigation visibility

Admin tab

Visible only if user belongs to Admin group

All other tabs visible to both Admin and Viewer

Action controls

Upload buttons (CSV / PDF / Excel):

Rendered only for Admin

Growth plan generation:

Available to both (read-only for Viewer; no config persistence)

15.4 Login Flow (Web UI)

User accesses MarketBuzz URL

If unauthenticated:

Redirect to Cognito Hosted UI

After successful login:

Redirect back to MarketBuzz

Tokens issued:

ID token

Access token

Frontend establishes authenticated session (recommended via backend-set httpOnly cookie)

Token refresh handled automatically via Cognito SDK / Hosted UI flow.

15.5 Authorization Enforcement (Backend Required)

All API requests must:

Validate Cognito JWT

Verify:

issuer

audience

expiry

Extract:

sub (user id)

email

cognito:groups

Backend must enforce:

Admin group for:

/admin/*

/uploads/*

/catalog/*

Viewer access otherwise

UI checks are convenience only — backend enforcement is mandatory.

15.6 Audit & Transparency (Strongly Recommended)

For every privileged action (Admin only), system must record:

Field	Description
user_id	Cognito sub
email	User email
action	upload_csv / upload_pdf / update_packages
timestamp	UTC
file_name	if applicable
file_hash	SHA256
result	success / failure
rows_processed	CSV only
new_charge_ids	CSV only
updated_charge_ids	CSV only

Audit logs must be viewable in Admin UI (read-only table).

15.7 Error & Empty States (Auth-related)

Unauthenticated

Redirect to login

Unauthorized (Viewer accessing Admin URL)

Show friendly “You don’t have access” screen

Session expired

Silent re-auth via Cognito

Fallback: redirect to login

15.8 Future-Proofing (Phase-2 ready)

The auth model must support:

Adding more groups later (e.g., Sales, Finance)

Restricting certain merchant data if needed

Integrating SSO (OIDC/SAML) without UI redesign

Key Design Principle (important)

Authentication protects access.
Authorization controls actions.
The story remains the same for everyone.

No conditional narratives.
No fragmented UX.