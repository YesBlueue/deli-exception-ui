"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartNoAxesCombined,
  FlaskConical,
  Inbox,
  LayoutDashboard,
  MessageSquare,
} from "lucide-react";
import type { ReactNode } from "react";
import { usePortal } from "@/infrastructure/portal/use-portal";
import { PortalHeader } from "@/features/portal/components/shared";
import { PRODUCT_NAME } from "@/shared/ui/patterns";
import { cn } from "@/shared/utils";

const NAV = [
  { to: "/overview", label: "Overview", Icon: LayoutDashboard },
  { to: "/dashboard", label: "Exception inbox", Icon: Inbox },
  { to: "/requests", label: "Customer complaints", Icon: MessageSquare },
  { to: "/analytics", label: "Complaint analytics", Icon: ChartNoAxesCombined },
  { to: "/conditions", label: "Route conditions", Icon: Inbox },
  { to: "/demo/events", label: "Event simulator", Icon: FlaskConical },
];

/** Matches a nav item on its own path and on nested paths, like the previous router's fuzzy active match. */
function isActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data } = usePortal();
  return (
    <div className="flex min-h-screen">
      {/* Pinned to the viewport: the page scrolls, the sidebar stays put (its links scroll on short screens). */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col self-start border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-5">
          <Image
            src="/brand/resolvemate-logo.png"
            alt=""
            width={408}
            height={160}
            priority
            className="h-7 w-auto shrink-0"
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-sidebar-accent-foreground">
              {PRODUCT_NAME}
            </div>
            <div className="text-xs text-sidebar-muted">Operations</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Main">
          {NAV.map(({ to, label, Icon }) => {
            const active = isActive(pathname, to);
            return (
              <Link
                key={to}
                href={to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-muted",
                  active && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-sidebar-border p-3 text-xs">
          <div className="px-3 text-sidebar-muted">Operations workspace</div>
          <div className="px-3 font-medium text-sidebar-accent-foreground">
            {data?.user.name ?? "Sign in required"}
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <PortalHeader section="Operations" />
        <header
          className="flex items-center gap-1 overflow-x-auto border-b border-sidebar-border bg-sidebar px-3 py-2 md:hidden"
          aria-label="Mobile navigation"
        >
          {NAV.map(({ to, label, Icon }) => {
            const active = isActive(pathname, to);
            return (
              <Link
                key={to}
                href={to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-sidebar-foreground",
                  active && "bg-sidebar-accent text-sidebar-accent-foreground",
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className="size-4" />
                  {label}
                </span>
              </Link>
            );
          })}
        </header>
        <div className="border-b border-demo/20 bg-demo-soft px-4 py-1.5 text-center text-xs text-demo md:px-8">
          Hackathon demo | Fictional source-system data | Updates appear in portals.
        </div>
        <div className="px-4 md:hidden"></div>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
