"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/useApiClient";
import { getErrorMessage } from "@/lib/utils";

interface PackageRow {
  app_id: string;
  app_name: string;
  plan_id: string;
  plan_name: string;
  price: number;
  tier: string | null;
}

export default function AdminPackagesPage() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<PackageRow | null>(null);
  const [deleting, setDeleting] = useState<PackageRow | null>(null);
  const [form, setForm] = useState({
    app_id: "",
    app_name: "",
    plan_id: "",
    plan_name: "",
    price: 0,
    tier: "",
  });

  const { data: list = [], isLoading, error } = useQuery({
    queryKey: ["admin", "packages"],
    queryFn: () => api.get<PackageRow[]>("/admin/packages"),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => api.post<PackageRow>("/admin/packages", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "packages"] });
      setShowAdd(false);
      setForm({ app_id: "", app_name: "", plan_id: "", plan_name: "", price: 0, tier: "" });
    },
  });

  const patchMutation = useMutation({
    mutationFn: ({
      appId,
      planId,
      body,
    }: {
      appId: string;
      planId: string;
      body: Partial<Omit<PackageRow, "app_id" | "plan_id">>;
    }) =>
      api.patch<PackageRow>(
        `/admin/packages/${encodeURIComponent(appId)}/${encodeURIComponent(planId)}`,
        body
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "packages"] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ appId, planId }: { appId: string; planId: string }) =>
      api.delete(`/admin/packages/${encodeURIComponent(appId)}/${encodeURIComponent(planId)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "packages"] });
      setDeleting(null);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ ...form, price: Number(form.price) || 0, tier: form.tier || "" });
  };

  const handleUpdate = (e: React.FormEvent, row: PackageRow) => {
    e.preventDefault();
    if (!editing) return;
    patchMutation.mutate({
      appId: row.app_id,
      planId: row.plan_id,
      body: {
        app_name: editing.app_name,
        plan_name: editing.plan_name,
        price: editing.price,
        tier: editing.tier,
      },
    });
  };

  const handleDelete = (row: PackageRow) => {
    if (!confirm(`Delete ${row.app_name} / ${row.plan_name}?`)) return;
    deleteMutation.mutate({ appId: row.app_id, planId: row.plan_id });
    setDeleting(row);
  };

  return (
    <main>
      <h1 className="text-2xl font-bold text-slate-800">Package Catalog</h1>
      <p className="mt-2 text-slate-600">Manage app/plan packages (app_id, plan_id, price, tier).</p>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          Add package
        </button>
        <Link
          href="/admin"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Admin
        </Link>
      </div>

      {showAdd && (
        <form onSubmit={handleCreate} className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-lg font-medium text-slate-800">New package</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <input
              type="text"
              placeholder="app_id"
              value={form.app_id}
              onChange={(e) => setForm((f) => ({ ...f, app_id: e.target.value }))}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              required
            />
            <input
              type="text"
              placeholder="app_name"
              value={form.app_name}
              onChange={(e) => setForm((f) => ({ ...f, app_name: e.target.value }))}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              required
            />
            <input
              type="text"
              placeholder="plan_id"
              value={form.plan_id}
              onChange={(e) => setForm((f) => ({ ...f, plan_id: e.target.value }))}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              required
            />
            <input
              type="text"
              placeholder="plan_name"
              value={form.plan_name}
              onChange={(e) => setForm((f) => ({ ...f, plan_name: e.target.value }))}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              required
            />
            <input
              type="number"
              placeholder="price"
              value={form.price || ""}
              onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              required
            />
            <input
              type="text"
              placeholder="tier (optional)"
              value={form.tier}
              onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value }))}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
          {createMutation.isError && (
            <p className="mt-2 text-sm text-red-600">{createMutation.error?.message}</p>
          )}
        </form>
      )}

      {isLoading && <p className="mt-6 text-slate-500">Loading…</p>}
      {error && (
        <p className="mt-6 text-red-600" role="alert">
          Failed to load: {getErrorMessage(error)}
        </p>
      )}
      {!isLoading && !error && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-2 font-medium text-slate-700">App ID</th>
                <th className="px-4 py-2 font-medium text-slate-700">App Name</th>
                <th className="px-4 py-2 font-medium text-slate-700">Plan ID</th>
                <th className="px-4 py-2 font-medium text-slate-700">Plan Name</th>
                <th className="px-4 py-2 font-medium text-slate-700">Price</th>
                <th className="px-4 py-2 font-medium text-slate-700">Tier</th>
                <th className="px-4 py-2 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => (
                <tr key={`${row.app_id}-${row.plan_id}`} className="border-b border-slate-100">
                  {editing?.app_id === row.app_id && editing?.plan_id === row.plan_id ? (
                    <>
                      <td className="px-4 py-2">{row.app_id}</td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editing.app_name}
                          onChange={(e) => setEditing((x) => (x ? { ...x, app_name: e.target.value } : null))}
                          className="w-32 rounded border border-slate-300 px-1 py-0.5 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">{row.plan_id}</td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editing.plan_name}
                          onChange={(e) => setEditing((x) => (x ? { ...x, plan_name: e.target.value } : null))}
                          className="w-32 rounded border border-slate-300 px-1 py-0.5 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={editing.price}
                          onChange={(e) => setEditing((x) => (x ? { ...x, price: parseFloat(e.target.value) || 0 } : null))}
                          className="w-20 rounded border border-slate-300 px-1 py-0.5 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editing.tier ?? ""}
                          onChange={(e) => setEditing((x) => (x ? { ...x, tier: e.target.value || null } : null))}
                          className="w-24 rounded border border-slate-300 px-1 py-0.5 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={(e) => handleUpdate(e, row)}
                          disabled={patchMutation.isPending}
                          className="text-teal-600 hover:underline"
                        >
                          Save
                        </button>{" "}
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className="text-slate-500 hover:underline"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2">{row.app_id}</td>
                      <td className="px-4 py-2">{row.app_name}</td>
                      <td className="px-4 py-2">{row.plan_id}</td>
                      <td className="px-4 py-2">{row.plan_name}</td>
                      <td className="px-4 py-2">${row.price.toFixed(2)}</td>
                      <td className="px-4 py-2">{row.tier ?? "—"}</td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => setEditing({ ...row })}
                          className="text-teal-600 hover:underline"
                        >
                          Edit
                        </button>{" "}
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          disabled={deleting?.app_id === row.app_id && deleting?.plan_id === row.plan_id}
                          className="text-red-600 hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && (
            <p className="p-6 text-center text-slate-500">No packages yet. Add one above.</p>
          )}
        </div>
      )}
    </main>
  );
}
