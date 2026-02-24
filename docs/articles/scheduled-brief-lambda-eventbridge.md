# Scheduled Monthly Brief (Lambda + EventBridge)

This article describes how to run the **proactive monthly brief** on a schedule (e.g. 1st of each month) so the Brief is refreshed even when no CSV is uploaded.

---

## What We're Building

- **Lambda function** – `marketbuzz-compass-scheduled-brief` – calls the API to generate the brief for the **previous month**.
- **EventBridge rule** – runs the Lambda on a schedule (e.g. 1st of month at 02:00 UTC).
- **Internal auth** – API accepts `X-Internal-Brief-Key` (or `Authorization: Bearer <key>`) so the Lambda can call `POST /admin/brief/generate` without a user JWT.

---

## Prerequisites

1. **API** must have:
   - `INTERNAL_BRIEF_API_KEY` set in `.env` (same value you will set in the Lambda).
   - `OPENAI_API_KEY` and DB configured so Nova can generate the brief.

2. **API URL** – the base URL of your deployed API (e.g. `https://api.your-domain.com`). For local testing you can use a tunnel (e.g. ngrok) and set `API_URL` in the Lambda to that URL.

---

## 1. Internal Auth (API)

The API route `POST /admin/brief/generate` accepts either:

- **Cognito Admin JWT** (existing behavior), or  
- **Internal key**: header `X-Internal-Brief-Key: <INTERNAL_BRIEF_API_KEY>` or `Authorization: Bearer <INTERNAL_BRIEF_API_KEY>`.

Set `INTERNAL_BRIEF_API_KEY` in the API `.env` to a long random secret. Use the same value in the Lambda environment.

---

## 2. Create the Lambda Function

1. In **AWS Console** go to **Lambda** → **Functions** → **Create function**.
2. **Name:** `marketbuzz-compass-scheduled-brief`.
3. **Runtime:** Node.js 20.x (or 18.x).
4. **Architecture:** x86_64.
5. **Execution role:** Create a new role with basic Lambda permissions (CloudWatch Logs). This Lambda only calls HTTPS; no S3/SQS needed.
6. **Create function**.

### Handler and code

- **Handler:** `dist/lambda/scheduledBrief.handler` (or the path that matches your build output).
- **Code:** Build the API package so that `apps/api/src/lambda/scheduledBrief.ts` is compiled to the handler path. You can also zip only the compiled `scheduledBrief.js` and a minimal `package.json` if you bundle a standalone.

Example (if your API build outputs to `dist/`):

- Build: `pnpm --filter @marketbuzz/api build` (or `tsc` so that `src/lambda/scheduledBrief.ts` → `dist/lambda/scheduledBrief.js`).
- Upload the `dist/lambda/scheduledBrief.js` (and any runtime deps if needed; this handler uses only `fetch`, built-in in Node 18+).

### Environment variables

| Key | Value |
|-----|--------|
| `API_URL` | Base URL of your API (e.g. `https://api.your-domain.com`) |
| `INTERNAL_BRIEF_API_KEY` | Same secret as in API `INTERNAL_BRIEF_API_KEY` |

Optional: `MARKETBUZZ_API_URL` is used if `API_URL` is not set.

### Timeout

- **Timeout:** 60 seconds (brief generation can take 10–30 s).

---

## 3. Create the EventBridge Rule

1. In **AWS Console** go to **EventBridge** → **Rules** → **Create rule**.
2. **Name:** `marketbuzz-compass-monthly-brief`.
3. **Rule type:** Schedule.
4. **Schedule pattern:** Recurring schedule.
5. **Schedule expression:** `cron(0 2 1 * ? *)`  
   - Meaning: at 02:00 UTC on the 1st day of every month.
6. **Target:** Lambda function → `marketbuzz-compass-scheduled-brief`.
7. **Create**.

---

## 4. Behaviour

- On the 1st of each month at 02:00 UTC, EventBridge invokes the Lambda.
- The Lambda computes the **previous month** (e.g. if today is 2026-02-01, month = `2026-01-01`).
- It sends `POST {API_URL}/admin/brief/generate?month=2026-01-01` with header `X-Internal-Brief-Key: <key>`.
- The API validates the internal key, runs Nova proactive brief, and upserts into `monthly_briefs`.
- If the request fails (4xx/5xx), the Lambda throws and EventBridge can retry (default retry policy).

---

## 5. Optional: Manual Invoke

You can invoke the Lambda manually from the AWS Console (Test tab) to generate the brief for “previous month” without waiting for the schedule. No event payload is required.

---

## Summary

| Item | Value |
|------|--------|
| Lambda | `marketbuzz-compass-scheduled-brief` |
| Handler | `dist/lambda/scheduledBrief.handler` (or your build path) |
| Schedule | `cron(0 2 1 * ? *)` (1st of month, 02:00 UTC) |
| API env | `INTERNAL_BRIEF_API_KEY` |
| Lambda env | `API_URL`, `INTERNAL_BRIEF_API_KEY` |
