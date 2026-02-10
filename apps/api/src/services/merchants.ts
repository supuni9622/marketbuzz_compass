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
