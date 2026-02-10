import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import multipart from "@fastify/multipart";
import { createHash } from "crypto";
import { db } from "../../db.js";
import { uploadCsv } from "../../services/s3.js";
import { sendIngestionJob } from "../../services/sqs.js";
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
  // List recent uploads with run status (Admin only)
  app.get(
    "/uploads",
    {
      preHandler: [authMiddleware, requireAdmin],
      schema: {
        description: "List recent ingestion uploads with run status. Admin only.",
        tags: ["Admin"],
        querystring: {
          type: "object",
          properties: {
            limit: { type: "integer", minimum: 1, maximum: 100, default: 25 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    upload_id: { type: "string" },
                    uploaded_at: { type: "string" },
                    uploaded_by_email: { type: ["string", "null"] },
                    status: { type: "string" },
                    rows_received: { type: ["integer", "null"] },
                    months_detected: { type: ["array", "null"] },
                    error_message: { type: ["string", "null"] },
                    run: {
                      type: ["object", "null"],
                      properties: {
                        run_id: { type: "string" },
                        started_at: { type: "string" },
                        finished_at: { type: ["string", "null"] },
                        inserted_count: { type: ["integer", "null"] },
                        updated_count: { type: ["integer", "null"] },
                        skipped_count: { type: ["integer", "null"] },
                        recompute_status: { type: ["string", "null"] },
                        nova_status: { type: ["string", "null"] },
                        error_message: { type: ["string", "null"] },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!db.isConfigured()) {
        return reply.status(503).send({ error: "Database not configured" });
      }
      const q = request.query as { limit?: string };
      const limit = Math.min(100, Math.max(1, parseInt(q.limit ?? "25", 10) || 25));
      try {
        const supabase = db.get();
        const { data: uploads, error: uploadsError } = await supabase
          .from("ingestion_uploads")
          .select("upload_id, uploaded_at, uploaded_by_email, status, rows_received, months_detected, error_message")
          .order("uploaded_at", { ascending: false })
          .limit(limit);

        if (uploadsError) {
          app.log.error({ err: uploadsError }, "Failed to list ingestion_uploads");
          return reply.status(500).send({ error: "Failed to list uploads" });
        }

        const list = uploads ?? [];
        if (list.length === 0) {
          return reply.send({ data: [] });
        }

        const uploadIds = list.map((u: { upload_id: string }) => u.upload_id);
        const { data: runs, error: runsError } = await supabase
          .from("ingestion_runs")
          .select("run_id, upload_id, started_at, finished_at, inserted_count, updated_count, skipped_count, recompute_status, nova_status, error_message")
          .in("upload_id", uploadIds)
          .order("started_at", { ascending: false });

        if (runsError) {
          app.log.error({ err: runsError }, "Failed to list ingestion_runs");
          return reply.send({ data: list.map((u: Record<string, unknown>) => ({ ...u, run: null })) });
        }

        const runByUpload: Record<string, (typeof runs)[0]> = {};
        for (const r of runs ?? []) {
          const uid = r.upload_id as string;
          if (!runByUpload[uid] || (r.started_at as string) > (runByUpload[uid].started_at as string)) {
            runByUpload[uid] = r;
          }
        }

        const data = list.map((u: Record<string, unknown>) => ({
          ...u,
          run: runByUpload[u.upload_id as string] ?? null,
        }));

        return reply.send({ data });
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({ error: "Failed to list uploads" });
      }
    }
  );

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
              const month = `${m[3]}-${(m[2] && monthNames[m[2]]) ?? "01"}`;
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

        if (runError || !runRow) {
          app.log.error({ err: runError }, "Failed to create ingestion_run");
          await supabase
            .from("ingestion_uploads")
            .update({ status: "failure", error_message: "Failed to create ingestion run" })
            .eq("upload_id", uploadId);
          await reply.status(500).send({ error: "Failed to create ingestion run" });
          return;
        }

        const runId = runRow.run_id;

        try {
          await sendIngestionJob({
            upload_id: uploadId,
            run_id: runId,
            s3_key: s3Key,
          });
        } catch (sqsErr) {
          app.log.error({ err: sqsErr, uploadId }, "Failed to send ingestion job to SQS");
          await supabase
            .from("ingestion_uploads")
            .update({ status: "failure", error_message: String(sqsErr) })
            .eq("upload_id", uploadId);
          await reply.status(500).send({ error: "Failed to enqueue ingestion job" });
          return;
        }

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
