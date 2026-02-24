# Articles

Learning notes and how-to articles from building MarketBuzz Compass. Suitable for adapting into blog posts (e.g. Medium, LinkedIn).

| Article | Summary |
|--------|--------|
| [aws-cognito-setup-step-by-step.md](./aws-cognito-setup-step-by-step.md) | Full AWS Cognito setup: User Pool, groups (Admin/Viewer), app client, domain, Managed login (callback URLs, OAuth, scopes), users, passwords, and where permissions are defined. |
| [cognito-jwt-postman-api-testing.md](./cognito-jwt-postman-api-testing.md) | Getting a Cognito JWT for API testing: why you get a code instead of a token, and Postman config that works (including the `invalid_client` fix). |
| [supabase-postgres-decisions-and-layers.md](./supabase-postgres-decisions-and-layers.md) | Supabase & PostgreSQL: decisions (service_role vs anon, RLS tripwire), patterns, data layers (raw vs canonical), and how RLS/keys are used in the app. |
| [ai-supervised-development-context-and-handoff.md](./ai-supervised-development-context-and-handoff.md) | AI-supervised dev: context windows, tracking with PROGRESS.md, handoff between sessions, artifact stack, and Mermaid diagrams. |
| [day3-ingestion-pipeline-architecture.md](./day3-ingestion-pipeline-architecture.md) | Day 3 ingestion pipeline: architecture (API → SQS → Lambda), data flow (CSV → charges_raw → canonical tables), component breakdown, recompute order, and Mermaid diagrams. |
| [aws-sqs-lambda-ingestion-setup.md](./aws-sqs-lambda-ingestion-setup.md) | AWS SQS + Lambda setup for ingestion worker: create queue, IAM role, Lambda function, event source mapping, env vars, and deployment. |
| [nova-architecture-and-business-value.md](./nova-architecture-and-business-value.md) | Nova: architecture (OpenAI, memory, tools, router), capabilities (brief, chat, growth plan), behavior (guardrails, tone), and how she supports Interpret / Guide / Plan / Warn. |
| [proactive-brief-trigger-architecture.md](./proactive-brief-trigger-architecture.md) | Proactive brief trigger architecture: after-upload (pipeline → Nova + nova_status) and scheduled (EventBridge → Lambda → POST /admin/brief/generate); shared endpoint, internal auth, month selection, and Mermaid diagrams. |
| [scheduled-brief-lambda-eventbridge.md](./scheduled-brief-lambda-eventbridge.md) | Scheduled monthly brief: internal auth (X-Internal-Brief-Key), Lambda handler (scheduledBrief.ts), EventBridge cron (1st of month), and env vars. |
| [cognito-token-storage-and-jwt-validation.md](./cognito-token-storage-and-jwt-validation.md) | Token storage (sessionStorage vs httpOnly cookie/session) and JWT issuer/audience validation: when the current approach is enough and when to add more. |
| [nextjs-scorecards-first-load-and-useSearchParams.md](./nextjs-scorecards-first-load-and-useSearchParams.md) | Fixing a section that stayed blank on first load: useSearchParams deferral, moving the section shell out of the deferred tree, Suspense only around the grid, and avoiding opacity-0 on first paint. |
| [deployment-api-lambda-notes.md](./deployment-api-lambda-notes.md) | API Lambda deployment: what we did (app factory, lambda/api.ts lazy init, build:api-lambda CJS, zip), **resolution** (CJS bundle + lazy init fixes "Dynamic require of node:crypto"), and quick reference. |
