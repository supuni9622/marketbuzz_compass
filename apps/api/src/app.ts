import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { config } from "./config.js";
import { healthRoutes } from "./routes/health.js";
import { adminBriefRoutes } from "./routes/admin/brief.js";
import { adminMemoryRoutes } from "./routes/admin/memory.js";
import { adminPackagesRoutes } from "./routes/admin/packages.js";
import { adminUploadRoutes } from "./routes/admin/upload.js";
import { metricsRoutes } from "./routes/metrics.js";
import { merchantsRoutes } from "./routes/merchants.js";
import { briefRoutes } from "./routes/brief.js";
import { novaRoutes } from "./routes/nova.js";

export interface BuildAppOptions {
  /** Base URL for Swagger server (e.g. http://localhost:3001 or API Gateway URL). */
  serverUrl?: string;
}

/**
 * Build the Fastify app (routes, plugins). Use for local server (index.ts) or Lambda (lambda/api.ts).
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const serverUrl = options.serverUrl ?? `http://localhost:${config.port}`;
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(swagger, {
    openapi: {
      info: {
        title: "MarketBuzz Compass API",
        description: "Internal revenue intelligence system for Clover app billing",
        version: "0.1.0",
      },
      servers: [{ url: serverUrl, description: "API" }],
    },
  });
  // In Lambda, swagger-ui tries to read static/logo.svg from the filesystem; skip it to avoid ENOENT.
  if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    await app.register(swaggerUi, { routePrefix: "/docs" });
  }

  await app.register(healthRoutes, { prefix: "/health" });
  await app.register(adminUploadRoutes, { prefix: "/admin" });
  await app.register(adminBriefRoutes, { prefix: "/admin" });
  await app.register(adminPackagesRoutes, { prefix: "/admin" });
  await app.register(adminMemoryRoutes, { prefix: "/admin" });
  await app.register(metricsRoutes, { prefix: "/metrics" });
  await app.register(merchantsRoutes, { prefix: "/merchants" });
  await app.register(briefRoutes, { prefix: "/brief" });
  await app.register(novaRoutes, { prefix: "/nova" });

  return app;
}
