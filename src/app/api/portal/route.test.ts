import { beforeEach, describe, expect, it, vi } from "vitest";
const { authenticatedClient, rpc } = vi.hoisted(() => ({
  authenticatedClient: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@/infrastructure/supabase/session.server", () => ({ authenticatedClient }));
import { GET, POST } from "./route";
beforeEach(() => {
  vi.clearAllMocks();
  authenticatedClient.mockResolvedValue({ client: { rpc }, user: { id: "customer" } });
});
describe("portal backend boundary", () => {
  it("denies cross-origin mutations before authentication or database access", async () => {
    const response = await POST(
      new Request("http://localhost/api/portal", {
        method: "POST",
        headers: { origin: "https://untrusted.example" },
        body: '{"action":"assign"}',
      }),
    );
    expect(response.status).toBe(403);
    expect(authenticatedClient).not.toHaveBeenCalled();
  });
  it("returns 401 instead of fictional data when authentication fails", async () => {
    authenticatedClient.mockRejectedValue(new Error("Sign in required"));
    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Sign in required" });
  });
  it("propagates database denial instead of falling back to local storage", async () => {
    rpc.mockResolvedValue({ error: { message: "Order access denied" }, data: null });
    const response = await POST(
      new Request("http://localhost/api/portal", {
        method: "POST",
        headers: { origin: "http://localhost" },
        body: JSON.stringify({
          action: "submit_report",
          input: { deliveryId: "someone-elses-order", description: "My order is delayed" },
        }),
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Order access denied" });
    expect(rpc).toHaveBeenCalledWith(
      "portal_command",
      expect.objectContaining({ command: "submit_report" }),
    );
  });
  it("does not expose the AI draft persistence command as a generic client action", async () => {
    const response = await POST(
      new Request("http://localhost/api/portal", {
        method: "POST",
        headers: { origin: "http://localhost" },
        body: '{"action":"save_draft","input":{}}',
      }),
    );
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
});
