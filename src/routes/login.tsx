import { createFileRoute, Link } from "@tanstack/react-router";
import { PackageSearch, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Delivery Exception Ops" },
      { name: "description", content: "Enter the delivery exception operations prototype." },
      { property: "og:title", content: "Sign in — Delivery Exception Ops" },
      { property: "og:description", content: "Enter the delivery exception operations prototype." },
    ],
  }),
  component: Login,
});

function Login() {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2">
          <PackageSearch className="h-6 w-6 text-sidebar-primary" aria-hidden />
          <span className="font-semibold text-sidebar-accent-foreground">Exception Ops</span>
        </div>
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-semibold leading-tight text-sidebar-accent-foreground">
            Every delayed, misrouted or lost parcel — in one queue.
          </h1>
          <ul className="space-y-2 text-sm text-sidebar-muted">
            <li>What happened? Why does it matter?</li>
            <li>What should we do next? What happens if we approve it?</li>
          </ul>
        </div>
        <p className="text-xs text-sidebar-muted">Fictional carriers: Golden Swift Express · Irrawaddy Parcel · Mingala Courier</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">Seller and customer service workspace.</p>
          </div>
          <div className="flex gap-3 rounded-lg border border-demo/30 bg-demo-soft p-4 text-sm text-demo">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              This is a UI prototype. Real sign-in is not connected, so use demo mode. Demo mode is <strong>not</strong> security.
            </p>
          </div>
          <Button asChild className="w-full" size="lg">
            <Link to="/dashboard">Enter demo workspace</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
