"use client";

import { useEffect } from "react";
import { getAuthorizeUrl } from "@/lib/auth/cognito";
import { generateCodeVerifier, generateCodeChallenge } from "@/lib/auth/pkce";
import { setCodeVerifier } from "@/lib/auth/storage";

export default function LoginPage() {
  useEffect(() => {
    const redirectUri = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "";
    const state = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    const verifier = generateCodeVerifier();
    setCodeVerifier(verifier);
    generateCodeChallenge(verifier).then((challenge) => {
      const url = getAuthorizeUrl(redirectUri, state, challenge);
      window.location.href = url;
    });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <p className="text-slate-600">Redirecting to sign in…</p>
    </main>
  );
}
