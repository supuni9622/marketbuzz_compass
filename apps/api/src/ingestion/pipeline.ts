/**
 * Ingestion pipeline orchestrator: fetch CSV → validate → upsert → recompute → audit.
 * @see docs/INGESTION_WORKFLOW.md
 */
import { db } from "../db.js";
import { getCsv } from "../services/s3.js";
import { validateCsv } from "./validator.js";
import { upsertCharges } from "./upsert.js";
import { recomputeCanonicalTables } from "./recompute.js";

export interface IngestionResult {
  ok: boolean;
  error?: string;
  inserted_count?: number;
  updated_count?: number;
  skipped_count?: number;
  months_affected?: string[];
}

/**
 * Run full ingestion for an upload: fetch CSV, validate, upsert, recompute, update audit.
 */
export async function runIngestion(
  uploadId: string,
  runId: string,
  s3Key: string
): Promise<IngestionResult> {
  const supabase = db.get();

  try {
    const csvBuffer = await getCsv(s3Key);
    const validation = validateCsv(csvBuffer, uploadId);

    if (!validation.ok) {
      await supabase
        .from("ingestion_uploads")
        .update({ status: "failure", error_message: validation.error })
        .eq("upload_id", uploadId);
      await supabase
        .from("ingestion_runs")
        .update({
          recompute_status: "failure",
          error_message: validation.error,
          finished_at: new Date().toISOString(),
        })
        .eq("run_id", runId);
      return { ok: false, error: validation.error };
    }

    const { parseResult } = validation;
    if (!parseResult) {
      return { ok: false, error: "Validation passed but no parse result" };
    }

    const { charges, monthsDetected } = parseResult;
    const totalRows = csvBuffer.toString("utf8").split("\n").length - 1;
    const skipped = totalRows - charges.length;

    const upsertCounts = await upsertCharges(supabase, charges, uploadId);

    await supabase
      .from("ingestion_runs")
      .update({
        inserted_count: upsertCounts.inserted_count,
        updated_count: upsertCounts.updated_count,
        skipped_count: skipped,
      })
      .eq("run_id", runId);

    await recomputeCanonicalTables(supabase, monthsDetected);

    await supabase
      .from("ingestion_uploads")
      .update({
        status: "success",
        rows_received: totalRows,
        months_detected: monthsDetected.length ? monthsDetected : null,
      })
      .eq("upload_id", uploadId);

    await supabase
      .from("ingestion_runs")
      .update({
        finished_at: new Date().toISOString(),
        recompute_status: "success",
        months_affected: monthsDetected.length ? monthsDetected : null,
      })
      .eq("run_id", runId);

    return {
      ok: true,
      inserted_count: upsertCounts.inserted_count,
      updated_count: upsertCounts.updated_count,
      skipped_count: skipped,
      months_affected: monthsDetected,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await supabase
      .from("ingestion_uploads")
      .update({ status: "failure", error_message: errMsg })
      .eq("upload_id", uploadId);
    await supabase
      .from("ingestion_runs")
      .update({
        finished_at: new Date().toISOString(),
        recompute_status: "failure",
        error_message: errMsg,
      })
      .eq("run_id", runId);

    return { ok: false, error: errMsg };
  }
}
