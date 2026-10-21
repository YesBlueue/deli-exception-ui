import { beforeEach, expect, it, vi } from "vitest";
const { authenticatedClient, rpc } = vi.hoisted(() => ({
  authenticatedClient: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@/infrastructure/supabase/session.server", () => ({ authenticatedClient }));
import { GET, POST } from "./route";
beforeEach(() => {
  vi.resetAllMocks();
  authenticatedClient.mockResolvedValue({ client: { rpc } });
});
it("denies unauthenticated reads without fixture fallback", async () => {
  authenticatedClient.mockRejectedValue(new Error("Sign in required"));
  expect((await GET()).status).toBe(401);
  expect(rpc).not.toHaveBeenCalled();
});
it("denies cross-origin publication before database access", async () => {
  expect(
    (
      await POST(
        new Request("http://localhost/api/driver", {
          method: "POST",
          headers: { origin: "https://elsewhere.invalid" },
          body: '{"action":"publish"}',
        }),
      )
    ).status,
  ).toBe(403);
  expect(authenticatedClient).not.toHaveBeenCalled();
});
it("delegates historical authorization to the guarded transaction and preserves denial", async () => {
  rpc.mockResolvedValue({ error: { message: "Delivery was not assigned to you at occurrence" } });
  const response = await POST(
    new Request("http://localhost/api/driver", {
      method: "POST",
      headers: { origin: "http://localhost" },
      body: JSON.stringify({ action: "submit", input: { deliveryId: "other-driver" } }),
    }),
  );
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    error: "Delivery was not assigned to you at occurrence",
  });
  expect(rpc).toHaveBeenCalledExactlyOnceWith("driver_command", {
    command: "submit",
    input: { deliveryId: "other-driver" },
  });
});
it("cannot accept a delivery lifecycle command", async () => {
  const response = await POST(
    new Request("http://localhost/api/driver", {
      method: "POST",
      headers: { origin: "http://localhost" },
      body: '{"action":"mark_delivered"}',
    }),
  );
  expect(response.status).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
});
