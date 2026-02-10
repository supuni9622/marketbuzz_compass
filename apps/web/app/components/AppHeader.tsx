"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/auth/AuthProvider";
import { UserAvatar } from "./UserAvatar";
import { GlobalFilters } from "./GlobalFilters";

function navItemClass(href: string, pathname: string) {
  const isActive =
    pathname === href || (href !== "/" && pathname.startsWith(href));
  return `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? "bg-teal-100 text-teal-800"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
  }`;
}

export function AppHeader() {
  const { user, logout, isAdmin } = useAuth();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUserMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [userMenuOpen]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = userMenuRef.current;
      if (el && !el.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [userMenuOpen]);

  return (
    <>
      <header className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold text-teal-600 transition-colors hover:text-teal-700"
          >
            MarketBuzz Compass
          </Link>
          <p className="text-base font-medium text-teal-700">Interpret. Guide. Plan. Warn.</p>
          <nav className="flex items-center gap-1" aria-label="Main">
            <Link href="/" className={navItemClass("/", pathname)}>
              Brief
            </Link>
            <Link href="/ask" className={navItemClass("/ask", pathname)}>
              Ask Nova
            </Link>
            <Link href="/growth-plan" className={navItemClass("/growth-plan", pathname)}>
              Growth Plan
            </Link>
            {isAdmin && (
              <Link href="/admin" className={navItemClass("/admin", pathname)}>
                Admin
              </Link>
            )}
            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 shadow-sm transition-colors hover:border-teal-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <UserAvatar size={28} className="flex-shrink-0" />
                  <span className="max-w-[140px] truncate" title={user.email}>
                    {user.email}
                  </span>
                  <svg
                    className={`h-4 w-4 flex-shrink-0 text-slate-500 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {userMenuOpen && (
                  <div
                    className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                    role="menu"
                  >
                    <div className="border-b border-slate-100 px-3 py-2">
                      <p className="truncate text-xs text-slate-500" title={user.email}>
                        {user.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                      role="menuitem"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>
      </header>
      <GlobalFilters />
    </>
  );
}
