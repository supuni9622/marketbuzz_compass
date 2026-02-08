import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { db } from "../db.js";

export async function healthRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get(
    "/",
    {
      schema: {
        description: "Health check",
        tags: ["Health"],
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["ok"] },
              timestamp: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
    async () => {
      return { status: "ok", timestamp: new Date().toISOString() };
    }
  );

  app.get(
    "/db",
    {
      schema: {
        description: "Database connectivity check",
        tags: ["Health"],
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["ok"] },
              db: { type: "string", enum: ["connected"] },
            },
          },
          503: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["error"] },
              db: { type: "string", enum: ["disconnected"] },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      if (!db.isConfigured()) {
        return reply.status(503).send({
          status: "error",
          db: "not_configured",
          message: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env",
        });
      }
      try {
        const supabase = db.get();
        const { error } = await supabase.from("charges_raw").select("charge_id").limit(1);
        if (error) throw error;
        return { status: "ok", db: "connected" };
      } catch (err) {
        app.log.error(err);
        return reply.status(503).send({ status: "error", db: "disconnected" });
      }
    }
  );
}
