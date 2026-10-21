import { describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));
vi.mock("next/navigation", () => navigation);

describe("App routing", () => {
  it("sends / to the operations overview instead of falling back to not found", async () => {
    const { default: Home } = await import("./page");
    expect(() => Home()).toThrow("NEXT_REDIRECT");
    expect(navigation.redirect).toHaveBeenCalledWith("/overview");
  });

  it("renders Google login instead of bypassing staff access", async () => {
    const { default: Login } = await import("./login/page");
    navigation.redirect.mockClear();
    expect(await Login({ searchParams: Promise.resolve({}) })).toBeTruthy();
    expect(navigation.redirect).not.toHaveBeenCalled();
  });
});
