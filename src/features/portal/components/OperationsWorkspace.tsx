"use client";
import Link from "next/link";
import { Text } from "@radix-ui/themes";
import { Inbox, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { usePortal } from "@/infrastructure/portal/use-portal";
import {
  CATEGORY_LABELS,
  exceptionSla,
  exceptionSummary,
  nextAction,
} from "@/core/domain/exception-rules";
import { Button } from "@/shared/ui/button";
import {
  EmptyState,
  FilterBar,
  LinkList,
  LinkRow,
  OptionSelect,
  PageHeader,
  Panel as PatternPanel,
  SearchField,
  StatGrid,
  StatList,
  StatTile,
  Timeline,
} from "@/shared/ui/patterns";
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
        <Text as="p" size="2" color="gray">
          Your account has no active operations membership. An administrator must assign it on the
          backend.
        </Text>
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
  const activeStaff = s.staff.filter(
    (person) => person.is_active && ["ADMIN", "OPERATIONS"].includes(person.role),
  );
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Delivery company operations"
        title={
          view === "overview"
            ? "Operations overview"
            : view === "reports"
              ? "Customer reports"
              : "Exception inbox"
        }
        description="Investigate exceptions using received delivery context and customer reports."
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard">Open exception inbox</Link>
          </Button>
        }
      />
      <StatGrid label="Summary">
        <StatTile label="Open exceptions" value={open.length} tone="accent" />
        <StatTile
          label="High / critical"
          value={open.filter((e) => ["HIGH", "CRITICAL"].includes(e.priority)).length}
          tone="critical"
        />
        <StatTile
          label="SLA breaches"
          value={open.filter((e) => exceptionSla(e, now).breached).length}
          tone="critical"
        />
        <StatTile label="Unassigned" value={open.filter((e) => !e.assignee_user_id).length} />
      </StatGrid>
      {view === "reports" ? (
        <PatternPanel title="Reports awaiting review" flush>
          {!s.reports.length ? (
            <EmptyState icon={MessageSquare} title="No customer reports yet." />
          ) : (
            <ul className="divide-y">
              {s.reports
                .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
                .map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <Text as="p" size="2" weight="bold" className="font-mono">
                        {r.complaint_reference}
                      </Text>
                      <Text as="p" size="2">
                        {CATEGORY_LABELS[r.category as keyof typeof CATEGORY_LABELS] ?? r.category} ·{" "}
                        {friendly(r.status)}
                      </Text>
                      <Text as="p" size="1" color="gray">
                        {r.needs_review ? "Manual classification review required" : r.category_reason}
                        {r.refund_requested ? " · seller refund handoff" : ""}
                      </Text>
                    </div>
                    {r.exception_id && (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/exceptions/${r.exception_id}`}>Review exception</Link>
                      </Button>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </PatternPanel>
      ) : (
        <>
          <PatternPanel
            flush
            toolbar={
              <FilterBar
                layout="stacked"
                search={
                  <SearchField
                    label="Search exceptions"
                    placeholder="Search order, customer or issue"
                    value={query}
                    onChange={setQuery}
                  />
                }
              >
                <OptionSelect
                  label="Priority"
                  value={priority}
                  onValueChange={setPriority}
                  emptyLabel="All priorities"
                  options={["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((v) => ({ value: v, label: v }))}
                />
                <OptionSelect
                  label="Seller"
                  value={seller}
                  onValueChange={setSeller}
                  emptyLabel="All sellers"
                  options={s.sellers.map((v) => ({ value: v.id, label: v.name }))}
                />
                <OptionSelect
                  label="Exception status"
                  value={status}
                  onValueChange={setStatus}
                  options={[
                    { value: "open", label: "Open" },
                    { value: "all", label: "All incl. resolved" },
                  ]}
                />
                <OptionSelect
                  label="Issue category"
                  value={category}
                  onValueChange={setCategory}
                  emptyLabel="All categories"
                  options={Object.entries(CATEGORY_LABELS).map(([id, label]) => ({ value: id, label }))}
                />
                <OptionSelect
                  label="Assignment"
                  value={assignee}
                  onValueChange={setAssignee}
                  emptyLabel="All assignments"
                  options={[
                    { value: "unassigned", label: "Unassigned" },
                    ...activeStaff.map((person) => ({ value: person.user_id, label: person.full_name })),
                  ]}
                />
                <OptionSelect
                  label="Exception age"
                  value={age}
                  onValueChange={setAge}
                  emptyLabel="All ages"
                  options={[
                    { value: "24", label: "At least 24 hours" },
                    { value: "48", label: "At least 48 hours" },
                  ]}
                />
              </FilterBar>
            }
          >
            {!rows.length ? (
              <EmptyState
                icon={Inbox}
                title="No exceptions match this view."
                description="Reports and relevant source updates create exceptions."
              />
            ) : (
              <LinkList label="Exceptions">
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
                    <LinkRow key={e.id} href={`/exceptions/${e.id}`}>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap gap-2">
                          <Tag tone={e.priority.toLowerCase() as "high"}>{e.priority}</Tag>
                          <Tag>{friendly(e.status)}</Tag>
                          <Tag>{o.provenance}</Tag>
                        </div>
                        <Text as="p" size="2" weight="medium">
                          {exceptionSummary(
                            o.seller_order_reference,
                            sellerName,
                            e.exception_type,
                            o.status,
                          )}
                        </Text>
                        {e.status !== "RESOLVED" && (
                          <Text
                            as="p"
                            size="1"
                            className="text-primary"
                            title={`${guidance.rule}: ${guidance.reason}`}
                          >
                            {guidance.action}
                          </Text>
                        )}
                        <Text as="p" size="1" color="gray">
                          Opened {time(e.detected_at)} ·{" "}
                          {s.staff.find((v) => v.user_id === e.assignee_user_id)?.full_name ??
                            "Unassigned"}
                        </Text>
                      </div>
                      <Text
                        size="2"
                        className={`tabular-nums ${sla.breached ? "text-critical" : "text-muted-foreground"}`}
                      >
                        {sla.label} →
                      </Text>
                    </LinkRow>
                  );
                })}
              </LinkList>
            )}
          </PatternPanel>
          {view === "overview" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <PatternPanel title="Open exceptions by category" flush>
                <StatList
                  items={Object.entries(CATEGORY_LABELS).map(([id, label]) => ({
                    key: id,
                    label,
                    value: open.filter((e) => e.exception_type === id).length,
                  }))}
                />
              </PatternPanel>
              <PatternPanel title="Recent activity" flush>
                <Timeline
                  items={s.audit
                    .sort((a, b) => b.created_at.localeCompare(a.created_at))
                    .slice(0, 8)
                    .map((a) => ({
                      key: a.id,
                      body: a.description,
                      time: <time dateTime={a.created_at}>{time(a.created_at)}</time>,
                    }))}
                />
                <Text as="p" size="1" color="gray" className="border-t px-4 py-2.5">
                  Counts cover the received demo dataset, not company-wide delivery volume.
                </Text>
              </PatternPanel>
            </div>
          )}
        </>
      )}
    </div>
  );
}
