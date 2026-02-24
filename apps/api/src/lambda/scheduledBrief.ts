/**
 * Lambda handler for EventBridge-scheduled monthly brief generation.
 * Runs on the 1st of each month (e.g. 02:00 UTC), POSTs to API to generate brief for previous month.
 *
 * Env (set in Lambda):
 *   API_URL          — Base URL of MarketBuzz API (e.g. https://api.example.com)
 *   INTERNAL_BRIEF_API_KEY — Same as API INTERNAL_BRIEF_API_KEY (for X-Internal-Brief-Key)
 *
 * EventBridge rule: schedule cron(0 2 1 * ? *) = 1st of month at 02:00 UTC.
 */
import type { ScheduledHandler } from "aws-lambda";

function previousMonthYYYYMM01(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-indexed
  const prev = new Date(Date.UTC(y, m - 1, 1));
  const py = prev.getUTCFullYear();
  const pm = String(prev.getUTCMonth() + 1).padStart(2, "0");
  return `${py}-${pm}-01`;
}

export const handler: ScheduledHandler = async () => {
  const apiUrl = (process.env.API_URL ?? process.env.MARKETBUZZ_API_URL ?? "").replace(/\/$/, "");
  const internalKey = process.env.INTERNAL_BRIEF_API_KEY ?? "";

  if (!apiUrl || !internalKey) {
    throw new Error("API_URL (or MARKETBUZZ_API_URL) and INTERNAL_BRIEF_API_KEY must be set");
  }

  const month = previousMonthYYYYMM01();
  const url = `${apiUrl}/admin/brief/generate?month=${encodeURIComponent(month)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Brief-Key": internalKey,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brief generate failed ${res.status}: ${text || res.statusText}`);
  }

  return { ok: true, month };
};
