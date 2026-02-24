# Supabase and PostgreSQL: Decisions, Patterns, and How We Manage Layers

This article documents how we use **Supabase** (PostgreSQL) in MarketBuzz Compass: the decisions we made, the patterns we follow, how data layers are structured, and how **RLS** (Row Level Security) plus **anon** vs **service_role** keys fit into the architecture. If you’re building an internal app with a backend API and want a clear split between “raw” and “canonical” data, this setup is a good reference.

---

## 1. Why Supabase and PostgreSQL

We needed:

- **PostgreSQL** – Strong indexing for month/app/merchant filters, pagination, and joins. Fits our canonical monthly tables and lifecycle logic.
- **Hosted Postgres** – Supabase gives us a managed Postgres instance, migrations, and a JS client without running our own DB server.
- **Dev parity** – Same Postgres in dev (Supabase) and optionally in prod (Supabase or RDS). No SQLite-to-Postgres drift.

We use Supabase **only as the database** (and migrations). Auth is **Cognito**, not Supabase Auth. So Supabase keys and RLS are about **who can talk to the database**, not about user login.

---

## 2. Key Decisions Summary

| Decision | Choice | Why |
|----------|--------|-----|
| **Database** | PostgreSQL via Supabase | Indexing, pagination, migrations, hosted. |
| **Auth** | Cognito, not Supabase Auth | We already use Cognito for Hosted UI and JWT; RLS doesn’t use `auth.uid()`. |
| **Who talks to Supabase?** | **Only the backend API** | Frontend never uses Supabase client; all requests go through Fastify. |
| **Which key in the API?** | **service_role** | Backend needs full access; we enforce permissions in API middleware (JWT + RBAC). |
| **RLS** | **Tripwire: enabled + deny-all for anon** | If someone later uses the anon key against our tables, they get no rows. service_role bypasses RLS. |
| **Data layers** | Raw (internal) vs canonical (UI/Nova) | UI and agent never see `charges_raw`; they only see materialized/canonical tables. |

---

## 3. Anon Key vs Service Role Key

Supabase gives two API keys for the same Postgres project:

| Key | Name in dashboard | Purpose | RLS |
|-----|-------------------|---------|-----|
| **anon (public)** | “anon” / “public” | Frontend or other public clients | **Applied** – only rows allowed by RLS policies are visible. |
| **service_role** | “service_role” | Backend, scripts, admin only | **Bypassed** – full read/write to all tables. |

- **anon** – Safe to expose in frontend code (e.g. browser). RLS policies limit what that key can do. We don’t use it in our app because the frontend doesn’t talk to Supabase.
- **service_role** – Must **never** be in the frontend or in public repos. Stored only in server `.env`. Our Fastify API uses this key so it can read/write everything; authorization is enforced in the API (JWT + Admin/Viewer), not in the DB.

**In our app:**  
Config prefers `SUPABASE_SERVICE_ROLE_KEY` and falls back to `SUPABASE_ANON_KEY` only so the app can start if you haven’t set the service key yet. In production we use **service_role** only.

---

## 4. How the Layers Are Managed in the Application

We separate data into layers. **Only the backend** reads/writes Supabase; the frontend and Nova (agent) call the API.

### Layer 0 – Internal only (never exposed to UI or Nova)

- **charges_raw** – Latest snapshot per Clover Charge ID. Written by the ingestion pipeline (UPSERT by charge_id). Used only to recompute canonical tables.

### Layer 1 – Materialized / canonical (UI and Nova)

- **monthly_revenue_lifecycle** – Billed/collected/refunded by month and app.
- **merchant_lifecycle_monthly** – Active / At Risk / Lost by month.
- **nra_monthly**, **nra_merchants_monthly**
- **refund_merchants_monthly**, **uninstall_merchants_monthly**
- **high_risk_churn_merchants**

These are filled by **recompute jobs** (worker) from `charges_raw`. All KPIs and lists the UI and Nova use come from these tables only.

### Layer 2 – Planning

- **package_catalog** – Admin-managed packages.
- **growth_forecast_monthly** – Optional forecasts.

### Layer 3 – Narrative cache

- **monthly_briefs** – Cached Nova output (headline, MoM delta, markdown).

**Pattern:**  
- **Ingestion** writes to `charges_raw` and ingestion_uploads / ingestion_runs.  
- **Worker** recomputes Layer 1 (and optionally 2) from `charges_raw`.  
- **API** serves only Layer 1–3 to the frontend; it never exposes `charges_raw`.  
- **Nova** is allowed to query only canonical tables (Layer 1–3), never raw.

This is enforced by **what the API and Nova code are allowed to query**, not by RLS (because the API uses service_role).

---

## 5. Request Flow: Where the Keys Are Used

