"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthGuard } from "./AuthGuard";
import { AuthProvider } from "./auth/AuthProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGuard>{children}</AuthGuard>
      </AuthProvider>
    </QueryClientProvider>
  );
}
