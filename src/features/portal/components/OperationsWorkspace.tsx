"use client";
import Link from "next/link";
import { Heading, Text } from "@radix-ui/themes";
import { ArrowRight, ChevronRight, Inbox, MessageSquare } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { usePortal } from "@/infrastructure/portal/use-portal";
import { ATTEMPT_CATEGORIES } from "@/core/domain/driver-rules";
import { CATEGORY_LABELS, exceptionSla, nextAction } from "@/core/domain/exception-rules";
import { Button } from "@/shared/ui/button";
import {
  BreakdownGrid,
  BreakdownTile,
  EmptyState,
  FilterBar,
  LinkList,
  LinkRow,
  MetaLine,
  OptionSelect,
  PageHeader,
  Panel as PatternPanel,
  RecordSummary,
  SearchField,
  StatGrid,
  StatTile,
  Timeline,
} from "@/shared/ui/patterns";
import {
  DueLabel,
  Panel,
  PortalState,
  PriorityBadge,
  ProvenanceBadge,
  StatusBadge,
  Tag,
  categoryLabel,
  friendly,
  time,
} from "./shared";
/** Priority filter value covering both HIGH and CRITICAL. */
const URGENT = "HIGH_OR_CRITICAL";
/** The summary tiles, each a preset of the inbox filters (also accepted as `?focus=`). */
type Focus = "open" | "urgent" | "breached" | "unassigned";
const ALL_CATEGORIES: Record<string, string> = { ...CATEGORY_LABELS, ...ATTEMPT_CATEGORIES };
export function OperationsWorkspace({ view }: { view: "overview" | "inbox" | "reports" }) {
  const q = usePortal();
  const s = q.data;
  const params = useSearchParams();
  const initialFocus = params.get("focus");
  const initialCategory = params.get("category") ?? "";
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState(initialFocus === "urgent" ? URGENT : "");
  const [seller, setSeller] = useState("");
  const [status, setStatus] = useState("open");
  const [category, setCategory] = useState(
    initialCategory in ALL_CATEGORIES ? initialCategory : "",
  );
  const [assignee, setAssignee] = useState(initialFocus === "unassigned" ? "unassigned" : "");
  const [age, setAge] = useState("");
  const [sla, setSla] = useState(initialFocus === "breached" ? "breached" : "");
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
        (priority === URGENT
          ? ["HIGH", "CRITICAL"].includes(e.priority)
          : !priority || e.priority === priority) &&
        (!sla || exceptionSla(e, now).breached === (sla === "breached")) &&
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
  // Each tile applies its preset (keeping the search text); "Open exceptions" clears the rest.
  function showFocus(target: Focus) {
    setStatus("open");
    setSeller("");
    setCategory("");
    setAge("");
    setPriority(target === "urgent" ? URGENT : "");
    setSla(target === "breached" ? "breached" : "");
    setAssignee(target === "unassigned" ? "unassigned" : "");
  }
  // Only the inbox lists exceptions; elsewhere the tiles open the inbox with their preset.
  const tile = (f: Focus) =>
    view === "inbox"
      ? { onClick: () => showFocus(f) }
      : { href: f === "open" ? "/dashboard" : `/dashboard?focus=${f}` };
  // Categories with open exceptions get a tile (largest first); empty ones are listed in one line.
  const byCategory = Object.entries(ALL_CATEGORIES)
    .map(([id, label]) => ({
      id,
      label,
      count: open.filter((e) => e.exception_type === id).length,
    }))
    .sort((a, b) => b.count - a.count);
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
          view !== "inbox" && (
            <Button asChild variant="outline">
              <Link href="/dashboard">Open exception inbox</Link>
            </Button>
          )
        }
      />
      <StatGrid label="Summary">
        <StatTile label="Open exceptions" value={open.length} tone="accent" {...tile("open")} />
        <StatTile
          label="High / critical"
          value={open.filter((e) => ["HIGH", "CRITICAL"].includes(e.priority)).length}
          tone="high"
          {...tile("urgent")}
        />
        <StatTile
          label="SLA breaches"
          value={open.filter((e) => exceptionSla(e, now).breached).length}
          tone="critical"
          {...tile("breached")}
        />
        <StatTile
          label="Unassigned"
          value={open.filter((e) => !e.assignee_user_id).length}
          {...tile("unassigned")}
        />
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
                  <li key={r.id} className="px-4 py-3">
                    <RecordSummary
                      title={categoryLabel(r.category)}
                      badges={
                        <>
                          <StatusBadge status={r.status} />
                          {r.needs_review && <Tag tone="medium">Needs review</Tag>}
                          {r.refund_requested && <Tag tone="info">Seller refund handoff</Tag>}
                        </>
                      }
                      meta={[
                        <span key="ref" className="font-mono text-foreground">
                          {r.complaint_reference}
                        </span>,
                        `Submitted ${time(r.submitted_at)}`,
                      ]}
                      trailing={
                        r.exception_id && (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/exceptions/${r.exception_id}`}>Review exception</Link>
                          </Button>
                        )
                      }
                    >
                      {!r.needs_review && (
                        <Text as="p" size="1" color="gray">
                          {r.category_reason}
                        </Text>
                      )}
                    </RecordSummary>
                  </li>
                ))}
            </ul>
          )}
        </PatternPanel>
      ) : (
        <>
          {view === "inbox" && (
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
                    options={[
                      { value: URGENT, label: "High and critical" },
                      ...["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((v) => ({
                        value: v,
                        label: friendly(v),
                      })),
                    ]}
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
                    options={Object.entries(ALL_CATEGORIES).map(([id, label]) => ({
                      value: id,
                      label,
                    }))}
                  />
                  <OptionSelect
                    label="Assignment"
                    value={assignee}
                    onValueChange={setAssignee}
                    emptyLabel="All assignments"
                    options={[
                      { value: "unassigned", label: "Unassigned" },
                      ...activeStaff.map((person) => ({
                        value: person.user_id,
                        label: person.full_name,
                      })),
                    ]}
                  />
                  <OptionSelect
                    label="SLA"
                    value={sla}
                    onValueChange={setSla}
                    emptyLabel="Any SLA state"
                    options={[
                      { value: "breached", label: "Breached" },
                      { value: "within", label: "Within SLA" },
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
                        <RecordSummary
                          lead={<PriorityBadge priority={e.priority} />}
                          title={categoryLabel(e.exception_type)}
                          badges={
                            <>
                              <StatusBadge status={e.status} />
                              {o.provenance === "DEMO" && (
                                <ProvenanceBadge provenance={o.provenance} />
                              )}
                            </>
                          }
                          meta={[
                            <span key="order" className="font-mono text-foreground">
                              {o.seller_order_reference ?? "No order reference"}
                            </span>,
                            sellerName,
                            `Source: ${friendly(o.status)}`,
                          ]}
                          trailing={
                            <span className="flex items-center gap-2">
                              <DueLabel sla={sla} />
                              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                            </span>
                          }
                        >
                          {e.status !== "RESOLVED" && (
                            <Text
                              as="p"
                              size="2"
                              className="flex items-start gap-1.5 text-primary"
                              title={`${guidance.rule}: ${guidance.reason}`}
                            >
                              <ArrowRight className="mt-1 size-3.5 shrink-0" aria-hidden />
                              {guidance.action}
                            </Text>
                          )}
                          <MetaLine
                            items={[
                              `Opened ${time(e.detected_at)}`,
                              s.staff.find((v) => v.user_id === e.assignee_user_id)?.full_name ??
                                "Unassigned",
                            ]}
                          />
                        </RecordSummary>
                      </LinkRow>
                    );
                  })}
                </LinkList>
              )}
            </PatternPanel>
          )}
          {view === "overview" && (
            <>
              <section aria-labelledby="by-category" className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Heading as="h2" size="4" id="by-category">
                    Open exceptions by category
                  </Heading>
                  <Text size="2" color="gray">
                    {open.length} open
                  </Text>
                </div>
                {byCategory.some((c) => c.count) && (
                  <BreakdownGrid label="Open exceptions by category">
                    {byCategory
                      .filter((c) => c.count)
                      .map(({ id, label, count }) => (
                        <BreakdownTile
                          key={id}
                          label={label}
                          value={count}
                          total={open.length}
                          href={`/dashboard?category=${id}`}
                        />
                      ))}
                  </BreakdownGrid>
                )}
                {byCategory.some((c) => !c.count) && (
                  <Text as="p" size="2" color="gray">
                    No open exceptions:{" "}
                    {byCategory
                      .filter((c) => !c.count)
                      .map((c) => c.label)
                      .join(", ")}
                  </Text>
                )}
                <Text as="p" size="1" color="gray">
                  Counts cover the received demo dataset, not company-wide delivery volume.
                </Text>
              </section>
              <PatternPanel
                title="Recent activity"
                aside={
                  <Button asChild size="sm" variant="outline">
                    <Link href="/activity">See all</Link>
                  </Button>
                }
                flush
              >
                <Timeline
                  items={s.audit
                    .sort((a, b) => b.created_at.localeCompare(a.created_at))
                    .slice(0, 8)
                    .map((a) => ({
                      key: a.id,
                      body: a.description,
                      time: <time dateTime={a.created_at}>{time(a.created_at)}</time>,
                    }))}
                  empty="No activity recorded yet."
                />
              </PatternPanel>
            </>
          )}
        </>
      )}
    </div>
  );
}
