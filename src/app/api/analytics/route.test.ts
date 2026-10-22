import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { authenticatedClient, from, summarizeAnalytics } = vi.hoisted(() => ({
  authenticatedClient: vi.fn(),
  from: vi.fn(),
  summarizeAnalytics: vi.fn(),
}));
vi.mock("@/infrastructure/supabase/session.server", () => ({ authenticatedClient }));
vi.mock("@/infrastructure/ai/analytics.server", () => ({ summarizeAnalytics }));
import { GET } from "./route";
import { POST } from "./summary/route";
let member: { role: string; is_active: boolean } | null;
let rows: Record<string, { id: string }[]>;
beforeEach(() => {
  vi.clearAllMocks();
  member = { role: "OPERATIONS", is_active: true };
  rows = {};
  from.mockImplementation((table: string) => {
    let cursor = "";
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      gt: vi.fn((_: string, value: string) => {
        cursor = value;
        return builder;
      }),
      maybeSingle: async () => ({ data: member, error: null }),
      then: (resolve: (r: unknown) => unknown) =>
        Promise.resolve({
          data: (rows[table] ?? []).filter((r) => r.id > cursor).slice(0, 500),
          error: null,
        }).then(resolve),
    };
    return builder;
  });
  authenticatedClient.mockResolvedValue({ client: { from }, user: { id: crypto.randomUUID() } });
  summarizeAnalytics.mockResolvedValue({ text: "Verified summary" });
});
const request = () => new Request("http://localhost/api/analytics?period=daily&date=2026-10-01");
it("denies unauthenticated and non-operations users before analytics reads", async () => {
  authenticatedClient.mockRejectedValueOnce(new Error("Sign in required"));
  expect((await GET(request())).status).toBe(401);
  expect(from).not.toHaveBeenCalled();
  for (const role of ["SELLER_STAFF", "DELIVERY_PERSON"]) {
    member = { role, is_active: true };
    expect((await GET(request())).status).toBe(403);
  }
  member = { role: "OPERATIONS", is_active: false };
  expect((await GET(request())).status).toBe(403);
  expect(from.mock.calls.every(([name]) => name === "staff_profiles")).toBe(true);
});
it("pages beyond the Data API limit and returns private aggregates without raw descriptions", async () => {
  rows["complaints"] = Array.from({ length: 1001 }, (_, i) => ({
    id: String(i).padStart(5, "0"),
    complaint_reference: `RPT-${i}`,
    submitted_at: "2026-10-01T01:00:00+06:30",
    category: "DELAY",
    status: "NEW",
    delivery_job_id: "order",
    exception_id: null,
  }));
  const response = await GET(request());
  const result = await response.json();
  expect(response.status).toBe(200);
  expect(result.metrics.received).toBe(1001);
  expect(result.table.rows).toHaveLength(20);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(JSON.stringify(result)).not.toContain("customer_description");
});
it("rejects invalid dates and filters", async () => {
  expect((await GET(new Request("http://localhost/api/analytics?date=2026-02-30"))).status).toBe(
    400,
  );
  expect((await GET(new Request("http://localhost/api/analytics?category=UNTRUSTED"))).status).toBe(
    400,
  );
});
it("fails visibly beyond the supported dataset size instead of returning partial totals", async () => {
  rows["complaints"] = Array.from({ length: 20001 }, (_, i) => ({
    id: String(i).padStart(6, "0"),
  }));
  const response = await GET(request());
  expect(response.status).toBe(503);
  expect((await response.json()).error).toContain("no partial totals");
});
it("does not return partial aggregates when a source query fails", async () => {
  from.mockImplementation((table: string) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: () => builder,
      maybeSingle: async () => ({ data: member, error: null }),
      then: (resolve: (r: unknown) => unknown) =>
        Promise.resolve({ data: null, error: { message: "private SQL diagnostic" } }).then(resolve),
    };
    return builder;
  });
  const response = await GET(request());
  expect(response.status).toBe(503);
  expect(JSON.stringify(await response.json())).not.toContain("private SQL diagnostic");
});
it("rejects cross-origin summaries and ignores forged client statistics", async () => {
  expect(
    (
      await POST(
        new Request("http://localhost/api/analytics/summary", {
          method: "POST",
          headers: { origin: "https://evil.invalid" },
        }),
      )
    ).status,
  ).toBe(403);
  expect(authenticatedClient).not.toHaveBeenCalled();
  const response = await POST(
    new Request("http://localhost/api/analytics/summary?date=2026-10-01", {
      method: "POST",
      headers: { origin: "http://localhost" },
      body: JSON.stringify({ received: 999, description: "private forged text" }),
    }),
  );
  expect(response.status).toBe(200);
  expect(summarizeAnalytics.mock.calls[0]![0].metrics.received).toBe(0);
});
it("does not call Groq for customers and throttles repeated staff requests", async () => {
  member = null;
  const req = () =>
    new Request("http://localhost/api/analytics/summary?date=2026-10-01", {
      method: "POST",
      headers: { origin: "http://localhost" },
    });
  expect((await POST(req())).status).toBe(403);
  expect(summarizeAnalytics).not.toHaveBeenCalled();
  member = { role: "ADMIN", is_active: true };
  expect((await POST(req())).status).toBe(200);
  expect((await POST(req())).status).toBe(429);
  expect(summarizeAnalytics).toHaveBeenCalledTimes(1);
});
