/**
 * Nova routes: chat and growth plan. JWT required.
 * @see docs/AGENT_SPEC.md
 */
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { db } from "../db.js";
import { authMiddleware } from "../auth/middleware.js";
import { config } from "../config.js";
import {
  runNovaChat,
  runNovaGrowthPlan,
  type ChatMessage,
} from "../nova/agent.js";

export async function novaRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.post(
    "/chat",
    {
      preHandler: [authMiddleware],
      schema: {
        description:
          "Ask Nova a question. Uses canonical data only; cites numbers. Optional month/compare_month/app_id for context.",
        tags: ["Nova"],
        body: {
          type: "object",
          properties: {
            messages: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  role: { type: "string", enum: ["user", "assistant"] },
                  content: { type: "string" },
                },
                required: ["role", "content"],
              },
              description: "Conversation history; last message is the new user question",
            },
            month: {
              type: "string",
              description: "Optional month (YYYY-MM) for tool context",
            },
            compare_month: {
              type: "string",
              description: "Optional comparison month",
            },
            app_id: { type: "string", description: "Optional app filter" },
          },
          required: ["messages"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              tool_calls_used: { type: "integer" },
            },
          },
          400: { type: "object", properties: { error: { type: "string" } } },
          503: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      if (!config.openaiApiKey) {
        return reply.status(503).send({
          error: "Nova is not configured (OPENAI_API_KEY missing)",
        });
      }
      if (!db.isConfigured()) {
        return reply.status(503).send({ error: "Database not configured" });
      }
      const body = request.body as {
        messages?: ChatMessage[];
        month?: string;
        compare_month?: string;
        app_id?: string;
      };
      const messages = body.messages ?? [];
      if (messages.length === 0) {
        return reply.status(400).send({ error: "messages is required and must not be empty" });
      }
      try {
        const result = await runNovaChat({
          messages,
          month: body.month?.trim(),
          compare_month: body.compare_month?.trim(),
          app_id: body.app_id?.trim() || undefined,
        });
        return result;
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({
          error: err instanceof Error ? err.message : "Nova chat failed",
        });
      }
    }
  );

  app.post(
    "/growth-plan",
    {
      preHandler: [authMiddleware],
      schema: {
        description:
          "Generate a growth plan for next month: baseline, target, gap, levers (retention, expansion, win-back, NRA).",
        tags: ["Nova"],
        body: {
          type: "object",
          properties: {
            month: {
              type: "string",
              description: "Baseline month (YYYY-MM or YYYY-MM-01)",
            },
            growth_pct: {
              type: "number",
              description: "Target growth percentage (e.g. 10)",
            },
            app_id: { type: "string", description: "Optional app filter" },
            constraints: { type: "object", description: "Optional constraints" },
          },
          required: ["month", "growth_pct"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              markdown: { type: "string" },
              tool_calls_used: { type: "integer" },
              lever_breakdown: {
                type: "array",
                description: "Parsed Lever Breakdown Table (Lever | Expected Contribution | Confidence)",
                items: {
                  type: "object",
                  properties: {
                    lever: { type: "string" },
                    expected_contribution: { type: "string" },
                    confidence: { type: "string" },
                  },
                },
              },
              execution_lists: {
                type: "object",
                description: "Parsed Execution Lists (At Risk, Upgrade candidates, Lost, NRA by plan)",
                properties: {
                  at_risk: {
                    type: "array",
                    items: { type: "object", properties: { label: { type: "string" } } },
                  },
                  upgrade_candidates: {
                    type: "array",
                    items: { type: "object", properties: { label: { type: "string" } } },
                  },
                  lost: {
                    type: "array",
                    items: { type: "object", properties: { label: { type: "string" } } },
                  },
                  nra_by_plan: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        plan: { type: "string" },
                        required: { type: "string" },
                      },
                    },
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
      if (!config.openaiApiKey) {
        return reply.status(503).send({
          error: "Nova is not configured (OPENAI_API_KEY missing)",
        });
      }
      if (!db.isConfigured()) {
        return reply.status(503).send({ error: "Database not configured" });
      }
      const body = request.body as {
        month?: string;
        growth_pct?: number;
        app_id?: string;
        constraints?: Record<string, unknown>;
      };
      const month = body.month?.trim();
      const growthPct = body.growth_pct;
      if (!month) {
        return reply.status(400).send({ error: "month is required" });
      }
      if (typeof growthPct !== "number") {
        return reply.status(400).send({ error: "growth_pct is required and must be a number" });
      }
      try {
        const result = await runNovaGrowthPlan({
          month,
          growth_pct: growthPct,
          app_id: body.app_id?.trim() || undefined,
          constraints: body.constraints,
        });
        return result;
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({
          error: err instanceof Error ? err.message : "Growth plan failed",
        });
      }
    }
  );
}
