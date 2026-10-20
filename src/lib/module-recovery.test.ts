import { describe, expect, it, vi, afterEach } from "vitest";
import { isModuleLoadError, reloadForModuleError } from "./module-recovery";

afterEach(() => { vi.unstubAllGlobals(); });
describe("stale module recovery", () => {
  it("recognizes the reported package-search import failure", () => {
    expect(isModuleLoadError(new Error("error loading dynamically imported module: https://example.test/assets/package-search-CGlVs4v7.js"))).toBe(true);
  });
  it("does not reload for unrelated application errors", () => expect(isModuleLoadError(new Error("Complaint not found"))).toBe(false));
  it("reloads stale assets only once within the retry window", () => {
    const values = new Map<string, string>();
    const reload = vi.fn();
    vi.stubGlobal("window", { location: { pathname: "/dashboard", reload }, sessionStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
    const error = new Error("error loading dynamically imported module: package-search.js");
    expect(reloadForModuleError(error)).toBe(true);
    expect(reloadForModuleError(error)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});