# API Lambda Deployment — What We Did & Current Blocker

Notes for deploying the MarketBuzz Compass API (Fastify) as AWS Lambda behind API Gateway. Last updated: 2026-02-11.

---

## What We Did

### 1. App factory + Lambda entry

- **`apps/api/src/app.ts`** — Added `buildApp(options?: { serverUrl?: string })` that creates the Fastify app, registers CORS, Swagger, all routes; returns the app without calling `listen`. Used by both local server and Lambda.
- **`apps/api/src/index.ts`** — Refactored to call `buildApp({ serverUrl: http://localhost:${port} })`, then `app.listen()`. Keeps `appRef` for `close()`.
- **`apps/api/src/lambda/api.ts`** — Lambda handler: top-level `await buildApp()`, wrap with `@fastify/aws-lambda`, `await app.ready()`, export `handler`. Uses payload 2.0 for API Gateway HTTP API.

### 2. Build and package

- **Dependency:** `@fastify/aws-lambda` in `apps/api/package.json`.
- **Script:** `build:api-lambda` — esbuild bundles `src/lambda/api.ts` → `dist-lambda/api.mjs` (ESM), Node 20, with **Node built-ins externalized** to avoid dynamic `require` in ESM:
  - `--external:node:crypto`, `node:stream`, `node:util`, `node:buffer`, `node:url`, `node:path`, `node:fs`, `node:os`, `node:http`, `node:https`, `node:net`, `node:zlib`, `node:events`
- **Zip:** Only `dist-lambda/api.mjs` at zip root. Handler in Lambda: **`api.handler`**.

### 3. AWS setup

- **Lambda:** `marketbuzz-compass-api` (Node 20, handler `api.handler`), env vars from `.env` (Supabase, Cognito, S3, SQS, OpenAI, INTERNAL_BRIEF_API_KEY), timeout 30–60s, S3 + SQS permissions on execution role.
- **API Gateway:** HTTP API, integration Lambda (payload 2.0), routes `ANY /` and `ANY /{proxy+}`. Stage created (e.g. `prod`). Invoke URL: `https://<api-id>.execute-api.us-east-1.amazonaws.com/prod` (or `$default` without `/prod`).

### 4. S3

- **Buckets:** `marketbuzz-compass-uploads`, `marketbuzz-compass-memory` (private, block public access, optional versioning, SSE-S3).

---

## Current Blocker

**Error:** Lambda fails at **init** (cold start) with:

```text
Init Error
{
  "errorType": "Error",
  "errorMessage": "Dynamic require of \"node:crypto\" is not supported",
  "stack": [
    "Error: Dynamic require of \"node:crypto\" is not supported",
    "    at file:///var/task/api.mjs:11:9",
    "    at ../../node_modules/.pnpm/@fastify+aws-lambda@6.4.0/node_modules/@fastify/aws-lambda/index.js (file:///var/task/api.mjs:46:19)",
    ...
  ]
}
```

- **Meaning:** Some code in the bundle (or a dependency like `jose`) is still doing a **dynamic** `require('node:crypto')`, which Node’s ESM loader does not allow. Marking `node:crypto` as **external** in esbuild leaves an import for Node to resolve, but if the dependency uses `require('node:crypto')` internally, that call remains in the bundle and fails at runtime.
- **Status:** Adding `--external:node:crypto` (and other `node:*`) did **not** fix it; the error persists after rebuild and redeploy.

---

## Next Steps to Try

1. **Bundle as CJS instead of ESM**  
   Change build to `--format=cjs` and output `api.js`. Set Lambda handler to `api.handler`. No ESM loader, so dynamic `require` may work. May need to avoid top-level `await` in `lambda/api.ts` (e.g. init handler on first invoke).

2. **Don’t bundle `jose`**  
   Add `--external:jose` and ship `node_modules/jose` (and its deps) in the zip or a Lambda layer. Then `node:crypto` is only required by the external `jose`, which might use a compatible require pattern.

3. **Use a Lambda layer for Node built-ins**  
   Unlikely to fix “dynamic require”;
   the issue is inside the bundled code.

4. **Switch to a different JWT library**  
   If `jose` is the only user of dynamic `require('node:crypto')`, replace it with a library that’s ESM-friendly or that esbuild can bundle without leaving a dynamic require.

5. **Serverless Framework / SAM / CDK**  
   Use a framework that has a known-good esbuild or bundling config for Node 20 + Fastify + Lambda (e.g. correct externals and format).

6. **Don’t bundle: zip `dist/` + `node_modules`**  
   Build with `tsc` only, zip `dist/` and `node_modules`, handler e.g. `dist/lambda/api.handler`. No esbuild, so no bundling of `jose`; Node loads `node:crypto` natively. Larger zip and slower cold start.

---

## Quick reference

| Item | Value |
|------|--------|
| Lambda name | marketbuzz-compass-api |
| Handler | api.handler |
| Build | `pnpm --filter @marketbuzz/api build:api-lambda` |
| Output | apps/api/dist-lambda/api.mjs |
| Zip | Only api.mjs at root → api-lambda.zip |
| API Gateway | HTTP API, ANY / + ANY /{proxy+}, payload 2.0 |
