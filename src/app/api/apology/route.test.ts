import { beforeEach, expect, it, vi } from "vitest";
const { authenticatedClient, draftApology, rpc, from } = vi.hoisted(() => ({
  authenticatedClient: vi.fn(),
  draftApology: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@/infrastructure/supabase/session.server", () => ({ authenticatedClient }));
vi.mock("@/infrastructure/ai/apology.server", () => ({ draftApology }));
import { POST } from "./route";
const reportId = "11111111-1111-4111-8111-111111111111";
const request = (origin = "http://localhost:3000") =>
  new Request("http://localhost:3000/api/apology", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      reportId,
      category: "UNTRUSTED CLIENT CATEGORY",
      model: "untrusted-model",
    }),
  });
beforeEach(() => {
  vi.resetAllMocks();
  const results: Record<string, unknown> = {
    staff_profiles: { data: { role: "OPERATIONS", is_active: true } },
    complaints: {
      data: { category: "DAMAGE", customer_description: "The box arrived damaged", status: "NEW" },
    },
    apology_drafts: { count: 0 },
  };
  from.mockImplementation((table: string) => {
    const query = { select: vi.fn(), eq: vi.fn(), single: vi.fn(), gte: vi.fn() };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.single.mockResolvedValue(results[table]);
    query.gte.mockResolvedValue(results[table]);
    return query;
  });
  authenticatedClient.mockResolvedValue({ client: { from, rpc }, user: { id: "staff" } });
  draftApology.mockResolvedValue({
    text: "Hello, we are sorry for the damaged package.",
    model: "openai/gpt-oss-120b",
  });
  rpc.mockResolvedValue({ error: null });
});
it("denies cross-origin generation before authentication or provider access", async () => {
  expect((await POST(request("https://untrusted.example"))).status).toBe(403);
  expect(authenticatedClient).not.toHaveBeenCalled();
  expect(draftApology).not.toHaveBeenCalled();
});
it("denies a customer before loading a report or generating text", async () => {
  from.mockReturnValue({
    select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }),
  });
  expect((await POST(request())).status).toBe(403);
  expect(from).toHaveBeenCalledExactlyOnceWith("staff_profiles");
  expect(draftApology).not.toHaveBeenCalled();
  expect(rpc).not.toHaveBeenCalled();
});
it("uses database context and only saves an unpublished draft", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(draftApology).toHaveBeenCalledExactlyOnceWith({
    category: "DAMAGE",
    description: "The box arrived damaged",
    status: "NEW",
  });
  expect(rpc).toHaveBeenCalledExactlyOnceWith("portal_command", {
    command: "save_draft",
    input: {
      reportId,
      text: "Hello, we are sorry for the damaged package.",
      model: "openai/gpt-oss-120b",
    },
  });
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
it("does not save or publish a reply when Groq fails", async () => {
  draftApology.mockRejectedValue(new Error("Groq drafting failed (429). Your reply is unchanged."));
  expect((await POST(request())).status).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
});
