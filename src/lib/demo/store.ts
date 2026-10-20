import { useSyncExternalStore } from "react";
import { DB_VERSION, seed } from "./seed";
import type { DB } from "./types";

const KEY = "deop-demo-db";
let state: DB | null = null;
const listeners = new Set<() => void>();

function load(): DB {
  try {
    const s = localStorage.getItem(KEY);
    if (s) {
      const p = JSON.parse(s) as DB;
      if (p.version === DB_VERSION) return p;
    }
  } catch {
    /* ignore */
  }
  const d = seed();
  localStorage.setItem(KEY, JSON.stringify(d));
  return d;
}

const getSnapshot = () => (state ??= load());
const getServer = () => null;
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Returns null during SSR / first paint, so pages render a skeleton. */
export function useDB(): DB | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServer);
}

export function mutate<T>(fn: (db: DB) => T): T {
  const next = structuredClone(getSnapshot());
  const r = fn(next);
  state = next;
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
  return r;
}

export function resetDemo() {
  state = seed();
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}
