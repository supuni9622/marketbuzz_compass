/**
 * Metrics service: KPIs from canonical tables with current, compare, delta, delta_pct.
 * @see docs/DATA_MODEL_SPEC.md, docs/MRR_AND_MANUAL_OUTPUTS.md
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** Month as YYYY-MM-01 */
export type MonthDate = string;

export interface MetricWithCompare {
  current: number;
  compare: number;
  delta: number;
  delta_pct: number | null;
}

export interface KpisResponse {
  month: MonthDate;
  compare_month: MonthDate;
  billed_amount: MetricWithCompare;
  billed_count: MetricWithCompare;
  collected_amount: MetricWithCompare;
  deposited_amount: MetricWithCompare;
  refunded_amount: MetricWithCompare;
  active_merchants: MetricWithCompare;
}

interface MrlRow {
  billed_amount: number;
  billed_count: number;
  collected_amount: number;
  deposited_amount: number;
  refunded_amount: number;
}

function toMonthDate(value: string): MonthDate {
  const match = value.match(/^(\d{4})-(\d{2})/);
  if (!match) return value;
  return `${match[1]}-${match[2]}-01`;
}

function prevMonth(month: MonthDate): MonthDate {
  const parts = month.slice(0, 7).split("-").map(Number);
  const y = parts[0] ?? new Date().getFullYear();
  const m = parts[1] ?? 1;
  const d = new Date(y, m - 2, 1); // m is 1-based, month is 0-based
  const py = d.getFullYear();
  const pm = String(d.getMonth() + 1).padStart(2, "0");
  return `${py}-${pm}-01`;
}

function metricWithCompare(current: number, compare: number): MetricWithCompare {
  const delta = current - compare;
  const delta_pct =
    compare !== 0 ? Math.round((delta / compare) * 10000) / 100 : null;
  return { current, compare, delta, delta_pct };
}

async function aggregateMrl(
  supabase: SupabaseClient,
  month: MonthDate,
  appId: string | undefined
): Promise<MrlRow> {
  let q = supabase
    .from("monthly_revenue_lifecycle")
    .select("billed_amount, billed_count, collected_amount, deposited_amount, refunded_amount")
    .eq("month", month);
  if (appId) q = q.eq("app_id", appId);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as MrlRow[];
  if (rows.length === 0) {
    return {
      billed_amount: 0,
      billed_count: 0,
      collected_amount: 0,
      deposited_amount: 0,
      refunded_amount: 0,
    };
  }
  return rows.reduce(
    (acc, r) => ({
      billed_amount: acc.billed_amount + Number(r.billed_amount),
      billed_count: acc.billed_count + Number(r.billed_count),
      collected_amount: acc.collected_amount + Number(r.collected_amount),
      deposited_amount: acc.deposited_amount + Number(r.deposited_amount),
      refunded_amount: acc.refunded_amount + Number(r.refunded_amount),
    }),
    { billed_amount: 0, billed_count: 0, collected_amount: 0, deposited_amount: 0, refunded_amount: 0 }
  );
}

async function countActiveMerchants(
  supabase: SupabaseClient,
  month: MonthDate,
  appId: string | undefined
): Promise<number> {
  let q = supabase
    .from("merchant_lifecycle_monthly")
    .select("merchant_id, app_id", { count: "exact", head: true })
    .eq("month", month)
    .eq("lifecycle_state", "Active");
  if (appId) q = q.eq("app_id", appId);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

/**
 * Get KPIs for a month with comparison to another month. All metrics include current, compare, delta, delta_pct.
 */
export async function getKpis(
  supabase: SupabaseClient,
  month: MonthDate,
  compareMonth: MonthDate | undefined,
  appId: string | undefined
): Promise<KpisResponse> {
  const m = toMonthDate(month);
  const c = compareMonth ? toMonthDate(compareMonth) : prevMonth(m);

  const [currentMrl, compareMrl, currentActive, compareActive] = await Promise.all([
    aggregateMrl(supabase, m, appId),
    aggregateMrl(supabase, c, appId),
    countActiveMerchants(supabase, m, appId),
    countActiveMerchants(supabase, c, appId),
  ]);

  return {
    month: m,
    compare_month: c,
    billed_amount: metricWithCompare(currentMrl.billed_amount, compareMrl.billed_amount),
    billed_count: metricWithCompare(currentMrl.billed_count, compareMrl.billed_count),
    collected_amount: metricWithCompare(currentMrl.collected_amount, compareMrl.collected_amount),
    deposited_amount: metricWithCompare(currentMrl.deposited_amount, compareMrl.deposited_amount),
    refunded_amount: metricWithCompare(currentMrl.refunded_amount, compareMrl.refunded_amount),
    active_merchants: metricWithCompare(currentActive, compareActive),
  };
}
