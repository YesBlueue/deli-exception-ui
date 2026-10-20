import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoSignUp, demoLogIn, demoLogOut, readDemoAuth } from "./demo-auth";
import { hashDemoPassword } from "@/lib/demo/customer-auth";
beforeEach(() => { localStorage.clear(); vi.stubGlobal("crypto", webcrypto); });
afterEach(() => vi.unstubAllGlobals());
describe("isolated demo accounts", () => {
  it("hashes passwords with per-account salt and never stores plaintext", async () => { await demoSignUp({ name: "Alice", email: "alice@example.test", password: "Local-only-pass", confirmPassword: "Local-only-pass" }); const stored = localStorage.getItem("resolveiq-demo-auth-v1"); expect(stored).not.toContain("Local-only-pass"); expect(stored).toContain("passwordHash"); expect(await hashDemoPassword("same", "salt-a")).not.toBe(await hashDemoPassword("same", "salt-b")); });
  it("restores sessions and mode from storage", async () => { const account = await demoSignUp({ name: "Alice", email: "alice@example.test", password: "Local-only-pass", confirmPassword: "Local-only-pass" }); vi.resetModules(); const fresh = await import("./demo-auth"); expect(fresh.readDemoAuth()).toEqual({ mode: "demo", user: account }); demoLogOut(); expect(readDemoAuth().user).toBeNull(); await demoLogIn({ email: "alice@example.test", password: "Local-only-pass" }); expect(readDemoAuth().user?.id).toBe(account.id); });
  it("rejects wrong passwords", async () => { await demoSignUp({ name: "Alice", email: "alice@example.test", password: "Local-only-pass", confirmPassword: "Local-only-pass" }); demoLogOut(); await expect(demoLogIn({ email: "alice@example.test", password: "incorrect" })).rejects.toThrow(/Could not log in/); expect(readDemoAuth().user).toBeNull(); });
  it("safely ignores malformed persisted account records", () => { localStorage.setItem("resolveiq-demo-auth-v1", JSON.stringify({ accounts: [null], mode: "invalid", sessionId: "a" })); expect(readDemoAuth()).toEqual({ mode: "cloud", user: null }); });
});