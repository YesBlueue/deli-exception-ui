import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn(() => ({ auth: {} })) }));
vi.mock("@supabase/ssr", () => ({ createBrowserClient: createClient }));

beforeEach(() => {
  vi.resetModules();
  createClient.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("browser Supabase configuration", () => {
  it("identifies missing public variables even when server variables exist", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "server-only-value");
    const { supabase } = await import("./client");
    expect(() => supabase.auth).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
    expect(createClient).not.toHaveBeenCalled();
  });

  it("uses public configuration and a single client without preview storage", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_example");
    const { supabase } = await import("./client");
    expect(createClient).not.toHaveBeenCalled();
    void supabase.auth;
    void supabase.auth;
    expect(createClient).toHaveBeenCalledExactlyOnceWith(
      "https://example.supabase.co",
      "sb_publishable_example",
    );
  });

  it("rejects a secret key in public configuration", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_secret_example");
    const { supabase } = await import("./client");
    expect(() => supabase.auth).toThrow("never a secret key");
    expect(createClient).not.toHaveBeenCalled();
  });
});
