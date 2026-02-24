/**
 * Nova tools: canonical data only. Wraps metrics and merchants services.
 * @see docs/AGENT_SPEC.md § Tool Contract
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getKpis } from "../services/metrics.js";
import {
  listMerchantsLifecycle,
  listRefundMerchants,
  listUninstallMerchants,
  listNraMerchants,
  listHighRiskChurnMerchants,
} from "../services/merchants.js";

function toMonthDate(value: string): string {
  const match = String(value).trim().match(/^(\d{4})-(\d{2})/);
  if (!match) return value;
  return `${match[1]}-${match[2]}-01`;
}

function prevMonth(month: string): string {
  const parts = month.slice(0, 7).split("-").map(Number);
  const y = parts[0] ?? new Date().getFullYear();
  const m = parts[1] ?? 1;
  const d = new Date(y, m - 2, 1);
  const py = d.getFullYear();
  const pm = String(d.getMonth() + 1).padStart(2, "0");
  return `${py}-${pm}-01`;
}

/** get_kpi: KPIs for a month with comparison. */
export async function toolGetKpi(
  supabase: SupabaseClient,
  params: { month: string; compare_month?: string; app_id?: string }
): Promise<string> {
  const month = toMonthDate(params.month);
  const compareMonth = params.compare_month ? toMonthDate(params.compare_month) : prevMonth(month);
  const kpis = await getKpis(supabase, month, compareMonth, params.app_id);
  return JSON.stringify(kpis, null, 2);
}

/** list_merchants: paginated list by type (Active, AtRisk, Lost, Refunded, Uninstalled). */
export async function toolListMerchants(
  supabase: SupabaseClient,
  params: {
    type: string;
    month: string;
    app_id?: string;
    page?: number;
    page_size?: number;
  }
): Promise<string> {
  const month = toMonthDate(params.month);
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.page_size ?? 25));

  const typeLower = String(params.type).toLowerCase();

  if (typeLower === "refunded") {
    const result = await listRefundMerchants(supabase, {
      month,
      app_id: params.app_id,
      page,
      page_size: pageSize,
    });
    return JSON.stringify(
      {
        type: "refunded",
        data: result.data,
        page: result.page,
        page_size: result.page_size,
        total_rows: result.total_rows,
      },
      null,
      2
    );
  }

  if (typeLower === "uninstalled") {
    const result = await listUninstallMerchants(supabase, {
      month,
      app_id: params.app_id,
      page,
      page_size: pageSize,
    });
    return JSON.stringify(
      {
        type: "uninstalled",
        data: result.data,
        page: result.page,
        page_size: result.page_size,
        total_rows: result.total_rows,
      },
      null,
      2
    );
  }

  if (typeLower === "nra") {
    const result = await listNraMerchants(supabase, {
      month,
      app_id: params.app_id,
      page,
      page_size: pageSize,
    });
    return JSON.stringify(
      {
        type: "nra",
        data: result.data,
        page: result.page,
        page_size: result.page_size,
        total_rows: result.total_rows,
      },
      null,
      2
    );
  }

  if (typeLower === "highriskchurn" || typeLower === "high_risk_churn") {
    const result = await listHighRiskChurnMerchants(supabase, {
      month,
      app_id: params.app_id,
      page,
      page_size: pageSize,
    });
    return JSON.stringify(
      {
        type: "high_risk_churn",
        data: result.data,
        page: result.page,
        page_size: result.page_size,
        total_rows: result.total_rows,
      },
      null,
      2
    );
  }

  const lifecycleState =
    typeLower === "atrisk" ? "AtRisk" : typeLower === "lost" ? "Lost" : "Active";
  const result = await listMerchantsLifecycle(supabase, {
    month,
    app_id: params.app_id,
    lifecycle_state: lifecycleState,
    page,
    page_size: pageSize,
  });
  return JSON.stringify(
    {
      type: lifecycleState,
      data: result.data,
      page: result.page,
      page_size: result.page_size,
      total_rows: result.total_rows,
    },
    null,
    2
  );
}

