"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { CustomerAccountForm } from "@/features/customer-auth/components/CustomerAccountForm";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/infrastructure/supabase/client";
import { useRouter } from "next/navigation";
export const friendly = (value: string) => value.replaceAll("_", " ").toLowerCase();
export const time = (value: string | null) =>
  value ? new Date(value).toLocaleString() : "Not provided";
export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border bg-card p-5 shadow-card">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}
export function Tag({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "critical" | "high" | "medium" | "low";
}) {
  const colors = {
    default: "bg-muted text-foreground",
    critical: "bg-critical-soft text-critical",
    high: "bg-high-soft text-high",
    medium: "bg-medium-soft text-medium",
    low: "bg-low-soft text-low",
  };
  return (
    <span className={`inline-flex rounded border px-2 py-1 text-xs font-medium ${colors[tone]}`}>
      {children}
    </span>
  );
}
export function PortalState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: Error | null;
  retry: () => void;
}) {
  if (loading)
    return (
      <p role="status" className="py-10 text-sm text-muted-foreground">
        Loading your workspace...
      </p>
    );
  if (error?.message === "Sign in required")
    return (
      <div className="mx-auto max-w-lg py-10">
        <CustomerAccountForm />
      </div>
    );
  return (
    <section className="mx-auto max-w-lg space-y-4 py-10">
      <h1 className="text-xl font-semibold">Workspace unavailable</h1>
      <p role="alert" className="text-sm text-destructive">
        {error?.message ?? "No data was returned."}
      </p>
      <Button onClick={retry}>Try again</Button>
    </section>
  );
}
export function PortalHeader({ title }: { title: string }) {
  const cache = useQueryClient();
  const router = useRouter();
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      window.alert(error.message);
      return;
    }
    cache.clear();
    router.replace("/login");
    router.refresh();
  }
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <p className="font-semibold">{title}</p>
        <nav className="flex flex-wrap items-center gap-3 text-sm text-primary">
          <Link href="/customer/complaint">Customer</Link>
          <Link href="/overview">Operations</Link>
          <Link href="/seller">Seller</Link>
          <Button size="sm" variant="ghost" onClick={() => void signOut()}>
            Sign out
          </Button>
        </nav>
      </div>
    </header>
  );
}
export function DemoBanner() {
  return (
    <div className="border-b border-demo/20 bg-demo-soft px-4 py-2 text-center text-xs text-demo">
      Hackathon demo | Fictional source-system orders and updates | Portal messages are saved in
      Supabase
    </div>
  );
}
