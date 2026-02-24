# AWS SQS + Lambda Setup for Ingestion Worker (MarketBuzz Compass)

This article documents how to create the SQS queue and Lambda function that power the Day 3 ingestion pipeline. The API sends a message to SQS after each CSV upload; Lambda is triggered by SQS, fetches the CSV from S3, parses, upserts, and recomputes canonical tables.

---

## What We're Building

- **SQS Queue** – `marketbuzz-compass-ingestion` – receives job messages `{ upload_id, run_id, s3_key }`
- **Lambda function** – `marketbuzz-compass-ingestion-worker` – processes each message
- **Event source mapping** – SQS triggers Lambda
- **IAM roles** – Lambda needs S3 GetObject, SQS ReceiveMessage/DeleteMessage, CloudWatch Logs

---

## 1. Create the SQS Queue

1. In **AWS Console** go to **Amazon SQS** → **Queues** → **Create queue**.
2. **Type:** Standard queue.
3. **Name:** `marketbuzz-compass-ingestion`.
4. **Configuration:**
   - **Visibility timeout:** 900 seconds (15 min) – Lambda can run up to 15 min.
   - **Message retention:** 4 days (default).
   - **Receive message wait time:** 0 (short polling) or 20 (long polling).
   - **Maximum receives:** 3 (after 3 failed attempts, move to DLQ if configured).
5. **Optional – Dead-letter queue:**
   - Create a second queue `marketbuzz-compass-ingestion-dlq` for failed messages.
   - Set **Redrive allow policy** on the main queue to send to DLQ after max receives.
6. **Create queue**.

After creation, note the **Queue URL** (e.g. `https://sqs.us-east-1.amazonaws.com/123456789012/marketbuzz-compass-ingestion`). Add it to `.env` as `SQS_QUEUE_URL`.

---

## 1b. Cost & Volume Considerations

MarketBuzz Compass expects **1–10 CSV uploads per month**. At this volume, AWS costs are negligible and stay within free tiers.

### Cost at This Volume

| Service | Usage | Monthly cost |
|---------|-------|--------------|
| **SQS** | 1–10 SendMessage + 1–10 ReceiveMessage | **$0** (free tier: 1M requests) |
| **Lambda** | 1–10 invocations, ~5–15 min each | **$0** (free tier: 1M requests, 400K GB-seconds) |
| **S3** | 1–10 PUTs, 1–10 GETs, small storage | **$0** |

### SQS Setting Recommendations

| Setting | Value | Reason |
|---------|-------|--------|
| **Queue type** | Standard | Cheaper than FIFO; ordering not needed for ingestion |
| **Visibility timeout** | 900 s (15 min) | Must be ≥ Lambda timeout so messages aren't redelivered while processing |
| **Message retention** | 4 days (default) | Fine for low volume; minimal cost either way |
| **Receive message wait time** | 0 or 20 s | No practical cost difference at 1–10 jobs/month. Use 20 s (long polling) if you want fewer empty receives. |
| **Maximum receives** | 3 | Reasonable retry limit; after 3 failures, message is discarded (or moved to DLQ if configured) |
| **Dead-letter queue** | **Skip for MVP** | Simplest setup. Add later if you need failure visibility. Cost impact is minimal either way. |

**Summary:** Use defaults; no cost optimization needed. Cost only becomes relevant at hundreds or thousands of uploads per month.

---

## 2. Create IAM Role for Lambda

Lambda needs an execution role with permissions for **SQS, S3, and CloudWatch Logs**.

**Important:** `AWSLambdaBasicExecutionRole` alone is **not enough** – it only grants CloudWatch Logs. Without SQS permissions, adding the SQS trigger will fail with: *"The function execution role does not have permissions to call ReceiveMessage on SQS"*.

1. Go to **IAM** → **Roles** → **Create role**.
2. **Trusted entity:** AWS service → **Lambda**.
3. **Attach policies:**
   - `AWSLambdaBasicExecutionRole` (CloudWatch Logs).
4. **Role name:** `marketbuzz-compass-ingestion-lambda-role`.
5. **Create role**.
6. **Add SQS and S3 permissions** – after creating the role, add an inline policy (see below).

### Add SQS and S3 inline policy (required)

After the role is created:

