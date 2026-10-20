import { Link } from "@tanstack/react-router";
import { FlaskConical, Inbox, LayoutDashboard, MessageSquare, PackageSearch, Smartphone } from "lucide-react";
import type { ReactNode } from "react";
import { CURRENT_USER } from "@/lib/demo/config";
import { ResetDemoButton } from "./ResetDemoButton";

const NAV = [
  { to: "/overview", label: "Overview", Icon: LayoutDashboard },
  { to: "/dashboard", label: "Exception inbox", Icon: Inbox },
  { to: "/requests", label: "Customer complaints", Icon: MessageSquare },
  { to: "/demo/events", label: "Event simulator", Icon: FlaskConical },
  { to: "/customer-demos", label: "Customer previews", Icon: Smartphone },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-5">
          <PackageSearch className="h-5 w-5 text-sidebar-primary" aria-hidden />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-sidebar-accent-foreground">Exception Ops</div>
            <div className="text-xs text-sidebar-muted">Shwe Market (demo org)</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Main">
          {NAV.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <div className="space-y-2 border-t border-sidebar-border p-3 text-xs">
          <ResetDemoButton />
          <div className="px-3 text-sidebar-muted">Simulated staff role</div>
          <div className="px-3 font-medium text-sidebar-accent-foreground">{CURRENT_USER}</div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-1 overflow-x-auto bg-sidebar px-3 py-2 md:hidden" aria-label="Mobile navigation">
          <PackageSearch className="mr-2 h-5 w-5 shrink-0 text-sidebar-primary" aria-hidden />
          {NAV.map(({ to, label, Icon }) => (
            <Link key={to} to={to} className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-sidebar-foreground" activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}>
              <span className="flex items-center gap-2"><Icon className="size-4" />{label}</span>
            </Link>
          ))}
        </header>
        <div className="border-b border-demo/20 bg-demo-soft px-4 py-1.5 text-center text-xs text-demo md:px-8">
          Local Demo Mode — fictional records; no messages or carrier contact.
        </div>
        <div className="px-4 md:hidden"><ResetDemoButton /></div>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
