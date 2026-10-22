import { beforeEach, describe, expect, it, vi } from "vitest";
beforeEach(() => { localStorage.clear(); vi.resetModules(); });
describe("demo persistence", () => {
  it("reads committed data after reload", async () => { const store = await import("./demo-store"); store.mutate((db) => { db.referenceCounter = 200; }); vi.resetModules(); const fresh = await import("./demo-store"); expect(fresh.readPlatformSnapshot()?.referenceCounter).toBe(200); });
  it("reseeds old schema versions", async () => { localStorage.setItem("deop-demo-db", JSON.stringify({ version: -1 })); const store = await import("./demo-store"); expect(store.readPlatformSnapshot()?.referenceCounter).toBe(124); });
  it("reset restores records and clears legacy complaint storage", async () => { const store = await import("./demo-store"); store.mutate((db) => { db.referenceCounter = 999; db.complaints = []; }); localStorage.setItem("resolveiq-standalone-complaints", "old"); store.resetDemo(); expect(store.readPlatformSnapshot()?.referenceCounter).toBe(124); expect(store.readPlatformSnapshot()?.complaints).toHaveLength(1); expect(localStorage.getItem("resolveiq-standalone-complaints")).toBeNull(); });
});