import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { draftApology } from "./apology.server";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("fails explicitly when Gemini is unconfigured", async () => {
  vi.stubEnv("GEMINI_API_KEY", "");
  vi.stubEnv("GEMINI_MODEL", "");
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(
    draftApology({ category: "DELAY", description: "Late delivery", status: "NEW" }),
  ).rejects.toThrow("not configured");
  expect(fetch).not.toHaveBeenCalled();
});
it("requests text only and returns an unpublished draft without operational capabilities", async () => {
  vi.stubEnv("GEMINI_API_KEY", "server-test-key");
  vi.stubEnv("GEMINI_MODEL", "gemini-test");
  const fetch = vi.fn();
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: "We are sorry for the difficulty." }] } }],
    }),
  });
  vi.stubGlobal("fetch", fetch);
  expect(
    await draftApology({ category: "DELAY", description: "Late delivery", status: "NEW" }),
  ).toEqual({ text: "We are sorry for the difficulty.", model: "gemini-test" });
  const body = JSON.parse(fetch.mock.calls[0]![1].body);
  expect(body.tools).toBeUndefined();
  expect(body.systemInstruction.parts[0].text).toContain("Do not classify");
  expect(JSON.parse(body.contents[0].parts[0].text)).toEqual({
    category: "DELAY",
    description: "Late delivery",
    status: "NEW",
  });
});
