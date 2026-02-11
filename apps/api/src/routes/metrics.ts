/**
 * Metrics routes: KPIs with current, compare, delta, delta_pct.
 * @see docs/MRR_AND_MANUAL_OUTPUTS.md, docs/DATA_MODEL_SPEC.md
 */
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { db } from "../db.js";
import { authMiddleware } from "../auth/middleware.js";
import { getKpis, getTrend, getMetricsByApp, type TrendMetric } from "../services/metrics.js";

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

  app.get(
    "/trend",
    {
      preHandler: [authMiddleware],
      schema: {
        description:
          "Trend over time: billed_amount or active_merchants for last N months (canonical tables).",
        tags: ["Metrics"],
        querystring: {
          type: "object",
          properties: {
            metric: {
              type: "string",
              enum: ["billed_amount", "active_merchants", "collected_amount", "deposited_amount", "refunded_amount", "nra_amount"],
              description: "Metric to trend",
            },
            months_back: {
              type: "integer",
              description: "Number of months (default 12, max 24)",
            },
            app_id: { type: "string", description: "Optional app filter" },
          },
          required: ["metric"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              metric: { type: "string" },
              points: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    month: { type: "string" },
                    value: { type: "number" },
                  },
                },
              },
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
        metric?: string;
        months_back?: string;
        app_id?: string;
      };
      const metric = q.metric as string | undefined;
      const validMetrics = ["billed_amount", "active_merchants", "collected_amount", "deposited_amount", "refunded_amount", "nra_amount"];
      if (!metric || !validMetrics.includes(metric)) {
        return reply.status(400).send({
          error:
            "metric is required and must be billed_amount, active_merchants, collected_amount, deposited_amount, refunded_amount, or nra_amount",
        });
      }
      if (!db.isConfigured()) {
        return reply.status(503).send({ error: "Database not configured" });
      }
      try {
        const supabase = db.get();
        const monthsBack = q.months_back ? parseInt(q.months_back, 10) : undefined;
        const result = await getTrend(supabase, {
          metric: metric as TrendMetric,
          months_back: monthsBack,
          app_id: q.app_id?.trim() || undefined,
        });
        return result;
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({ error: "Failed to fetch trend" });
      }
    }
  );

  app.get(
    "/by-app",
    {
      preHandler: [authMiddleware],
      schema: {
        description:
          "Metrics by app for a month (billed_amount, collected_amount, deposited_amount, nra_amount, active_merchants, refunded_amount per app). For Evidence zone charts.",
        tags: ["Metrics"],
        querystring: {
          type: "object",
          properties: {
            month: { type: "string", description: "Month (YYYY-MM or YYYY-MM-01)" },
          },
          required: ["month"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              month: { type: "string" },
              billed_amount: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    app_id: { type: "string" },
                    app_name: { type: "string" },
                    value: { type: "number" },
                  },
                },
              },
              collected_amount: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    app_id: { type: "string" },
                    app_name: { type: "string" },
                    value: { type: "number" },
                  },
                },
              },
              deposited_amount: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    app_id: { type: "string" },
                    app_name: { type: "string" },
                    value: { type: "number" },
                  },
                },
              },
              nra_amount: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    app_id: { type: "string" },
                    app_name: { type: "string" },
                    value: { type: "number" },
                  },
                },
              },
              active_merchants: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    app_id: { type: "string" },
                    app_name: { type: "string" },
                    value: { type: "number" },
                  },
                },
              },
              refunded_amount: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    app_id: { type: "string" },
                    app_name: { type: "string" },
                    value: { type: "number" },
                  },
                },
              },
            },
          },
          400: { type: "object", properties: { error: { type: "string" } } },
          503: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      const q = request.query as { month?: string };
      const month = q.month?.trim();
      if (!month) {
        return reply.status(400).send({ error: "month is required (YYYY-MM or YYYY-MM-01)" });
      }
      if (!db.isConfigured()) {
        return reply.status(503).send({ error: "Database not configured" });
      }
      try {
        const supabase = db.get();
        const result = await getMetricsByApp(supabase, month);
        return result;
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({ error: "Failed to fetch metrics by app" });
      }
    }
  );
}
