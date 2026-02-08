import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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
