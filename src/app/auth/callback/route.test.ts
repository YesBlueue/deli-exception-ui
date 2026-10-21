import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { sessionClient, exchangeCodeForSession } = vi.hoisted(() => ({
  sessionClient: vi.fn(),
  exchangeCodeForSession: vi.fn(),
}));
vi.mock("@/infrastructure/supabase/session.server", () => ({ sessionClient }));
import { GET } from "./route";
beforeEach(() => {
  vi.clearAllMocks();
  sessionClient.mockResolvedValue({ auth: { exchangeCodeForSession } });
});
afterEach(() => vi.restoreAllMocks());
it("exchanges the code and uses the fixed customer destination", async () => {
  exchangeCodeForSession.mockResolvedValue({ error: null });
  const response = await GET(
    new Request(
      "http://localhost:3000/auth/callback?code=test-code&next=https://untrusted.example",
    ),
  );
  expect(exchangeCodeForSession).toHaveBeenCalledWith("test-code");
  expect(response.headers.get("location")).toBe("http://localhost:3000/customer/complaint");
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it("reports exchange failure without logging codes, provider text, or tokens", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  exchangeCodeForSession.mockResolvedValue({
    error: {
      code: "pkce_code_verifier_not_found",
      status: 400,
      message: "Sensitive provider message with a token",
    },
  });
  const response = await GET(new Request("http://localhost:3000/auth/callback?code=private-code"));
  expect(response.headers.get("location")).toBe("http://localhost:3000/login?error=oauth");
  expect(warn).toHaveBeenCalledExactlyOnceWith("[Auth] OAuth code exchange failed", {
    code: "pkce_code_verifier_not_found",
    status: 400,
  });
});
it("does not exchange a missing code or expose provider error descriptions", async () => {
  const response = await GET(
    new Request(
      "http://localhost:3000/auth/callback?error=access_denied&error_description=private",
    ),
  );
  expect(sessionClient).not.toHaveBeenCalled();
  expect(response.headers.get("location")).toBe("http://localhost:3000/login?error=oauth");
});
