import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { config } from "../config.js";

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: config.awsRegion,
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }
  return client;
}

/**
 * Upload CSV to S3 at clover_csv/{yyyy}/{mm}/{upload_id}.csv
 */
export async function uploadCsv(
  uploadId: string,
  body: Buffer | Uint8Array
): Promise<string> {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const key = `clover_csv/${yyyy}/${mm}/${uploadId}.csv`;

  await getClient().send(
    new PutObjectCommand({
      Bucket: config.s3BucketUploads,
      Key: key,
      Body: body,
      ContentType: "text/csv",
    })
  );

  return key;
}

/**
 * Fetch CSV from S3 by key (for Lambda ingestion worker).
 */
export async function getCsv(s3Key: string): Promise<Buffer> {
  const response = await getClient().send(
    new GetObjectCommand({
      Bucket: config.s3BucketUploads,
      Key: s3Key,
    })
  );
  const body = response.Body;
  if (!body) {
    throw new Error(`Empty response from S3 for key: ${s3Key}`);
  }
  const stream = body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
