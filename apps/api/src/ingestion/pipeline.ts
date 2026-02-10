/**
 * Ingestion pipeline orchestrator: fetch CSV → validate → upsert → recompute → audit.
 * After recompute success, triggers Nova proactive brief and updates ingestion_runs.nova_status.
 * @see docs/INGESTION_WORKFLOW.md
 */
import { db } from "../db.js";
import { config } from "../config.js";
import { getCsv } from "../services/s3.js";
import { validateCsv } from "./validator.js";
import { upsertCharges } from "./upsert.js";
import { recomputeCanonicalTables } from "./recompute.js";
import { runNovaProactiveBrief } from "../nova/agent.js";
import { upsertBrief } from "../services/brief.js";

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

    // Proactive brief: generate for latest affected month and update nova_status
    const primaryMonth =
      monthsDetected.length > 0
        ? monthsDetected.slice().sort().reverse()[0]!.slice(0, 7) + "-01"
        : null;
    if (primaryMonth && config.openaiApiKey) {
      try {
        const result = await runNovaProactiveBrief({
          month: primaryMonth,
          created_by: "ingestion",
        });
        await upsertBrief(supabase, {
          month: result.month,
          created_by: "ingestion",
          headline_gross_billed: result.headline_gross_billed,
          mom_delta: result.mom_delta,
          mom_delta_pct: result.mom_delta_pct,
          brief_markdown: result.brief_markdown,
        });
        await supabase
          .from("ingestion_runs")
          .update({ nova_status: "success" })
          .eq("run_id", runId);
      } catch (novaErr) {
        const novaMsg =
          novaErr instanceof Error ? novaErr.message : String(novaErr);
        await supabase
          .from("ingestion_runs")
          .update({
            nova_status: "failure",
            error_message: `Nova brief: ${novaMsg}`,
          })
          .eq("run_id", runId);
        // Ingestion succeeded; do not fail the pipeline
      }
    }

    return {
      ok: true,
      inserted_count: upsertCounts.inserted_count,
      updated_count: upsertCounts.updated_count,
      skipped_count: skipped,
      months_affected: monthsDetected,
    };
  } catch (err) {
    const errMsg =
      err instanceof Error
        ? err.message
        : err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : JSON.stringify(err);
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
