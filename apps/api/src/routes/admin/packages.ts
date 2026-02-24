/**
 * Admin package catalog CRUD. Admin only.
 */
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { db } from "../../db.js";
import { authMiddleware, requireAdmin } from "../../auth/middleware.js";
import {
  listPackages,
  createPackage,
  updatePackage,
  deletePackage,
  type CreatePackageInput,
} from "../../services/packages.js";

export async function adminPackagesRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get(
    "/packages",
    {
      preHandler: [authMiddleware, requireAdmin],
      schema: {
        description: "List all package catalog entries. Admin only.",
        tags: ["Admin", "Packages"],
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                app_id: { type: "string" },
                app_name: { type: "string" },
                plan_id: { type: "string" },
                plan_name: { type: "string" },
                price: { type: "number" },
                tier: { type: ["string", "null"] },
              },
            },
          },
          503: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (_request, reply) => {
      if (!db.isConfigured()) {
        return reply.status(503).send({ error: "Database not configured" });
      }
      try {
        const supabase = db.get();
        const list = await listPackages(supabase);
        return list;
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({ error: "Failed to list packages" });
      }
    }
  );

  app.post(
    "/packages",
    {
      preHandler: [authMiddleware, requireAdmin],
      schema: {
        description: "Create a package catalog entry. Admin only.",
        tags: ["Admin", "Packages"],
        body: {
          type: "object",
          properties: {
            app_id: { type: "string" },
            app_name: { type: "string" },
            plan_id: { type: "string" },
            plan_name: { type: "string" },
            price: { type: "number" },
            tier: { type: ["string", "null"] },
          },
          required: ["app_id", "app_name", "plan_id", "plan_name", "price"],
        },
        response: {
          201: {
            type: "object",
            properties: {
              app_id: { type: "string" },
              app_name: { type: "string" },
              plan_id: { type: "string" },
              plan_name: { type: "string" },
              price: { type: "number" },
              tier: { type: ["string", "null"] },
            },
          },
          400: { type: "object", properties: { error: { type: "string" } } },
          503: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      if (!db.isConfigured()) {
        return reply.status(503).send({ error: "Database not configured" });
      }
      const body = request.body as CreatePackageInput;
      if (
        !body.app_id?.trim() ||
        !body.app_name?.trim() ||
        !body.plan_id?.trim() ||
        !body.plan_name?.trim() ||
        typeof body.price !== "number"
      ) {
        return reply.status(400).send({
          error: "app_id, app_name, plan_id, plan_name, and price (number) are required",
        });
      }
      try {
        const supabase = db.get();
        const row = await createPackage(supabase, body);
        return reply.status(201).send(row);
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({
          error: err instanceof Error ? err.message : "Failed to create package",
        });
      }
    }
  );

  app.patch(
    "/packages/:app_id/:plan_id",
    {
      preHandler: [authMiddleware, requireAdmin],
      schema: {
        description: "Update a package catalog entry. Admin only.",
        tags: ["Admin", "Packages"],
        params: {
          type: "object",
          properties: {
            app_id: { type: "string" },
            plan_id: { type: "string" },
          },
          required: ["app_id", "plan_id"],
        },
        body: {
          type: "object",
          properties: {
            app_name: { type: "string" },
            plan_name: { type: "string" },
            price: { type: "number" },
            tier: { type: ["string", "null"] },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              app_id: { type: "string" },
              app_name: { type: "string" },
              plan_id: { type: "string" },
              plan_name: { type: "string" },
              price: { type: "number" },
              tier: { type: ["string", "null"] },
            },
          },
          400: { type: "object", properties: { error: { type: "string" } } },
          503: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      if (!db.isConfigured()) {
        return reply.status(503).send({ error: "Database not configured" });
      }
      const { app_id: appId, plan_id: planId } = request.params as { app_id: string; plan_id: string };
      const body = request.body as Partial<CreatePackageInput>;
      try {
        const supabase = db.get();
        const row = await updatePackage(supabase, appId, planId, body);
        return row;
      } catch (err) {
        app.log.error(err);
        const msg = err instanceof Error ? err.message : "Failed to update package";
        if (msg.includes("not found")) return reply.status(404).send({ error: msg });
        return reply.status(500).send({ error: msg });
      }
    }
  );

  app.delete(
    "/packages/:app_id/:plan_id",
    {
      preHandler: [authMiddleware, requireAdmin],
      schema: {
        description: "Delete a package catalog entry. Admin only.",
        tags: ["Admin", "Packages"],
        params: {
          type: "object",
          properties: {
            app_id: { type: "string" },
            plan_id: { type: "string" },
          },
          required: ["app_id", "plan_id"],
        },
        response: {
          204: { type: "null", description: "No content" },
          404: { type: "object", properties: { error: { type: "string" } } },
          503: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      if (!db.isConfigured()) {
        return reply.status(503).send({ error: "Database not configured" });
      }
      const { app_id: appId, plan_id: planId } = request.params as { app_id: string; plan_id: string };
      try {
        const supabase = db.get();
        await deletePackage(supabase, appId, planId);
        return reply.status(204).send();
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({
          error: err instanceof Error ? err.message : "Failed to delete package",
        });
      }
    }
  );
}
