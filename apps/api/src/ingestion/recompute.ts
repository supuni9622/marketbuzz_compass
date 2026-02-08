/**
 * Recompute canonical tables for affected months.
 * @see docs/INGESTION_WORKFLOW.md, docs/DATA_MODEL_SPEC.md
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** Month format YYYY-MM (e.g. "2026-01") */
function toMonthDate(ym: string): string {
  return `${ym}-01`;
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

/**
 * Expand months scope: add previous month for At Risk logic.
 */
export function expandMonthsScope(monthsDetected: string[]): string[] {
  const set = new Set<string>();
  for (const m of monthsDetected) {
    set.add(m);
    set.add(prevMonth(m));
  }
  return Array.from(set).sort();
}

async function deleteByMonths(
  supabase: SupabaseClient,
  table: string,
  monthColumn: string,
  months: string[]
): Promise<void> {
  if (months.length === 0) return;
  const monthDates = months.map(toMonthDate);
  const { error } = await supabase
    .from(table)
    .delete()
    .in(monthColumn, monthDates);
  if (error) throw error;
}

async function deleteByUninstallMonths(
  supabase: SupabaseClient,
  months: string[]
): Promise<void> {
  if (months.length === 0) return;
  const monthDates = months.map(toMonthDate);
  const { error } = await supabase
    .from("uninstall_merchants_monthly")
    .delete()
    .in("uninstall_month", monthDates);
  if (error) throw error;
}

/**
 * Recompute monthly_revenue_lifecycle for months in scope.
 */
async function recomputeMonthlyRevenueLifecycle(
  supabase: SupabaseClient,
  months: string[]
): Promise<void> {
  await deleteByMonths(supabase, "monthly_revenue_lifecycle", "month", months);

  for (const ym of months) {
    const month = toMonthDate(ym);

    const { data: charges } = await supabase
      .from("charges_raw")
      .select("charge_id, app_id, app_name, amount, status_current")
      .eq("charge_month", month);

    if (!charges || charges.length === 0) continue;

    const byApp = new Map<
      string,
      { app_name: string; billed: number; billedCount: Set<string>; collected: number; deposited: number; refunded: number }
    >();

    for (const c of charges) {
      const key = c.app_id;
      if (!byApp.has(key)) {
        byApp.set(key, {
          app_name: c.app_name ?? "Unknown",
          billed: 0,
          billedCount: new Set(),
          collected: 0,
          deposited: 0,
          refunded: 0,
        });
      }
      const row = byApp.get(key)!;
      row.billed += Number(c.amount);
      row.billedCount.add(c.charge_id);

      const status = (c.status_current ?? "").toUpperCase();
      if (status === "COLLECTED" || status === "DEPOSITED") {
        row.collected += Number(c.amount);
      }
      if (status === "DEPOSITED") {
        row.deposited += Number(c.amount);
      }
      if (status === "REFUND" || Number(c.amount) < 0) {
        row.refunded += Math.abs(Number(c.amount));
      }
    }

    const rows = Array.from(byApp.entries()).map(([app_id, v]) => ({
      month,
      app_id,
      app_name: v.app_name,
      billed_amount: v.billed,
      billed_count: v.billedCount.size,
      collected_amount: v.collected,
      deposited_amount: v.deposited,
      refunded_amount: v.refunded,
      net_statement_amount: v.billed - v.refunded,
    }));

    if (rows.length > 0) {
      const { error } = await supabase.from("monthly_revenue_lifecycle").insert(rows);
      if (error) throw error;
    }
  }
}

/**
 * Recompute merchant_lifecycle_monthly: Active, AtRisk, Lost.
 * Active: billed in month. AtRisk: billed in M-1, not M. Lost: refunded/uninstalled in month (from charges_raw), not Active.
 */
async function recomputeMerchantLifecycle(
  supabase: SupabaseClient,
  months: string[]
): Promise<void> {
  await deleteByMonths(supabase, "merchant_lifecycle_monthly", "month", months);

  for (const ym of months) {
    const month = toMonthDate(ym);
    const prev = toMonthDate(prevMonth(ym));
    const [y, m] = ym.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const monthEnd = `${ym}-${String(lastDay).padStart(2, "0")}`;

    const { data: billedThisMonth } = await supabase
      .from("charges_raw")
      .select("merchant_id, merchant_name, app_id, app_name")
      .eq("charge_month", month);

    const { data: billedPrevMonth } = await supabase
      .from("charges_raw")
      .select("merchant_id, merchant_name, app_id, app_name")
      .eq("charge_month", prev);

    const { data: refundedCharges } = await supabase
      .from("charges_raw")
      .select("merchant_id, merchant_name, app_id")
      .eq("charge_month", month)
      .eq("status_current", "REFUND");

    const { data: uninstalledCharges } = await supabase
      .from("charges_raw")
      .select("merchant_id, merchant_name, app_id")
      .not("uninstall_date", "is", null)
      .gte("uninstall_date", month)
      .lte("uninstall_date", monthEnd);

    const thisSet = new Set(
      (billedThisMonth ?? []).map((r) => `${r.merchant_id}:${r.app_id}`)
    );

    const rows: Array<{
      month: string;
      merchant_id: string;
      merchant_name: string;
      app_id: string;
      app_name: string;
      lifecycle_state: "Active" | "AtRisk" | "Lost";
    }> = [];

    const seen = new Set<string>();

    for (const c of billedThisMonth ?? []) {
      const key = `${c.merchant_id}:${c.app_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        month,
        merchant_id: c.merchant_id,
        merchant_name: c.merchant_name ?? "Unknown",
        app_id: c.app_id,
        app_name: c.app_name ?? "Unknown",
        lifecycle_state: "Active",
      });
    }

    for (const c of billedPrevMonth ?? []) {
      const key = `${c.merchant_id}:${c.app_id}`;
      if (seen.has(key)) continue;
      if (!thisSet.has(key)) {
        seen.add(key);
        rows.push({
          month,
          merchant_id: c.merchant_id,
          merchant_name: c.merchant_name ?? "Unknown",
          app_id: c.app_id,
          app_name: c.app_name ?? "Unknown",
          lifecycle_state: "AtRisk",
        });
      }
    }

    for (const r of refundedCharges ?? []) {
      const key = `${r.merchant_id}:${r.app_id}`;
      if (seen.has(key)) continue;
      if (!thisSet.has(key)) {
        seen.add(key);
        rows.push({
          month,
          merchant_id: r.merchant_id,
          merchant_name: r.merchant_name ?? "Unknown",
          app_id: r.app_id,
          app_name: "Unknown",
          lifecycle_state: "Lost",
        });
      }
    }
    for (const u of uninstalledCharges ?? []) {
      const key = `${u.merchant_id}:${u.app_id}`;
      if (seen.has(key)) continue;
      if (!thisSet.has(key)) {
        seen.add(key);
        rows.push({
          month,
          merchant_id: u.merchant_id,
          merchant_name: u.merchant_name ?? "Unknown",
          app_id: u.app_id,
          app_name: "Unknown",
          lifecycle_state: "Lost",
        });
      }
    }

    if (rows.length > 0) {
      const { error } = await supabase.from("merchant_lifecycle_monthly").insert(rows);
      if (error) throw error;
    }
  }
}

/**
 * Recompute refund_merchants_monthly.
 */
async function recomputeRefundMerchants(
  supabase: SupabaseClient,
  months: string[]
): Promise<void> {
  await deleteByMonths(supabase, "refund_merchants_monthly", "month", months);

  for (const ym of months) {
    const month = toMonthDate(ym);

    const { data: charges } = await supabase
      .from("charges_raw")
      .select("charge_id, merchant_id, merchant_name, app_id, app_name, amount")
      .eq("charge_month", month)
      .eq("status_current", "REFUND");

    if (!charges || charges.length === 0) continue;

    const rows = charges.map((c) => ({
      month,
      merchant_id: c.merchant_id,
      merchant_name: c.merchant_name ?? "Unknown",
      app_id: c.app_id,
      refund_amount: Math.abs(Number(c.amount)),
      charge_id: c.charge_id,
    }));

    const { error } = await supabase.from("refund_merchants_monthly").insert(rows);
    if (error) throw error;
  }
}

/**
 * Recompute uninstall_merchants_monthly.
 */
async function recomputeUninstallMerchants(
  supabase: SupabaseClient,
  months: string[]
): Promise<void> {
  await deleteByUninstallMonths(supabase, months);

  for (const ym of months) {
    const monthStart = toMonthDate(ym);
    const [y, m] = ym.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const monthEnd = `${ym}-${String(lastDay).padStart(2, "0")}`;

    const { data: charges } = await supabase
      .from("charges_raw")
      .select("merchant_id, merchant_name, app_id, app_name, uninstall_date")
      .not("uninstall_date", "is", null)
      .gte("uninstall_date", monthStart)
      .lte("uninstall_date", monthEnd);

    if (!charges || charges.length === 0) continue;

    const seen = new Set<string>();
    const rows: Array<{
      uninstall_month: string;
      merchant_id: string;
      merchant_name: string;
      app_id: string;
      uninstall_date: string;
    }> = [];

    for (const c of charges) {
      const key = `${c.merchant_id}:${c.app_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        uninstall_month: monthStart,
        merchant_id: c.merchant_id,
        merchant_name: c.merchant_name ?? "Unknown",
        app_id: c.app_id,
        uninstall_date: c.uninstall_date!,
      });
    }

    if (rows.length > 0) {
      const { error } = await supabase.from("uninstall_merchants_monthly").insert(rows);
      if (error) throw error;
    }
  }
}

