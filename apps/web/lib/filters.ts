/**
 * Global filter defaults and month helpers.
 * Month format: YYYY-MM or YYYY-MM-01 for API.
 */

export function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function getPreviousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

export function toApiMonth(month: string): string {
  if (month.length === 7 && month.endsWith("-01") === false) {
    return `${month}-01`;
  }
  return month;
}

export const APP_OPTIONS = [
  { value: "", label: "All Apps" },
  { value: "sms", label: "SMS Marketing" },
  { value: "crm", label: "Small Business CRM" },
  { value: "unlock", label: "Insight Unlock" },
] as const;

export type AppOptionValue = (typeof APP_OPTIONS)[number]["value"];
