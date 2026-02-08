import { config as loadEnv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from monorepo root (two levels up from apps/api/src)
loadEnv({ path: path.resolve(__dirname, "../../../.env") });

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
};
