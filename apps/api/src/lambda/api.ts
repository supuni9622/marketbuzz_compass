/**
 * Lambda handler for API Gateway HTTP API (payload 2.0).
 * Wraps the Fastify app with @fastify/aws-lambda so all routes are served by this single handler.
 * Uses lazy init (no top-level await) so the bundle can be CJS and avoid "Dynamic require of node:crypto" in ESM.
 *
 * Build: pnpm --filter @marketbuzz/api build:api-lambda
 * Handler (in AWS): api.handler (zip contains api.js at root).
 */
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import awsLambdaFastify from "@fastify/aws-lambda";
import { buildApp } from "../app.js";

let proxy: APIGatewayProxyHandlerV2 | null = null;

async function getProxy(): Promise<APIGatewayProxyHandlerV2> {
  if (proxy) return proxy;
  const app = await buildApp({ serverUrl: "https://api" });
  proxy = awsLambdaFastify(app);
  await app.ready();
  return proxy;
}

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  const handlerFn = await getProxy();
  const result = await handlerFn(event, context, undefined as unknown as Parameters<APIGatewayProxyHandlerV2>[2]);
  return result ?? { statusCode: 502, body: "" };
};
