"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/useApiClient";
import { getErrorMessage } from "@/lib/utils";

export default function AdminMemoryPage() {
  const api = useApiClient();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const { data: listRes, isLoading: listLoading, error: listError } = useQuery({
    queryKey: ["admin", "memory", "list"],
    queryFn: () => api.get<{ files: string[] }>("/admin/memory/list"),
  });

  const { data: contentRes, isLoading: contentLoading } = useQuery({
    queryKey: ["admin", "memory", "content", selectedPath],
    queryFn: () =>
      api.get<{ path: string; content: string | null }>(
        "/admin/memory/content",
        selectedPath ? { path: selectedPath } : undefined
      ),
    enabled: !!selectedPath,
  });

  const files = listRes?.files ?? [];
  const byCategory = files.reduce<Record<string, string[]>>((acc, p) => {
    const cat = p.includes("/") ? p.split("/")[0]! : "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <main>
      <h1 className="text-2xl font-bold text-slate-800">Nova Memory</h1>
      <p className="mt-2 text-slate-600">
        Browse memory files used by Nova (definitions, playbooks, apps, market, admin). Read-only.
      </p>

      <div className="mt-6">
        <Link
          href="/admin"
          className="inline-block rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Admin
        </Link>
      </div>

      {listLoading && <p className="mt-6 text-slate-500">Loading file list…</p>}
      {listError && (
        <p className="mt-6 text-red-600" role="alert">
          Failed to load: {getErrorMessage(listError)}
        </p>
      )}

      {!listLoading && !listError && (
        <div className="mt-6 flex gap-6">
          <aside className="w-64 shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-semibold text-slate-800">Files by category</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {Object.entries(byCategory).map(([cat, paths]) => (
                <li key={cat}>
                  <span className="font-medium text-slate-600">{cat}/</span>
                  <ul className="ml-2 mt-0.5">
                    {paths.map((path) => (
                      <li key={path}>
                        <button
                          type="button"
                          onClick={() => setSelectedPath(path)}
                          className={`block w-full truncate text-left hover:underline ${
                            selectedPath === path ? "font-medium text-teal-700" : "text-slate-700"
                          }`}
                          title={path}
                        >
                          {path.replace(`${cat}/`, "")}
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </aside>
          <section className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-4">
            {!selectedPath && (
              <p className="text-slate-500">Select a file to view its content.</p>
            )}
            {selectedPath && contentLoading && (
              <p className="text-slate-500">Loading…</p>
            )}
            {selectedPath && contentRes && (
              <>
                <h3 className="mb-2 font-mono text-sm font-medium text-slate-700">{contentRes.path}</h3>
                <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded border border-slate-100 bg-slate-50 p-3 text-sm text-slate-800">
                  {contentRes.content ?? "(empty)"}
                </pre>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
