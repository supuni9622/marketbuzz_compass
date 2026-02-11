"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/useApiClient";
import { useFilters } from "@/app/hooks/useFilters";
import { getErrorMessage } from "@/lib/utils";
import { useState } from "react";

const ACTION_CENTER_IDS = [
  "action-center",
  "action-center-at-risk",
  "action-center-lost",
  "action-center-critical-churn",
  "action-center-onhold",
  "action-center-refunds",
  "action-center-uninstalls",
];

interface MerchantRow {
  month: string;
  merchant_id: string;
  merchant_name: string;
  app_id: string;
  app_name: string;
  lifecycle_state: string;
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function merchantRowsToCsv(rows: MerchantRow[]): string {
  const header = ["Month", "Merchant ID", "Merchant Name", "App ID", "App Name", "Lifecycle State"];
  const lines = [header.map(escapeCsvCell).join(",")];
  for (const r of rows) {
    lines.push(
      [r.month, r.merchant_id, r.merchant_name, r.app_id, r.app_name, r.lifecycle_state].map(
        escapeCsvCell
      ).join(",")
    );
  }
  return lines.join("\r\n");
}

interface RefundRow {
  month: string;
  merchant_id: string;
  merchant_name: string;
  app_id: string;
  refund_amount: number;
  charge_id: string;
}

function refundRowsToCsv(rows: RefundRow[]): string {
  const header = ["Month", "Merchant ID", "Merchant Name", "App ID", "Refund Amount", "Charge ID"];
  const lines = [header.map(escapeCsvCell).join(",")];
  for (const r of rows) {
    lines.push(
      [r.month, r.merchant_id, r.merchant_name, r.app_id, String(r.refund_amount), r.charge_id].map(
        escapeCsvCell
      ).join(",")
    );
  }
  return lines.join("\r\n");
}

interface UninstallRow {
  uninstall_month: string;
  merchant_id: string;
  merchant_name: string;
  app_id: string;
  uninstall_date: string;
}

function uninstallRowsToCsv(rows: UninstallRow[]): string {
  const header = ["Uninstall Month", "Merchant ID", "Merchant Name", "App ID", "Uninstall Date"];
  const lines = [header.map(escapeCsvCell).join(",")];
  for (const r of rows) {
    lines.push(
      [r.uninstall_month, r.merchant_id, r.merchant_name, r.app_id, r.uninstall_date].map(
        escapeCsvCell
      ).join(",")
    );
  }
  return lines.join("\r\n");
}

interface HighRiskChurnRow {
  month: string;
  merchant_id: string;
  merchant_name: string;
  app_id: string;
  refund_amount: number;
  uninstall_date: string;
  last_active_month: string;
}

function highRiskChurnRowsToCsv(rows: HighRiskChurnRow[]): string {
  const header = ["Month", "Merchant ID", "Merchant Name", "App ID", "Refund Amount", "Uninstall Date", "Last Active Month"];
  const lines = [header.map(escapeCsvCell).join(",")];
  for (const r of rows) {
    lines.push(
      [r.month, r.merchant_id, r.merchant_name, r.app_id, String(r.refund_amount), r.uninstall_date, r.last_active_month].map(
        escapeCsvCell
      ).join(",")
    );
  }
  return lines.join("\r\n");
}

interface OnHoldChargeRow {
  charge_id: string;
  merchant_id: string;
  merchant_name: string;
  app_id: string;
  app_name: string;
  amount: number;
  status_current: string;
}

function onHoldRowsToCsv(rows: OnHoldChargeRow[]): string {
  const header = ["Charge ID", "Merchant ID", "Merchant Name", "App ID", "App Name", "Amount", "Status"];
  const lines = [header.map(escapeCsvCell).join(",")];
  for (const r of rows) {
    lines.push(
      [r.charge_id, r.merchant_id, r.merchant_name, r.app_id, r.app_name, String(r.amount), r.status_current].map(
        escapeCsvCell
      ).join(",")
    );
  }
  return lines.join("\r\n");
}

function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface LifecycleResponse {
  data: MerchantRow[];
  page: number;
  page_size: number;
  total_rows: number;
}

interface RefundsResponse {
  data: RefundRow[];
  page: number;
  page_size: number;
  total_rows: number;
}

interface UninstallsResponse {
  data: UninstallRow[];
  page: number;
  page_size: number;
  total_rows: number;
}

interface HighRiskChurnResponse {
  data: HighRiskChurnRow[];
  page: number;
  page_size: number;
  total_rows: number;
}

interface OnHoldResponse {
  data: OnHoldChargeRow[];
  page: number;
  page_size: number;
  total_rows: number;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export function ActionCenterTables() {
  const api = useApiClient();
  const { monthApi, appId } = useFilters();
  const [pageSize, setPageSize] = useState(25);
  const [atRiskPage, setAtRiskPage] = useState(1);
  const [lostPage, setLostPage] = useState(1);
  const [criticalChurnPage, setCriticalChurnPage] = useState(1);
  const [onHoldPage, setOnHoldPage] = useState(1);
  const [refundsPage, setRefundsPage] = useState(1);
  const [uninstallsPage, setUninstallsPage] = useState(1);

  const atRiskQuery = useQuery({
    queryKey: ["merchants", "lifecycle", monthApi, appId, "AtRisk", atRiskPage, pageSize],
    queryFn: () => {
      const params: Record<string, string> = {
        month: monthApi,
        lifecycle_state: "AtRisk",
        page: String(atRiskPage),
        page_size: String(pageSize),
      };
      if (appId) params.app_id = appId;
      return api.get<LifecycleResponse>("/merchants/lifecycle", params);
    },
  });

  const lostQuery = useQuery({
    queryKey: ["merchants", "lifecycle", monthApi, appId, "Lost", lostPage, pageSize],
    queryFn: () => {
      const params: Record<string, string> = {
        month: monthApi,
        lifecycle_state: "Lost",
        page: String(lostPage),
        page_size: String(pageSize),
      };
      if (appId) params.app_id = appId;
      return api.get<LifecycleResponse>("/merchants/lifecycle", params);
    },
  });

  const refundsQuery = useQuery({
    queryKey: ["merchants", "refunds", monthApi, appId, refundsPage, pageSize],
    queryFn: () => {
      const params: Record<string, string> = {
        month: monthApi,
        page: String(refundsPage),
        page_size: String(pageSize),
      };
      if (appId) params.app_id = appId;
      return api.get<RefundsResponse>("/merchants/refunds", params);
    },
  });

  const uninstallsQuery = useQuery({
    queryKey: ["merchants", "uninstalls", monthApi, appId, uninstallsPage, pageSize],
    queryFn: () => {
      const params: Record<string, string> = {
        month: monthApi,
        page: String(uninstallsPage),
        page_size: String(pageSize),
      };
      if (appId) params.app_id = appId;
      return api.get<UninstallsResponse>("/merchants/uninstalls", params);
    },
  });

  const criticalChurnQuery = useQuery({
    queryKey: ["merchants", "high-risk-churn", monthApi, appId, criticalChurnPage, pageSize],
    queryFn: () => {
      const params: Record<string, string> = {
        month: monthApi,
        page: String(criticalChurnPage),
        page_size: String(pageSize),
      };
      if (appId) params.app_id = appId;
      return api.get<HighRiskChurnResponse>("/merchants/high-risk-churn", params);
    },
  });

  const onHoldQuery = useQuery({
    queryKey: ["merchants", "onhold", monthApi, appId, onHoldPage, pageSize],
    queryFn: () => {
      const params: Record<string, string> = {
        month: monthApi,
        page: String(onHoldPage),
        page_size: String(pageSize),
      };
      if (appId) params.app_id = appId;
      return api.get<OnHoldResponse>("/merchants/onhold", params);
    },
  });

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    if (hash && ACTION_CENTER_IDS.includes(hash)) {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [monthApi, appId]);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setAtRiskPage(1);
    setLostPage(1);
    setCriticalChurnPage(1);
    setOnHoldPage(1);
    setRefundsPage(1);
    setUninstallsPage(1);
  };