/** get_trend: billed_amount (or active count) for last N months from canonical tables. */
export async function toolGetTrend(
  supabase: SupabaseClient,
  params: { metric: string; months_back: number; app_id?: string }
): Promise<string> {
  const monthsBack = Math.min(24, Math.max(1, params.months_back ?? 12));
  const metric = (params.metric ?? "billed_amount").toLowerCase();

  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - monthsBack, 1);
  const months: string[] = [];
  for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
    );
  }

  if (metric === "active_merchants") {
    const points: { month: string; value: number }[] = [];
    for (const month of months) {
      let q = supabase
        .from("merchant_lifecycle_monthly")
        .select("merchant_id, app_id", { count: "exact", head: true })
        .eq("month", month)
        .eq("lifecycle_state", "Active");
      if (params.app_id) q = q.eq("app_id", params.app_id);
      const { count, error } = await q;
      if (error) throw error;
      points.push({ month, value: count ?? 0 });
    }
    return JSON.stringify({ metric: "active_merchants", points }, null, 2);
  }

  const points: { month: string; value: number }[] = [];
  for (const month of months) {
    let q = supabase
      .from("monthly_revenue_lifecycle")
      .select("billed_amount")
      .eq("month", month);
    if (params.app_id) q = q.eq("app_id", params.app_id);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []) as { billed_amount: number }[];
    const total = rows.reduce((s, r) => s + Number(r.billed_amount ?? 0), 0);
    points.push({ month, value: total });
  }
  return JSON.stringify({ metric: "billed_amount", points }, null, 2);
}

/** get_growth_baseline: last month gross billed for growth plan. */
export async function toolGetGrowthBaseline(
  supabase: SupabaseClient,
  params: { month: string; app_id?: string }
): Promise<string> {
  const month = toMonthDate(params.month);
  const kpis = await getKpis(supabase, month, prevMonth(month), params.app_id);
  return JSON.stringify(
    {
      month: kpis.month,
      gross_billed: kpis.billed_amount.current,
      active_merchants: kpis.active_merchants.current,
    },
    null,
    2
  );
}

export const NOVA_TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "get_kpi",
      description:
        "Get KPIs for a month with comparison (billed_amount, active_merchants, refunded_amount, etc.). Use compare_month for MoM.",
      parameters: {
        type: "object",
        properties: {
          month: { type: "string", description: "Month YYYY-MM or YYYY-MM-01" },
          compare_month: {
            type: "string",
            description: "Optional comparison month; default is previous month",
          },
          app_id: { type: "string", description: "Optional app filter" },
        },
        required: ["month"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_merchants",
      description:
        "List merchants by type: Active, AtRisk, Lost, Refunded, Uninstalled. Paginated.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["Active", "AtRisk", "Lost", "Refunded", "Uninstalled"],
            description: "Merchant list type",
          },
          month: { type: "string", description: "Month YYYY-MM or YYYY-MM-01" },
          app_id: { type: "string", description: "Optional app filter" },
          page: { type: "integer", description: "Page number (default 1)" },
          page_size: { type: "integer", description: "Page size (default 25, max 100)" },
        },
        required: ["type", "month"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_trend",
      description: "Get trend over time: billed_amount or active_merchants for last N months.",
      parameters: {
        type: "object",
        properties: {
          metric: {
            type: "string",
            enum: ["billed_amount", "active_merchants"],
            description: "Metric to trend",
          },
          months_back: {
            type: "integer",
            description: "Number of months (default 12, max 24)",
          },
          app_id: { type: "string", description: "Optional app filter" },
        },
        required: ["metric"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_growth_baseline",
      description: "Get gross billed and active merchants for a month (baseline for growth plan).",
      parameters: {
        type: "object",
        properties: {
          month: { type: "string", description: "Month YYYY-MM or YYYY-MM-01" },
          app_id: { type: "string", description: "Optional app filter" },
        },
        required: ["month"],
      },
    },
  },
];

export async function executeNovaTool(
  name: string,
  args: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<string> {
  switch (name) {
    case "get_kpi":
      return toolGetKpi(supabase, {
        month: String(args.month ?? ""),
        compare_month: args.compare_month != null ? String(args.compare_month) : undefined,
        app_id: args.app_id != null ? String(args.app_id) : undefined,
      });
    case "list_merchants":
      return toolListMerchants(supabase, {
        type: String(args.type ?? "Active"),
        month: String(args.month ?? ""),
        app_id: args.app_id != null ? String(args.app_id) : undefined,
        page: typeof args.page === "number" ? args.page : undefined,
        page_size: typeof args.page_size === "number" ? args.page_size : undefined,
      });
    case "get_trend":
      return toolGetTrend(supabase, {
        metric: String(args.metric ?? "billed_amount"),
        months_back: typeof args.months_back === "number" ? args.months_back : 12,
        app_id: args.app_id != null ? String(args.app_id) : undefined,
      });
    case "get_growth_baseline":
      return toolGetGrowthBaseline(supabase, {
        month: String(args.month ?? ""),
        app_id: args.app_id != null ? String(args.app_id) : undefined,
      });
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
