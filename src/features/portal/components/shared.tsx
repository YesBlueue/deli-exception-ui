"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { Badge, Heading, Text } from "@radix-ui/themes";
import { Button } from "@/shared/ui/button";
import { Notice, Panel as PatternPanel } from "@/shared/ui/patterns";
import { Skeleton } from "@/shared/ui/skeleton";
import { CustomerAccountForm } from "@/features/customer-auth/components/CustomerAccountForm";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/infrastructure/supabase/client";
import { useRouter } from "next/navigation";
export const friendly = (value: string) => value.replaceAll("_", " ").toLowerCase();
export const time = (value: string | null) =>
  value ? new Date(value).toLocaleString() : "Not provided";
/** Titled design-system panel whose body stacks its children with consistent spacing. */
export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PatternPanel title={title}>
      <div className="space-y-4">{children}</div>
    </PatternPanel>
  );
}
const TAG_COLOR = {
  default: "gray",
  critical: "red",
  high: "crimson",
  medium: "yellow",
  low: "gray",
} as const;
/** Small status label; priority tones keep the design system's fixed status colors. */
export function Tag({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "critical" | "high" | "medium" | "low";
}) {
  return (
    <Badge color={TAG_COLOR[tone] ?? "gray"} variant="soft" size="1">
      {children}
    </Badge>
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
      <div className="space-y-4 py-6">
        <Text as="p" role="status" size="2" color="gray">
          Loading your workspace...
        </Text>
        <Skeleton className="h-24" />
        <Skeleton className="h-48" />
      </div>
    );
  if (error?.message === "Sign in required")
    return (
      <div className="mx-auto max-w-lg py-10">
        <CustomerAccountForm />
      </div>
    );
  return (
    <section className="mx-auto max-w-lg space-y-4 py-10">
      <Heading as="h1" size="5">
        Workspace unavailable
      </Heading>
      <Notice tone="error" role="alert">
        {error?.message ?? "No data was returned."}
      </Notice>
      <Button onClick={retry}>Try again</Button>
    </section>
  );
}
/** Links between the three portals plus sign-out. */
export function PortalNav() {
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
    <nav aria-label="Portals" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <Link
        href="/customer/complaint"
        className="inline-flex min-h-6 items-center text-primary hover:underline"
      >
        Customer
      </Link>
      <Link
        href="/overview"
        className="inline-flex min-h-6 items-center text-primary hover:underline"
      >
        Operations
      </Link>
      <Link
        href="/seller"
        className="inline-flex min-h-6 items-center text-primary hover:underline"
      >
        Seller
      </Link>
      <Link
        href="/driver"
        className="inline-flex min-h-6 items-center text-primary hover:underline"
      >
        Driver
      </Link>
      <Button size="sm" variant="ghost" className="min-h-6" onClick={() => void signOut()}>
        Sign out
      </Button>
    </nav>
  );
}
export function PortalHeader({ title }: { title: string }) {
  return (
    <header className="border-b bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
        <Text as="p" size="2" weight="bold">
          {title}
        </Text>
        <PortalNav />
      </div>
    </header>
  );
}
export const DEMO_BANNER_TEXT =
  "Hackathon demo | Fictional source-system orders and updates | Portal messages are saved in Supabase";
export function DemoBanner() {
  return (
    <div className="border-b border-demo/20 bg-demo-soft px-4 py-2 text-center text-xs text-demo">
      {DEMO_BANNER_TEXT}
    </div>
  );
}
