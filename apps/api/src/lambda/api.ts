/**
 * Lambda handler for API Gateway HTTP API (payload 2.0).
 * Wraps the Fastify app with @fastify/aws-lambda so all routes are served by this single handler.
 *
 * Build: pnpm --filter @marketbuzz/api build:api-lambda
 * Handler (in AWS): api.handler or dist-lambda/api.handler depending on zip layout.
 */
import awsLambdaFastify from "@fastify/aws-lambda";
import { buildApp } from "../app.js";

const app = await buildApp({ serverUrl: "https://api" });
const proxy = awsLambdaFastify(app);
await app.ready();

export const handler = proxy;
