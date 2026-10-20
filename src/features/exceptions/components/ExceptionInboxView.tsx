"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Inbox, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { PriorityBadge, StatusBadge, TYPE_LABEL, ago } from "@/features/exceptions/components/badges";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { CARRIERS } from "@/core/domain/carriers";
import { STATUS_LABEL } from "@/core/domain/lifecycle";
import { SlaCountdown } from "@/features/exceptions/components/SlaCountdown";
import { isActiveException } from "@/core/domain/sla";
import { suggestedAction } from "@/core/domain/priority";
import { usePlatformData as useDB } from "@/infrastructure/demo-platform/platform";
import type { Priority, WorkflowStatus } from "@/core/domain/types";

const PRANK: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const ALL = "all";

export function ExceptionInboxView() {
  const db = useDB();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [fp, setFp] = useState(ALL);
  const [ft, setFt] = useState(ALL);
  const [fc, setFc] = useState(ALL);
  const [fs, setFs] = useState("open");

  const rows = useMemo(() => {
    if (!db) return [];
    return db.exceptions
      .map((x) => ({ x, s: db.shipments.find((s) => s.id === x.shipmentId) }))
      .filter(({ x, s }) => {
        if (!s) return false;
        if (fs === "open" ? !isActiveException(x.workflowStatus) : fs !== ALL && x.workflowStatus !== fs) return false;
        if (fp !== ALL && x.priority !== fp) return false;
        if (ft !== ALL && x.type !== ft) return false;
        if (fc !== ALL && s.carrierId !== fc) return false;
        const t = q.trim().toLowerCase();
        if (t && ![s.orderId, s.customerName, s.trackingId].some((v) => v.toLowerCase().includes(t))) return false;
        return true;
      })
      .sort((a, b) => PRANK[a.x.priority] - PRANK[b.x.priority] || a.x.openedAt.localeCompare(b.x.openedAt));
  }, [db, q, fp, ft, fc, fs]);

  const stats = useMemo(() => {
    if (!db) return null;
    const open = db.exceptions.filter((x) => isActiveException(x.workflowStatus));
    const today = new Date().toDateString();
    return {
      open: open.length,
      critical: open.filter((x) => x.priority === "CRITICAL").length,
      awaiting: open.filter((x) => x.workflowStatus === "AWAITING_CUSTOMER").length,
      resolvedToday: db.exceptions.filter((x) => x.resolvedAt && new Date(x.resolvedAt).toDateString() === today).length,
    };
  }, [db]);

  const reset = () => {
    setQ("");
    setFp(ALL);
    setFt(ALL);
    setFc(ALL);
    setFs("open");
  };

  return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Exception inbox</h1>
          <p className="text-sm text-muted-foreground">Actionable issues only. Routine scans stay in shipment history.</p>
        </div>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Summary">
          {stats
            ? [
                ["Open exceptions", stats.open, "text-foreground"],
                ["Critical", stats.critical, "text-critical"],
                ["Awaiting customer", stats.awaiting, "text-medium"],
                ["Resolved today", stats.resolvedToday, "text-success"],
              ].map(([l, v, c]) => (
                <div key={l as string} className="rounded-lg border bg-card p-4 shadow-card">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{l}</div>
                  <div className={`mt-1 text-3xl font-semibold tabular-nums ${c}`}>{v}</div>
                </div>
              ))
            : Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[86px]" />)}
        </section>

        <section className="rounded-lg border bg-card shadow-card">
          <div className="flex flex-col gap-2 border-b p-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input aria-label="Search" placeholder="Search order, customer, tracking ID" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
              <Filter label="Priority" value={fp} onChange={setFp} opts={["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((p) => [p, p[0] + p.slice(1).toLowerCase()])} />
              <Filter label="Type" value={ft} onChange={setFt} opts={Object.entries(TYPE_LABEL)} />
              <Filter label="Carrier" value={fc} onChange={setFc} opts={Object.values(CARRIERS).map((c) => [c.id, c.name])} />
              <Select value={fs} onValueChange={setFs}>
                <SelectTrigger aria-label="Workflow status" className="lg:w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">All open</SelectItem>
                  <SelectItem value={ALL}>All incl. resolved</SelectItem>
                  {(Object.keys(STATUS_LABEL) as WorkflowStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!db ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden />
              <div className="font-medium">{db.exceptions.length ? "No exceptions match these filters" : "Inbox is clear"}</div>
              <p className="text-sm text-muted-foreground">Try widening your search or reset filters.</p>
              <Button variant="outline" size="sm" onClick={reset}>Reset filters</Button>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      {["Priority", "Order", "Customer", "Carrier", "Exception", "SLA", "Status", "Suggested next action"].map((h) => (
                        <th key={h} className="px-4 py-2.5 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ x, s }) => (
                      <tr
                        key={x.id}
                        tabIndex={0}
                        onClick={() => router.push(`/exceptions/${x.id}`)}
                        onKeyDown={(e) => e.key === "Enter" && router.push(`/exceptions/${x.id}`)}
                        className="cursor-pointer border-t transition-colors hover:bg-accent/50 focus-visible:bg-accent/50"
                      >
                        <td className="px-4 py-3"><PriorityBadge p={x.priority} /></td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{s?.orderId}</td>
                        <td className="px-4 py-3">{s?.customerName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{CARRIERS[s?.carrierId ?? "gsx"].name}</td>
                        <td className="px-4 py-3">{TYPE_LABEL[x.type]}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground tabular-nums">{<SlaCountdown exception={x} />}</td>
                        <td className="px-4 py-3"><StatusBadge s={x.workflowStatus} /></td>
                        <td className="px-4 py-3 text-muted-foreground">{x.workflowStatus === "RESOLVED" ? "—" : suggestedAction(x.type)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="divide-y lg:hidden">
                {rows.map(({ x, s }) => (
                  <li key={x.id}>
                    <Link href={`/exceptions/${x.id}`} className="flex items-center gap-3 p-4 hover:bg-accent/50">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <PriorityBadge p={x.priority} />
                          <StatusBadge s={x.workflowStatus} />
                        </div>
                        <div className="font-medium">{TYPE_LABEL[x.type]} · <span className="font-mono text-xs">{s?.orderId}</span></div>
                        <div className="text-sm text-muted-foreground">{s?.customerName} · {CARRIERS[s?.carrierId ?? "gsx"].name} · {ago(x.openedAt)}</div>
                        {isActiveException(x.workflowStatus) && <div className="text-sm text-primary">→ {suggestedAction(x.type)}</div>}
                      </div>
                      <SlaCountdown exception={x} /><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
  );
}

function Filter({ label, value, onChange, opts }: { label: string; value: string; onChange: (v: string) => void; opts: [string, string][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="lg:w-40"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {label.toLowerCase()}</SelectItem>
        {opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
