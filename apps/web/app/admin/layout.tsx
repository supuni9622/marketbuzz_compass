"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/auth/AuthProvider";
import { useEffect, useRef, useState } from "react";

function adminNavItemClass(href: string, pathname: string) {
  const isActive =
    href === "/"
      ? pathname === "/"
      : href === "/admin"
        ? pathname === "/admin"
        : pathname.startsWith(href);
  return `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
  }`;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAdmin) {
      window.location.href = "/";
    }
  }, [isAdmin, isLoading]);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  useEffect(() => {
    if (!navOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [navOpen]);

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

  const adminNavLinks = (
    <>
      <Link href="/" className={adminNavItemClass("/", pathname)} onClick={() => setNavOpen(false)}>
        Brief
      </Link>
      <Link href="/admin" className={adminNavItemClass("/admin", pathname)} onClick={() => setNavOpen(false)}>
        Upload
      </Link>
      <Link href="/admin/packages" className={adminNavItemClass("/admin/packages", pathname)} onClick={() => setNavOpen(false)}>
        Packages
      </Link>
      <Link href="/admin/memory" className={adminNavItemClass("/admin/memory", pathname)} onClick={() => setNavOpen(false)}>
        Memory
      </Link>
    </>
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
          <Link href="/" className="shrink-0 text-xl font-bold text-teal-600 transition-colors hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300">
            MarketBuzz Compass
          </Link>
          <nav ref={navRef} className="relative flex items-center gap-1" aria-label="Admin">
            <div className="hidden md:flex md:items-center md:gap-1">{adminNavLinks}</div>
            <button
              type="button"
              onClick={() => setNavOpen((o) => !o)}
              aria-expanded={navOpen}
              aria-label="Open menu"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 md:hidden"
            >
              {navOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            {navOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 flex w-48 flex-col rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800 md:hidden [&>a]:block [&>a]:w-full [&>a]:px-3 [&>a]:py-2 [&>a]:text-left">
                {adminNavLinks}
              </div>
            )}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
