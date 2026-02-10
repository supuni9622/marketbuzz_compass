"use client";

import { useMemo } from "react";
import { useAuth } from "@/app/auth/AuthProvider";
import { createApiClient } from "./client";

export function useApiClient() {
  const { getToken } = useAuth();
  return useMemo(() => createApiClient({ getToken }), [getToken]);
}
