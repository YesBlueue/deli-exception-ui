import { useSyncExternalStore } from "react";
import { DB_VERSION, seed } from "@/core/domain/seed";
import type { DB } from "@/core/domain/types";

const KEY = "deop-demo-db";
let state: DB | null = null;
const listeners = new Set<() => void>();

function load(): DB {
  if (typeof window === "undefined") return seed();
  try {
    const s = localStorage.getItem(KEY);
    if (s) {
      const p = JSON.parse(s) as DB;
      if (p.version === DB_VERSION && Array.isArray(p.shipments) && Array.isArray(p.complaints) && Array.isArray(p.events) && Array.isArray(p.exceptions) && Array.isArray(p.actions) && Array.isArray(p.logs) && Array.isArray(p.requestActivity) && Array.isArray(p.customerLinks) && Number.isSafeInteger(p.referenceCounter)) return p;
    }
  } catch {
    /* ignore */
  }
  const d = seed();
  try { window.localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* read-only demo remains usable */ }
  return d;
}

const getSnapshot = () => (state ??= load());
const getServer = () => null;
const subscribe = (l: () => void) => {
  if (typeof window === "undefined") return () => {};
  listeners.add(l);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    state = null;
    l();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
};

/** Returns null during SSR / first paint, so pages render a skeleton. */
export function useDB(): DB | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServer);
}

export function mutate<T>(fn: (db: DB) => T): T {
  if (typeof window === "undefined") throw Error("Demo changes are only available in a browser.");
  const next = structuredClone(load());
  const r = fn(next);
  localStorage.setItem(KEY, JSON.stringify(next));
  state = next;
  listeners.forEach((l) => l());
  return r;
}

export function resetDemo() {
  if (typeof window === "undefined") return;
  const fresh = seed();
  window.localStorage.setItem(KEY, JSON.stringify(fresh));
  state = fresh;
  window.localStorage.removeItem("resolveiq-standalone-complaints");
  listeners.forEach((l) => l());
}
export function readPlatformSnapshot() { return typeof window === "undefined" ? null : getSnapshot(); }
