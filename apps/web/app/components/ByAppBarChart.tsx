"use client";

import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/useApiClient";
import { getErrorMessage } from "@/lib/utils";

interface ByAppRow {
  app_id: string;
  app_name: string;
  value: number;
}

interface MetricsByAppResponse {
  month: string;
  billed_amount: ByAppRow[];
  collected_amount: ByAppRow[];
  deposited_amount: ByAppRow[];
  nra_amount: ByAppRow[];
  active_merchants: ByAppRow[];
  refunded_amount: ByAppRow[];
}

type MetricKey = "billed_amount" | "collected_amount" | "deposited_amount" | "nra_amount" | "active_merchants" | "refunded_amount";

interface ByAppBarChartProps {
  month: string;
  metricKey: MetricKey;
  formatValue?: (n: number) => string;
}

/**
 * Horizontal bar chart of metric by app for one month (Evidence zone).
 */
export function ByAppBarChart({
  month,
  metricKey,
  formatValue = (n) => n.toLocaleString(),
}: ByAppBarChartProps) {
  const api = useApiClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["metrics", "by-app", month],
    queryFn: () =>
      api.get<MetricsByAppResponse>("/metrics/by-app", { month }),
  });

  const rows = data?.[metricKey] ?? [];
  const maxVal = rows.length ? Math.max(...rows.map((r) => r.value), 1) : 1;

  if (isLoading) {
    return <p className="mt-2 text-sm text-slate-500">Loading breakdown…</p>;
  }
  if (error) {
    return (
      <p className="mt-2 text-sm text-red-600" role="alert">
        {getErrorMessage(error, "Failed to load breakdown.")}
      </p>
    );
  }
  if (rows.length === 0) {
    return <p className="mt-2 text-sm text-slate-500">No data by app for this month.</p>;
  }

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-xs font-medium text-slate-500">By app ({data?.month ?? month})</p>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.app_id} className="flex items-center gap-2 text-sm">
            <span className="w-24 shrink-0 truncate text-slate-600" title={r.app_name}>
              {r.app_name || r.app_id}
            </span>
            <div className="min-w-0 flex-1">
              <div
                className="h-6 rounded bg-teal-600 dark:bg-teal-500"
                style={{
                  width: `${Math.max(4, (r.value / maxVal) * 100)}%`,
                }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-slate-700">
              {formatValue(r.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
