import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { signInWithOAuth } = vi.hoisted(() => ({ signInWithOAuth: vi.fn() }));
vi.mock("@/infrastructure/supabase/client", () => ({ supabase: { auth: { signInWithOAuth } } }));
import { CustomerAccountForm } from "./CustomerAccountForm";
beforeEach(() => {
  signInWithOAuth.mockReset();
});
afterEach(cleanup);
it("starts Google OAuth with the fixed Next.js callback", async () => {
  signInWithOAuth.mockResolvedValue({ error: null });
  render(<CustomerAccountForm />);
  fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
  await waitFor(() =>
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    }),
  );
  expect(screen.getByRole("button")).toBeDisabled();
});
it("shows OAuth failure without local-account fallback", async () => {
  signInWithOAuth.mockResolvedValue({ error: new Error("Google provider is disabled") });
  render(<CustomerAccountForm />);
  fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Google provider is disabled");
  expect(screen.queryByText(/local demo sign-in/i)).not.toBeInTheDocument();
  expect(screen.getByRole("button")).not.toBeDisabled();
});
