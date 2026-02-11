/**
 * Merchants service: paginated list from merchant_lifecycle_monthly.
 * @see docs/DATA_MODEL_SPEC.md §8 Pagination & Query Standards
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type MonthDate = string;

export interface MerchantLifecycleRow {
  month: string;
  merchant_id: string;
  merchant_name: string;
  app_id: string;
  app_name: string;
  lifecycle_state: string;
}

export interface MerchantListResponse {
  data: MerchantLifecycleRow[];
  page: number;
  page_size: number;
  total_rows: number;
}

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function toMonthDate(value: string): MonthDate {
  const match = value.trim().match(/^(\d{4})-(\d{2})/);
  if (!match) return value;
  return `${match[1]}-${match[2]}-01`;
}

/**
 * List merchants from merchant_lifecycle_monthly with filters and pagination.
 */
export async function listMerchantsLifecycle(
  supabase: SupabaseClient,
  params: {
    month: MonthDate;
    app_id?: string;
    lifecycle_state?: string;
    page?: number;
    page_size?: number;
  }
): Promise<MerchantListResponse> {
  const month = toMonthDate(params.month);
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params.page_size ?? DEFAULT_PAGE_SIZE)
  );
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("merchant_lifecycle_monthly")
    .select("month, merchant_id, merchant_name, app_id, app_name, lifecycle_state", {
      count: "exact",
    })
    .eq("month", month)
    .order("merchant_id", { ascending: true })
    .order("app_id", { ascending: true })
    .range(from, to);

  if (params.app_id) q = q.eq("app_id", params.app_id);
  if (params.lifecycle_state) q = q.eq("lifecycle_state", params.lifecycle_state);

  const { data, count, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as MerchantLifecycleRow[];
  const totalRows = count ?? 0;

  return {
    data: rows.map((r) => ({ ...r, month: String(r.month).slice(0, 10) })),
    page,
    page_size: pageSize,
    total_rows: totalRows,
  };
}

export interface RefundMerchantRow {
  month: string;
  merchant_id: string;
  merchant_name: string;
  app_id: string;
  refund_amount: number;
  charge_id: string;
}

export interface RefundListResponse {
  data: RefundMerchantRow[];
  page: number;
  page_size: number;
  total_rows: number;
}

/**
 * List refund merchants from refund_merchants_monthly (paginated).
 */
export async function listRefundMerchants(
  supabase: SupabaseClient,
  params: {
    month: MonthDate;
    app_id?: string;
    page?: number;
    page_size?: number;
  }
): Promise<RefundListResponse> {
  const month = toMonthDate(params.month);
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params.page_size ?? DEFAULT_PAGE_SIZE)
  );
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("refund_merchants_monthly")
    .select("month, merchant_id, merchant_name, app_id, refund_amount, charge_id", {
      count: "exact",
    })
    .eq("month", month)
    .order("merchant_id", { ascending: true })
    .order("app_id", { ascending: true })
    .order("charge_id", { ascending: true })
    .range(from, to);

  if (params.app_id) q = q.eq("app_id", params.app_id);

  const { data, count, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as RefundMerchantRow[];
  const totalRows = count ?? 0;

  return {
    data: rows.map((r) => ({
      ...r,
      month: String(r.month).slice(0, 10),
      refund_amount: Number(r.refund_amount),
    })),
    page,
    page_size: pageSize,
    total_rows: totalRows,
  };
}

export interface UninstallMerchantRow {
  uninstall_month: string;
  merchant_id: string;
  merchant_name: string;
  app_id: string;
  uninstall_date: string;
}

export interface UninstallListResponse {
  data: UninstallMerchantRow[];
  page: number;
  page_size: number;
  total_rows: number;
}

/**
 * List uninstall merchants from uninstall_merchants_monthly (paginated).
 */
export async function listUninstallMerchants(
  supabase: SupabaseClient,
  params: {
    month: MonthDate;
    app_id?: string;
    page?: number;
    page_size?: number;
  }
): Promise<UninstallListResponse> {
  const month = toMonthDate(params.month);
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params.page_size ?? DEFAULT_PAGE_SIZE)
  );
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("uninstall_merchants_monthly")
    .select("uninstall_month, merchant_id, merchant_name, app_id, uninstall_date", {
      count: "exact",
    })
    .eq("uninstall_month", month)
    .order("merchant_id", { ascending: true })
    .order("app_id", { ascending: true })
    .range(from, to);

  if (params.app_id) q = q.eq("app_id", params.app_id);

  const { data, count, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as UninstallMerchantRow[];
  const totalRows = count ?? 0;

  return {
    data: rows.map((r) => ({
      uninstall_month: String(r.uninstall_month).slice(0, 10),
      merchant_id: r.merchant_id,
      merchant_name: r.merchant_name,
      app_id: r.app_id,
      uninstall_date: String(r.uninstall_date).slice(0, 10),
    })),
    page,
    page_size: pageSize,
    total_rows: totalRows,
  };
}

export interface HighRiskChurnMerchantRow {
  month: string;
  merchant_id: string;
  merchant_name: string;
  app_id: string;
  refund_amount: number;
  uninstall_date: string;
  last_active_month: string;
}

export interface HighRiskChurnListResponse {
  data: HighRiskChurnMerchantRow[];
  page: number;
  page_size: number;
  total_rows: number;
}

/**
 * List high-risk churn merchants (Refunded ∩ Uninstalled ∩ Lost) from high_risk_churn_merchants (paginated).
 */
export async function listHighRiskChurnMerchants(
  supabase: SupabaseClient,
  params: {
    month: MonthDate;
    app_id?: string;
    page?: number;
    page_size?: number;
  }
): Promise<HighRiskChurnListResponse> {
  const month = toMonthDate(params.month);
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params.page_size ?? DEFAULT_PAGE_SIZE)
  );
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("high_risk_churn_merchants")
    .select("month, merchant_id, merchant_name, app_id, refund_amount, uninstall_date, last_active_month", {
      count: "exact",
    })
    .eq("month", month)
    .order("merchant_id", { ascending: true })
    .order("app_id", { ascending: true })
    .range(from, to);

  if (params.app_id) q = q.eq("app_id", params.app_id);

  const { data, count, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as HighRiskChurnMerchantRow[];
  const totalRows = count ?? 0;

  return {
    data: rows.map((r) => ({
      month: String(r.month).slice(0, 10),
      merchant_id: r.merchant_id,
      merchant_name: r.merchant_name,
      app_id: r.app_id,
      refund_amount: Number(r.refund_amount),
      uninstall_date: String(r.uninstall_date).slice(0, 10),
      last_active_month: String(r.last_active_month).slice(0, 10),
    })),
    page,
    page_size: pageSize,
    total_rows: totalRows,
  };
}
