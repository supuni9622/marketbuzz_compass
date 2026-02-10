"use client";

import { useEffect, useRef, useState } from "react";
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
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" role="alert">
          Failed to load brief. {error instanceof Error ? error.message : "Unknown error."}
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6" aria-label="Monthly Brief">
      <h2 className="text-lg font-semibold text-slate-800">MarketBuzz Monthly Brief</h2>
      <div className="mt-4">
        <NarrativeBlock
          content={content}
          placeholder={placeholder}
          isUpdating={isLoading}
          hasNewContent={hasNewContent}
        />
      </div>
    </section>
  );
}