  return (
    <section id="action-center" className="mt-8 scroll-mt-6" aria-label="Action Center">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Action Center</h2>
        <div className="flex items-center gap-2">
          <label htmlFor="action-center-page-size" className="text-sm text-slate-600 dark:text-slate-400">
            Rows per page
          </label>
          <select
            id="action-center-page-size"
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            aria-label="Rows per page"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-8">
        <div id="action-center-at-risk" className="scroll-mt-6">
          <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">At Risk</h3>
          <MerchantTable
            query={atRiskQuery}
            onPageChange={setAtRiskPage}
            currentPage={atRiskPage}
            exportLabel="at-risk"
          />
        </div>
        <div id="action-center-lost" className="scroll-mt-6">
          <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Lost</h3>
          <MerchantTable
            query={lostQuery}
            onPageChange={setLostPage}
            currentPage={lostPage}
            exportLabel="lost"
          />
        </div>
        <div id="action-center-critical-churn" className="scroll-mt-6">
          <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Critical Churn</h3>
          <HighRiskChurnTable
            query={criticalChurnQuery}
            onPageChange={setCriticalChurnPage}
            currentPage={criticalChurnPage}
          />
        </div>
        <div id="action-center-onhold" className="scroll-mt-6">
          <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Payment at risk (ON HOLD)</h3>
          <OnHoldTable
            query={onHoldQuery}
            onPageChange={setOnHoldPage}
            currentPage={onHoldPage}
          />
        </div>
        <div id="action-center-refunds" className="scroll-mt-6">
          <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Refunds</h3>
          <RefundTable
            query={refundsQuery}
            onPageChange={setRefundsPage}
            currentPage={refundsPage}
          />
        </div>
        <div id="action-center-uninstalls" className="scroll-mt-6">
          <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Uninstalls</h3>
          <UninstallTable
            query={uninstallsQuery}
            onPageChange={setUninstallsPage}
            currentPage={uninstallsPage}
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
  exportLabel,
}: {
  query: { data?: LifecycleResponse; isLoading: boolean; error: Error | null };
  onPageChange: (p: number) => void;
  currentPage: number;
  exportLabel: string;
}) {
  const { data, isLoading, error } = query;

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
        <div className="h-48 animate-pulse bg-slate-100 dark:bg-slate-700" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300" role="alert">
        Failed to load. {getErrorMessage(error)}
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-600 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
        No merchants in this category.
      </div>
    );
  }

  const totalPages = Math.ceil(data.total_rows / data.page_size);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md dark:border-slate-600 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-600">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Merchant</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">App</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.data.map((row) => (
              <tr key={`${row.merchant_id}-${row.app_id}`} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/50">
                <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{row.merchant_name}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{row.app_name}</td>
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
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-2 dark:border-slate-600">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Page {data.page} of {totalPages} ({data.total_rows} total)
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const csv = merchantRowsToCsv(data.data);
                const filename = `merchants-${exportLabel}-page${data.page}.csv`;
                downloadCsv(csv, filename);
              }}
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-teal-700 hover:shadow-md dark:bg-teal-500 dark:hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1"
            >
              Export CSV
            </button>
            {totalPages > 1 && (
              <>
                <button
                  type="button"
                  disabled={data.page <= 1}
                  onClick={() => onPageChange(currentPage - 1)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition-colors disabled:opacity-50 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-600"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={data.page >= totalPages}
                  onClick={() => onPageChange(currentPage + 1)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition-colors disabled:opacity-50 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-600"
                >
                  Next
                </button>
              </>
            )}
          </div>
        </div>
    </div>
  );
}

