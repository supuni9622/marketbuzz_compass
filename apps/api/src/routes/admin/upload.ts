import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import multipart from "@fastify/multipart";
import { createHash } from "crypto";
import { db } from "../../db.js";
import { uploadCsv } from "../../services/s3.js";
import { authMiddleware, requireAdmin } from "../../auth/middleware.js";

// Required columns per INGESTION_WORKFLOW.md / CLOVER_CSV_SCHEMA.md
const REQUIRED_COLUMNS = [
  "Charge ID",
  "Charge Date",
  "Merchant ID",
  "Merchant Name",
  "App Name",
  "Amount",
  "Status",
];
const FALLBACK_APP_COLUMN = "App ID";

function parseCsvHeaders(firstLine: string): string[] {
  return firstLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
}

function validateCsvHeaders(headers: string[]): { ok: boolean; error?: string } {
  const hasAppName = headers.includes("App Name");
  const hasAppId = headers.includes("App ID");
  if (!hasAppName && !hasAppId) {
    return { ok: false, error: "Missing required column: App Name or App ID" };
  }

  for (const col of REQUIRED_COLUMNS) {
    if (col === "App Name" && (hasAppName || hasAppId)) continue;
    if (!headers.includes(col)) {
      return { ok: false, error: `Missing required column: ${col}` };
    }
  }
  return { ok: true };
}

export async function adminUploadRoutes(app: FastifyInstance): Promise<void> {
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

  app.post(
    "/upload/csv",
    {
      preHandler: [authMiddleware, requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;

      const data = await request.file();
      if (!data) {
        await reply.status(400).send({ error: "No file uploaded" });
        return;
      }

      const buffer = await data.toBuffer();
      if (buffer.length === 0) {
        await reply.status(400).send({ error: "Empty file" });
        return;
      }

      const firstLine = buffer.toString("utf8").split("\n")[0];
      if (!firstLine) {
        await reply.status(400).send({ error: "File has no headers" });
        return;
      }

      const headers = parseCsvHeaders(firstLine);
      const validation = validateCsvHeaders(headers);
      if (!validation.ok) {
        await reply.status(400).send({ error: validation.error });
        return;
      }

      const fileSha256 = createHash("sha256").update(buffer).digest("hex");
      const supabase = db.get();

      const { data: uploadRow, error: uploadError } = await supabase
        .from("ingestion_uploads")
        .insert({
          uploaded_by_user_id: user.sub,
          uploaded_by_email: user.email,
          source_system: "clover",
          status: "pending",
        })
        .select("upload_id")
        .single();

      if (uploadError || !uploadRow) {
        app.log.error({ err: uploadError }, "Failed to create ingestion_uploads");
        await reply.status(500).send({ error: "Failed to create upload record" });
        return;
      }

      const uploadId = uploadRow.upload_id;

      try {
        const s3Key = await uploadCsv(uploadId, buffer);
        const rowCount = buffer.toString("utf8").split("\n").length - 1;

        // Detect months from Charge Date column (simplified: we'll parse in worker)
        const monthsDetected: string[] = [];
        const lines = buffer.toString("utf8").split("\n").slice(1, 11);
        const chargeDateIdx = headers.indexOf("Charge Date");
        for (const line of lines) {
          if (!line.trim()) continue;
          const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
          const dateStr = cols[chargeDateIdx];
          if (dateStr) {
            const m = dateStr.match(/(\d{2})-(\w{3})-(\d{4})/);
            if (m) {
              const monthNames: Record<string, string> = {
                Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
                Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
              };
              const month = `${m[3]}-${monthNames[m[2]] ?? "01"}`;
              if (!monthsDetected.includes(month)) monthsDetected.push(month);
            }
          }
        }

        await supabase
          .from("ingestion_uploads")
          .update({
            file_s3_key: s3Key,
            file_sha256: fileSha256,
            rows_received: rowCount,
            months_detected: monthsDetected.length ? monthsDetected : null,
          })
          .eq("upload_id", uploadId);

        const { data: runRow, error: runError } = await supabase
          .from("ingestion_runs")
          .insert({
            upload_id: uploadId,
            months_affected: monthsDetected.length ? monthsDetected : null,
          })
          .select("run_id")
          .single();

        if (runError) {
          app.log.warn({ err: runError }, "Failed to create ingestion_run");
        }

        const runId = runRow?.run_id ?? null;

        await reply.status(202).send({
          upload_id: uploadId,
          run_id: runId,
          status: "pending",
          file_s3_key: s3Key,
          rows_received: rowCount,
          months_detected: monthsDetected,
        });
      } catch (err) {
        app.log.error({ err, uploadId }, "Failed to upload to S3");
        await supabase
          .from("ingestion_uploads")
          .update({ status: "failure", error_message: String(err) })
          .eq("upload_id", uploadId);
        await reply.status(500).send({ error: "Failed to store file" });
      }
    }
  );
}
