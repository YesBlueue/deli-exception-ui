"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { portalRequest } from "./use-portal";
import type { DriverSnapshot } from "./driver-types";
export function useDriver() {
  const cache = useQueryClient();
  const query = useQuery<DriverSnapshot>({
    queryKey: ["driver"],
    queryFn: () => portalRequest("/api/driver"),
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });
  async function command(action: string, input: Record<string, unknown> = {}) {
    const result = await portalRequest<Record<string, unknown>>("/api/driver", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, input }),
    });
    await Promise.all([
      cache.invalidateQueries({ queryKey: ["driver"] }),
      cache.invalidateQueries({ queryKey: ["delivery-updates"] }),
      cache.invalidateQueries({ queryKey: ["portal"] }),
    ]);
    return result;
  }
  return { ...query, command };
}