function RefundTable({
  query,
  onPageChange,
  currentPage,
}: {
  query: { data?: RefundsResponse; isLoading: boolean; error: Error | null };
  onPageChange: (p: number) => void;
  currentPage: number;
}) {
  const { data, isLoading, error } = query;
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
        <div className="h-48 animate-pulse bg-slate-100 dark:bg-slate-700" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300" role="alert">
        Failed to load. {getErrorMessage(error)}
      </div>
    );
  }
  if (!data || data.data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-600 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
        No refunds in this month.
      </div>
    );
  }
  const totalPages = Math.ceil(data.total_rows / data.page_size);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md dark:border-slate-600 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-600">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Merchant</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">App</th>
              <th className="px-4 py-2 text-right font-medium text-slate-700 dark:text-slate-300">Refund Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.data.map((row, i) => (
              <tr key={`${row.charge_id}-${i}`} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/50">
                <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{row.merchant_name}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{row.app_id}</td>
                <td className="px-4 py-2 text-right text-slate-800">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(row.refund_amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-2 dark:border-slate-600">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Page {data.page} of {totalPages} ({data.total_rows} total)
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              downloadCsv(refundRowsToCsv(data.data), `merchants-refunds-page${data.page}.csv`);
            }}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-teal-700 hover:shadow-md dark:bg-teal-500 dark:hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1"
          >
            Export CSV
          </button>
          {totalPages > 1 && (
            <>
              <button
                type="button"
                disabled={data.page <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition-colors disabled:opacity-50 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-600"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={data.page >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition-colors disabled:opacity-50 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-600"
              >
                Next
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function UninstallTable({
  query,
  onPageChange,
  currentPage,
}: {
  query: { data?: UninstallsResponse; isLoading: boolean; error: Error | null };
  onPageChange: (p: number) => void;
  currentPage: number;
}) {
  const { data, isLoading, error } = query;
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
        <div className="h-48 animate-pulse bg-slate-100 dark:bg-slate-700" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300" role="alert">
        Failed to load. {getErrorMessage(error)}
      </div>
    );
  }
  if (!data || data.data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-600 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
        No uninstalls in this month.
      </div>
    );
  }
  const totalPages = Math.ceil(data.total_rows / data.page_size);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md dark:border-slate-600 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-600">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Merchant</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">App</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Uninstall Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.data.map((row) => (
              <tr key={`${row.merchant_id}-${row.app_id}`} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/50">
                <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{row.merchant_name}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{row.app_id}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{row.uninstall_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-2 dark:border-slate-600">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Page {data.page} of {totalPages} ({data.total_rows} total)
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              downloadCsv(uninstallRowsToCsv(data.data), `merchants-uninstalls-page${data.page}.csv`);
            }}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-teal-700 hover:shadow-md dark:bg-teal-500 dark:hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1"
          >
            Export CSV
          </button>
          {totalPages > 1 && (
            <>
              <button
                type="button"
                disabled={data.page <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition-colors disabled:opacity-50 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-600"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={data.page >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition-colors disabled:opacity-50 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-600"
              >
                Next
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function HighRiskChurnTable({
  query,
  onPageChange,
  currentPage,
}: {
  query: { data?: HighRiskChurnResponse; isLoading: boolean; error: Error | null };
  onPageChange: (p: number) => void;
  currentPage: number;
}) {
  const { data, isLoading, error } = query;
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
        <div className="h-48 animate-pulse bg-slate-100 dark:bg-slate-700" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300" role="alert">
        Failed to load. {getErrorMessage(error)}
      </div>
    );
  }
  if (!data || data.data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-600 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
        No critical churn merchants in this month.
      </div>
    );
  }
  const totalPages = Math.ceil(data.total_rows / data.page_size);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md dark:border-slate-600 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-600">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Merchant</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">App</th>
              <th className="px-4 py-2 text-right font-medium text-slate-700 dark:text-slate-300">Refund Amount</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Uninstall Date</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Last Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.data.map((row) => (
              <tr key={`${row.merchant_id}-${row.app_id}`} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/50">
                <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{row.merchant_name}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{row.app_id}</td>
                <td className="px-4 py-2 text-right text-slate-800">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(row.refund_amount)}
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{row.uninstall_date}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{row.last_active_month}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-2 dark:border-slate-600">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Page {data.page} of {totalPages} ({data.total_rows} total)
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              downloadCsv(highRiskChurnRowsToCsv(data.data), `merchants-critical-churn-page${data.page}.csv`);
            }}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-teal-700 hover:shadow-md dark:bg-teal-500 dark:hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1"
          >
            Export CSV
          </button>
          {totalPages > 1 && (
            <>
              <button
                type="button"
                disabled={data.page <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition-colors disabled:opacity-50 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-600"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={data.page >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition-colors disabled:opacity-50 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-600"
              >
                Next
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OnHoldTable({
  query,
  onPageChange,
  currentPage,
}: {
  query: { data?: OnHoldResponse; isLoading: boolean; error: Error | null };
  onPageChange: (p: number) => void;
  currentPage: number;
}) {
  const { data, isLoading, error } = query;
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
        <div className="h-48 animate-pulse bg-slate-100 dark:bg-slate-700" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300" role="alert">
        Failed to load. {getErrorMessage(error)}
      </div>
    );
  }
  if (!data || data.data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-600 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
        No on-hold charges in this month.
      </div>
    );
  }
  const totalPages = Math.ceil(data.total_rows / data.page_size);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md dark:border-slate-600 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-600">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Charge ID</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Merchant</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">App</th>
              <th className="px-4 py-2 text-right font-medium text-slate-700 dark:text-slate-300">Amount</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.data.map((row) => (
              <tr key={row.charge_id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/50">
                <td className="px-4 py-2 font-mono text-xs text-slate-600 dark:text-slate-400">{row.charge_id}</td>
                <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{row.merchant_name}</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{row.app_name}</td>
                <td className="px-4 py-2 text-right text-slate-800">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(row.amount)}
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{row.status_current}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-2 dark:border-slate-600">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Page {data.page} of {totalPages} ({data.total_rows} total)
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              downloadCsv(onHoldRowsToCsv(data.data), `merchants-onhold-page${data.page}.csv`);
            }}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-teal-700 hover:shadow-md dark:bg-teal-500 dark:hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1"
          >
            Export CSV
          </button>
          {totalPages > 1 && (
            <>
              <button
                type="button"
                disabled={data.page <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition-colors disabled:opacity-50 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-600"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={data.page >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition-colors disabled:opacity-50 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-600"
              >
                Next
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
