/**
 * Decode JWT payload without verification (client-side only for display).
 * Backend validates the token; this is only for reading groups/email.
 */
export interface JwtPayload {
  sub: string;
  email?: string;
  "cognito:username"?: string;
  "cognito:groups"?: string[];
  exp?: number;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(payload: JwtPayload): boolean {
  if (!payload.exp) return true;
  return payload.exp * 1000 < Date.now();
}
