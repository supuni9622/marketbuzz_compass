Cognito setup (recommended)
1) User Pool (authentication)
Email + password sign-in

Require email verification

Enable MFA optional (or enforced for Admins only)

Password policy: strong (Cognito defaults are fine)

2) App client
Use Hosted UI (fastest, safest) or direct auth via SDK

For a web UI (Next.js), Hosted UI is the simplest and secure.

3) Identity Pool (optional)
Only needed if the frontend directly accesses AWS resources (S3 uploads, etc.).

If uploads go through your backend API, you can skip Identity Pool.

Roles & permissions (keep it simple)
Use Cognito Groups (best for RBAC):

Groups
Admin

upload CSV / PDF knowledge packs

manage packages catalog

view everything

Viewer

view dashboards, lists, growth plans, chat

no uploads, no config changes

How it maps in the app
Backend verifies JWT

Reads cognito:groups claim

Enforces authorization in API routes

Web app flow (what users experience)
Visit MarketBuzz URL

Redirect to Cognito login (Hosted UI)

On success, Cognito returns tokens

Frontend stores token securely (httpOnly cookie via backend session is ideal)

All API calls include valid token → backend validates

Backend integration (important)
JWT verification
Backend verifies:

signature using Cognito JWKS

token issuer + audience

expiration

API middleware
requireAuth()

requireGroup("Admin") for admin endpoints

File uploads (CSV/PDF) with Cognito
Two good patterns:

Option A (simpler, recommended)
Frontend uploads to backend API → backend stores to S3.

Easy auditing

No Identity Pool required

Option B (more scalable)
Frontend gets a pre-signed S3 URL from backend and uploads directly.

Still authenticated (backend issues URL only to Admins)

Best for bigger PDFs/CSVs

Either way: Admin-only.

Audit trail (since investors/management will read outputs)
Log:

who uploaded

when

file hash

how many Charge IDs inserted/updated

metrics refresh success/failure

This is huge for trust.

```

User signs in → Cognito returns JWT with cognito:groups
                          ↓
Backend receives request with Authorization: Bearer <JWT>
                          ↓
Auth middleware validates JWT and extracts groups
                          ↓
For /admin/upload/csv → requireAdmin hook checks groups.includes("Admin")
   - Admin → 200 OK
   - Viewer → 403 Forbidden

```