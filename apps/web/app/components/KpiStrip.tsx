"use client";

import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/useApiClient";
import { useFilters } from "@/app/hooks/useFilters";

interface MetricWithCompare {
  current: number;
  compare: number;
  delta: number;
  delta_pct: number | null;
}

interface KpisResponse {
  month: string;
  compare_month: string;
  billed_amount: MetricWithCompare;
  billed_count: MetricWithCompare;
  active_merchants: MetricWithCompare;
  refunded_amount: MetricWithCompare;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

function DeltaBadge({ delta, deltaPct }: { delta: number; deltaPct: number | null }) {
  const isPositive = delta > 0;
  const isNegative = delta < 0;
  const isZero = delta === 0;
  const pctStr = deltaPct != null ? `${isPositive ? "+" : ""}${deltaPct}%` : "";

  if (isZero) {
    return <span className="text-slate-500 dark:text-slate-400">—</span>;
  }
  const colorClass = isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
  return (
    <span className={colorClass}>
      {isPositive ? "+" : ""}
      {pctStr}
    </span>
  );
}

export function KpiStrip() {
  const api = useApiClient();
  const { monthApi, compareMonthApi, appId } = useFilters();

  const { data, isLoading, error } = useQuery({
    queryKey: ["kpis", monthApi, compareMonthApi, appId],
    queryFn: () => {
      const params: Record<string, string> = { month: monthApi, compare_month: compareMonthApi };
      if (appId) params.app_id = appId;
      return api.get<KpisResponse>("/metrics/kpis", params);
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="KPI strip loading">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-600 dark:bg-slate-700" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300" role="alert">
        Failed to load KPIs. {error instanceof Error ? error.message : "Unknown error."}
      </div>
    );
  }

  if (!data) return null;

  const { billed_amount, active_merchants, refunded_amount } = data;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="KPI strip">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md transition-shadow hover:shadow-lg dark:border-slate-600 dark:bg-slate-800">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Gross Billed</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(billed_amount.current)}</p>
        <p className="mt-1 text-sm">
          <DeltaBadge delta={billed_amount.delta} deltaPct={billed_amount.delta_pct} />
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md transition-shadow hover:shadow-lg dark:border-slate-600 dark:bg-slate-800">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Active Merchants</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatNumber(active_merchants.current)}</p>
        <p className="mt-1 text-sm">
          <DeltaBadge delta={active_merchants.delta} deltaPct={active_merchants.delta_pct} />
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md transition-shadow hover:shadow-lg dark:border-slate-600 dark:bg-slate-800">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Refunded</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(refunded_amount.current)}</p>
        <p className="mt-1 text-sm">
          <DeltaBadge delta={refunded_amount.delta} deltaPct={refunded_amount.delta_pct} />
        </p>
      </div>
    </div>
  );
}
