"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePortal } from "@/infrastructure/portal/use-portal";
import {
  CATEGORY_LABELS,
  exceptionSla,
  exceptionSummary,
  nextAction,
} from "@/core/domain/exception-rules";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Panel, PortalState, Tag, friendly, time } from "./shared";
export function OperationsWorkspace({ view }: { view: "overview" | "inbox" | "reports" }) {
  const q = usePortal();
  const s = q.data;
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("");
  const [seller, setSeller] = useState("");
  const [status, setStatus] = useState("open");
  const [category, setCategory] = useState("");
  const [assignee, setAssignee] = useState("");
  const [age, setAge] = useState("");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  if (!s)
    return <PortalState loading={q.isPending} error={q.error} retry={() => void q.refetch()} />;
  if (!s.isStaff)
    return (
      <Panel title="Operations access required">
        <p className="text-sm text-muted-foreground">
          Your account has no active operations membership. An administrator must assign it on the
          backend.
        </p>
      </Panel>
    );
  const open = s.exceptions.filter((e) => e.status !== "RESOLVED");
  const rank: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const rows = s.exceptions
    .filter((e) => {
      const o = s.orders.find((o) => o.id === e.delivery_job_id);
      return (
        o &&
        (status !== "open" || e.status !== "RESOLVED") &&
        (!priority || e.priority === priority) &&
        (!seller || o.seller_id === seller) &&
        (!category || e.exception_type === category) &&
        (!assignee ||
          (assignee === "unassigned" ? !e.assignee_user_id : e.assignee_user_id === assignee)) &&
        (!age || now - Date.parse(e.detected_at) >= Number(age) * 36e5) &&
        `${o.seller_order_reference} ${o.recipient_name} ${e.exception_type}`
          .toLowerCase()
          .includes(query.toLowerCase())
      );
    })
    .sort(
      (a, b) =>
        (rank[a.priority] ?? 4) - (rank[b.priority] ?? 4) ||
        a.detected_at.localeCompare(b.detected_at),
    );
  const selectClass = "h-10 rounded-md border bg-card px-3 text-sm";
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-primary">Delivery company operations</p>
          <h1 className="mt-1 text-2xl font-semibold">
            {view === "overview"
              ? "Operations overview"
              : view === "reports"
                ? "Customer reports"
                : "Exception inbox"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Investigate exceptions using received delivery context and customer reports.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Open exception inbox</Link>
        </Button>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Open exceptions", value: open.length },
          {
            label: "High / critical",
            value: open.filter((e) => ["HIGH", "CRITICAL"].includes(e.priority)).length,
          },
          {
            label: "SLA breaches",
            value: open.filter((e) => exceptionSla(e, now).breached).length,
          },
          { label: "Unassigned", value: open.filter((e) => !e.assignee_user_id).length },
        ].map((metric) => (
          <article key={metric.label} className="rounded-lg border bg-card p-5 shadow-card">
            <p className="text-xs font-medium uppercase text-muted-foreground">{metric.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{metric.value}</p>
          </article>
        ))}
      </div>
      {view === "reports" ? (
        <Panel title="Reports awaiting review">
          <div className="divide-y">
            {s.reports
              .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
              .map((r) => (
                <article
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div className="space-y-2">
                    <p className="font-mono text-sm font-semibold">{r.complaint_reference}</p>
                    <p className="text-sm">
                      {CATEGORY_LABELS[r.category as keyof typeof CATEGORY_LABELS] ?? r.category} ·{" "}
                      {friendly(r.status)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.needs_review ? "Manual classification review required" : r.category_reason}
                      {r.refund_requested ? " · seller refund handoff" : ""}
                    </p>
                  </div>
                  {r.exception_id && (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/exceptions/${r.exception_id}`}>Review exception</Link>
                    </Button>
                  )}
                </article>
              ))}
            {!s.reports.length && (
              <p className="text-sm text-muted-foreground">No customer reports yet.</p>
            )}
          </div>
        </Panel>
      ) : (
        <>
          <section className="rounded-lg border bg-card shadow-card">
            <div className="flex flex-wrap gap-2 border-b p-3">
              <Input
                aria-label="Search exceptions"
                placeholder="Search order, customer or issue"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-w-48 flex-1"
              />
              <select
                aria-label="Priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={selectClass}
              >
                <option value="">All priorities</option>
                {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
              <select
                aria-label="Seller"
                value={seller}
                onChange={(e) => setSeller(e.target.value)}
                className={selectClass}
              >
                <option value="">All sellers</option>
                {s.sellers.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Exception status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={selectClass}
              >
                <option value="open">Open</option>
                <option value="all">All incl. resolved</option>
              </select>
              <select
                aria-label="Issue category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className={selectClass}
              >
                <option value="">All categories</option>
                {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Assignment"
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
                className={selectClass}
              >
                <option value="">All assignments</option>
                <option value="unassigned">Unassigned</option>
                {s.staff
                  .filter(
                    (person) => person.is_active && ["ADMIN", "OPERATIONS"].includes(person.role),
                  )
                  .map((person) => (
                    <option key={person.user_id} value={person.user_id}>
                      {person.full_name}
                    </option>
                  ))}
              </select>
              <select
                aria-label="Exception age"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                className={selectClass}
              >
                <option value="">All ages</option>
                <option value="24">At least 24 hours</option>
                <option value="48">At least 48 hours</option>
              </select>
            </div>
            <div className="divide-y">
              {rows.map((e) => {
                const o = s.orders.find((o) => o.id === e.delivery_job_id)!;
                const sellerName =
                  s.sellers.find((v) => v.id === o.seller_id)?.name ?? "Unknown seller";
                const sla = exceptionSla(e, now);
                const linked = s.reports
                  .filter((report) => report.exception_id === e.id)
                  .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
                const guidance = nextAction(
                  {
                    category: linked[0]?.category ?? e.exception_type,
                    sourceStatus: o.status,
                    sourceUpdatedAt: o.source_updated_at,
                    refund: linked.some((report) => report.refund_requested),
                    needsReview: linked.some((report) => report.needs_review),
                    confirmation: o.confirmation_details,
                    hasRelevantEvent: s.events.some(
                      (event) =>
                        event.delivery_job_id === o.id &&
                        event.processing_result === "APPLIED" &&
                        !!event.event_at,
                    ),
                  },
                  now,
                );
                return (
                  <Link
                    key={e.id}
                    href={`/exceptions/${e.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-accent/50"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Tag tone={e.priority.toLowerCase() as "high"}>{e.priority}</Tag>
                        <Tag>{friendly(e.status)}</Tag>
                        <Tag>{o.provenance}</Tag>
                      </div>
                      <p className="text-sm font-medium">
                        {exceptionSummary(
                          o.seller_order_reference,
                          sellerName,
                          e.exception_type,
                          o.status,
                        )}
                      </p>
                      {e.status !== "RESOLVED" && (
                        <p
                          className="text-xs text-primary"
                          title={`${guidance.rule}: ${guidance.reason}`}
                        >
                          {guidance.action}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Opened {time(e.detected_at)} ·{" "}
                        {s.staff.find((v) => v.user_id === e.assignee_user_id)?.full_name ??
                          "Unassigned"}
                      </p>
                    </div>
                    <span
                      className={`text-sm tabular-nums ${sla.breached ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {sla.label} →
                    </span>
                  </Link>
                );
              })}
              {!rows.length && (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No exceptions match this view. Reports and relevant source updates create
                  exceptions.
                </p>
              )}
            </div>
          </section>
          {view === "overview" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="Open exceptions by category">
                <div className="divide-y">
                  {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
                    <div key={id} className="flex justify-between py-3 text-sm">
                      <span>{label}</span>
                      <span>{open.filter((e) => e.exception_type === id).length}</span>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="Recent activity">
                <ol className="divide-y">
                  {s.audit
                    .sort((a, b) => b.created_at.localeCompare(a.created_at))
                    .slice(0, 8)
                    .map((a) => (
                      <li key={a.id} className="py-3 text-sm">
                        <p>{a.description}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{time(a.created_at)}</p>
                      </li>
                    ))}
                </ol>
                <p className="text-xs text-muted-foreground">
                  Counts cover the received demo dataset, not company-wide delivery volume.
                </p>
              </Panel>
            </div>
          )}
        </>
      )}
    </div>
  );
}
