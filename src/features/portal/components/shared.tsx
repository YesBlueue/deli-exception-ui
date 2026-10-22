"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { Badge, DropdownMenu, Heading, Text } from "@radix-ui/themes";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Notice, Panel as PatternPanel, ProductMark } from "@/shared/ui/patterns";
import { Skeleton } from "@/shared/ui/skeleton";
import { CustomerAccountForm } from "@/features/customer-auth/components/CustomerAccountForm";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/infrastructure/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import { CATEGORY_LABELS } from "@/core/domain/exception-rules";
import { ATTEMPT_CATEGORIES, CONDITION_CATEGORIES } from "@/core/domain/driver-rules";
/** `IN_PROGRESS` → "In progress". */
export const friendly = (value: string) => {
  const text = value.replaceAll("_", " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};
/** Display name of a report or driver category, falling back to its code. */
export const categoryLabel = (category: string) =>
  CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ??
  ATTEMPT_CATEGORIES[category as keyof typeof ATTEMPT_CATEGORIES] ??
  CONDITION_CATEGORIES[category as keyof typeof CONDITION_CATEGORIES] ??
  friendly(category);
const DATE_TIME = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
export const time = (value: string | null) =>
  value ? DATE_TIME.format(new Date(value)) : "Not provided";
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
  info: "blue",
  success: "green",
} as const;
/** Small status label; tones keep the design system's fixed status colors. */
export function Tag({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: keyof typeof TAG_COLOR;
}) {
  return (
    <Badge color={TAG_COLOR[tone] ?? "gray"} variant="soft" size="1">
      {children}
    </Badge>
  );
}
/** Priority is the loudest badge on a record: critical is solid, low is only outlined. */
const PRIORITY_BADGE = {
  CRITICAL: { color: "red", variant: "solid" },
  HIGH: { color: "crimson", variant: "soft" },
  MEDIUM: { color: "yellow", variant: "soft" },
  LOW: { color: "gray", variant: "outline" },
} as const;
export function PriorityBadge({ priority }: { priority: string }) {
  const style = PRIORITY_BADGE[priority as keyof typeof PRIORITY_BADGE] ?? PRIORITY_BADGE.LOW;
  return (
    <Badge size="1" {...style}>
      {friendly(priority)}
    </Badge>
  );
}
/** Workflow state; deliberately quieter than priority. */
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge size="1" color="gray" variant="surface">
      {friendly(status)}
    </Badge>
  );
}
/** Marks fictional source data in the simulated (purple) color. */
export function ProvenanceBadge({ provenance }: { provenance: string }) {
  return (
    <Badge size="1" color={provenance === "DEMO" ? "purple" : "gray"} variant="outline">
      {friendly(provenance)}
    </Badge>
  );
}
/** Time left on the exception SLA: a small caption over a bold value, red once breached. */
export function DueLabel({ sla }: { sla: { label: string; breached: boolean } }) {
  if (sla.label === "Closed")
    return (
      <Text as="p" size="2" color="gray">
        Closed
      </Text>
    );
  return (
    <div className="flex items-baseline gap-1.5 tabular-nums sm:block sm:text-right">
      <Text as="p" size="1" className={sla.breached ? "text-critical" : "text-muted-foreground"}>
        {sla.breached ? "Overdue by" : "Due in"}
      </Text>
      <Text as="p" size="3" weight="bold" className={sla.breached ? "text-critical" : undefined}>
        {sla.label.replace(/^Overdue /, "")}
      </Text>
    </div>
  );
}
/** Words written by a customer or driver, set apart from staff-written text. */
export function Quote({ children }: { children: ReactNode }) {
  return (
    <blockquote className="border-l-2 border-primary bg-muted px-3 py-2">
      <Text as="p" size="2" className="whitespace-pre-wrap break-words">
        {children}
      </Text>
    </blockquote>
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
/** The portals one account may use; operations owns every route outside the other three. */
const PORTALS = [
  {
    href: "/overview",
    label: "Operations",
    matches: (path: string) => !/^\/(customer|seller|driver)/.test(path),
  },
  {
    href: "/customer/complaint",
    label: "Customer",
    matches: (path: string) => path.startsWith("/customer"),
  },
  { href: "/seller", label: "Seller", matches: (path: string) => path.startsWith("/seller") },
  { href: "/driver", label: "Driver", matches: (path: string) => path.startsWith("/driver") },
];
/** The single place to switch portal (a menu showing the current one), plus sign-out. */
export function PortalNav() {
  const cache = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
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
  const current = PORTALS.find((p) => p.matches(pathname)) ?? PORTALS[0]!;
  return (
    <nav aria-label="Portals" className="flex items-center gap-2">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button size="sm" variant="outline" aria-label={`${current.label} portal. Switch portal`}>
            {current.label} portal
            <ChevronDown aria-hidden />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          <DropdownMenu.Label>Switch portal</DropdownMenu.Label>
          {PORTALS.map((p) => (
            <DropdownMenu.Item key={p.href} asChild>
              <Link href={p.href} aria-current={p === current ? "page" : undefined}>
                <span className="flex w-full items-center justify-between gap-6">
                  {p.label}
                  {p === current && <Check className="size-4" aria-hidden />}
                </span>
              </Link>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <Button size="sm" variant="ghost" onClick={() => void signOut()}>
        Sign out
      </Button>
    </nav>
  );
}
/** Staff top bar; the logo shows only on phones, where the sidebar that carries it is hidden. */
export function PortalHeader({ section }: { section?: string }) {
  return (
    <header className="border-b bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
        <span className="md:invisible">
          <ProductMark compact {...(section ? { section } : {})} />
        </span>
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
