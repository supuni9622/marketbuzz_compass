"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { getCurrentMonth, getPreviousMonth, APP_OPTIONS } from "@/lib/filters";

const MONTH_OPTIONS = (() => {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const value = `${y}-${m}`;
    const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    options.push({ value, label });
  }
  return options;
})();

export function GlobalFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [copyFeedback, setCopyFeedback] = useState(false);

  const month = searchParams.get("month") ?? getCurrentMonth();
  const compareMonth = searchParams.get("compare") ?? getPreviousMonth(month);
  const appId = searchParams.get("app") ?? "";

  const copyLink = useCallback(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has("month")) params.set("month", month);
    if (!params.has("compare")) params.set("compare", compareMonth);
    if (appId && !params.has("app")) params.set("app", appId);
    const query = params.toString();
    const url = `${window.location.origin}${pathname}${query ? `?${query}` : ""}`;
    navigator.clipboard.writeText(url).then(
      () => {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      },
      () => {}
    );
  }, [pathname, searchParams, month, compareMonth, appId]);

  const setParams = useCallback(
    (updates: { month?: string; compare?: string; app?: string }) => {
      const next = new URLSearchParams(searchParams.toString());
      if (updates.month !== undefined) next.set("month", updates.month);
      if (updates.compare !== undefined) next.set("compare", updates.compare);
      if (updates.app !== undefined) next.set("app", updates.app);
      router.replace(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="filter-month" className="text-sm font-medium text-slate-600">
            Month
          </label>
          <select
            id="filter-month"
            value={month}
            onChange={(e) => {
              const m = e.target.value;
              setParams({ month: m, compare: getPreviousMonth(m) });
            }}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            {MONTH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="filter-compare" className="text-sm font-medium text-slate-600">
            Compare
          </label>
          <select
            id="filter-compare"
            value={compareMonth}
            onChange={(e) => setParams({ compare: e.target.value })}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value={getPreviousMonth(month)}>Previous month</option>
            {MONTH_OPTIONS.filter((o) => o.value !== month).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="filter-app" className="text-sm font-medium text-slate-600">
            App
          </label>
          <select
            id="filter-app"
            value={appId}
            onChange={(e) => setParams({ app: e.target.value })}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            {APP_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto">
          <button
            type="button"
            onClick={copyLink}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            title="Copy link to this view (current filters)"
          >
            {copyFeedback ? "Copied!" : "Copy link"}
          </button>
        </div>
      </div>
    </header>
  );
}
