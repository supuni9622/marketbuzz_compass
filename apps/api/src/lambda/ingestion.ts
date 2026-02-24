/**
 * Lambda handler for SQS-triggered ingestion.
 * Receives { upload_id, run_id, s3_key } and runs the pipeline.
 * Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, S3_BUCKET_UPLOADS in Lambda env.
 */
import type { SQSEvent, SQSHandler } from "aws-lambda";
import { runIngestion } from "../ingestion/pipeline.js";

interface IngestionMessage {
  upload_id: string;
  run_id: string;
  s3_key: string;
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const body = JSON.parse(record.body) as IngestionMessage;
    const { upload_id, run_id, s3_key } = body;

    if (!upload_id || !run_id || !s3_key) {
      throw new Error(`Invalid message: missing upload_id, run_id, or s3_key`);
    }

    const result = await runIngestion(upload_id, run_id, s3_key);

    if (!result.ok) {
      throw new Error(result.error ?? "Ingestion failed");
    }
  }
};
