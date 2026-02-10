"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "./auth/AuthProvider";
import { useEffect } from "react";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { token, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
    if (!token && !isPublic) {
      window.location.href = "/login";
    }
  }, [token, isLoading, pathname]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-slate-600">Loading…</p>
      </main>
    );
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!token && !isPublic) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-slate-600">Redirecting to sign in…</p>
      </main>
    );
  }

  return <>{children}</>;
}
