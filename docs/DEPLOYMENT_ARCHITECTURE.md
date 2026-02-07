# DEPLOYMENT_ARCHITECTURE.md — MarketBuzz Compass

## Purpose

This document defines the **deployment architecture** for MarketBuzz Compass:
- secure
- cost-effective
- scalable
- low-maintenance
- Nova-safe (no stale memory, no hallucinations)

The system is optimized for:
- internal usage (1–2 times/month)
- correctness over raw throughput
- explainability and auditability

---

## 1) High-Level Architecture

### Core Services
- Web UI (Next.js)
- Backend API (Node.js / TypeScript)
- Nova Agent Service
- Worker (Ingestion + Recompute)
- Postgres (RDS)
- Redis (optional, for cache)
- S3 (files + memory)
- SQS (jobs)
- Cognito (auth)

---

## 2) Recommended AWS Deployment (Phase-1)

### **Primary Recommendation**
👉 **Serverless-first (Lambda + managed services)**

Why:
- Very low usage frequency
- Predictable workloads
- Minimal ops
- Lowest long-term cost

---

## 3) Component-by-Component Deployment

---

### 3.1 Web UI

**Technology**
- Next.js (App Router)
- Static + Server Components

**Deployment**
- **Vercel** or **AWS Amplify**
- Uses Cognito Hosted UI for auth
- Calls Backend API with JWT

**Why**
- Fast iteration
- No infra maintenance
- Perfect for internal tools

---

### 3.2 Authentication — AWS Cognito

**Components**
- Cognito User Pool
- Cognito Groups:
  - `Admin`
  - `Viewer`

**Flow**
1. User hits UI
2. Redirect → Cognito Hosted UI
3. Cognito issues JWT
4. JWT sent to Backend API

**Security**
- Backend validates JWT via JWKS
- Role enforcement server-side only

---

### 3.3 Backend API

**Technology**
- Node.js + TypeScript
- Framework: Fastify / NestJS (recommended)

**Deployment**
- **AWS Lambda**
- Fronted by **API Gateway (HTTP API)**

**Responsibilities**
- Auth validation
- CSV upload handling
- Query canonical tables
- Memory registry access
- Chat orchestration with Nova
- Growth plan endpoints
- Admin APIs

**Why Lambda**
- Near-zero idle cost
- Scales automatically
- Fits request-driven workload

---

### 3.4 Database — Postgres (RDS)

**Service**
- Amazon RDS (PostgreSQL)

**Instance**
- db.t4g.small (or equivalent)
- Multi-AZ optional (Phase-2)

**Stores**
- charges_raw
- canonical monthly tables
- memory_items / memory_versions / memory_change_log
- ingestion logs
- cached monthly briefs
- package catalog

**Why RDS**
- Strong consistency
- SQL fits lifecycle queries
- Easy Phase-2 expansion

---

### 3.5 Object Storage — S3

**Buckets**
1. `marketbuzz-compass-uploads`
   - Clover CSVs
   - Uploaded PDFs/CSVs
2. `marketbuzz-compass-memory`
   - Memory markdown files
   - Versioned content

**Access**
- Private buckets
- Backend + Nova IAM roles only

---

### 3.6 Job Queue — SQS

**Queue**
- `compass-ingestion-jobs`

**Used for**
- CSV recompute jobs
- Memory regeneration
- Nova proactive brief trigger

**Why SQS**
- Simple
- Reliable
- Decouples upload from heavy compute

---

### 3.7 Worker Service (Ingestion + Recompute)

**Technology**
- Node.js (same codebase as API, different handler)

**Deployment**
- **AWS Lambda triggered by SQS**

**Responsibilities**
- Parse CSV
- Normalize data
- UPSERT into `charges_raw`
- Recompute monthly materialized tables
- Trigger Nova proactive mode
- Write ingestion audit records

**Why Lambda**
- Runs only when jobs exist
- No idle cost
- Naturally parallel per upload

---

### 3.8 Nova Agent Service

**Technology**
- Node.js / TypeScript
- LLM provider (OpenAI / Anthropic / internal)

**Deployment (Phase-1)**
- **AWS Lambda**
- Invoked by:
  - Worker (proactive)
  - Backend API (reactive chat)

**Responsibilities**
- Memory loading (DB + S3)
- Cache-safe reasoning
- Monthly brief generation
- Growth plan reasoning
- Evidence linking

**Memory Safety**
- Reads only approved memory
- Draft memory only when explicitly requested
- Version-validated cache usage

---

### 3.9 Memory Cache Layer (Optional but Recommended)

**Service**
- Redis (ElastiCache) or DynamoDB KV

**Used for**
- Approved memory content by version
- Tokenized memory chunks
- Bundle caching

**TTL**
- 12–24h
- Version-based invalidation

**Fallback**
- DB + S3 always authoritative

---

## 4) Deployment Diagram (Conceptual)

User
↓
Web UI (Next.js)
↓ JWT
API Gateway
↓
Backend API (Lambda)
├── RDS (Postgres)
├── S3 (Uploads + Memory)
├── Redis (Cache)
├── Cognito (Auth)
├── SQS (Jobs)
↓
Nova (Lambda)
↓
S3 + RDS


---

## 5) Environment Separation

### Environments
- **dev**
- **staging**
- **prod**

Each environment has:
- separate Cognito User Pool
- separate RDS
- separate S3 buckets
- separate SQS queues

Never share memory or data across envs.

---

## 6) Security Model

### IAM Roles
- API Lambda Role
- Worker Lambda Role
- Nova Lambda Role

Each role has:
- least-privilege S3 access
- DB access via VPC
- SQS permissions scoped to queue

### Network
- Lambdas in VPC
- RDS private subnet
- No public DB access

---

## 7) Observability & Monitoring

### Logs
- CloudWatch Logs for:
  - API requests
  - Worker runs
  - Nova reasoning steps (metadata only)

### Metrics
- Ingestion job success/failure
- Recompute duration
- Nova brief generation time
- Cache hit/miss

### Alerts
- Failed ingestion
- Failed Nova brief generation
- DB connectivity issues

---

## 8) Cost Profile (Expected)

### Monthly (ballpark)
- Lambda: ~$5–15
- RDS: ~$30–50
- S3: ~$5
- SQS: <$1
- Cognito: free tier likely enough
- Redis (optional): ~$15–30

**Total:** ~$60–100 / month (Phase-1)

---

## 9) Scaling Strategy

### Phase-1
- Single-digit admins
- CSV uploads 1–2×/month
- No performance pressure

### Phase-2
- Add ECS for Nova if LLM workloads grow
- Introduce read replicas for RDS
- Add pre-computed aggregates

---

## 10) Failure Scenarios & Behavior

| Scenario | Behavior |
|-------|---------|
| CSV upload fails | No DB changes |
| Recompute fails | Raw data preserved |
| Nova fails | Metrics still visible |
| Cache stale | Version check prevents misuse |
| Memory conflict | Approved version always wins |

---

## 11) Why This Architecture Works

- **Low ops burden**
- **High correctness**
- **Explicit governance**
- **Nova stays trustworthy**
- **Easy to evolve**

This architecture supports:
> *An institutional revenue analyst, not a clever demo.*

---

## 12) Locked Summary

- Serverless-first
- Cognito for auth
- Postgres as truth
- S3 for memory
- Nova as dual-mode agent
- Version-driven cache invalidation
- Cost-efficient by default

---


