/**
 * Package catalog service: CRUD for package_catalog table.
 * @see docs/DATA_MODEL_SPEC.md — package_catalog (app_id, app_name, plan_id, plan_name, price, tier)
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface PackageCatalogRow {
  app_id: string;
  app_name: string;
  plan_id: string;
  plan_name: string;
  price: number;
  tier: string | null;
}

export async function listPackages(supabase: SupabaseClient): Promise<PackageCatalogRow[]> {
  const { data, error } = await supabase
    .from("package_catalog")
    .select("app_id, app_name, plan_id, plan_name, price, tier")
    .order("app_id", { ascending: true })
    .order("plan_id", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    price: Number(r.price),
  })) as PackageCatalogRow[];
}

export interface CreatePackageInput {
  app_id: string;
  app_name: string;
  plan_id: string;
  plan_name: string;
  price: number;
  tier?: string | null;
}

export async function createPackage(
  supabase: SupabaseClient,
  input: CreatePackageInput
): Promise<PackageCatalogRow> {
  const { data, error } = await supabase
    .from("package_catalog")
    .insert({
      app_id: input.app_id.trim(),
      app_name: input.app_name.trim(),
      plan_id: input.plan_id.trim(),
      plan_name: input.plan_name.trim(),
      price: input.price,
      tier: input.tier?.trim() || null,
    })
    .select()
    .single();
  if (error) throw error;
  return { ...data, price: Number(data.price) } as PackageCatalogRow;
}

export async function updatePackage(
  supabase: SupabaseClient,
  appId: string,
  planId: string,
  input: Partial<Omit<CreatePackageInput, "app_id" | "plan_id">>
): Promise<PackageCatalogRow> {
  const updates: Record<string, unknown> = {};
  if (input.app_name !== undefined) updates.app_name = input.app_name.trim();
  if (input.plan_name !== undefined) updates.plan_name = input.plan_name.trim();
  if (input.price !== undefined) updates.price = input.price;
  if (input.tier !== undefined) updates.tier = input.tier?.trim() || null;
  if (Object.keys(updates).length === 0) {
    const { data } = await supabase
      .from("package_catalog")
      .select()
      .eq("app_id", appId)
      .eq("plan_id", planId)
      .single();
    if (!data) throw new Error("Package not found");
    return { ...data, price: Number(data.price) } as PackageCatalogRow;
  }
  const { data, error } = await supabase
    .from("package_catalog")
    .update(updates)
    .eq("app_id", appId)
    .eq("plan_id", planId)
    .select()
    .single();
  if (error) throw error;
  return { ...data, price: Number(data.price) } as PackageCatalogRow;
}

export async function deletePackage(
  supabase: SupabaseClient,
  appId: string,
  planId: string
): Promise<void> {
  const { error } = await supabase
    .from("package_catalog")
    .delete()
    .eq("app_id", appId)
    .eq("plan_id", planId);
  if (error) throw error;
}
