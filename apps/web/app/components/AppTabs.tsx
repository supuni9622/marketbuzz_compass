"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { APP_OPTIONS } from "@/lib/filters";

/**
 * App tabs: set the app filter via URL. Same effect as GlobalFilters App dropdown.
 * Per UI_LAYOUT_SPEC — App Health / per-app views.
 */
export function AppTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentApp = searchParams.get("app") ?? "";

  const buildUrl = useCallback(
    (appValue: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (appValue) next.set("app", appValue);
      else next.delete("app");
      const q = next.toString();
      return pathname + (q ? `?${q}` : "");
    },
    [pathname, searchParams]
  );

  return (
    <div className="border-b border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800" aria-label="App filter">
      <div className="mx-auto max-w-6xl px-4">
        <nav className="-mb-px flex gap-1" aria-label="App tabs">
          {APP_OPTIONS.map((opt) => {
            const isActive =
              (opt.value === "" && currentApp === "") || opt.value === currentApp;
            return (
              <Link
                key={opt.value || "all"}
                href={buildUrl(opt.value)}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-300"
                    : "border-transparent text-slate-500 hover:border-teal-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-teal-500 dark:hover:text-slate-200"
                }`}
              >
                {opt.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
