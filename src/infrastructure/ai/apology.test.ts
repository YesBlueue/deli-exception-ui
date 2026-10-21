import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { draftApology } from "./apology.server";
const context = { category: "DELAY", description: "Late delivery", status: "NEW" };
beforeEach(() => {
  vi.stubEnv("GROQ_API_KEY", "server-test-key");
  vi.stubEnv("GROQ_MODEL", "openai/gpt-oss-120b");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("fails explicitly when Groq is unconfigured, even with old Gemini settings", async () => {
  vi.stubEnv("GROQ_API_KEY", "");
  vi.stubEnv("GROQ_MODEL", "");
  vi.stubEnv("GEMINI_API_KEY", "old-provider-key");
  vi.stubEnv("GEMINI_MODEL", "old-model");
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(draftApology(context)).rejects.toThrow("not configured");
  expect(fetch).not.toHaveBeenCalled();
});
it("requests text only and returns an unpublished draft without operational capabilities", async () => {
  const fetch = vi.fn();
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [
        {
          finish_reason: "stop",
          message: { content: "We are sorry for the difficulty.", reasoning: "PRIVATE REASONING" },
        },
      ],
    }),
  });
  vi.stubGlobal("fetch", fetch);
  expect(await draftApology(context)).toEqual({
    text: "We are sorry for the difficulty.",
    model: "openai/gpt-oss-120b",
  });
  expect(fetch.mock.calls[0]![0]).toBe("https://api.groq.com/openai/v1/chat/completions");
  expect(fetch.mock.calls[0]![1].headers.Authorization).toBe("Bearer server-test-key");
  const body = JSON.parse(fetch.mock.calls[0]![1].body);
  expect(body.tools).toBeUndefined();
  expect(body.model).toBe("openai/gpt-oss-120b");
  expect(body.include_reasoning).toBe(false);
  expect(body.reasoning_format).toBeUndefined();
  expect(body.reasoning_effort).toBe("low");
  expect(body.messages[0].content).toContain("Do not classify");
  expect(JSON.parse(body.messages[1].content)).toEqual(context);
});
it("does not expose provider errors or retry with another provider", async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 429,
    json: vi.fn(() => {
      throw new Error("Sensitive provider payload");
    }),
  });
  vi.stubGlobal("fetch", fetch);
  await expect(draftApology(context)).rejects.toThrow("Groq drafting failed (429)");
  expect(fetch).toHaveBeenCalledTimes(1);
});
it.each([
  { finish_reason: "length", message: { content: "Truncated apology" } },
  { finish_reason: "stop", message: { content: null, reasoning: "Reasoning only" } },
  { finish_reason: "stop", message: { content: " " } },
  { finish_reason: "stop", message: { content: "x".repeat(4001) } },
  { finish_reason: "stop", message: { content: "Apology", tool_calls: [{ name: "publish" }] } },
  { finish_reason: "stop", message: { content: "Apology", refusal: "Refused" } },
])("rejects incomplete or non-text drafts %#", async (choice) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [choice] }) }),
  );
  await expect(draftApology(context)).rejects.toThrow("no usable complete draft");
});
it("rejects an invalid model setting before requesting Groq", async () => {
  vi.stubEnv("GROQ_MODEL", "https://untrusted.example/model");
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(draftApology(context)).rejects.toThrow("Invalid Groq model");
  expect(fetch).not.toHaveBeenCalled();
});
