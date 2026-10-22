"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/infrastructure/supabase/client";
import { Field, Notice, PageHeader, Panel, ProductMark, SiteShell } from "@/shared/ui/patterns";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
export function DriverTestLogin() {
  const router = useRouter();
  const cache = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signIn() {
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      cache.clear();
      setPassword("");
      router.replace("/driver");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
      setBusy(false);
    }
  }
  return (
    <SiteShell width="sm" brand={<ProductMark section="Driver test sign-in" />}>
      <div className="space-y-6">
        <PageHeader
          title="Driver test sign-in"
          description="Use your assigned test credentials. Driver access is checked by the server."
        />
        <Notice tone="info" role="status">
          Local development only. These synthetic accounts use passwords; customer Google sign-in is
          unchanged.
        </Notice>
        <Panel title="Test account">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void signIn();
            }}
          >
            <Field label="Email" htmlFor="test-driver-email">
              <Input
                id="test-driver-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password" htmlFor="test-driver-password">
              <Input
                id="test-driver-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {error && (
              <Notice tone="error" role="alert">
                {error}
              </Notice>
            )}
            <Button type="submit" disabled={busy || !email || !password}>
              {busy ? "Signing in…" : "Sign in as test driver"}
            </Button>
          </form>
        </Panel>
      </div>
    </SiteShell>
  );
}
