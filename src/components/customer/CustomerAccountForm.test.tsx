import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerAccountForm } from "./CustomerAccountForm";

const auth = vi.hoisted(() => ({ signUp: vi.fn(), signInWithPassword: vi.fn(), verifyOtp: vi.fn() }));
const modes = vi.hoisted(() => ({ changeMode: vi.fn() }));
vi.mock("./CustomerAuthProvider", () => ({ useCustomerAuth: () => ({ mode: "cloud", changeMode: modes.changeMode }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
beforeEach(() => vi.clearAllMocks());

function credentials(signup = false) {
  if (signup) {
    fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Customer" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "Example-pass-123" } });
  }
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "customer@example.test" } });
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "Example-pass-123" } });
  fireEvent.click(screen.getByRole("button", { name: signup ? "Sign Up" : "Log In" }));
}

describe("customer account transitions", () => {
  it("uses the managed login client without a separate settings request and continues after login", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    auth.signInWithPassword.mockResolvedValue({ data: { session: { user: { id: "customer" } } }, error: null });
    const next = vi.fn(); render(<CustomerAccountForm onAuthenticated={next} />);
    credentials();
    await waitFor(() => expect(next).toHaveBeenCalledOnce());
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "customer@example.test", password: "Example-pass-123" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("continues automatically when signup creates a session", async () => {
    auth.signUp.mockResolvedValue({ data: { session: { user: { id: "customer" } } }, error: null });
    const next = vi.fn(); render(<CustomerAccountForm onAuthenticated={next} />); credentials(true);
    await waitFor(() => expect(next).toHaveBeenCalledOnce());
    expect(auth.signUp).toHaveBeenCalledWith({ email: "customer@example.test", password: "Example-pass-123", options: { data: { name: "Customer" }, emailRedirectTo: `${window.location.origin}/customer/complaint` } });
  });
  it("does not grant reporting access before sessionless signup is verified", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    const next = vi.fn(); render(<CustomerAccountForm onAuthenticated={next} />); credentials(true);
    await screen.findByRole("status");
    expect(next).not.toHaveBeenCalled();
  });
  it("offers explicit fallback on service failure without granting access", async () => {
    auth.signInWithPassword.mockRejectedValue(Error("network"));
    const next = vi.fn(); render(<CustomerAccountForm onAuthenticated={next} />); credentials();
    fireEvent.click(await screen.findByRole("button", { name: "Use local demo sign-in instead" }));
    expect(modes.changeMode).toHaveBeenCalledWith("demo"); expect(next).not.toHaveBeenCalled();
  });
  it("never continues after rejected registration", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: { code: "phone_provider_disabled", message: "Phone provider disabled" } });
    const next = vi.fn(); render(<CustomerAccountForm onAuthenticated={next} />); credentials(true);
    await screen.findByRole("alert");
    expect(next).not.toHaveBeenCalled();
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });
});