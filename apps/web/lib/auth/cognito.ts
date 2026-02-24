/**
 * Cognito Hosted UI: authorize URL and token exchange (PKCE).
 * Requires NEXT_PUBLIC_COGNITO_* and callback URL registered in Cognito app client.
 */
const SCOPE = "openid email profile";

function getDomain(): string {
  const d = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
  if (!d) throw new Error("NEXT_PUBLIC_COGNITO_DOMAIN is required");
  return d.replace(/^https?:\/\//, "");
}

function getClientId(): string {
  const id = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
  if (!id) throw new Error("NEXT_PUBLIC_COGNITO_CLIENT_ID is required");
  return id;
}

export function getAuthorizeUrl(redirectUri: string, state: string, codeChallenge: string): string {
  const domain = getDomain();
  const clientId = getClientId();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPE,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://${domain}/oauth2/authorize?${params.toString()}`;
}

export function getSignOutUrl(redirectUri: string): string {
  const domain = getDomain();
  const clientId = getClientId();
  const params = new URLSearchParams({
    client_id: clientId,
    logout_uri: redirectUri,
  });
  return `https://${domain}/logout?${params.toString()}`;
}

export interface TokenResponse {
  id_token: string;
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export async function exchangeCode(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<TokenResponse> {
  const domain = getDomain();
  const clientId = getClientId();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });
  const res = await fetch(`https://${domain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<TokenResponse>;
}
