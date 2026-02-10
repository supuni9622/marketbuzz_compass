"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { useApiClient } from "@/lib/api/useApiClient";
import { useFilters } from "@/app/hooks/useFilters";
import { TrendSparkline } from "./TrendSparkline";

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

function getCardVariants(reduceMotion: boolean | null) {
  if (reduceMotion) {
    return { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } };
  }
  return {
    hidden: { opacity: 0, y: 8 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.06, duration: 0.25 },
    }),
  };
}

export function Scorecards() {
  const api = useApiClient();
  const { monthApi, compareMonthApi, appId } = useFilters();
  const reduceMotion = useReducedMotion();

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
      <motion.section
        className="mt-8"
        aria-label="Scorecards loading"
        initial={false}
        animate={{ opacity: 1 }}
      >
        <h2 className="text-lg font-semibold text-slate-800">Scorecards</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      </motion.section>
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
  const cardVariants = getCardVariants(reduceMotion ?? false);
  const cards = [
    {
      key: "billed",
      title: "Gross Billed",
      value: formatCurrency(billed_amount.current),
      delta: billed_amount.delta,
      deltaPct: billed_amount.delta_pct,
      trendMetric: "billed_amount" as const,
    },
    {
      key: "active",
      title: "Active Merchants",
      value: formatNumber(active_merchants.current),
      delta: active_merchants.delta,
      deltaPct: active_merchants.delta_pct,
      trendMetric: "active_merchants" as const,
    },
    {
      key: "refunded",
      title: "Refunded",
      value: formatCurrency(refunded_amount.current),
      delta: refunded_amount.delta,
      deltaPct: refunded_amount.delta_pct,
      trendMetric: "refunded_amount" as const,
    },
  ];

  return (
    <motion.section
      className="mt-8"
      aria-label="Scorecards"
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: { staggerChildren: 0.06 },
        },
      }}
    >
      <h2 className="text-lg font-semibold text-slate-800">Scorecards</h2>
      <p className="mt-1 text-sm text-slate-500">Last 12 months trend (sparkline)</p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.key}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            variants={cardVariants}
            custom={i}
          >
            <p className="text-sm font-medium text-slate-600">{card.title}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{card.value}</p>
            <p className="mt-1 text-sm">
              <DeltaBadge delta={card.delta} deltaPct={card.deltaPct} />
            </p>
            <TrendSparkline metric={card.trendMetric} monthsBack={12} />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
