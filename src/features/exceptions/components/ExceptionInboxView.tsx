"use client";

import { Text } from "@radix-ui/themes";
import { Inbox } from "lucide-react";
import { useMemo, useState } from "react";
import { PriorityBadge, StatusBadge, TYPE_LABEL, ago } from "@/features/exceptions/components/badges";
import { Button } from "@/shared/ui/button";
import { DataTable, EmptyState, FilterBar, PageHeader, Panel, SearchField, StatGrid, StatTile, type Column } from "@/shared/ui/patterns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { CARRIERS } from "@/core/domain/carriers";
import { STATUS_LABEL } from "@/core/domain/lifecycle";
import { SlaCountdown } from "@/features/exceptions/components/SlaCountdown";
import { isActiveException } from "@/core/domain/sla";
import { suggestedAction } from "@/core/domain/priority";
import { usePlatformData as useDB } from "@/infrastructure/demo-platform/platform";
import type { DeliveryException, Priority, Shipment, WorkflowStatus } from "@/core/domain/types";

const PRANK: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const ALL = "all";

type Row = { x: DeliveryException; s: Shipment | undefined };

const COLUMNS: Column<Row>[] = [
  { header: "Priority", cell: ({ x }) => <PriorityBadge p={x.priority} /> },
  { header: "Order", cell: ({ s }) => s?.orderId, className: "whitespace-nowrap font-mono text-xs" },
  { header: "Customer", cell: ({ s }) => s?.customerName },
  { header: "Carrier", cell: ({ s }) => CARRIERS[s?.carrierId ?? "gsx"].name, className: "text-muted-foreground" },
  { header: "Exception", cell: ({ x }) => TYPE_LABEL[x.type] },
  { header: "SLA", cell: ({ x }) => <SlaCountdown exception={x} />, className: "whitespace-nowrap tabular-nums" },
  { header: "Status", cell: ({ x }) => <StatusBadge s={x.workflowStatus} /> },
  { header: "Suggested next action", cell: ({ x }) => (x.workflowStatus === "RESOLVED" ? "—" : suggestedAction(x.type)), className: "text-muted-foreground" },
];

function MobileRow({ x, s }: Row) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge p={x.priority} />
          <StatusBadge s={x.workflowStatus} />
        </div>
        <Text as="div" size="2" weight="medium">{TYPE_LABEL[x.type]} · <span className="font-mono text-xs">{s?.orderId}</span></Text>
        <Text as="div" size="2" color="gray">{s?.customerName} · {CARRIERS[s?.carrierId ?? "gsx"].name} · {ago(x.openedAt)}</Text>
        {isActiveException(x.workflowStatus) && <Text as="div" size="2" className="text-primary">→ {suggestedAction(x.type)}</Text>}
      </div>
      <SlaCountdown exception={x} />
    </div>
  );
}

export function ExceptionInboxView() {
  const db = useDB();
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
      <PageHeader title="Exception inbox" description="Actionable issues only. Routine scans stay in shipment history." />

      <StatGrid label="Summary">
        <StatTile label="Open exceptions" value={stats?.open ?? null} />
        <StatTile label="Critical" value={stats?.critical ?? null} tone="critical" />
        <StatTile label="Awaiting customer" value={stats?.awaiting ?? null} tone="medium" />
        <StatTile label="Resolved today" value={stats?.resolvedToday ?? null} tone="success" />
      </StatGrid>

      <Panel
        flush
        toolbar={
          <FilterBar search={<SearchField label="Search" placeholder="Search order, customer, tracking ID" value={q} onChange={setQ} />}>
            <Filter label="Priority" value={fp} onChange={setFp} opts={["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((p) => [p, p[0] + p.slice(1).toLowerCase()])} />
            <Filter label="Type" value={ft} onChange={setFt} opts={Object.entries(TYPE_LABEL)} />
            <Filter label="Carrier" value={fc} onChange={setFc} opts={Object.values(CARRIERS).map((c) => [c.id, c.name])} />
            <Select value={fs} onValueChange={setFs}>
              <SelectTrigger aria-label="Workflow status" className="xl:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">All open</SelectItem>
                <SelectItem value={ALL}>All incl. resolved</SelectItem>
                {(Object.keys(STATUS_LABEL) as WorkflowStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterBar>
        }
      >
        {!db ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={db.exceptions.length ? "No exceptions match these filters" : "Inbox is clear"}
            description="Try widening your search or reset filters."
            action={<Button variant="outline" size="sm" onClick={reset}>Reset filters</Button>}
          />
        ) : (
          <DataTable
            label="Exceptions"
            columns={COLUMNS}
            rows={rows}
            rowKey={({ x }) => x.id}
            rowHref={({ x }) => `/exceptions/${x.id}`}
            renderMobile={(row) => <MobileRow {...row} />}
          />
        )}
      </Panel>
    </div>
  );
}

function Filter({ label, value, onChange, opts }: { label: string; value: string; onChange: (v: string) => void; opts: [string, string][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="xl:w-36"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {label.toLowerCase()}</SelectItem>
        {opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
