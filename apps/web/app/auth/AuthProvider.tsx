"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getSignOutUrl } from "@/lib/auth/cognito";
import { decodeJwtPayload, isTokenExpired } from "@/lib/auth/jwt";
import * as storage from "@/lib/auth/storage";

export interface AuthUser {
  sub: string;
  email: string;
  groups: string[];
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function userFromToken(token: string): AuthUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload || isTokenExpired(payload)) return null;
  const groups = payload["cognito:groups"] ?? [];
  const email = payload.email ?? payload["cognito:username"] ?? "";
  return { sub: payload.sub, email: String(email), groups };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = storage.getToken();
    setTokenState(t);
    setIsLoading(false);
  }, []);

  const user = useMemo(() => (token ? userFromToken(token) : null), [token]);
  const isAdmin = Boolean(user?.groups?.includes("Admin"));

  const login = useCallback(() => {
    window.location.href = "/login";
  }, []);

  const logout = useCallback(() => {
    storage.clearAuth();
    setTokenState(null);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    window.location.href = getSignOutUrl(origin);
  }, []);

  const getToken = useCallback(() => storage.getToken(), []);

  const value: AuthContextValue = useMemo(
    () => ({ token, user, isAdmin, isLoading, login, logout, getToken }),
    [token, user, isAdmin, isLoading, login, logout, getToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

