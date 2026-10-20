import { Link } from "@tanstack/react-router";
import { FlaskConical, Inbox, LogOut, PackageSearch, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { CURRENT_USER } from "@/lib/demo/config";
import { resetDemo } from "@/lib/demo/store";

const NAV = [
  { to: "/dashboard", label: "Exception inbox", Icon: Inbox },
  { to: "/demo/events", label: "Event simulator", Icon: FlaskConical },
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
          <button
            onClick={() => {
              resetDemo();
              toast.success("Demo data reset");
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset demo data
          </button>
          <div className="px-3 text-sidebar-muted">Signed in (demo) as</div>
          <div className="px-3 font-medium text-sidebar-accent-foreground">{CURRENT_USER}</div>
          <Link to="/login" className="flex items-center gap-2 rounded-md px-3 py-2 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <LogOut className="h-3.5 w-3.5" aria-hidden /> Exit demo
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-1 overflow-x-auto bg-sidebar px-3 py-2 md:hidden">
          <PackageSearch className="mr-2 h-5 w-5 shrink-0 text-sidebar-primary" aria-hidden />
          {NAV.map(({ to, label }) => (
            <Link key={to} to={to} className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-sidebar-foreground" activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}>
              {label}
            </Link>
          ))}
        </header>
        <div className="border-b border-demo/20 bg-demo-soft px-4 py-1.5 text-center text-xs text-demo md:px-8">
          UI prototype — fictional data stored in this browser. No real messages are sent and no carriers are contacted.
        </div>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
