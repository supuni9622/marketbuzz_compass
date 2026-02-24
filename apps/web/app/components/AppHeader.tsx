"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/auth/AuthProvider";
import { useTheme } from "@/app/theme/ThemeProvider";
import { UserAvatar } from "./UserAvatar";
import { GlobalFilters } from "./GlobalFilters";

function navItemClass(href: string, pathname: string) {
  const isActive =
    pathname === href || (href !== "/" && pathname.startsWith(href));
  return `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
  }`;
}

export function AppHeader() {
  const { user, token, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

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

  const navLinks = (
    <>
      <Link href="/" className={navItemClass("/", pathname)} onClick={() => setNavOpen(false)}>
        Brief
      </Link>
      <Link href="/ask" className={navItemClass("/ask", pathname)} onClick={() => setNavOpen(false)}>
        Ask Nova
      </Link>
      <Link href="/growth-plan" className={navItemClass("/growth-plan", pathname)} onClick={() => setNavOpen(false)}>
        Growth Plan
      </Link>
      {isAdmin && (
        <Link href="/admin" className={navItemClass("/admin", pathname)} onClick={() => setNavOpen(false)}>
          Admin
        </Link>
      )}
    </>
  );

  return (
    <>
      <header className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
          <Link
            href="/"
            className="text-xl font-bold text-teal-600 transition-colors hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 shrink-0"
          >
            MarketBuzz Compass
          </Link>
          <p className="hidden text-base font-medium text-teal-700 dark:text-teal-300 lg:block">Interpret. Guide. Plan. Warn.</p>
          <nav ref={navRef} className="relative flex items-center gap-1" aria-label="Main">
            <div className="hidden md:flex md:items-center md:gap-1">{navLinks}</div>
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
              <div className="absolute right-0 top-full z-50 mt-1 flex w-56 flex-col rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800 md:hidden [&>a]:block [&>a]:w-full [&>a]:px-3 [&>a]:py-2 [&>a]:text-left">
                {navLinks}
                <div className="my-1 border-t border-slate-200 dark:border-slate-600" />
                <button
                  type="button"
                  onClick={() => {
                    toggleTheme();
                  }}
                  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {theme === "dark" ? (
                    <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                  <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                </button>
                {(user ?? token) && (
                  <>
                    <div className="border-t border-slate-200 dark:border-slate-600" />
                    <div className="px-3 py-2">
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={user?.email ?? "Account"}>
                        {user?.email || "Account"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNavOpen(false);
                        logout();
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                    >
                      Sign out
                    </button>
                  </>
                )}
              </div>
            )}
            <div className="hidden md:flex md:items-center md:gap-1">
              {(user ?? token) && (
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((o) => !o)}
                    aria-expanded={userMenuOpen}
                    aria-haspopup="menu"
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 shadow-sm transition-colors hover:border-teal-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:border-teal-500 dark:hover:bg-slate-600"
                  >
                    <UserAvatar size={28} className="flex-shrink-0" />
                    <span className="max-w-[140px] truncate" title={user?.email ?? "Account"}>
                      {user?.email || "Account"}
                    </span>
                    <svg
                      className={`h-4 w-4 flex-shrink-0 text-slate-500 transition-transform dark:text-slate-400 ${userMenuOpen ? "rotate-180" : ""}`}
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
                      className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
                      role="menu"
                    >
                      <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-600">
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={user?.email ?? "Account"}>
                          {user?.email || "Account"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                        role="menuitem"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              >
                {theme === "dark" ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>
          </nav>
        </div>
      </header>
      <GlobalFilters />
    </>
  );
}
