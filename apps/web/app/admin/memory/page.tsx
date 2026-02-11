"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/useApiClient";
import { getErrorMessage } from "@/lib/utils";

// --- Types (match API responses) ---
interface MemoryItemRow {
  id: string;
  path: string;
  title: string;
  type: string;
  tags: string[];
  current_version_id: string | null;
  owner: string;
  created_at: string;
  updated_at: string;
}

interface MemoryItemWithContent extends MemoryItemRow {
  current_content?: string | null;
  current_version_number?: number | null;
}

interface MemoryVersionRow {
  id: string;
  item_id: string;
  version_number: number;
  content: string;
  status: string;
  created_by: string;
  created_at: string;
  change_note: string | null;
  source: string;
  item_title?: string;
  item_path?: string;
}

interface MemoryChangeLogEntry {
  id: string;
  item_id: string | null;
  version_id: string | null;
  action: string;
  actor: string;
  note: string | null;
  created_at: string;
  item_title?: string | null;
}

const MEMORY_TYPES = ["definitions", "apps", "market", "playbooks", "admin"] as const;
type TabId = "active" | "drafts" | "history" | "create";

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return s;
  }
}

/** Simple line-based diff: return lines that are only in A, only in B, or in both. */
function diffLines(a: string, b: string): { left: string; right: string } {
  return { left: a || "(empty)", right: b || "(empty)" };
}

