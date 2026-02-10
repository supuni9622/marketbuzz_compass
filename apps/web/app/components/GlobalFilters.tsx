"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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

interface FilterDropdownOption {
  value: string;
  label: string;
}

function FilterDropdown({
  id,
  label,
  value,
  options,
  onChange,
  maxHeight = "max-h-60",
}: {
  id: string;
  label: string;
  value: string;
  options: readonly FilterDropdownOption[];
  onChange: (value: string) => void;
  maxHeight?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption?.label ?? value;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <label htmlFor={id} className="text-sm font-medium text-slate-600">
        {label}
      </label>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="mt-0.5 flex min-w-[7rem] items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-800 shadow-sm transition-colors hover:border-teal-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
      >
        <span className="truncate">{displayLabel}</span>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className={`absolute left-0 top-full z-50 mt-1 w-full min-w-[10rem] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg ${maxHeight}`}
          aria-label={label}
        >
          {options.map((o) => {
            const isSelected = o.value === value;
            return (
              <li key={`${o.value || "all"}-${o.label}`} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                    isSelected
                      ? "bg-teal-50 font-medium text-teal-800"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {o.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

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

  const compareOptions: FilterDropdownOption[] = [
    { value: getPreviousMonth(month), label: "Previous month" },
    ...MONTH_OPTIONS.filter((o) => o.value !== month),
  ];

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-end gap-4">
        <FilterDropdown
          id="filter-month"
          label="Month"
          value={month}
          options={MONTH_OPTIONS}
          onChange={(m) => setParams({ month: m, compare: getPreviousMonth(m) })}
        />
        <FilterDropdown
          id="filter-compare"
          label="Compare"
          value={compareMonth}
          options={compareOptions}
          onChange={(c) => setParams({ compare: c })}
        />
        <FilterDropdown
          id="filter-app"
          label="App"
          value={appId}
          options={APP_OPTIONS}
          onChange={(a) => setParams({ app: a })}
          maxHeight="max-h-48"
        />
        <div className="ml-auto pb-0.5">
          <button
            type="button"
            onClick={copyLink}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-teal-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            title="Copy link to this view (current filters)"
          >
            {copyFeedback ? "Copied!" : "Copy link"}
          </button>
        </div>
      </div>
    </header>
  );
}
