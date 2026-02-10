/**
 * Brief route: GET /brief — cached monthly brief or placeholder.
 * @see docs/INGESTION_WORKFLOW.md, monthly_briefs table
 */
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { db } from "../db.js";
import { authMiddleware } from "../auth/middleware.js";
import { getBrief, toBriefResponse } from "../services/brief.js";

export async function briefRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get(
    "/",
    {
      preHandler: [authMiddleware],
      schema: {
        description:
          "Monthly brief for a given month. Returns cached row from monthly_briefs or placeholder (brief_markdown: \"Summary pending — Nova coming soon\").",
        tags: ["Brief"],
        querystring: {
          type: "object",
          properties: {
            month: {
              type: "string",
              description: "Month (YYYY-MM or YYYY-MM-01)",
            },
          },
          required: ["month"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              month: { type: "string" },
              created_at: { type: ["string", "null"] },
              created_by: { type: "string" },
              headline_gross_billed: { type: ["number", "null"] },
              mom_delta: { type: ["number", "null"] },
              mom_delta_pct: { type: ["number", "null"] },
              brief_markdown: { type: "string" },
              evidence_links: {},
              flags: {},
              placeholder: { type: "boolean" },
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
        const row = await getBrief(supabase, month);
        const response = toBriefResponse(row, month);
        return response;
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({ error: "Failed to fetch brief" });
      }
    }
  );
}
