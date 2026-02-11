"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/useApiClient";
import { getErrorMessage } from "@/lib/utils";
import { useFilters } from "@/app/hooks/useFilters";
import { NarrativeBlock } from "./NarrativeBlock";

interface BriefResponse {
  month: string;
  brief_markdown: string;
  placeholder: boolean;
}

export function BriefSection() {
  const api = useApiClient();
  const { monthApi } = useFilters();
  const [hasNewContent, setHasNewContent] = useState(false);
  const prevPlaceholderRef = useRef<boolean | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["brief", monthApi],
    queryFn: () => api.get<BriefResponse>("/brief", { month: monthApi }),
  });

  const placeholder = data?.placeholder ?? true;
  const content = data?.brief_markdown ?? "Summary pending — Nova coming soon.";

  useEffect(() => {
    if (isLoading) return;
    const wasPlaceholder = prevPlaceholderRef.current;
    prevPlaceholderRef.current = placeholder;
    if ((wasPlaceholder === true || wasPlaceholder === null) && !placeholder) {
      setHasNewContent(true);
      const t = setTimeout(() => setHasNewContent(false), 700);
      return () => clearTimeout(t);
    }
  }, [isLoading, placeholder]);

  if (error) {
    return (
      <section className="mt-6" aria-label="Monthly Brief error">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300" role="alert">
          Failed to load brief. {getErrorMessage(error)}
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6" aria-label="Monthly Brief">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">MarketBuzz Monthly Brief</h2>
      <div className="mt-4">
        <NarrativeBlock
          content={content}
          placeholder={placeholder}
          isUpdating={isLoading}
          hasNewContent={hasNewContent}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href="#action-center"
          className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-sm font-medium text-teal-700 shadow-sm transition-colors hover:border-teal-300 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-teal-600 dark:bg-slate-800 dark:text-teal-300 dark:hover:bg-teal-900/30"
        >
          Show evidence
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </a>
        <Link
          href="/growth-plan"
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-teal-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:bg-teal-500 dark:hover:bg-teal-600 dark:focus:ring-offset-slate-800"
        >
          Generate growth plan
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
