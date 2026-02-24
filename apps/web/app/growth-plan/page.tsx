"use client";

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "../components/AppHeader";
import { useApiClient } from "@/lib/api/useApiClient";
import { useFilters } from "../hooks/useFilters";

interface KpisResponse {
  month: string;
  billed_amount: { current: number; compare: number; delta: number; delta_pct: number | null };
}

interface LeverBreakdownRow {
  lever: string;
  expected_contribution: string;
  confidence: string;
}

interface ExecutionListItem {
  label: string;
}

interface NraByPlanRow {
  plan: string;
  required: string;
}

interface ExecutionLists {
  at_risk?: ExecutionListItem[];
  upgrade_candidates?: ExecutionListItem[];
  lost?: ExecutionListItem[];
  nra_by_plan?: NraByPlanRow[];
}

interface GrowthPlanResponse {
  markdown: string;
  tool_calls_used: number;
  lever_breakdown?: LeverBreakdownRow[];
  execution_lists?: ExecutionLists;
}

interface TrendResponse {
  metric: string;
  points: { month: string; value: number }[];
}

const PRESET_GROWTH = [5, 10, 15, 20];

/** Parse "$5,000" or "5000" to number for waterfall. */
function parseContribution(s: string): number {
  const n = parseFloat(String(s).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Line chart: last 6 months + target marker (SVG, no deps). */
function GrowthPlanLineChart({
  points,
  target,
  formatCurrency,
}: {
  points: { month: string; value: number }[];
  target: number;
  formatCurrency: (n: number) => string;
}) {
  const width = 400;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 28, left: 48 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const allValues = [...points.map((p) => p.value), target].filter(Number.isFinite);
  const minY = Math.min(0, ...allValues);
  const maxY = Math.max(...allValues, 1);
  const range = maxY - minY || 1;
  const x = (i: number) => padding.left + (i / Math.max(1, points.length - 1)) * innerWidth;
  const y = (v: number) => padding.top + innerHeight - ((v - minY) / range) * innerHeight;
  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`)
    .join(" ");
  const shortMonth = (m: string) => {
    const match = m.match(/^(\d{4})-(\d{2})/);
    if (!match || match[1] === undefined || match[2] === undefined) return m;
    const d = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, 1);
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  };
  return (
    <svg width={width} height={height} className="text-slate-700 dark:text-slate-300" aria-hidden>
      <path d={pathD} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-teal-600 dark:text-teal-400" />
      {target > 0 && (
        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={y(target)}
          y2={y(target)}
          stroke="currentColor"
          strokeDasharray="4 2"
          strokeWidth={1}
          className="text-amber-600 dark:text-amber-400"
        />
      )}
      {points.map((p, i) => (
        <text key={p.month} x={x(i)} y={height - 6} textAnchor="middle" className="fill-current text-[10px]">
          {shortMonth(p.month)}
        </text>
      ))}
      <text x={padding.left - 4} y={padding.top + innerHeight / 2} textAnchor="end" className="fill-current text-[10px]">
        {formatCurrency(maxY)}
      </text>
      <text x={padding.left - 4} y={height - padding.bottom} textAnchor="end" className="fill-current text-[10px]">
        {formatCurrency(minY)}
      </text>
    </svg>
  );
}

/** Waterfall: baseline → levers → target (div bars). */
function GrowthPlanWaterfall({
  baseline,
  leverBreakdown,
  target,
  formatCurrency,
}: {
  baseline: number;
  leverBreakdown: LeverBreakdownRow[];
  target: number;
  formatCurrency: (n: number) => string;
}) {
  const contributions = leverBreakdown.map((r) => parseContribution(r.expected_contribution));
  const totalLever = contributions.reduce((a, b) => a + b, 0);
  const maxVal = Math.max(baseline, target, baseline + totalLever, 1);
  const maxBarWidth = 200;
  const w = (v: number) => Math.max(2, (Math.abs(v) / maxVal) * maxBarWidth);
  const items: { label: string; value: number; type: "baseline" | "lever" | "target" }[] = [
    { label: "Baseline", value: baseline, type: "baseline" },
    ...leverBreakdown.map((r, i) => ({ label: `+ ${r.lever}`, value: contributions[i] ?? 0, type: "lever" as const })),
    { label: "Target", value: target, type: "target" },
  ];
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <span className="w-24 shrink-0 text-slate-600 dark:text-slate-300">{item.label}</span>
          <div
            className="h-6 shrink-0 rounded bg-teal-500/80 dark:bg-teal-500/60"
            style={{
              width: w(item.value),
              backgroundColor: item.type === "target" ? "rgb(234 179 8 / 0.7)" : item.type === "baseline" ? "rgb(14 165 233 / 0.7)" : undefined,
            }}
            title={formatCurrency(item.value)}
          />
          <span className="text-slate-700 dark:text-slate-300">{formatCurrency(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function GrowthPlanPage() {
  const api = useApiClient();
  const { monthApi, appId } = useFilters();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [growthPct, setGrowthPct] = useState<number>(10);
  const [customPct, setCustomPct] = useState("");
  const [result, setResult] = useState<GrowthPlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: kpis } = useQuery({
    queryKey: ["kpis", monthApi, appId],
    queryFn: () =>
      api.get<KpisResponse>("/metrics/kpis", {
        month: monthApi,
        ...(appId ? { app_id: appId } : {}),
      }),
    enabled: !!monthApi,
  });

  const { data: trend } = useQuery({
    queryKey: ["trend", "billed_amount", monthApi, appId, 6],
    queryFn: () => {
      const params: Record<string, string> = {
        metric: "billed_amount",
        months_back: "6",
      };
      if (appId) params.app_id = appId;
      return api.get<TrendResponse>("/metrics/trend", params);
    },
    enabled: step === 3 && !!monthApi,
  });

  const baseline = kpis?.billed_amount?.current ?? 0;
  const displayPct = customPct !== "" ? parseFloat(customPct) : growthPct;
  const isValidPct = !Number.isNaN(displayPct) && displayPct > 0 && displayPct <= 100;
  const targetAmount = baseline * (1 + (displayPct / 100));

  const runPlan = useCallback(async () => {
    if (!monthApi || !isValidPct) return;
    setError(null);
    setIsLoading(true);
    setResult(null);
    try {
      const res = await api.post<GrowthPlanResponse>("/nova/growth-plan", {
        month: monthApi,
        growth_pct: displayPct,
        ...(appId ? { app_id: appId } : {}),
      });
      setResult(res);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate growth plan.");
    } finally {
      setIsLoading(false);
    }
  }, [api, monthApi, appId, displayPct, isValidPct]);

  const reset = useCallback(() => {
    setStep(1);
    setGrowthPct(10);
    setCustomPct("");
    setResult(null);
    setError(null);
  }, []);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <main className="min-h-screen bg-gradient-to-b from-teal-50/50 to-slate-50/80 dark:from-slate-900 dark:to-slate-900">
      <AppHeader />
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Growth Plan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Set a target growth % for the next month. Nova will produce a plan by levers (retention, expansion, win-back, acquisition).
        </p>

        {step === 1 && (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
            <h2 className="text-lg font-medium text-slate-800">Step 1: Baseline</h2>
            <p className="mt-2 text-slate-600">
              Last month gross billed: <strong>{formatCurrency(baseline)}</strong>
              {monthApi && (
                <span className="text-slate-500"> (Month: {monthApi})</span>
              )}
            </p>
            {appId && (
              <p className="mt-1 text-sm text-slate-500">Filtered by app: {appId}</p>
            )}
            <button
              type="button"
              onClick={() => setStep(2)}
              className="mt-6 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-teal-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              Next — Set target
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-md transition-shadow hover:shadow-lg dark:border-slate-600 dark:bg-slate-800">
            <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100">Step 2: Target growth %</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300">Choose or enter target growth for next month.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {PRESET_GROWTH.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setGrowthPct(p);
                    setCustomPct("");
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    customPct === "" && growthPct === p
                      ? "border-teal-600 bg-teal-50 text-teal-700"
                      : "border-slate-300 bg-white text-slate-700 hover:border-teal-300 hover:bg-slate-50"
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>
            <div className="mt-4">
              <label htmlFor="custom-pct" className="text-sm font-medium text-slate-600">
                Or custom %
              </label>
              <input
                id="custom-pct"
                type="number"
                min={0.1}
                max={100}
                step={0.5}
                value={customPct}
                onChange={(e) => setCustomPct(e.target.value)}
                placeholder="e.g. 12.5"
                className="mt-1 w-24 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            {error && (
              <div className="mt-4 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300" role="alert">
                {error}
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={runPlan}
                disabled={!isValidPct || isLoading}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-teal-700 hover:shadow-md disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
              >
                {isLoading ? "Generating…" : `Generate plan (${displayPct}%)`}
              </button>
            </div>
          </div>
        )}

        {step === 3 && result && (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-md transition-shadow hover:shadow-lg dark:border-slate-600 dark:bg-slate-800">
            <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100">Growth plan</h2>

            {/* Line chart: last 6 months + target marker */}
            {trend?.points && trend.points.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">Last 6 months + target</h3>
                <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-600 dark:bg-slate-700/30">
                  <GrowthPlanLineChart
                    points={trend.points}
                    target={targetAmount}
                    formatCurrency={formatCurrency}
                  />
                </div>
              </div>
            )}

            {/* Waterfall: baseline → levers → target */}
            {(baseline > 0 || targetAmount > 0) && result.lever_breakdown && result.lever_breakdown.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">Waterfall: baseline → levers → target</h3>
                <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-600 dark:bg-slate-700/30">
                  <GrowthPlanWaterfall
                    baseline={baseline}
                    leverBreakdown={result.lever_breakdown}
                    target={targetAmount}
                    formatCurrency={formatCurrency}
                  />
                </div>
              </div>
            )}

            {result.lever_breakdown && result.lever_breakdown.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">Lever Breakdown</h3>
                <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-600">
                  <table className="w-full min-w-[280px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700/50">
                        <th className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">Lever</th>
                        <th className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">Expected Contribution</th>
                        <th className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.lever_breakdown.map((row, i) => (
                        <tr
                          key={i}
                          className="border-b border-slate-100 last:border-0 dark:border-slate-600"
                        >
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{row.lever}</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{row.expected_contribution}</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{row.confidence}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {result.execution_lists && (
              (result.execution_lists.at_risk?.length ?? 0) +
              (result.execution_lists.upgrade_candidates?.length ?? 0) +
              (result.execution_lists.lost?.length ?? 0) +
              (result.execution_lists.nra_by_plan?.length ?? 0) > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">Execution lists</h3>
                <div className="mt-2 space-y-3">
                  {result.execution_lists.at_risk && result.execution_lists.at_risk.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-slate-600 dark:text-slate-300">At Risk merchants to contact</h4>
                      <div className="mt-1 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-600">
                        <table className="w-full min-w-[200px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700/50">
                              <th className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">Merchant</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.execution_lists.at_risk.map((item, i) => (
                              <tr key={i} className="border-b border-slate-100 last:border-0 dark:border-slate-600">
                                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{item.label}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {result.execution_lists.upgrade_candidates && result.execution_lists.upgrade_candidates.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-slate-600 dark:text-slate-300">Upgrade candidates</h4>
                      <div className="mt-1 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-600">
                        <table className="w-full min-w-[200px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700/50">
                              <th className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">Merchant</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.execution_lists.upgrade_candidates.map((item, i) => (
                              <tr key={i} className="border-b border-slate-100 last:border-0 dark:border-slate-600">
                                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{item.label}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {result.execution_lists.lost && result.execution_lists.lost.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-slate-600 dark:text-slate-300">Lost merchants to target</h4>
                      <div className="mt-1 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-600">
                        <table className="w-full min-w-[200px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700/50">
                              <th className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">Merchant</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.execution_lists.lost.map((item, i) => (
                              <tr key={i} className="border-b border-slate-100 last:border-0 dark:border-slate-600">
                                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{item.label}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {result.execution_lists.nra_by_plan && result.execution_lists.nra_by_plan.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-slate-600 dark:text-slate-300">Required NRA by plan</h4>
                      <div className="mt-1 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-600">
                        <table className="w-full min-w-[200px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700/50">
                              <th className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">Plan</th>
                              <th className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">Required</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.execution_lists.nra_by_plan.map((row, i) => (
                              <tr key={i} className="border-b border-slate-100 last:border-0 dark:border-slate-600">
                                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{row.plan}</td>
                                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{row.required}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="mt-4 whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
              {result.markdown}
            </div>
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Nova used {result.tool_calls_used} tool call(s) to build this plan.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              Start over
            </button>
          </div>
        )}

        {step === 3 && !result && !isLoading && (
          <div className="mt-8">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-teal-700 hover:shadow-md"
            >
              Back to target
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
