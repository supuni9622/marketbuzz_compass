"use client";

import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/useApiClient";
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

  const { data, isLoading, error } = useQuery({
    queryKey: ["brief", monthApi],
    queryFn: () => api.get<BriefResponse>("/brief", { month: monthApi }),
  });

  if (isLoading) {
    return (
      <section className="mt-6" aria-label="Monthly Brief loading">
        <div className="flex gap-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-slate-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-6" aria-label="Monthly Brief error">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" role="alert">
          Failed to load brief. {error instanceof Error ? error.message : "Unknown error."}
        </div>
      </section>
    );
  }

  const content = data?.brief_markdown ?? "Summary pending — Nova coming soon.";
  const placeholder = data?.placeholder ?? true;

  return (
    <section className="mt-6" aria-label="Monthly Brief">
      <h2 className="text-lg font-semibold text-slate-800">MarketBuzz Monthly Brief</h2>
      <div className="mt-4">
        <NarrativeBlock content={content} placeholder={placeholder} />
      </div>
    </section>
  );
}
