/**
 * Admin brief generation: trigger Nova to generate monthly brief and upsert to monthly_briefs.
 */
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authMiddleware, requireAdmin } from "../../auth/middleware.js";
import { db } from "../../db.js";
import { config } from "../../config.js";
import { runNovaProactiveBrief } from "../../nova/agent.js";
import { upsertBrief } from "../../services/brief.js";

export async function adminBriefRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.post(
    "/brief/generate",
    {
      preHandler: [authMiddleware, requireAdmin],
      schema: {
        description:
          "Generate monthly brief via Nova and upsert to monthly_briefs. Admin only.",
        tags: ["Admin", "Brief"],
        querystring: {
          type: "object",
          properties: {
            month: {
              type: "string",
              description: "Month (YYYY-MM or YYYY-MM-01)",
            },
            compare_month: { type: "string", description: "Optional comparison month" },
            app_id: { type: "string", description: "Optional app filter" },
          },
          required: ["month"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              month: { type: "string" },
              headline_gross_billed: { type: ["number", "null"] },
              mom_delta: { type: ["number", "null"] },
              mom_delta_pct: { type: ["number", "null"] },
              brief_markdown: { type: "string" },
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
      const q = request.query as { month?: string; compare_month?: string; app_id?: string };
      const month = q.month?.trim();
      if (!month) {
        return reply.status(400).send({ error: "month is required (YYYY-MM or YYYY-MM-01)" });
      }
      try {
        const result = await runNovaProactiveBrief({
          month,
          compare_month: q.compare_month?.trim(),
          app_id: q.app_id?.trim() || undefined,
          created_by: "nova",
        });
        const supabase = db.get();
        await upsertBrief(supabase, {
          month: result.month,
          created_by: "nova",
          headline_gross_billed: result.headline_gross_billed,
          mom_delta: result.mom_delta,
          mom_delta_pct: result.mom_delta_pct,
          brief_markdown: result.brief_markdown,
        });
        return result;
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({
          error: err instanceof Error ? err.message : "Brief generation failed",
        });
      }
    }
  );
}
