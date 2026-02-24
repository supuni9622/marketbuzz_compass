/**
 * Admin Memory Manager: list known memory files and read content; full API (items, versions, create, upload, approve, reject, change-log). Admin only.
 * @see docs/MEMORY_FILE_STRUCTURE.md, docs/ADMIN_MEMORY_MANAGER_UI_SPEC.md
 */
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authMiddleware, requireAdmin } from "../../auth/middleware.js";
import { db } from "../../db.js";
import {
  addDraftVersion,
  approveMemoryVersion,
  createMemoryItem,
  getMemoryChangeLog,
  getMemoryItem,
  getMemoryVersion,
  listMemoryItems,
  listMemoryVersions,
  rejectMemoryVersion,
} from "../../services/memoryAdmin.js";
import { getMemoryFileList, getMemoryIndex, readMemoryFile } from "../../nova/memoryLoader.js";

export async function adminMemoryRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get(
    "/memory/index",
    {
      preHandler: [authMiddleware, requireAdmin],
      schema: {
        description:
          "Memory discovery index (registry). Returns paths with category. Equivalent to memory_index.json. Admin only.",
        tags: ["Admin", "Memory"],
        response: {
          200: {
            type: "object",
            properties: {
              version: { type: "string" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    path: { type: "string" },
                    category: { type: "string" },
                  },
                },
              },
            },
          },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (_request, reply) => {
      try {
        const index = getMemoryIndex();
        return index;
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({
          error: err instanceof Error ? err.message : "Failed to get memory index",
        });
      }
    }
  );

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

  if (!db.isConfigured()) return;

  app.get(
    "/memory/items",
    {
      preHandler: [authMiddleware, requireAdmin],
      schema: {
        description: "List memory items (DB). Optional status=active for items with approved version. Admin only.",
        tags: ["Admin", "Memory"],
        querystring: {
          type: "object",
          properties: { status: { type: "string", enum: ["active"] } },
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
                    id: { type: "string" },
                    path: { type: "string" },
                    title: { type: "string" },
                    type: { type: "string" },
                    tags: { type: "array", items: { type: "string" } },
                    current_version_id: { type: ["string", "null"] },
                    owner: { type: "string" },
                    created_at: { type: "string" },
                    updated_at: { type: "string" },
                  },
                },
              },
            },
          },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      const q = request.query as { status?: string };
      try {
        const data = await listMemoryItems(db.get(), {
          status: q.status === "active" ? "active" : undefined,
        });
        return { data };
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({
          error: err instanceof Error ? err.message : "Failed to list memory items",
        });
      }
    }
  );

  app.get(
    "/memory/item/:id",
    {
      preHandler: [authMiddleware, requireAdmin],
      schema: {
        description: "Get one memory item by id (with current version content). Admin only.",
        tags: ["Admin", "Memory"],
        params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
        response: {
          200: { type: "object", properties: { id: { type: "string" }, path: { type: "string" }, title: { type: "string" }, type: { type: "string" }, tags: { type: "array" }, current_version_id: {}, owner: {}, created_at: {}, updated_at: {}, current_content: {}, current_version_number: {} } },
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const item = await getMemoryItem(db.get(), id, { include_content: true });
        if (!item) return reply.status(404).send({ error: "Memory item not found" });
        return item;
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({
          error: err instanceof Error ? err.message : "Failed to get memory item",
        });
      }
    }
  );

  app.get(
    "/memory/version/:id",
    {
      preHandler: [authMiddleware, requireAdmin],
      schema: {
        description: "Get one memory version by id (for review screen). Admin only.",
        tags: ["Admin", "Memory"],
        params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
        response: {
          200: { type: "object", properties: { id: {}, item_id: {}, version_number: {}, content: {}, status: {}, created_by: {}, created_at: {}, change_note: {}, source: {} } },
          404: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const version = await getMemoryVersion(db.get(), id);
        if (!version) return reply.status(404).send({ error: "Memory version not found" });
        return version;
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({
          error: err instanceof Error ? err.message : "Failed to get memory version",
        });
      }
    }
  );

  app.get(
    "/memory/versions",
    {
      preHandler: [authMiddleware, requireAdmin],
      schema: {
        description: "List memory versions. status=draft returns only drafts. Admin only.",
        tags: ["Admin", "Memory"],
        querystring: {
          type: "object",
          properties: { status: { type: "string", enum: ["draft"] } },
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
                    id: { type: "string" },
                    item_id: { type: "string" },
                    version_number: { type: "number" },
                    status: { type: "string" },
                    created_by: { type: "string" },
                    created_at: { type: "string" },
                    item_title: { type: "string" },
                    item_path: { type: "string" },
                  },
                },
              },
            },
          },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      const q = request.query as { status?: string };
      try {
        const data = await listMemoryVersions(db.get(), {
          status: q.status === "draft" ? "draft" : undefined,
        });
        return { data };
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({
          error: err instanceof Error ? err.message : "Failed to list memory versions",
        });
      }
    }
  );

  app.post(
    "/memory/create",
    {
      preHandler: [authMiddleware, requireAdmin],
      schema: {
        description: "Create a new memory item with an initial draft version. Admin only.",
        tags: ["Admin", "Memory"],
        body: {
          type: "object",
          properties: {
            path: { type: "string" },
            title: { type: "string" },
            type: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            content: { type: "string" },
            change_note: { type: "string" },
          },
          required: ["path", "title", "type", "content"],
        },
        response: {
          200: { type: "object", properties: { item: {}, version: {} } },
          400: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      const user = request.user!;
      const body = request.body as { path?: string; title?: string; type?: string; tags?: string[]; content?: string; change_note?: string };
      const path = body.path?.trim();
      const title = body.title?.trim();
      const type = body.type?.trim();
      const content = body.content;
      if (!path || !title || !type || content === undefined) {
        return reply.status(400).send({ error: "path, title, type, and content are required" });
      }
      try {
        const result = await createMemoryItem(db.get(), {
          path,
          title,
          type,
          tags: body.tags,
          content,
          change_note: body.change_note?.trim(),
          created_by: user.email ?? "admin",
          source: "manual",
        });
        return result;
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({
          error: err instanceof Error ? err.message : "Failed to create memory item",
        });
      }
    }
  );

  app.post(
    "/memory/upload",
    {
      preHandler: [authMiddleware, requireAdmin],
      schema: {
        description: "Upload a file (e.g. .md/.txt) as a new memory item draft or new version. Admin only.",
        tags: ["Admin", "Memory"],
        body: {
          type: "object",
          properties: {
            path: { type: "string" },
            title: { type: "string" },
            type: { type: "string" },
            content: { type: "string" },
            change_note: { type: "string" },
            item_id: { type: "string", description: "If provided, add as new draft version to this item" },
          },
          required: ["content"],
        },
        response: {
          200: { type: "object", properties: { item: {}, version: {} } },
          400: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      const user = request.user!;
      const body = request.body as {
        path?: string;
        title?: string;
        type?: string;
        content?: string;
        change_note?: string;
        item_id?: string;
      };
      const content = body.content;
      if (content === undefined) {
        return reply.status(400).send({ error: "content is required" });
      }
      try {
        if (body.item_id) {
          const version = await addDraftVersion(db.get(), {
            item_id: body.item_id,
            content,
            change_note: body.change_note?.trim(),
            created_by: user.email ?? "admin",
            source: "upload",
          });
          const item = await getMemoryItem(db.get(), body.item_id);
          return { item, version };
        }
        const path = body.path?.trim() || `uploaded/${Date.now()}.md`;
        const title = body.title?.trim() || path.replace(/\.(md|txt)$/, "").replace(/\//g, " ");
        const type = body.type?.trim() || "admin";
        const result = await createMemoryItem(db.get(), {
          path,
          title,
          type,
          content,
          change_note: body.change_note?.trim(),
          created_by: user.email ?? "admin",
          source: "upload",
        });
        return result;
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({
          error: err instanceof Error ? err.message : "Failed to upload memory",
        });
      }
    }
  );

  app.post(
    "/memory/approve",
    {
      preHandler: [authMiddleware, requireAdmin],
      schema: {
        description: "Approve a draft version. Sets version status, updates item current_version, writes change-log. Admin only.",
        tags: ["Admin", "Memory"],
        body: {
          type: "object",
          properties: { version_id: { type: "string" }, note: { type: "string" } },
          required: ["version_id"],
        },
        response: {
          200: { type: "object", properties: { ok: { type: "boolean" } } },
          400: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      const user = request.user!;
      const body = request.body as { version_id?: string; note?: string };
      const versionId = body.version_id?.trim();
      if (!versionId) return reply.status(400).send({ error: "version_id is required" });
      try {
        await approveMemoryVersion(db.get(), versionId, user.email ?? "admin", body.note?.trim());
        return { ok: true };
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({
          error: err instanceof Error ? err.message : "Failed to approve version",
        });
      }
    }
  );

  app.post(
    "/memory/reject",
    {
      preHandler: [authMiddleware, requireAdmin],
      schema: {
        description: "Reject a draft version. Sets status, writes change-log. Admin only.",
        tags: ["Admin", "Memory"],
        body: {
          type: "object",
          properties: { version_id: { type: "string" }, rejection_note: { type: "string" } },
          required: ["version_id", "rejection_note"],
        },
        response: {
          200: { type: "object", properties: { ok: { type: "boolean" } } },
          400: { type: "object", properties: { error: { type: "string" } } },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      const user = request.user!;
      const body = request.body as { version_id?: string; rejection_note?: string };
      const versionId = body.version_id?.trim();
      const note = body.rejection_note?.trim();
      if (!versionId || !note) return reply.status(400).send({ error: "version_id and rejection_note are required" });
      try {
        await rejectMemoryVersion(db.get(), versionId, user.email ?? "admin", note);
        return { ok: true };
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({
          error: err instanceof Error ? err.message : "Failed to reject version",
        });
      }
    }
  );

  app.get(
    "/memory/change-log",
    {
      preHandler: [authMiddleware, requireAdmin],
      schema: {
        description: "Get memory change-log (audit). Optional item_id, limit, offset. Admin only.",
        tags: ["Admin", "Memory"],
        querystring: {
          type: "object",
          properties: {
            item_id: { type: "string" },
            limit: { type: "integer" },
            offset: { type: "integer" },
          },
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
                    id: { type: "string" },
                    item_id: { type: ["string", "null"] },
                    version_id: { type: ["string", "null"] },
                    action: { type: "string" },
                    actor: { type: "string" },
                    note: { type: ["string", "null"] },
                    created_at: { type: "string" },
                    item_title: { type: ["string", "null"] },
                  },
                },
              },
            },
          },
          500: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (request, reply) => {
      const q = request.query as { item_id?: string; limit?: number | string; offset?: number | string };
      try {
        const data = await getMemoryChangeLog(db.get(), {
          item_id: q.item_id?.trim(),
          limit: q.limit != null ? Number(q.limit) : undefined,
          offset: q.offset != null ? Number(q.offset) : undefined,
        });
        return { data };
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({
          error: err instanceof Error ? err.message : "Failed to get change-log",
        });
      }
    }
  );
}
