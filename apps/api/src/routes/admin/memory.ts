/**
 * Admin Memory Manager: list known memory files and read content. Admin only.
 * @see docs/MEMORY_FILE_STRUCTURE.md, docs/ADMIN_MEMORY_MANAGER_UI_SPEC.md
 */
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authMiddleware, requireAdmin } from "../../auth/middleware.js";
import { getMemoryFileList, readMemoryFile } from "../../nova/memoryLoader.js";

export async function adminMemoryRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get(
    "/memory/list",
    {
      preHandler: [authMiddleware, requireAdmin],
      schema: {
        description: "List known Nova memory file paths (from bundles). Admin only.",
        tags: ["Admin", "Memory"],
        response: {
          200: {
            type: "object",
            properties: {
              files: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (_request, reply) => {
      try {
        const files = getMemoryFileList();
        return { files };
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({
          error: err instanceof Error ? err.message : "Failed to list memory files",
        });
      }
    }
  );

  app.get(
    "/memory/content",
    {
      preHandler: [authMiddleware, requireAdmin],
      schema: {
        description: "Read content of a memory file by relative path (e.g. definitions/metrics.md). Admin only.",
        tags: ["Admin", "Memory"],
        querystring: {
          type: "object",
          properties: {
            path: { type: "string", description: "Relative path, e.g. definitions/metrics.md" },
          },
          required: ["path"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              path: { type: "string" },
              content: { type: ["string", "null"] },
            },
          },
          400: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      const q = request.query as { path?: string };
      const relPath = q.path?.trim();
      if (!relPath) {
        return reply.status(400).send({ error: "path is required (e.g. definitions/metrics.md)" });
      }
      try {
        const content = await readMemoryFile(relPath);
        return { path: relPath, content };
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({
          error: err instanceof Error ? err.message : "Failed to read memory file",
        });
      }
    }
  );
}