/**
 * Recompute nra_monthly and nra_merchants_monthly (New Revenue Added).
 */
async function recomputeNra(supabase: SupabaseClient, months: string[]): Promise<void> {
  await deleteByMonths(supabase, "nra_monthly", "month", months);
  await deleteByMonths(supabase, "nra_merchants_monthly", "month", months);

  for (const ym of months) {
    const month = toMonthDate(ym);
    const prev = toMonthDate(prevMonth(ym));

    const { data: thisMonth } = await supabase
      .from("charges_raw")
      .select("charge_id, merchant_id, merchant_name, app_id, app_name, amount")
      .eq("charge_month", month)
      .not("status_current", "eq", "REFUND");

    const { data: prevMonthCharges } = await supabase
      .from("charges_raw")
      .select("merchant_id, app_id")
      .eq("charge_month", prev);

    const prevSet = new Set(
      (prevMonthCharges ?? []).map((r) => `${r.merchant_id}:${r.app_id}`)
    );

    const nraMerchants = (thisMonth ?? []).filter(
      (c) => !prevSet.has(`${c.merchant_id}:${c.app_id}`)
    );

    const byApp = new Map<string, { app_name: string; amount: number; count: number }>();
    for (const c of nraMerchants) {
      const key = c.app_id;
      if (!byApp.has(key)) {
        byApp.set(key, { app_name: c.app_name ?? "Unknown", amount: 0, count: 0 });
      }
      const row = byApp.get(key)!;
      row.amount += Number(c.amount);
      row.count++;
    }

    const nraMonthlyRows = Array.from(byApp.entries()).map(([app_id, v]) => ({
      month,
      app_id,
      app_name: v.app_name,
      nra_amount: v.amount,
      nra_count: v.count,
    }));

    const nraMerchantsRows = nraMerchants.map((c) => ({
      month,
      merchant_id: c.merchant_id,
      merchant_name: c.merchant_name ?? "Unknown",
      app_id: c.app_id,
      amount: Number(c.amount),
    }));

    if (nraMonthlyRows.length > 0) {
      const { error } = await supabase.from("nra_monthly").insert(nraMonthlyRows);
      if (error) throw error;
    }
    if (nraMerchantsRows.length > 0) {
      const { error } = await supabase.from("nra_merchants_monthly").insert(nraMerchantsRows);
      if (error) throw error;
    }
  }
}

