"use client";

import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/useApiClient";
import { useFilters } from "@/app/hooks/useFilters";
import { useState } from "react";

interface MerchantRow {
  month: string;
  merchant_id: string;
  merchant_name: string;
  app_id: string;
  app_name: string;
  lifecycle_state: string;
}

interface LifecycleResponse {
  data: MerchantRow[];
  page: number;
  page_size: number;
  total_rows: number;
}

const PAGE_SIZE = 25;

export function ActionCenterTables() {
  const api = useApiClient();
  const { monthApi, appId } = useFilters();
  const [atRiskPage, setAtRiskPage] = useState(1);
  const [lostPage, setLostPage] = useState(1);

  const atRiskQuery = useQuery({
    queryKey: ["merchants", "lifecycle", monthApi, appId, "AtRisk", atRiskPage],
    queryFn: () => {
      const params: Record<string, string> = {
        month: monthApi,
        lifecycle_state: "AtRisk",
        page: String(atRiskPage),
        page_size: String(PAGE_SIZE),
      };
      if (appId) params.app_id = appId;
      return api.get<LifecycleResponse>("/merchants/lifecycle", params);
    },
  });

  const lostQuery = useQuery({
    queryKey: ["merchants", "lifecycle", monthApi, appId, "Lost", lostPage],
    queryFn: () => {
      const params: Record<string, string> = {
        month: monthApi,
        lifecycle_state: "Lost",
        page: String(lostPage),
        page_size: String(PAGE_SIZE),
      };
      if (appId) params.app_id = appId;
      return api.get<LifecycleResponse>("/merchants/lifecycle", params);
    },
  });

  return (
    <section className="mt-8" aria-label="Action Center">
      <h2 className="text-lg font-semibold text-slate-800">Action Center</h2>

      <div className="mt-4 space-y-8">
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">At Risk</h3>
          <MerchantTable
            query={atRiskQuery}
            onPageChange={setAtRiskPage}
            currentPage={atRiskPage}
          />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Lost</h3>
          <MerchantTable
            query={lostQuery}
            onPageChange={setLostPage}
            currentPage={lostPage}
          />
        </div>
      </div>
    </section>
  );
}

function MerchantTable({
  query,
  onPageChange,
  currentPage,
}: {
  query: { data?: LifecycleResponse; isLoading: boolean; error: Error | null };
  onPageChange: (p: number) => void;
  currentPage: number;
}) {
  const { data, isLoading, error } = query;

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="h-48 animate-pulse bg-slate-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" role="alert">
        Failed to load. {error.message}
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-600">
        No merchants in this category.
      </div>
    );
  }

  const totalPages = Math.ceil(data.total_rows / data.page_size);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-700">Merchant</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700">App</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.data.map((row) => (
              <tr key={`${row.merchant_id}-${row.app_id}`} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-slate-800">{row.merchant_name}</td>
                <td className="px-4 py-2 text-slate-600">{row.app_name}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      row.lifecycle_state === "Lost"
                        ? "rounded px-1.5 py-0.5 text-xs font-medium text-red-700 bg-red-100"
                        : "rounded px-1.5 py-0.5 text-xs font-medium text-amber-700 bg-amber-100"
                    }
                  >
                    {row.lifecycle_state}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2">
          <p className="text-xs text-slate-500">
            Page {data.page} of {totalPages} ({data.total_rows} total)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={data.page <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-50 hover:bg-slate-100"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={data.page >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-50 hover:bg-slate-100"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
