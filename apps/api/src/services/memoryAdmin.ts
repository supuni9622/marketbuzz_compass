/**
 * Admin Memory Manager: items, versions, approve/reject, change-log.
 * @see docs/ADMIN_MEMORY_MANAGER_UI_SPEC.md
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface MemoryItemRow {
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

export interface MemoryVersionRow {
  id: string;
  item_id: string;
  version_number: number;
  content: string;
  status: string;
  created_by: string;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  rejection_note: string | null;
  change_note: string | null;
  source: string;
}

export interface MemoryChangeLogRow {
  id: string;
  item_id: string | null;
  version_id: string | null;
  action: string;
  actor: string;
  note: string | null;
  created_at: string;
}

export interface MemoryItemWithVersion extends MemoryItemRow {
  current_content?: string | null;
  current_version_number?: number | null;
}

/** List items; status=active means only items with an approved current version. */
export async function listMemoryItems(
  supabase: SupabaseClient,
  opts: { status?: "active" } = {}
): Promise<MemoryItemRow[]> {
  let query = supabase
    .from("memory_items")
    .select("id, path, title, type, tags, current_version_id, owner, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (opts.status === "active") {
    query = query.not("current_version_id", "is", null);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as MemoryItemRow[];
}

/** Get one item by id; optionally include current version content. */
export async function getMemoryItem(
  supabase: SupabaseClient,
  id: string,
  opts: { include_content?: boolean } = {}
): Promise<MemoryItemWithVersion | null> {
  const { data: item, error: itemError } = await supabase
    .from("memory_items")
    .select("id, path, title, type, tags, current_version_id, owner, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (itemError || !item) return null;
  const row = item as MemoryItemRow;
  if (!opts.include_content || !row.current_version_id) {
    return { ...row, tags: row.tags ?? [] };
  }
  const { data: ver } = await supabase
    .from("memory_versions")
    .select("content, version_number")
    .eq("id", row.current_version_id)
    .maybeSingle();
  return {
    ...row,
    tags: row.tags ?? [],
    current_content: (ver as { content?: string } | null)?.content ?? null,
    current_version_number: (ver as { version_number?: number } | null)?.version_number ?? null,
  };
}

/** List versions; status=draft returns only draft versions. */
export async function listMemoryVersions(
  supabase: SupabaseClient,
  opts: { status?: "draft" } = {}
): Promise<(MemoryVersionRow & { item_title?: string; item_path?: string })[]> {
  let query = supabase
    .from("memory_versions")
    .select("id, item_id, version_number, content, status, created_by, created_at, approved_at, approved_by, rejection_note, change_note, source")
    .order("created_at", { ascending: false });
  if (opts.status === "draft") {
    query = query.eq("status", "draft");
  }
  const { data: versions, error } = await query;
  if (error) throw error;
  const rows = (versions ?? []) as MemoryVersionRow[];
  if (rows.length === 0) return [];
  const itemIds = [...new Set(rows.map((r) => r.item_id))];
  const { data: items } = await supabase
    .from("memory_items")
    .select("id, title, path")
    .in("id", itemIds);
  const itemMap = new Map((items ?? []).map((i: { id: string; title: string; path: string }) => [i.id, i]));
  return rows.map((r) => ({
    ...r,
    item_title: itemMap.get(r.item_id)?.title,
    item_path: itemMap.get(r.item_id)?.path,
  }));
}

/** Get a single version by id. */
export async function getMemoryVersion(
  supabase: SupabaseClient,
  versionId: string
): Promise<MemoryVersionRow | null> {
  const { data, error } = await supabase
    .from("memory_versions")
    .select("*")
    .eq("id", versionId)
    .maybeSingle();
  if (error || !data) return null;
  return data as MemoryVersionRow;
}

/** Create a new memory item with an initial draft version. */
export async function createMemoryItem(
  supabase: SupabaseClient,
  input: {
    path: string;
    title: string;
    type: string;
    tags?: string[];
    content: string;
    change_note?: string;
    created_by: string;
    source?: string;
  }
): Promise<{ item: MemoryItemRow; version: MemoryVersionRow }> {
  const { data: item, error: itemError } = await supabase
    .from("memory_items")
    .insert({
      path: input.path,
      title: input.title,
      type: input.type,
      tags: input.tags ?? [],
      owner: input.created_by,
    })
    .select()
    .single();
  if (itemError) throw itemError;
  const itemRow = item as MemoryItemRow;
  const { data: version, error: versionError } = await supabase
    .from("memory_versions")
    .insert({
      item_id: itemRow.id,
      version_number: 1,
      content: input.content,
      status: "draft",
      created_by: input.created_by,
      change_note: input.change_note ?? null,
      source: input.source ?? "manual",
    })
    .select()
    .single();
  if (versionError) throw versionError;
  await supabase.from("memory_change_log").insert({
    item_id: itemRow.id,
    version_id: (version as MemoryVersionRow).id,
    action: "create",
    actor: input.created_by,
    note: input.change_note ?? null,
  });
  return { item: itemRow, version: version as MemoryVersionRow };
}

/** Add a new draft version to an existing item. */
export async function addDraftVersion(
  supabase: SupabaseClient,
  input: {
    item_id: string;
    content: string;
    change_note?: string;
    created_by: string;
    source?: string;
  }
): Promise<MemoryVersionRow> {
  const { data: max } = await supabase
    .from("memory_versions")
    .select("version_number")
    .eq("item_id", input.item_id)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextNum = ((max as { version_number?: number } | null)?.version_number ?? 0) + 1;
  const { data: version, error } = await supabase
    .from("memory_versions")
    .insert({
      item_id: input.item_id,
      version_number: nextNum,
      content: input.content,
      status: "draft",
      created_by: input.created_by,
      change_note: input.change_note ?? null,
      source: input.source ?? "manual",
    })
    .select()
    .single();
  if (error) throw error;
  return version as MemoryVersionRow;
}

/** Approve a draft version: set status, update item current_version, write change-log. */
export async function approveMemoryVersion(
  supabase: SupabaseClient,
  versionId: string,
  approvedBy: string,
  note?: string
): Promise<void> {
  const version = await getMemoryVersion(supabase, versionId);
  if (!version || version.status !== "draft") throw new Error("Version not found or not draft");
  const { error: updateVer } = await supabase
    .from("memory_versions")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: approvedBy,
      change_note: note ?? version.change_note,
    })
    .eq("id", versionId);
  if (updateVer) throw updateVer;
  const { error: updateItem } = await supabase
    .from("memory_items")
    .update({ current_version_id: versionId, updated_at: new Date().toISOString() })
    .eq("id", version.item_id);
  if (updateItem) throw updateItem;
  await supabase.from("memory_change_log").insert({
    item_id: version.item_id,
    version_id: versionId,
    action: "approve",
    actor: approvedBy,
    note: note ?? null,
  });
}