/**
 * Recompute high_risk_churn_merchants: Refunded ∩ Uninstalled ∩ Lost.
 */
async function recomputeHighRiskChurn(
  supabase: SupabaseClient,
  months: string[]
): Promise<void> {
  await deleteByMonths(supabase, "high_risk_churn_merchants", "month", months);

  for (const ym of months) {
    const month = toMonthDate(ym);

    const { data: refunded } = await supabase
      .from("refund_merchants_monthly")
      .select("merchant_id, merchant_name, app_id, refund_amount")
      .eq("month", month);

    const { data: uninstalled } = await supabase
      .from("uninstall_merchants_monthly")
      .select("merchant_id, app_id, uninstall_date")
      .eq("uninstall_month", month);

    const { data: lost } = await supabase
      .from("merchant_lifecycle_monthly")
      .select("merchant_id, app_id")
      .eq("month", month)
      .eq("lifecycle_state", "Lost");

    const lostSet = new Set((lost ?? []).map((r) => `${r.merchant_id}:${r.app_id}`));
    const uninstallMap = new Map(
      (uninstalled ?? []).map((r) => [`${r.merchant_id}:${r.app_id}`, r.uninstall_date])
    );

    const rows = (refunded ?? [])
      .filter((r) => lostSet.has(`${r.merchant_id}:${r.app_id}`))
      .filter((r) => uninstallMap.has(`${r.merchant_id}:${r.app_id}`))
      .map((r) => ({
        month,
        merchant_id: r.merchant_id,
        merchant_name: r.merchant_name ?? "Unknown",
        app_id: r.app_id,
        refund_amount: r.refund_amount,
        uninstall_date: uninstallMap.get(`${r.merchant_id}:${r.app_id}`)!,
        last_active_month: toMonthDate(prevMonth(ym)),
      }));

    if (rows.length > 0) {
      const { error } = await supabase.from("high_risk_churn_merchants").insert(rows);
      if (error) throw error;
    }
  }
}

/**
 * Recompute all canonical tables for months in scope.
 */
export async function recomputeCanonicalTables(
  supabase: SupabaseClient,
  monthsDetected: string[]
): Promise<void> {
  const months = expandMonthsScope(monthsDetected);

  await recomputeMonthlyRevenueLifecycle(supabase, months);
  await recomputeMerchantLifecycle(supabase, months);
  await recomputeRefundMerchants(supabase, months);
  await recomputeUninstallMerchants(supabase, months);
  await recomputeNra(supabase, months);
  await recomputeHighRiskChurn(supabase, months);
}
