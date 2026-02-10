/**
 * Merchant list routes: paginated lifecycle list from canonical table.
 * @see docs/DATA_MODEL_SPEC.md, docs/MRR_AND_MANUAL_OUTPUTS.md
 */
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { db } from "../db.js";
import { authMiddleware } from "../auth/middleware.js";
import { listMerchantsLifecycle } from "../services/merchants.js";

export async function merchantsRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get(
    "/lifecycle",
    {
      preHandler: [authMiddleware],
      schema: {
        description:
          "Paginated list of merchants by lifecycle state for a given month. Source: merchant_lifecycle_monthly.",
        tags: ["Merchants"],
        querystring: {
          type: "object",
          properties: {
            month: {
              type: "string",
              description: "Month (YYYY-MM or YYYY-MM-01)",
            },
            app_id: {
              type: "string",
              description: "Optional filter by app",
            },
            lifecycle_state: {
              type: "string",
              enum: ["Active", "AtRisk", "Lost"],
              description: "Optional filter by lifecycle state",
            },
            page: { type: "integer", minimum: 1, description: "Page number (default 1)" },
            page_size: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              description: "Page size (default 25, max 100)",
            },
          },
          required: ["month"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    month: { type: "string" },
                    merchant_id: { type: "string" },
                    merchant_name: { type: "string" },
                    app_id: { type: "string" },
                    app_name: { type: "string" },
                    lifecycle_state: { type: "string" },
                  },
                },
              },
              page: { type: "integer" },
              page_size: { type: "integer" },
              total_rows: { type: "integer" },
            },
          },
          400: { type: "object", properties: { error: { type: "string" } } },
          503: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      const q = request.query as {
        month?: string;
        app_id?: string;
        lifecycle_state?: string;
        page?: string;
        page_size?: string;
      };
      const month = q.month?.trim();
      if (!month) {
        return reply.status(400).send({ error: "month is required (YYYY-MM or YYYY-MM-01)" });
      }
      if (!db.isConfigured()) {
        return reply.status(503).send({ error: "Database not configured" });
      }
      try {
        const supabase = db.get();
        const page = q.page ? parseInt(q.page, 10) : undefined;
        const pageSize = q.page_size ? parseInt(q.page_size, 10) : undefined;
        const result = await listMerchantsLifecycle(supabase, {
          month,
          app_id: q.app_id || undefined,
          lifecycle_state: q.lifecycle_state || undefined,
          page: Number.isFinite(page) ? page : undefined,
          page_size: Number.isFinite(pageSize) ? pageSize : undefined,
        });
        return result;
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({ error: "Failed to fetch merchant list" });
      }
    }
  );
}
