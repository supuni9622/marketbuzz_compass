/**
 * Brief service: read from monthly_briefs (cached Nova output).
 * @see docs/INGESTION_WORKFLOW.md, monthly_briefs table
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type MonthDate = string;

export interface MonthlyBriefRow {
  month: string;
  created_at: string;
  created_by: string;
  headline_gross_billed: number | null;
  mom_delta: number | null;
  mom_delta_pct: number | null;
  brief_markdown: string | null;
  evidence_links: unknown;
  flags: unknown;
}

const PLACEHOLDER_MARKDOWN = "Summary pending — Nova coming soon.";

function toMonthDate(value: string): MonthDate {
  const match = value.trim().match(/^(\d{4})-(\d{2})/);
  if (!match) return value;
  return `${match[1]}-${match[2]}-01`;
}

/**
 * Get brief for a month. Returns row from monthly_briefs or null if none.
 */
export async function getBrief(
  supabase: SupabaseClient,
  month: MonthDate
): Promise<MonthlyBriefRow | null> {
  const m = toMonthDate(month);
  const { data, error } = await supabase
    .from("monthly_briefs")
    .select("month, created_at, created_by, headline_gross_billed, mom_delta, mom_delta_pct, brief_markdown, evidence_links, flags")
    .eq("month", m)
    .maybeSingle();
  if (error) throw error;
  return data as MonthlyBriefRow | null;
}

/**
 * Get last N briefs by month (desc), returned oldest-first for context order.
 * Used by MONTHLY_BRIEF memory bundle (last 2 briefs).
 */
export async function getLastBriefs(
  supabase: SupabaseClient,
  limit: number = 2
): Promise<MonthlyBriefRow[]> {
  const { data, error } = await supabase
    .from("monthly_briefs")
    .select("month, created_at, created_by, headline_gross_billed, mom_delta, mom_delta_pct, brief_markdown, evidence_links, flags")
    .order("month", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as MonthlyBriefRow[];
  return rows.reverse();
}

/**
 * Response shape: either cached brief or placeholder.
 */
export interface BriefResponse {
  month: string;
  created_at: string | null;
  created_by: string;
  headline_gross_billed: number | null;
  mom_delta: number | null;
  mom_delta_pct: number | null;
  brief_markdown: string;
  evidence_links: unknown;
  flags: unknown;
  placeholder: boolean;
}

/**
 * Upsert a monthly brief (Nova-generated). Used by admin brief generation.
 */
export interface UpsertBriefInput {
  month: MonthDate;
  created_by: string;
  headline_gross_billed: number | null;
  mom_delta: number | null;
  mom_delta_pct: number | null;
  brief_markdown: string;
  evidence_links?: unknown;
  flags?: unknown;
}

export async function upsertBrief(
  supabase: SupabaseClient,
  input: UpsertBriefInput
): Promise<MonthlyBriefRow> {
  const m = toMonthDate(input.month);
  const { data, error } = await supabase
    .from("monthly_briefs")
    .upsert(
      {
        month: m,
        created_by: input.created_by,
        headline_gross_billed: input.headline_gross_billed,
        mom_delta: input.mom_delta,
        mom_delta_pct: input.mom_delta_pct,
        brief_markdown: input.brief_markdown,
        evidence_links: input.evidence_links ?? null,
        flags: input.flags ?? null,
      },
      { onConflict: "month" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as MonthlyBriefRow;
}

export function toBriefResponse(row: MonthlyBriefRow | null, month: MonthDate): BriefResponse {
  if (!row) {
    return {
      month: toMonthDate(month),
      created_at: null,
      created_by: "system",
      headline_gross_billed: null,
      mom_delta: null,
      mom_delta_pct: null,
      brief_markdown: PLACEHOLDER_MARKDOWN,
      evidence_links: null,
      flags: null,
      placeholder: true,
    };
  }
  return {
    month: String(row.month).slice(0, 10),
    created_at: row.created_at,
    created_by: row.created_by,
    headline_gross_billed: row.headline_gross_billed != null ? Number(row.headline_gross_billed) : null,
    mom_delta: row.mom_delta != null ? Number(row.mom_delta) : null,
    mom_delta_pct: row.mom_delta_pct != null ? Number(row.mom_delta_pct) : null,
    brief_markdown: row.brief_markdown ?? PLACEHOLDER_MARKDOWN,
    evidence_links: row.evidence_links ?? null,
    flags: row.flags ?? null,
    placeholder: false,
  };
}
