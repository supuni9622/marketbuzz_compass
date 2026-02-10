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
  active_merchants: MetricWithCompare;
  refunded_amount: MetricWithCompare;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

function DeltaBadge({ delta, deltaPct }: { delta: number; deltaPct: number | null }) {
  const isPositive = delta > 0;
  const isZero = delta === 0;
  const pctStr = deltaPct != null ? `${isPositive ? "+" : ""}${deltaPct}%` : "";
  if (isZero) return <span className="text-slate-500">—</span>;
  const colorClass = isPositive ? "text-emerald-600" : "text-red-600";
  return <span className={colorClass}>{pctStr}</span>;
}

/** Minimal 2-point sparkline (compare | current) for scorecards until trend API exists */
function MiniSparkline({ compare, current }: { compare: number; current: number }) {
  const total = compare + current;
  if (total <= 0) {
    return <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100" aria-hidden />;
  }
  const compareW = (compare / total) * 100;
  const currentW = (current / total) * 100;
  return (
    <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden>
      <div
        className="bg-slate-300 transition-all duration-300"
        style={{ width: `${compareW}%` }}
      />
      <div
        className="bg-teal-500 transition-all duration-300"
        style={{ width: `${currentW}%` }}
      />
    </div>
  );
}

export function Scorecards() {
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
      <section className="mt-8" aria-label="Scorecards loading">
        <h2 className="text-lg font-semibold text-slate-800">Scorecards</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-8" aria-label="Scorecards error">
        <h2 className="text-lg font-semibold text-slate-800">Scorecards</h2>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" role="alert">
          Failed to load. {error instanceof Error ? error.message : "Unknown error."}
        </div>
      </section>
    );
  }

  if (!data) return null;

  const { billed_amount, active_merchants, refunded_amount } = data;

  return (
    <section className="mt-8" aria-label="Scorecards">
      <h2 className="text-lg font-semibold text-slate-800">Scorecards</h2>
      <p className="mt-1 text-sm text-slate-500">Compare vs previous month (bar: compare → current)</p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
          <p className="text-sm font-medium text-slate-600">Gross Billed</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{formatCurrency(billed_amount.current)}</p>
          <p className="mt-1 text-sm">
            <DeltaBadge delta={billed_amount.delta} deltaPct={billed_amount.delta_pct} />
          </p>
          <MiniSparkline compare={billed_amount.compare} current={billed_amount.current} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
          <p className="text-sm font-medium text-slate-600">Active Merchants</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{formatNumber(active_merchants.current)}</p>
          <p className="mt-1 text-sm">
            <DeltaBadge delta={active_merchants.delta} deltaPct={active_merchants.delta_pct} />
          </p>
          <MiniSparkline compare={active_merchants.compare} current={active_merchants.current} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
          <p className="text-sm font-medium text-slate-600">Refunded</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{formatCurrency(refunded_amount.current)}</p>
          <p className="mt-1 text-sm">
            <DeltaBadge delta={refunded_amount.delta} deltaPct={refunded_amount.delta_pct} />
          </p>
          <MiniSparkline compare={refunded_amount.compare} current={refunded_amount.current} />
        </div>
      </div>
    </section>
  );
}
