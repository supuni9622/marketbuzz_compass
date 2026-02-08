import { FastifyRequest, FastifyReply } from "fastify";
import { jwtVerify } from "jose";
import { getJwks } from "./jwks.js";
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
