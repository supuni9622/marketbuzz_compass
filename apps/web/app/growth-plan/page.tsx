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

interface GrowthPlanResponse {
  markdown: string;
  tool_calls_used: number;
}

const PRESET_GROWTH = [5, 10, 15, 20];

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

  const baseline = kpis?.billed_amount?.current ?? 0;
  const displayPct = customPct !== "" ? parseFloat(customPct) : growthPct;
  const isValidPct = !Number.isNaN(displayPct) && displayPct > 0 && displayPct <= 100;

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