1. Open the role → **Add permissions** → **Create inline policy**.
2. **JSON** tab → paste the policy below (replace `YOUR_ACCOUNT_ID` and `us-east-1` with your values).
3. **Next** → Policy name: `SQS-S3-Ingestion-Access` → **Create policy**.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:us-east-1:YOUR_ACCOUNT_ID:marketbuzz-compass-ingestion"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::marketbuzz-compass-uploads/clover_csv/*"
    }
  ]
}
```

Alternatively, when creating the role you can attach one combined policy (Logs + SQS + S3) instead of `AWSLambdaBasicExecutionRole` plus the inline policy. Use the same SQS and S3 statements above, plus the logs statements from `AWSLambdaBasicExecutionRole`.

---

## 3. Create the Lambda Function

1. Go to **AWS Lambda** → **Functions** → **Create function**.
2. **Name:** `marketbuzz-compass-ingestion-worker`.
3. **Runtime:** Node.js 20.x (or 18.x).
4. **Architecture:** x86_64.
5. **Execution role:** Use the role created in step 2.
6. **Create function**.

### Configuration

1. **General configuration:**
   - **Timeout:** 15 minutes (900 seconds).
   - **Memory:** 512 MB (or 1024 MB for large CSVs).

2. **Environment variables** (Configuration → Environment variables):

   | Key | Value |
   |----|-------|
   | `SUPABASE_URL` | Your Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
   | `S3_BUCKET_UPLOADS` | `marketbuzz-compass-uploads` |

   **Note:** Do not set `AWS_REGION` – Lambda provides it automatically and reserves it. The AWS SDK uses it by default.

3. **VPC:** Leave default (no VPC) – Supabase is public.

---

## 4. Add SQS as Trigger (Event Source Mapping)

1. In the Lambda function, go to **Configuration** → **Triggers** → **Add trigger**.
2. **Source:** SQS.
3. **SQS queue:** Select `marketbuzz-compass-ingestion`.
4. **Batch size:** 1 (process one message at a time for simplicity).
5. **Add**.

Lambda will now be invoked when a message arrives in the queue.

### If you get "The function execution role does not have permissions to call ReceiveMessage on SQS"

The Lambda role is missing SQS permissions. Add them:

1. Go to **IAM** → **Roles** → open your Lambda's execution role (e.g. `marketbuzz-compass-ingestion-lambda-role`).
2. **Add permissions** → **Create inline policy** → **JSON** tab.
3. Paste the SQS + S3 policy from Section 2 above (replace `YOUR_ACCOUNT_ID` and `us-east-1`).
4. **Next** → Policy name: `SQS-S3-Ingestion-Access` → **Create policy**.
5. Retry adding the SQS trigger in Lambda.

---

## 5. Deploy the Lambda Code

The Lambda handler lives in `apps/api/src/lambda/ingestion.ts`. You need to bundle and deploy it.

### Option A: Manual ZIP upload

1. From the monorepo root:
   ```bash
   cd apps/api
   pnpm run build:lambda   # or equivalent build script
   ```
2. Zip the output (e.g. `dist-lambda/` or `dist/`).
3. In Lambda console → **Code** → **Upload from** → **.zip file**.

### Option B: AWS CLI

```bash
cd apps/api
pnpm run build:lambda
cd dist-lambda && zip -r ../ingestion.zip . && cd ..
aws lambda update-function-code \
  --function-name marketbuzz-compass-ingestion-worker \
  --zip-file fileb://ingestion.zip
```

### Option C: Serverless Framework / SST / SAM

Use your preferred IaC tool. The handler export is `handler` from `ingestion.js` (or the path you configure).

---

## 6. Handler Configuration

In Lambda configuration → **Runtime settings**:

- **Handler:** `ingestion.handler` (the build outputs `ingestion.mjs` in the deployment package root).

---

## 7. SQS Queue Permissions (Optional)

If Lambda fails with "Access Denied" when polling SQS:

1. Go to the SQS queue → **Access policy**.
2. Add a policy that allows Lambda to receive and delete messages:

```json
{
  "Effect": "Allow",
  "Principal": {
    "Service": "lambda.amazonaws.com"
  },
  "Action": [
    "sqs:ReceiveMessage",
    "sqs:DeleteMessage",
    "sqs:GetQueueAttributes"
  ],
  "Resource": "arn:aws:sqs:us-east-1:YOUR_ACCOUNT_ID:marketbuzz-compass-ingestion",
  "Condition": {
    "ArnLike": {
      "lambda:SourceFunctionArn": "arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:marketbuzz-compass-ingestion-worker"
    }
  }
}
```

AWS usually adds this automatically when you create the event source mapping. If not, add it manually.

---

## 8. API Permissions (SendMessage)

The API (or the IAM user/role it uses) needs permission to send messages to the queue:

```json
{
  "Effect": "Allow",
  "Action": "sqs:SendMessage",
  "Resource": "arn:aws:sqs:us-east-1:YOUR_ACCOUNT_ID:marketbuzz-compass-ingestion"
}
```

Add this to the IAM user or role that the API uses (e.g. the same user with S3 access).

---

## 9. .env for the API

Add to your `.env` (monorepo root):

```
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/YOUR_ACCOUNT_ID/marketbuzz-compass-ingestion
```

The API reads this to send messages after each CSV upload.

---

## 10. Test the Flow

1. Upload a CSV via `POST /admin/upload/csv` (with Admin JWT).
2. Check CloudWatch Logs for the Lambda – you should see the handler run.
3. Check Supabase – `ingestion_uploads` and `ingestion_runs` should show `status: success` and `recompute_status: success`.
4. If Lambda fails, check:
   - S3 GetObject permission
   - Supabase URL and key
   - Handler path and export name

---

## Checklist

| Step | Task | Done |
|------|------|------|
| 1 | Create SQS queue `marketbuzz-compass-ingestion` | ☐ |
| 2 | Create IAM role for Lambda (SQS, S3, Logs) | ☐ |
| 3 | Create Lambda function | ☐ |
| 4 | Set Lambda timeout (15 min), memory (512 MB) | ☐ |
| 5 | Set Lambda env vars (Supabase, S3 bucket) | ☐ |
| 6 | Add SQS trigger (event source mapping) | ☐ |
| 7 | Deploy Lambda code | ☐ |
| 8 | Add SQS SendMessage to API IAM user | ☐ |
| 9 | Add SQS_QUEUE_URL to .env | ☐ |

---

## Related Docs

- [day3-ingestion-pipeline-architecture.md](./day3-ingestion-pipeline-architecture.md) – Architecture and data flow
- [INGESTION_WORKFLOW.md](../INGESTION_WORKFLOW.md) – Validation, upsert, recompute rules
