import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { config } from "./config.js";
import { db } from "./db.js";
import { healthRoutes } from "./routes/health.js";
import { adminUploadRoutes } from "./routes/admin/upload.js";
import { metricsRoutes } from "./routes/metrics.js";
import { merchantsRoutes } from "./routes/merchants.js";

const app = Fastify({ logger: true });

async function start() {
  await app.register(cors, { origin: true });
  await app.register(swagger, {
    openapi: {
      info: {
        title: "MarketBuzz Compass API",
        description: "Internal revenue intelligence system for Clover app billing",
        version: "0.1.0",
      },
      servers: [{ url: `http://localhost:${config.port}`, description: "Local" }],
    },
  });
  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });

  await app.register(healthRoutes, { prefix: "/health" });
  await app.register(adminUploadRoutes, { prefix: "/admin" });
  await app.register(metricsRoutes, { prefix: "/metrics" });
  await app.register(merchantsRoutes, { prefix: "/merchants" });

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`API running at http://${config.host}:${config.port}`);
    app.log.info(`Swagger docs at http://${config.host}:${config.port}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

export async function close() {
  await app.close();
  await db.close();
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