/** Reject a draft version: set status, write change-log. */
export async function rejectMemoryVersion(
  supabase: SupabaseClient,
  versionId: string,
  rejectedBy: string,
  rejectionNote: string
): Promise<void> {
  const version = await getMemoryVersion(supabase, versionId);
  if (!version || version.status !== "draft") throw new Error("Version not found or not draft");
  const { error: updateVer } = await supabase
    .from("memory_versions")
    .update({
      status: "rejected",
      rejection_note: rejectionNote,
    })
    .eq("id", versionId);
  if (updateVer) throw updateVer;
  await supabase.from("memory_change_log").insert({
    item_id: version.item_id,
    version_id: versionId,
    action: "reject",
    actor: rejectedBy,
    note: rejectionNote,
  });
}

export interface MemoryChangeLogEntry extends MemoryChangeLogRow {
  item_title?: string | null;
}

/** Get change-log entries (paginated). Joins item title for display. */
export async function getMemoryChangeLog(
  supabase: SupabaseClient,
  opts: { item_id?: string; limit?: number; offset?: number } = {}
): Promise<MemoryChangeLogEntry[]> {
  let query = supabase
    .from("memory_change_log")
    .select("id, item_id, version_id, action, actor, note, created_at")
    .order("created_at", { ascending: false });
  if (opts.item_id) query = query.eq("item_id", opts.item_id);
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  query = query.range(offset, offset + limit - 1);
  const { data: rows, error } = await query;
  if (error) throw error;
  const entries = (rows ?? []) as MemoryChangeLogRow[];
  const itemIds = [...new Set(entries.map((e) => e.item_id).filter(Boolean))] as string[];
  if (itemIds.length === 0) return entries.map((e) => ({ ...e, item_title: null }));
  const { data: items } = await supabase
    .from("memory_items")
    .select("id, title")
    .in("id", itemIds);
  const titleMap = new Map((items ?? []).map((i: { id: string; title: string }) => [i.id, i.title]));
  return entries.map((e) => ({
    ...e,
    item_title: e.item_id ? titleMap.get(e.item_id) ?? null : null,
  }));
}
