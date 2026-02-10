"use client";

import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/useApiClient";

interface RunRow {
  run_id: string;
  upload_id: string;
  started_at: string;
  finished_at: string | null;
  inserted_count: number | null;
  updated_count: number | null;
  skipped_count: number | null;
  recompute_status: string | null;
  nova_status: string | null;
  error_message: string | null;
}

interface UploadRow {
  upload_id: string;
  uploaded_at: string;
  uploaded_by_email: string | null;
  status: string;
  rows_received: number | null;
  months_detected: string[] | null;
  error_message: string | null;
  run: RunRow | null;
}

interface UploadsResponse {
  data: UploadRow[];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function StatusBadge({ status }: { status: string }) {
  const isSuccess = status === "success";
  const isFailure = status === "failure";
  const isPending = status === "pending";
  const cls = isSuccess
    ? "bg-emerald-100 text-emerald-800"
    : isFailure
      ? "bg-red-100 text-red-800"
      : "bg-amber-100 text-amber-800";
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

export function UploadStatusList() {
  const api = useApiClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "uploads"],
    queryFn: () => api.get<UploadsResponse>("/admin/uploads", { limit: "25" }),
  });

  if (isLoading) {
    return (
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Recent uploads</h2>
        <div className="mt-4 h-32 animate-pulse rounded bg-slate-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Recent uploads</h2>
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          Failed to load uploads. {error instanceof Error ? error.message : "Unknown error."}
        </div>
      </div>
    );
  }

  const list = data?.data ?? [];

  return (
    <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">Recent uploads</h2>
      {list.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No uploads yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-700">Uploaded</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">By</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">Status</th>
                <th className="px-3 py-2 text-right font-medium text-slate-700">Rows</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">Run</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">Recompute</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {list.map((u) => (
                <tr key={u.upload_id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-600">{formatDate(u.uploaded_at)}</td>
                  <td className="px-3 py-2 text-slate-600">{u.uploaded_by_email ?? "—"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600">{u.rows_received ?? "—"}</td>
                  <td className="px-3 py-2">
                    {u.run ? (
                      <span className="text-slate-600">
                        {u.run.inserted_count ?? 0} ins / {u.run.updated_count ?? 0} upd
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {u.run ? <StatusBadge status={u.run.recompute_status ?? "pending"} /> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
