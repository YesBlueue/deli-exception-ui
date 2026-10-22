"use client";
import { Heading, Text } from "@radix-ui/themes";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Notice } from "@/shared/ui/patterns";
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
        <Heading as="h1" size="7">
          Welcome to ResolveMate
        </Heading>
        <Text as="p" size="2" color="gray" mt="2">
          Sign in to choose one of your orders, report an issue, and read replies here.
        </Text>
      </div>
      <Button className="h-12 w-full" disabled={busy} onClick={() => void signIn()}>
        {busy ? "Connecting to Google..." : "Continue with Google"}
      </Button>
      {error && (
        <Notice tone="error" role="alert">
          {error}
        </Notice>
      )}
      <Text as="p" size="1" color="gray">
        Your first Google sign-in creates your account. Demo orders are clearly labeled; no live
        delivery integration is connected.
      </Text>
    </section>
  );
}
