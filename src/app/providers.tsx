"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

import { reloadForModuleError } from "@/infrastructure/monitoring/module-recovery";
import { Toaster } from "@/shared/ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  useEffect(() => {
    // Stale documents can reference chunks removed by a newer deployment; recover with a guarded reload.
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (reloadForModuleError(event.reason)) event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
