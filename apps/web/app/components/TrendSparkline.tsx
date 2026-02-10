"use client";

import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/useApiClient";
import { useFilters } from "@/app/hooks/useFilters";

interface TrendResponse {
  metric: string;
  points: { month: string; value: number }[];
}

interface TrendSparklineProps {
  metric: "billed_amount" | "active_merchants" | "refunded_amount";
  /** Height in pixels */
  height?: number;
  /** Months to show (default 12) */
  monthsBack?: number;
}

/**
 * Small line sparkline from GET /metrics/trend. Fallback to empty if no data.
 */
export function TrendSparkline({
  metric,
  height = 32,
  monthsBack = 12,
}: TrendSparklineProps) {
  const api = useApiClient();
  const { monthApi, appId } = useFilters();

  const { data } = useQuery({
    queryKey: ["trend", metric, monthApi, appId, monthsBack],
    queryFn: () => {
      const params: Record<string, string> = {
        metric,
        months_back: String(monthsBack),
      };
      if (appId) params.app_id = appId;
      return api.get<TrendResponse>("/metrics/trend", params);
    },
  });

  const points = data?.points ?? [];
  if (points.length < 2) {
    return <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100" style={{ height }} aria-hidden />;
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 120;
  const padding = 2;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const x = (i: number) => padding + (i / (points.length - 1)) * innerWidth;
  const y = (v: number) => padding + innerHeight - ((v - min) / range) * innerHeight;

  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`)
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      className="mt-2 text-teal-500"
      aria-hidden
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
