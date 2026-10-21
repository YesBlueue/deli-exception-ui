"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PortalSnapshot } from "./types";
export async function portalRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error ?? "Request failed. Your data was not replaced by demo records.");
  return result as T;
}
export function usePortal() {
  const cache = useQueryClient();
  const query = useQuery<PortalSnapshot>({
    queryKey: ["portal"],
    queryFn: () => portalRequest("/api/portal"),
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });
  const command = async (action: string, input: Record<string, unknown> = {}) => {
    const result = await portalRequest<Record<string, unknown>>("/api/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, input }),
    });
    await cache.invalidateQueries({ queryKey: ["portal"] });
    return result;
  };
  return { ...query, command };
}
