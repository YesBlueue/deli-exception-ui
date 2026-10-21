import { afterEach, expect, it, vi } from "vitest";
const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/features/portal/components/DriverTestLogin", () => ({ DriverTestLogin: () => null }));
import Page from "./page";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
it("does not expose test password login in production", () => {
  vi.stubEnv("NODE_ENV", "production");
  expect(() => Page()).toThrow("NOT_FOUND");
});
it("makes test login available during local development", () => {
  vi.stubEnv("NODE_ENV", "development");
  expect(Page()).toBeTruthy();
  expect(notFound).not.toHaveBeenCalled();
});