```
User (browser) → Cognito login → JWT
       ↓
Frontend sends HTTP request to Fastify API with header: Authorization: Bearer <JWT>
       ↓
API validates JWT (Cognito JWKS), checks cognito:groups (e.g. Admin)
       ↓
API connects to Supabase with service_role key (from .env)
       ↓
Supabase: RLS is bypassed for service_role → API reads/writes tables
       ↓
API returns JSON to frontend
```

The frontend **never** sees Supabase URL or keys. It only knows the API base URL and sends the JWT. So:

- **Auth** = Cognito + API middleware (RBAC).
- **DB access** = API only, with **service_role**.
- **RLS** = Not used for normal API flow; it’s a safety net if anon is ever used against these tables.

---

## 6. RLS: What We Use It For (Tripwire)

We use RLS as a **tripwire**, not as the main authorization mechanism.

- **RLS** in Postgres/Supabase controls what rows a **given key** can read or write. With the **anon** key, RLS policies are evaluated; with **service_role**, they are **bypassed**.
- We don’t use Supabase Auth, so we don’t have `auth.uid()` in RLS. All access goes through the API with service_role, so RLS doesn’t restrict the API.

**What we did:**  
We enabled RLS on every internal table and added a **deny-all** policy for anon/authenticated, e.g.:

```sql
ALTER TABLE charges_raw ENABLE ROW LEVEL SECURITY;
CREATE POLICY "charges_raw_tripwire" ON charges_raw FOR ALL USING (false);
```

So:

- **service_role** – Unchanged; full access (RLS bypassed).
- **anon** (or any key that respects RLS) – Gets no rows from these tables.

**Why:**  
If someone later adds a Supabase client in the frontend (or a script) using the **anon** key, they still can’t read or write our data. It’s a cheap guardrail. The **real** security is: “Don’t expose service_role; enforce JWT + RBAC in the API; don’t expose raw tables.”

---

## 7. What RLS Protects vs What It Doesn’t

| RLS protects against | How |
|----------------------|-----|
| Direct Supabase client usage with anon key | Deny-all policies return no rows. |
| Accidental future use of anon against these tables | Same; tripwire catches it. |

| RLS does **not** protect against | Reason |
|----------------------------------|--------|
| API bugs (wrong filters, IDOR, “return all”) | API uses service_role → RLS is bypassed. |
| Leaky or misconfigured API routes | Same. |
| Anyone with service_role | They have full DB access. |

So: **API is the main security boundary.** RLS is a secondary guard for anon-only access.

---

## 8. Patterns We Follow

### Single DB client in the backend

- One Supabase client per process, created with **service_role**.
- Config: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (from `.env` at monorepo root).
- We load `.env` from the repo root so the API and any workers share the same env.

### Config and keys

- **Backend** – Reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (fallback to anon only for local convenience). Never send service_role to the client.
- **Frontend** – No Supabase URL or keys; only API base URL and Cognito config for login.

### Migrations

- All schema changes are in **Supabase migrations** under `supabase/migrations/`.
- Tables first (charges_raw, ingestion_uploads, ingestion_runs, canonical tables, monthly_briefs, etc.), then one migration that enables RLS and creates the tripwire policies on all of them.

### Query discipline

- **Ingestion / worker** – Write to `charges_raw` and ingestion_*; recompute Layer 1 (and optionally 2) from `charges_raw`.
- **API** – Read/write only Layer 1–3; never expose `charges_raw`.
- **Nova** – Same; only canonical tables. No raw CSV or charges_raw.

---

## 9. Quick Reference

| Topic | Our choice |
|-------|------------|
| Database | PostgreSQL (Supabase in dev) |
| Auth | Cognito (not Supabase Auth) |
| Frontend → DB | No direct Supabase; frontend → API only |
| API → DB | Supabase JS client with **service_role** |
| RLS | Enabled; deny-all (tripwire) for anon |
| Anon key | Not used in app; safe to publish, RLS would restrict it |
| Service key | Backend only, `.env`, never in client |
| Data layers | Layer 0 raw (internal), 1–3 canonical (UI + Nova) |

---

## 10. Related Code and Docs

- **Backend DB client** – `apps/api/src/db.ts`: single `createClient(url, key)` with config from `.env`.
- **Config** – `apps/api/src/config.ts`: `supabaseUrl`, `supabaseKey` (service_role preferred).
- **RLS migration** – `supabase/migrations/20240207000009_enable_rls_tripwire.sql`.
- **Decisions doc** – `docs/progressql_supabase_rsl_decisions.md`.
- **Data model** – `docs/DATA_MODEL_SPEC.md` (tables and layers).

---

*Documented from the MarketBuzz Compass project. You can reuse this pattern for any app where the API is the only consumer of the database and you want a clear split between raw and canonical data plus a low-cost RLS tripwire.*