export default function AdminMemoryPage() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>("active");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [reviewVersionId, setReviewVersionId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [createForm, setCreateForm] = useState({
    path: "",
    title: "",
    type: "definitions",
    tags: "",
    content: "",
    change_note: "",
  });
  const [uploadContent, setUploadContent] = useState("");
  const [uploadPath, setUploadPath] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadType, setUploadType] = useState("admin");

  // Detect DB: try to fetch items. If 404 or error, we're in file-only mode.
  const itemsQuery = useQuery({
    queryKey: ["admin", "memory", "items"],
    queryFn: () => api.get<{ data: MemoryItemRow[] }>("/admin/memory/items"),
    retry: false,
  });
  const dbAvailable = itemsQuery.isSuccess && !itemsQuery.isError;

  // File-based list (existing behavior when DB not used)
  const listRes = useQuery({
    queryKey: ["admin", "memory", "list"],
    queryFn: () => api.get<{ files: string[] }>("/admin/memory/list"),
    enabled: !dbAvailable,
  });
  const contentRes = useQuery({
    queryKey: ["admin", "memory", "content", selectedPath],
    queryFn: () =>
      api.get<{ path: string; content: string | null }>(
        "/admin/memory/content",
        selectedPath ? { path: selectedPath } : undefined
      ),
    enabled: !!selectedPath && !dbAvailable,
  });

  // DB: Active items
  const activeItems = dbAvailable && itemsQuery.data ? (itemsQuery.data as { data?: MemoryItemRow[] }).data ?? [] : [];
  const activeItemsFiltered = activeItems.filter((i) => i.current_version_id != null);

  // DB: Selected item (for View)
  const selectedItem = useQuery({
    queryKey: ["admin", "memory", "item", selectedItemId],
    queryFn: () => api.get<MemoryItemWithContent>(`/admin/memory/item/${selectedItemId!}`),
    enabled: !!selectedItemId && dbAvailable,
  });

  // DB: Drafts
  const draftsQuery = useQuery({
    queryKey: ["admin", "memory", "versions", "draft"],
    queryFn: () => api.get<{ data: MemoryVersionRow[] }>("/admin/memory/versions", { status: "draft" }),
    enabled: dbAvailable && (activeTab === "drafts" || !!reviewVersionId),
  });
  const drafts = (draftsQuery.data as { data?: MemoryVersionRow[] } | undefined)?.data ?? [];

  // DB: Review — selected draft version (full content)
  const reviewVersion = useQuery({
    queryKey: ["admin", "memory", "version", reviewVersionId],
    queryFn: () => api.get<MemoryVersionRow>(`/admin/memory/version/${reviewVersionId!}`),
    enabled: !!reviewVersionId && dbAvailable,
  });
  const reviewItemId = reviewVersion.data?.item_id ?? null;
  const reviewItem = useQuery({
    queryKey: ["admin", "memory", "item", reviewItemId],
    queryFn: () => api.get<MemoryItemWithContent>(`/admin/memory/item/${reviewItemId!}`),
    enabled: !!reviewItemId && dbAvailable,
  });
  const currentContent = reviewItem.data?.current_content ?? "";
  const draftContent = reviewVersion.data?.content ?? "";
  const diff = diffLines(currentContent, draftContent);

  // DB: Change log
  const changeLogQuery = useQuery({
    queryKey: ["admin", "memory", "change-log"],
    queryFn: () => api.get<{ data: MemoryChangeLogEntry[] }>("/admin/memory/change-log", { limit: "50" }),
    enabled: dbAvailable && activeTab === "history",
  });
  const changeLog = (changeLogQuery.data as { data?: MemoryChangeLogEntry[] } | undefined)?.data ?? [];

  const approveMutation = useMutation({
    mutationFn: (versionId: string) => api.post<{ ok: boolean }>("/admin/memory/approve", { version_id: versionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "memory"] });
      setReviewVersionId(null);
    },
  });
  const rejectMutation = useMutation({
    mutationFn: ({ versionId, note }: { versionId: string; note: string }) =>
      api.post<{ ok: boolean }>("/admin/memory/reject", { version_id: versionId, rejection_note: note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "memory"] });
      setReviewVersionId(null);
      setRejectNote("");
    },
  });
  const createMutation = useMutation({
    mutationFn: (body: { path: string; title: string; type: string; tags?: string[]; content: string; change_note?: string }) =>
      api.post<{ item: MemoryItemRow; version: MemoryVersionRow }>("/admin/memory/create", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "memory"] });
      setCreateForm({ path: "", title: "", type: "definitions", tags: "", content: "", change_note: "" });
      setActiveTab("drafts");
    },
  });
  const uploadMutation = useMutation({
    mutationFn: (body: { content: string; path?: string; title?: string; type?: string }) =>
      api.post<{ item: MemoryItemRow; version: MemoryVersionRow }>("/admin/memory/upload", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "memory"] });
      setUploadContent("");
      setUploadPath("");
      setUploadTitle("");
      setActiveTab("drafts");
    },
  });

  const handleApprove = useCallback(() => {
    if (!reviewVersionId) return;
    approveMutation.mutate(reviewVersionId);
  }, [reviewVersionId, approveMutation]);
  const handleReject = useCallback(() => {
    if (!reviewVersionId || !rejectNote.trim()) return;
    rejectMutation.mutate({ versionId: reviewVersionId, note: rejectNote.trim() });
  }, [reviewVersionId, rejectNote, rejectMutation]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = createForm.tags.split(/[\s,]+/).filter(Boolean);
    createMutation.mutate({
      path: createForm.path.trim(),
      title: createForm.title.trim(),
      type: createForm.type,
      tags: tags.length ? tags : undefined,
      content: createForm.content,
      change_note: createForm.change_note.trim() || undefined,
    });
  };
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadContent.trim()) return;
    uploadMutation.mutate({
      content: uploadContent,
      path: uploadPath.trim() || undefined,
      title: uploadTitle.trim() || undefined,
      type: uploadType.trim() || undefined,
    });
  };

  const files = listRes.data?.files ?? [];
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
        {dbAvailable
          ? "Manage memory items (definitions, playbooks, apps, market). Approve drafts to update what Nova trusts."
          : "Browse memory files used by Nova (definitions, playbooks, apps, market, admin). Read-only."}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {dbAvailable && (
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(["active", "drafts", "history", "create"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedItemId(null);
                  if (tab !== "drafts") setReviewVersionId(null);
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  activeTab === tab ? "bg-white text-teal-700 shadow" : "text-slate-600 hover:text-slate-800"
                }`}
              >
                {tab === "active" && "Active Memory"}
                {tab === "drafts" && "Drafts"}
                {tab === "history" && "Change History"}
                {tab === "create" && "Create / Upload"}
              </button>
            ))}
          </div>
        )}
        <Link
          href="/admin"
          className="inline-block rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Admin
        </Link>
      </div>

      {/* Review draft panel (diff + approve/reject) */}
      {dbAvailable && reviewVersionId && (
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Review draft</h2>
          {reviewVersion.isLoading && <p className="mt-2 text-slate-500">Loading…</p>}
          {reviewVersion.data && reviewItem.data && (
            <>
              <div className="mt-2 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                <div>
                  <span className="font-medium">Title:</span> {reviewItem.data.title}
                </div>
                <div>
                  <span className="font-medium">Type:</span> {reviewItem.data.type}
                </div>
                <div>
                  <span className="font-medium">Created by:</span> {reviewVersion.data.created_by}
                </div>
                <div>
                  <span className="font-medium">Source:</span> {reviewVersion.data.source}
                </div>
                {reviewVersion.data.change_note && (
                  <div className="md:col-span-2">
                    <span className="font-medium">Change note:</span> {reviewVersion.data.change_note}
                  </div>
                )}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-medium text-slate-700">Current (active) version</h3>
                  <pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800">
                    {diff.left}
                  </pre>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-700">Draft version</h3>
                  <pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800">
                    {diff.right}
                  </pre>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <div className="flex flex-1 flex-wrap items-end gap-2">
                  <input
                    type="text"
                    placeholder="Rejection note (required to reject)"
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={rejectMutation.isPending || !rejectNote.trim()}
                    className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewVersionId(null)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
              {(approveMutation.isError || rejectMutation.isError) && (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {getErrorMessage(approveMutation.error ?? rejectMutation.error)}
                </p>
              )}
            </>
          )}
        </section>
      )}

      {/* DB: Active tab */}
      {dbAvailable && activeTab === "active" && !reviewVersionId && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-slate-800">Active Memory</h2>
          <p className="mt-1 text-sm text-slate-600">Items with an approved version that Nova uses.</p>
          {itemsQuery.isLoading && <p className="mt-4 text-slate-500">Loading…</p>}
          {itemsQuery.isError && (
            <p className="mt-4 text-red-600" role="alert">
              Failed to load items: {getErrorMessage((itemsQuery as { error?: unknown }).error)}
            </p>
          )}
          {itemsQuery.isSuccess && (
            <>
              {activeItemsFiltered.length === 0 ? (
                <p className="mt-4 text-slate-500">No active items yet. Create one in Create / Upload and approve the draft.</p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 font-medium text-slate-700">Title</th>
                        <th className="px-3 py-2 font-medium text-slate-700">Type</th>
                        <th className="px-3 py-2 font-medium text-slate-700">Tags</th>
                        <th className="px-3 py-2 font-medium text-slate-700">Owner</th>
                        <th className="px-3 py-2 font-medium text-slate-700">Last updated</th>
                        <th className="px-3 py-2 font-medium text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeItemsFiltered.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">{row.title}</td>
                          <td className="px-3 py-2">{row.type}</td>
                          <td className="px-3 py-2">{(row.tags ?? []).join(", ") || "—"}</td>
                          <td className="px-3 py-2">{row.owner}</td>
                          <td className="px-3 py-2">{formatDate(row.updated_at)}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setSelectedItemId(selectedItemId === row.id ? null : row.id)}
                              className="text-teal-600 hover:underline"
                            >
                              {selectedItemId === row.id ? "Hide" : "View"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {selectedItemId && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                  {selectedItem.isLoading && <p className="text-slate-500">Loading…</p>}
                  {selectedItem.data && (
                    <>
                      <h3 className="font-medium text-slate-800">{(selectedItem.data as MemoryItemWithContent).title}</h3>
                      <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded border border-slate-100 bg-slate-50 p-3 text-sm text-slate-800">
                        {(selectedItem.data as MemoryItemWithContent).current_content ?? "(empty)"}
                      </pre>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* DB: Drafts tab */}
      {dbAvailable && activeTab === "drafts" && !reviewVersionId && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-slate-800">Drafts & Pending Approval</h2>
          <p className="mt-1 text-sm text-slate-600">Review and approve or reject drafts.</p>
          {draftsQuery.isLoading && <p className="mt-4 text-slate-500">Loading…</p>}
          {draftsQuery.isSuccess && (
            <>
              {drafts.length === 0 ? (
                <p className="mt-4 text-slate-500">No drafts. Create a new item in Create / Upload.</p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 font-medium text-slate-700">Title</th>
                        <th className="px-3 py-2 font-medium text-slate-700">Version</th>
                        <th className="px-3 py-2 font-medium text-slate-700">Type</th>
                        <th className="px-3 py-2 font-medium text-slate-700">Created by</th>
                        <th className="px-3 py-2 font-medium text-slate-700">Created at</th>
                        <th className="px-3 py-2 font-medium text-slate-700">Source</th>
                        <th className="px-3 py-2 font-medium text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drafts.map((v) => (
                        <tr key={v.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">{v.item_title ?? v.item_id}</td>
                          <td className="px-3 py-2">v{v.version_number}</td>
                          <td className="px-3 py-2">{v.item_path?.split("/")[0] ?? "—"}</td>
                          <td className="px-3 py-2">{v.created_by}</td>
                          <td className="px-3 py-2">{formatDate(v.created_at)}</td>
                          <td className="px-3 py-2">{v.source}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setReviewVersionId(v.id)}
                              className="text-teal-600 hover:underline"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* DB: Change History tab */}
      {dbAvailable && activeTab === "history" && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-slate-800">Change History</h2>
          <p className="mt-1 text-sm text-slate-600">Audit log of approvals, rejections, and creates.</p>
          {changeLogQuery.isLoading && <p className="mt-4 text-slate-500">Loading…</p>}
          {changeLogQuery.isSuccess && (
            <>
              {changeLog.length === 0 ? (
                <p className="mt-4 text-slate-500">No change log entries yet.</p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 font-medium text-slate-700">Timestamp</th>
                        <th className="px-3 py-2 font-medium text-slate-700">Item</th>
                        <th className="px-3 py-2 font-medium text-slate-700">Action</th>
                        <th className="px-3 py-2 font-medium text-slate-700">Actor</th>
                        <th className="px-3 py-2 font-medium text-slate-700">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changeLog.map((e) => (
                        <tr key={e.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">{formatDate(e.created_at)}</td>
                          <td className="px-3 py-2">{e.item_title ?? e.item_id ?? "—"}</td>
                          <td className="px-3 py-2">{e.action}</td>
                          <td className="px-3 py-2">{e.actor}</td>
                          <td className="px-3 py-2">{e.note ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* DB: Create / Upload tab */}
      {dbAvailable && activeTab === "create" && (
        <section className="mt-6 grid gap-8 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-800">Create from scratch</h2>
            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Path (e.g. definitions/metrics.md)</label>
                <input
                  type="text"
                  value={createForm.path}
                  onChange={(e) => setCreateForm((f) => ({ ...f, path: e.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Title</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Type</label>
                <select
                  value={createForm.type}
                  onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {MEMORY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Tags (comma or space separated)</label>
                <input
                  type="text"
                  value={createForm.tags}
                  onChange={(e) => setCreateForm((f) => ({ ...f, tags: e.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Content (markdown)</label>
                <textarea
                  value={createForm.content}
                  onChange={(e) => setCreateForm((f) => ({ ...f, content: e.target.value }))}
                  rows={8}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Change note (optional)</label>
                <input
                  type="text"
                  value={createForm.change_note}
                  onChange={(e) => setCreateForm((f) => ({ ...f, change_note: e.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                Create (saves as draft)
              </button>
              {createMutation.isError && (
                <p className="text-sm text-red-600" role="alert">
                  {getErrorMessage(createMutation.error)}
                </p>
              )}
            </form>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-800">Upload / Paste content</h2>
            <p className="mt-1 text-sm text-slate-600">Paste markdown (or upload file content) to create a new memory item as draft.</p>
            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Content (required)</label>
                <textarea
                  value={uploadContent}
                  onChange={(e) => setUploadContent(e.target.value)}
                  rows={6}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono"
                  placeholder="Paste markdown or file content…"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Path (optional)</label>
                <input
                  type="text"
                  value={uploadPath}
                  onChange={(e) => setUploadPath(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  placeholder="e.g. market/update-2026.md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Title (optional)</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Type (optional)</label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {MEMORY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={uploadMutation.isPending || !uploadContent.trim()}
                className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                Upload (saves as draft)
              </button>
              {uploadMutation.isError && (
                <p className="text-sm text-red-600" role="alert">
                  {getErrorMessage(uploadMutation.error)}
                </p>
              )}
            </form>
          </div>
        </section>
      )}

      {/* File-only mode (no DB or items failed) */}
      {!dbAvailable && (
        <div className="mt-6">
          {listRes.isLoading && <p className="text-slate-500">Loading file list…</p>}
          {listRes.isError && (
            <p className="text-red-600" role="alert">
              Failed to load: {getErrorMessage(listRes.error)}
            </p>
          )}
          {listRes.isSuccess && (
            <div className="flex flex-col gap-6 md:flex-row">
              <aside className="min-w-0 shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-4 md:w-64">
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
                {!selectedPath && <p className="text-slate-500">Select a file to view its content.</p>}
                {selectedPath && contentRes.isLoading && <p className="text-slate-500">Loading…</p>}
                {selectedPath && contentRes.data && (
                  <>
                    <h3 className="mb-2 font-mono text-sm font-medium text-slate-700">{(contentRes.data as { path: string }).path}</h3>
                    <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded border border-slate-100 bg-slate-50 p-3 text-sm text-slate-800">
                      {(contentRes.data as { content: string | null }).content ?? "(empty)"}
                    </pre>
                  </>
                )}
              </section>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
