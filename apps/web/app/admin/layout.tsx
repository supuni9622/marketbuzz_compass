"use client";

import Link from "next/link";
import { useAuth } from "@/app/auth/AuthProvider";
import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAdmin) {
      window.location.href = "/";
    }
  }, [isAdmin, isLoading]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-slate-600">Loading…</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-slate-600">Redirecting…</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="text-xl font-bold text-teal-600 hover:text-teal-700">
            MarketBuzz Compass
          </Link>
          <nav className="flex gap-4">
            <Link href="/" className="text-sm text-slate-600 hover:text-slate-800 hover:underline">
              Brief
            </Link>
            <Link href="/admin" className="text-sm text-slate-600 hover:text-slate-800 hover:underline">
              Upload
            </Link>
            <Link href="/admin/packages" className="text-sm text-slate-600 hover:text-slate-800 hover:underline">
              Packages
            </Link>
            <Link href="/admin/memory" className="text-sm text-slate-600 hover:text-slate-800 hover:underline">
              Memory
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
