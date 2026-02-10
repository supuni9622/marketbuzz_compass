"use client";

import Link from "next/link";
import { useAuth } from "@/app/auth/AuthProvider";
import { GlobalFilters } from "./GlobalFilters";

export function AppHeader() {
  const { user, logout, isAdmin } = useAuth();

  return (
    <>
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="text-xl font-bold text-teal-600 hover:text-teal-700">
            MarketBuzz Compass
          </Link>
          <p className="text-sm text-slate-500">Interpret. Guide. Plan. Warn.</p>
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-slate-600" title={user.email}>
                {user.email}
              </span>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline"
              >
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={logout}
              className="text-sm text-slate-600 hover:text-slate-800 hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <GlobalFilters />
    </>
  );
}
