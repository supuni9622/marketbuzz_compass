/**
 * SQS service — send ingestion job messages.
 */
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { config } from "../config.js";

let client: SQSClient | null = null;

function getClient(): SQSClient {
  if (!client) {
    client = new SQSClient({
      region: config.awsRegion,
      credentials:
        typeof process.env.AWS_LAMBDA_FUNCTION_NAME !== "undefined"
          ? undefined
          : process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
            ? {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
              }
            : undefined,
    });
  }
  return client;
}

export interface IngestionJobPayload {
  upload_id: string;
  run_id: string;
  s3_key: string;
}

/**
 * Send an ingestion job to SQS.
 * @throws if SQS_QUEUE_URL is not configured
 */
export async function sendIngestionJob(payload: IngestionJobPayload): Promise<void> {
  const queueUrl = config.sqsQueueUrl;
  if (!queueUrl) {
    throw new Error("SQS_QUEUE_URL is required for ingestion. Add it to .env per docs/articles/aws-sqs-lambda-ingestion-setup.md");
  }

  await getClient().send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(payload),
    })
  );
}
