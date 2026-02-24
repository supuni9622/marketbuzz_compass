const TOKEN_KEY = "marketbuzz_id_token";
const CODE_VERIFIER_KEY = "marketbuzz_code_verifier";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getCodeVerifier(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(CODE_VERIFIER_KEY);
}

export function setCodeVerifier(verifier: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CODE_VERIFIER_KEY, verifier);
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(CODE_VERIFIER_KEY);
}
