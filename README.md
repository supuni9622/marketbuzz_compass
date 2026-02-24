# MarketBuzz Compass

An internal revenue intelligence platform for Clover app billing, merchant lifecycle, and growth planning. Central to this system is **Nova**, an AI agent that performs automated financial analysis and interactive troubleshooting.

**Tagline:** Interpret. Guide. Plan. Warn.

## Tech Stack

- **Monorepo:** pnpm workspaces
- **Backend:** Fastify (TypeScript)
- **Frontend:** Next.js 15 (App Router)
- **Database:** Supabase (Postgres)
- **Validation:** Zod
- **API Docs:** Swagger

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase account

### 1. Install

```bash
pnpm install
```

### 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Copy `.env.example` to `.env` in **project root** (required — API loads from monorepo root)
3. Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` from Supabase Dashboard → Project Settings → API
4. Run migrations (Supabase Dashboard → SQL Editor, or use Supabase CLI):

```bash
# Option A: Supabase CLI
pnpm exec supabase db push

# Option B: Run each migration file manually in SQL Editor (in order)
# supabase/migrations/20240207000001 through 20240207000009
```

### 3. Run API

```bash
pnpm dev:api
```

API: http://localhost:3001  
Swagger: http://localhost:3001/docs

### 4. Run Web (optional)

```bash
pnpm dev:web
```

Web: http://localhost:3000

## Project Structure

```
marketbuzz_compass/
├── apps/
│   ├── api/          # Fastify backend
│   └── web/          # Next.js frontend
├── packages/
│   └── shared/       # Types, constants, Zod schemas
├── supabase/
│   └── migrations/   # SQL migrations
└── docs/             # Specs and progress
```

## Docs

- [AGENTS.md](./AGENTS.md) — Project guidelines
- [docs/PROGRESS.md](./docs/PROGRESS.md) — Task tracker & handoff for new context
- [docs/DATA_MODEL_SPEC.md](./docs/DATA_MODEL_SPEC.md) — Data model
- [docs/CLOVER_CSV_SCHEMA.md](./docs/CLOVER_CSV_SCHEMA.md) — Clover CSV input format
