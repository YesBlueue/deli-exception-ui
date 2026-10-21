"use client";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { supabase } from "@/infrastructure/supabase/client";
export function CustomerAccountForm({
  onAuthenticated: _onAuthenticated,
}: {
  onAuthenticated?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signIn() {
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Google sign-in could not start. Please try again.",
      );
      setBusy(false);
    }
  }
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Welcome to delivery support</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to choose one of your orders, report an issue, and read replies here.
        </p>
      </div>
      <Button className="h-12 w-full" disabled={busy} onClick={() => void signIn()}>
        {busy ? "Connecting to Google..." : "Continue with Google"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Your first Google sign-in creates your account. Demo orders are clearly labeled; no live
        delivery integration is connected.
      </p>
    </section>
  );
}
