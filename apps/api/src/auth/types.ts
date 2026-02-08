/**
 * User extracted from Cognito JWT.
 * Groups come from cognito:groups claim.
 */
export interface AuthUser {
  sub: string;
  email?: string;
  groups: string[];
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}
