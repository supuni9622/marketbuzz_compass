import { config as loadEnv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// In Lambda, env vars come from the function config; no .env file.
// fileURLToPath(import.meta.url) is undefined in the CJS bundle, so skip it.
if (typeof process.env.AWS_LAMBDA_FUNCTION_NAME === "undefined") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  loadEnv({ path: path.resolve(__dirname, "../../../.env") });
}

export const config = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  host: process.env.HOST ?? "0.0.0.0",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "",
  // AWS
  awsRegion: process.env.AWS_REGION ?? "us-east-1",
  s3BucketUploads: process.env.S3_BUCKET_UPLOADS ?? "marketbuzz-compass-uploads",
  sqsQueueUrl: process.env.SQS_QUEUE_URL ?? "",
  // Cognito
  cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID ?? "",
  cognitoClientId: process.env.COGNITO_CLIENT_ID ?? "",
  cognitoRegion: process.env.COGNITO_REGION ?? process.env.AWS_REGION ?? "us-east-1",
  // Nova (Phase 1)
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  /** Path to memory markdown files (repo /memory or S3-backed later). */
  memoryPath: process.env.MEMORY_PATH ?? "",
  /** Optional: key for scheduled/internal calls to POST /admin/brief/generate (no Cognito). */
  internalBriefApiKey: process.env.INTERNAL_BRIEF_API_KEY ?? "",
};
