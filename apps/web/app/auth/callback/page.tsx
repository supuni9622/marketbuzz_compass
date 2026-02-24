"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { exchangeCode } from "@/lib/auth/cognito";
import { getCodeVerifier } from "@/lib/auth/storage";
import { setToken } from "@/lib/auth/storage";

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (!code) {
      setError("Missing authorization code");
      return;
    }
    const redirectUri = `${window.location.origin}/auth/callback`;
    const verifier = getCodeVerifier();
    if (!verifier) {
      setError("Missing code verifier (session may have expired). Try signing in again.");
      return;
    }
    exchangeCode(code, redirectUri, verifier)
      .then((res) => {
        setToken(res.id_token);
        window.location.href = "/";
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Sign-in failed");
      });
  }, [searchParams]);

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-red-600">{error}</p>
        <a href="/login" className="text-teal-600 underline">
          Try again
        </a>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <p className="text-slate-600">Completing sign in…</p>
    </main>
  );
}
