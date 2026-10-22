import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { analyticsSummaryContext, summarizeAnalytics } from "./analytics.server";
import { calculateAnalytics } from "@/core/domain/complaint-analytics";
const data = calculateAnalytics(
  {
    reports: [],
    orders: [],
    sellers: [{ id: "private-seller-id", name: "Private seller" }],
    history: [],
    replies: [],
  },
  {
    period: "daily",
    date: "2026-10-22",
    seller: "",
    category: "",
    status: "",
    bucket: "",
    page: 1,
  },
  Date.parse("2026-10-23T00:00:00Z"),
);
beforeEach(() => {
  vi.stubEnv("GROQ_API_KEY", "test-server-key");
  vi.stubEnv("GROQ_MODEL", "openai/gpt-oss-120b");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("sends verified aggregates only, with no identifiers, rows, tools or reasoning output", async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [{ finish_reason: "stop", message: { content: "No complaints were received." } }],
    }),
  });
  vi.stubGlobal("fetch", fetch);
  expect((await summarizeAnalytics(data)).text).toBe("No complaints were received.");
  const body = JSON.parse(fetch.mock.calls[0]![1].body);
  expect(JSON.parse(body.messages[1].content)).toEqual(analyticsSummaryContext(data));
  expect(body.messages[1].content).not.toMatch(
    /private-seller|Private seller|table|rows|complaint_reference|sellerRows/,
  );
  expect(body.tools).toBeUndefined();
  expect(body.include_reasoning).toBe(false);
});
it("leaves calculated findings available when configuration is absent", async () => {
  vi.stubEnv("GROQ_API_KEY", "");
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(summarizeAnalytics(data)).rejects.toThrow("not configured");
  expect(fetch).not.toHaveBeenCalled();
});
it.each([
  { finish_reason: "length", message: { content: "Partial" } },
  { finish_reason: "stop", message: { content: "Text", tool_calls: [{}] } },
  { finish_reason: "stop", message: { content: "Text", refusal: "No" } },
  { finish_reason: "stop", message: { content: null } },
])("rejects unusable provider summaries %#", async (choice) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [choice] }) }),
  );
  await expect(summarizeAnalytics(data)).rejects.toThrow("no usable summary");
});
