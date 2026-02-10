import { FastifyRequest, FastifyReply } from "fastify";
import { jwtVerify } from "jose";
import { getJwks } from "./jwks.js";
import { config } from "../config.js";
import type { AuthUser } from "./types.js";

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const auth = request.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    await reply.status(401).send({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = auth.slice(7);

  try {
    const { payload } = await jwtVerify(token, getJwks());
    const groups = (payload["cognito:groups"] as string[] | undefined) ?? [];
    request.user = {
      sub: payload.sub as string,
      email: (payload.email as string) ?? (payload["cognito:username"] as string),
      groups,
    } as AuthUser;
  } catch {
    await reply.status(401).send({ error: "Invalid or expired token" });
  }
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const groups = request.user?.groups ?? [];
  if (!groups.includes("Admin")) {
    await reply.status(403).send({ error: "Admin access required" });
  }
}

/**
 * For POST /admin/brief/generate only: allow either Cognito Admin or internal key.
 * Internal key: X-Internal-Brief-Key header or Authorization: Bearer <INTERNAL_BRIEF_API_KEY>.
 */
export async function requireAdminOrInternalBriefKey(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const internalKey = config.internalBriefApiKey?.trim();
  if (internalKey) {
    const headerKey = request.headers["x-internal-brief-key"] as string | undefined;
    const bearer = request.headers.authorization?.startsWith("Bearer ")
      ? request.headers.authorization.slice(7).trim()
      : "";
    if ((headerKey && headerKey === internalKey) || (bearer && bearer === internalKey)) {
      request.user = {
        sub: "internal",
        groups: ["Admin"],
      } as AuthUser;
      return;
    }
  }
  await authMiddleware(request, reply);
  if (reply.sent) return;
  await requireAdmin(request, reply);
}
