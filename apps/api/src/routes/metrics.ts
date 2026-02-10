/**
 * Metrics routes: KPIs with current, compare, delta, delta_pct.
 * @see docs/MRR_AND_MANUAL_OUTPUTS.md, docs/DATA_MODEL_SPEC.md
 */
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { db } from "../db.js";
import { authMiddleware } from "../auth/middleware.js";
import { getKpis } from "../services/metrics.js";

export async function metricsRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get(
    "/kpis",
    {
      preHandler: [authMiddleware],
      schema: {
        description:
          "KPIs for a month with comparison. Every metric includes current, compare, delta, delta_pct (counts and percentages).",
        tags: ["Metrics"],
        querystring: {
          type: "object",
          properties: {
            month: { type: "string", description: "Current month (YYYY-MM or YYYY-MM-01)" },
            compare_month: {
              type: "string",
              description: "Compare month (default: previous month). YYYY-MM or YYYY-MM-01.",
            },
            app_id: { type: "string", description: "Optional filter by app" },
          },
          required: ["month"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              month: { type: "string" },
              compare_month: { type: "string" },
              billed_amount: {
                type: "object",
                properties: {
                  current: { type: "number" },
                  compare: { type: "number" },
                  delta: { type: "number" },
                  delta_pct: { type: ["number", "null"] },
                },
              },
              billed_count: {
                type: "object",
                properties: {
                  current: { type: "number" },
                  compare: { type: "number" },
                  delta: { type: "number" },
                  delta_pct: { type: ["number", "null"] },
                },
              },
              collected_amount: {
                type: "object",
                properties: {
                  current: { type: "number" },
                  compare: { type: "number" },
                  delta: { type: "number" },
                  delta_pct: { type: ["number", "null"] },
                },
              },
              deposited_amount: {
                type: "object",
                properties: {
                  current: { type: "number" },
                  compare: { type: "number" },
                  delta: { type: "number" },
                  delta_pct: { type: ["number", "null"] },
                },
              },
              refunded_amount: {
                type: "object",
                properties: {
                  current: { type: "number" },
                  compare: { type: "number" },
                  delta: { type: "number" },
                  delta_pct: { type: ["number", "null"] },
                },
              },
              active_merchants: {
                type: "object",
                properties: {
                  current: { type: "number" },
                  compare: { type: "number" },
                  delta: { type: "number" },
                  delta_pct: { type: ["number", "null"] },
                },
              },
            },
          },
          400: {
            type: "object",
            properties: { error: { type: "string" } },
          },
        },
      },
    },
    async (request, reply) => {
      const q = request.query as { month?: string; compare_month?: string; app_id?: string };
      const month = q.month?.trim();
      if (!month) {
        return reply.status(400).send({ error: "month is required (YYYY-MM or YYYY-MM-01)" });
      }
      if (!db.isConfigured()) {
        return reply.status(503).send({ error: "Database not configured" });
      }
      try {
        const supabase = db.get();
        const kpis = await getKpis(supabase, month, q.compare_month, q.app_id);
        return kpis;
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({ error: "Failed to fetch KPIs" });
      }
    }
  );
}
