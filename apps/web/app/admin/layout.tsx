"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/auth/AuthProvider";
import { useEffect } from "react";

function adminNavItemClass(href: string, pathname: string) {
  const isActive =
    href === "/"
      ? pathname === "/"
      : href === "/admin"
        ? pathname === "/admin"
        : pathname.startsWith(href);
  return `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? "bg-teal-100 text-teal-800"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
  }`;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth();
  const pathname = usePathname();

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
      <header className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="text-xl font-bold text-teal-600 transition-colors hover:text-teal-700">
            MarketBuzz Compass
          </Link>
          <nav className="flex items-center gap-1" aria-label="Admin">
            <Link href="/" className={adminNavItemClass("/", pathname)}>
              Brief
            </Link>
            <Link href="/admin" className={adminNavItemClass("/admin", pathname)}>
              Upload
            </Link>
            <Link href="/admin/packages" className={adminNavItemClass("/admin/packages", pathname)}>
              Packages
            </Link>
            <Link href="/admin/memory" className={adminNavItemClass("/admin/memory", pathname)}>
              Memory
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
