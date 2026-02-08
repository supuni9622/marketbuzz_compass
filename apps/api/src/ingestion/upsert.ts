/**
 * UPSERT charges into charges_raw by charge_id.
 * @see docs/INGESTION_WORKFLOW.md
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedCharge } from "./parser.js";

const BATCH_SIZE = 500;

export interface UpsertCounts {
  inserted_count: number;
  updated_count: number;
  skipped_count: number;
}

function toDbRow(charge: ParsedCharge, sourceFileId: string) {
  return {
    charge_id: charge.charge_id,
    charge_date: charge.charge_date,
    charge_month: charge.charge_month,
    merchant_id: charge.merchant_id,
    merchant_name: charge.merchant_name,
    app_id: charge.app_id,
    app_name: charge.app_name,
    plan_name: null,
    amount: charge.amount,
    status_current: charge.status_current,
    uninstall_date: charge.uninstall_date,
    last_seen_at: new Date().toISOString(),
    source_file_id: sourceFileId,
  };
}

/**
 * Upsert charges into charges_raw. Returns inserted/updated counts.
 * Uses: 1) fetch existing IDs, 2) batch upsert.
 */
export async function upsertCharges(
  supabase: SupabaseClient,
  charges: ParsedCharge[],
  sourceFileId: string
): Promise<UpsertCounts> {
  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < charges.length; i += BATCH_SIZE) {
    const batch = charges.slice(i, i + BATCH_SIZE);
    const chargeIds = batch.map((c) => c.charge_id);

    const { data: existing } = await supabase
      .from("charges_raw")
      .select("charge_id")
      .in("charge_id", chargeIds);

    const existingSet = new Set((existing ?? []).map((r) => r.charge_id));

    const rows = batch.map((c) => toDbRow(c, sourceFileId));

    const { error } = await supabase.from("charges_raw").upsert(rows, {
      onConflict: "charge_id",
      ignoreDuplicates: false,
    });

    if (error) throw error;

    for (const c of batch) {
      if (existingSet.has(c.charge_id)) updated++;
      else inserted++;
    }
  }

  return {
    inserted_count: inserted,
    updated_count: updated,
    skipped_count: 0,
  };
}
