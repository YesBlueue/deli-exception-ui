import { beforeEach, expect, it, vi } from "vitest";
const { authenticatedClient, draftApology, from, rpc, results } = vi.hoisted(() => ({
  authenticatedClient: vi.fn(),
  draftApology: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  results: {} as Record<string, unknown>,
}));
vi.mock("@/infrastructure/supabase/session.server", () => ({ authenticatedClient }));
vi.mock("@/infrastructure/ai/apology.server", () => ({ draftApology }));
import { POST } from "./route";
const request = () =>
  new Request("http://localhost/api/driver/draft", {
    method: "POST",
    headers: { origin: "http://localhost" },
    body: JSON.stringify({
      reviewId: "11111111-1111-4111-8111-111111111111",
      details: "UNTRUSTED PRIVATE DATA",
      category: "UNTRUSTED",
    }),
  });
beforeEach(() => {
  vi.resetAllMocks();
  results["staff_profiles"] = { data: { role: "OPERATIONS", is_active: true } };
  results["notification_reviews"] = {
    data: { report_id: "condition", state: "PREPARED" },
    count: 0,
  };
  results["driver_reports"] = { data: { category: "ROAD_CLOSURE", state: "RECEIVED" } };
  from.mockImplementation((table: string) => {
    const q = { select: vi.fn(), eq: vi.fn(), single: vi.fn(), gte: vi.fn() };
    q.select.mockReturnValue(q);
    q.eq.mockReturnValue(q);
    q.single.mockResolvedValue(results[table]);
    q.gte.mockResolvedValue(results[table]);
    return q;
  });
  authenticatedClient.mockResolvedValue({ client: { from, rpc }, user: { id: "ops" } });
  draftApology.mockResolvedValue({
    text: "Your delivery may be delayed. We are sorry.",
    model: "openai/gpt-oss-120b",
  });
  rpc.mockResolvedValue({ error: null });
});
it("uses only structured server context and saves a private draft without publication", async () => {
  expect((await POST(request())).status).toBe(200);
  expect(draftApology).toHaveBeenCalledWith(
    expect.objectContaining({ category: "ROAD_CLOSURE", status: "POTENTIAL_DELAY_UNCONFIRMED" }),
  );
  expect(JSON.stringify(draftApology.mock.calls)).not.toContain("UNTRUSTED");
  expect(rpc).toHaveBeenCalledExactlyOnceWith("driver_command", {
    command: "prepare",
    input: {
      reportId: "condition",
      expectedReviewId: "11111111-1111-4111-8111-111111111111",
      body: "Your delivery may be delayed. We are sorry.",
      origin: "GROQ",
      model: "openai/gpt-oss-120b",
    },
  });
});
it("denies drivers before provider access", async () => {
  results["staff_profiles"] = { data: { role: "DELIVERY_PERSON", is_active: true } };
  expect((await POST(request())).status).toBe(403);
  expect(draftApology).not.toHaveBeenCalled();
});
it("keeps the saved template usable when Groq fails", async () => {
  draftApology.mockRejectedValue(new Error("Groq unavailable"));
  expect((await POST(request())).status).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
});
