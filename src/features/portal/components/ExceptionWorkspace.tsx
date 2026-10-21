"use client";
import Link from "next/link";
import { Heading, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { usePortal, portalRequest } from "@/infrastructure/portal/use-portal";
import type { PortalSnapshot } from "@/infrastructure/portal/types";
import {
  CATEGORY_LABELS,
  EXCEPTION_TRANSITIONS,
  exceptionSla,
  exceptionSummary,
  nextAction,
} from "@/core/domain/exception-rules";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Input } from "@/shared/ui/input";
import {
  BackLink,
  Field,
  KeyValueList,
  Notice,
  OptionSelect,
  PageHeader,
  Panel as PatternPanel,
  Timeline,
} from "@/shared/ui/patterns";
import { Panel, PortalState, Tag, friendly, time } from "./shared";
import type { Tables } from "@/infrastructure/supabase/types";
import { DriverReportContext } from "./DriverReportContext";
type Run = (command: string, input: Record<string, unknown>) => Promise<void>;
export function ExceptionWorkspace({ id }: { id: string }) {
  const q = usePortal();
  const s = q.data;
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState("");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  if (!s)
    return <PortalState loading={q.isPending} error={q.error} retry={() => void q.refetch()} />;
  if (!s.isStaff)
    return (
      <Panel title="Operations access required">
        <Text as="p" size="2">
          This account cannot access exception investigations.
        </Text>
      </Panel>
    );
  const ex = s.exceptions.find((v) => v.id === id);
  const order = s.orders.find((v) => v.id === ex?.delivery_job_id);
  if (!ex || !order)
    return (
      <Panel title="Exception unavailable">
        <Text as="p" size="2">
          This exception does not exist or is outside your access.
        </Text>
        <Link href="/dashboard" className="text-sm text-primary hover:underline">
          Back to inbox
        </Link>
      </Panel>
    );
  const reports = s.reports
    .filter((r) => r.exception_id === id)
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
  const seller = s.sellers.find((v) => v.id === order.seller_id)?.name ?? "Unknown seller";
  const suggestion = nextAction(
    {
      category: reports[0]?.category ?? ex.exception_type,
      sourceStatus: order.status,
      sourceUpdatedAt: order.source_updated_at,
      refund: reports.some((r) => r.refund_requested),
      needsReview: reports.some((r) => r.needs_review),
      confirmation: order.confirmation_details,
      hasRelevantEvent: s.events.some(
        (event) =>
          event.delivery_job_id === order.id &&
          event.processing_result === "APPLIED" &&
          !!event.event_at,
      ),
    },
    now,
  );
  const sla = exceptionSla(ex, now);
  const run: Run = async (command, input) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await q.command(command, input);
      setNotice("Saved to the portal.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
      throw e;
    } finally {
      setBusy(false);
    }
  };
  const staffName = (userId: string | null) => s.staff.find((v) => v.user_id === userId)?.full_name;
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <BackLink href="/dashboard">Exception inbox</BackLink>
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            <Tag tone={ex.priority.toLowerCase() as "high"}>{ex.priority}</Tag>
            <Tag>{friendly(ex.status)}</Tag>
            <Tag>{order.provenance}</Tag>
            <span className={sla.breached ? "text-critical" : undefined}>{sla.label}</span>
          </span>
        }
        title={
          <>
            {CATEGORY_LABELS[ex.exception_type as keyof typeof CATEGORY_LABELS] ??
              friendly(ex.exception_type)}{" "}
            · <span className="font-mono">{order.seller_order_reference}</span>
          </>
        }
        description={
          <>
            {exceptionSummary(
              order.seller_order_reference,
              seller,
              ex.exception_type,
              order.status,
            )}
            <br />
            Opened {time(ex.detected_at)} · Age{" "}
            {Math.max(0, Math.floor((now - Date.parse(ex.detected_at)) / 36e5))}h ·{" "}
            {staffName(ex.assignee_user_id) ?? "Unassigned"}
          </>
        }
      />
      {error && (
        <Notice tone="error" role="alert">
          {error}
        </Notice>
      )}
      {notice && (
        <Notice tone="success" role="status">
          {notice}
        </Notice>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Panel title="Suggested next action">
            <Text as="p" size="3" weight="medium" className="text-primary">
              {suggestion.action}
            </Text>
            <Text as="p" size="2" color="gray">
              {suggestion.reason}
            </Text>
            <Text as="p" size="1" color="gray">
              Rule {suggestion.rule} · {suggestion.version} · Guidance only. No operation runs until
              staff explicitly chooses an action.
            </Text>
          </Panel>
          <Panel title="Priority explanation">
            <Text as="p" size="2">
              {ex.priority_reason}
            </Text>
            <Text as="p" size="1" color="gray">
              SLA: critical 2h, high 8h, medium 24h, low 48h from original opening. Source delivery
              status is independent.
            </Text>
          </Panel>
          <section className="space-y-4">
            <Heading as="h2" size="4">
              Linked customer reports
            </Heading>
            {reports.map((r) => (
              <ReportReview key={r.id} report={r} snapshot={s} run={run} disabled={busy} />
            ))}
            {!reports.length && (
              <Text as="p" size="2" color="gray">
                No customer report is linked. Review the available driver and source context.
              </Text>
            )}
          </section>
          <DriverReportContext exceptionId={id} />
          <Panel title="Private staff notes">
            <Field label="Investigation note" htmlFor="staff-note">
              <Textarea
                id="staff-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={4000}
                placeholder="Only authorized operations staff can read this."
              />
            </Field>
            <Button
              disabled={busy || !note.trim()}
              variant="secondary"
              onClick={() =>
                void run("note", { exceptionId: id, text: note })
                  .then(() => setNote(""))
                  .catch(() => {})
              }
            >
              Save private note
            </Button>
            <ol className="space-y-3">
              {s.notes
                .filter((n) => n.exception_id === id)
                .sort((a, b) => a.created_at.localeCompare(b.created_at))
                .map((n) => (
                  <li key={n.id} className="rounded-md bg-muted p-3">
                    <Text as="p" size="1" color="gray">
                      {time(n.created_at)} · {staffName(n.author_user_id) ?? "Staff"}
                    </Text>
                    <Text as="p" size="2" mt="2" className="whitespace-pre-wrap break-words">
                      {n.body}
                    </Text>
                  </li>
                ))}
            </ol>
          </Panel>
          <Panel title="Seller-visible updates">
            <SellerUpdate exceptionId={id} run={run} disabled={busy} />
            <div className="divide-y">
              {s.updates
                .filter((u) => u.delivery_job_id === order.id)
                .map((u) => (
                  <article key={u.id} className="space-y-1 py-3">
                    <Text as="p" size="1" color="gray">
                      {u.title} · {time(u.created_at)}
                    </Text>
                    <Text as="p" size="2" className="whitespace-pre-wrap break-words">
                      {u.body}
                    </Text>
                  </article>
                ))}
            </div>
          </Panel>
          <PatternPanel title="Audit history" flush>
            <Timeline
              items={s.audit
                .filter((a) => a.delivery_exception_id === id)
                .sort((a, b) => b.created_at.localeCompare(a.created_at))
                .map((a) => ({
                  key: a.id,
                  body: <span className="whitespace-pre-wrap break-words">{a.description}</span>,
                  time: <time dateTime={a.created_at}>{time(a.created_at)}</time>,
                  meta: <>· {friendly(a.action_type)}</>,
                }))}
            />
          </PatternPanel>
        </div>
        <aside className="min-w-0 space-y-6">
          <Panel title="Assignment">
            <Field label="Operations assignee" htmlFor="assignee">
              <OptionSelect
                id="assignee"
                value={ex.assignee_user_id ?? ""}
                disabled={busy}
                onValueChange={(value) =>
                  void run("assign", { exceptionId: id, assignee: value }).catch(() => {})
                }
                emptyLabel="Unassigned"
                options={s.staff
                  .filter((v) => v.is_active && ["ADMIN", "OPERATIONS"].includes(v.role))
                  .map((v) => ({ value: v.user_id, label: v.full_name }))}
              />
            </Field>
          </Panel>
          <Panel title="Exception workflow">
            <Field label="Move to" htmlFor="exception-status">
              <OptionSelect
                id="exception-status"
                value={target}
                onValueChange={setTarget}
                placeholder="Choose permitted status"
                options={(EXCEPTION_TRANSITIONS[ex.status] ?? []).map((v) => ({
                  value: v,
                  label: friendly(v),
                }))}
              />
            </Field>
            <Field label="Audit reason" htmlFor="transition-reason">
              <Textarea
                id="transition-reason"
                value={reason}
                maxLength={4000}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <Button
              className="w-full"
              disabled={busy || !target || !reason.trim()}
              onClick={() =>
                void run("exception_status", { exceptionId: id, status: target, text: reason })
                  .then(() => {
                    setTarget("");
                    setReason("");
                  })
                  .catch(() => {})
              }
            >
              Update exception status
            </Button>
          </Panel>
          <Panel title="Received order context">
            <KeyValueList
              items={[
                ["Order", order.seller_order_reference],
                ["Seller", seller],
                ["Customer", order.recipient_name],
                ["Source status", friendly(order.status)],
                ["Provenance", order.provenance],
                ["Source system", order.source_system],
                ["External delivery ID", order.external_delivery_id ?? "Missing"],
                ["Source updated", time(order.source_updated_at)],
                ["Received", time(order.received_at)],
                ["Confirmation", order.confirmation_details ?? "Not available"],
              ].map(([label, value]) => ({ label, value }))}
            />
            <Text as="p" size="1" color="gray">
              Delivery creation and execution remain in the existing delivery system.
            </Text>
          </Panel>
          <PatternPanel title="Relevant received updates" flush>
            <Timeline
              items={s.events
                .filter((e) => e.delivery_job_id === order.id)
                .sort((a, b) => b.received_at.localeCompare(a.received_at))
                .slice(0, 10)
                .map((e) => ({
                  key: e.id,
                  body: (
                    <span className="font-medium">
                      {friendly(e.event_code)} · {friendly(e.processing_result)}
                    </span>
                  ),
                  time: (
                    <span>
                      Occurred {time(e.event_at)}
                      <br />
                      Received {time(e.received_at)}
                      <br />
                      {e.source} · {e.source_event_id}
                    </span>
                  ),
                }))}
            />
          </PatternPanel>
        </aside>
      </div>
    </div>
  );
}
function SellerUpdate({
  exceptionId,
  run,
  disabled,
}: {
  exceptionId: string;
  run: Run;
  disabled: boolean;
}) {
  const [body, setBody] = useState("");
  return (
    <div className="space-y-3">
      <Field label="Update for the seller only" htmlFor="seller-update">
        <Textarea
          id="seller-update"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={4000}
          placeholder="Include only findings that should be shared with the seller."
        />
      </Field>
      <Button
        variant="outline"
        disabled={disabled || !body.trim()}
        onClick={() =>
          void run("seller_update", { exceptionId, text: body })
            .then(() => setBody(""))
            .catch(() => {})
        }
      >
        Publish seller update
      </Button>
    </div>
  );
}
function ReportReview({
  report: r,
  snapshot: s,
  run,
  disabled,
}: {
  report: Tables<"complaints">;
  snapshot: PortalSnapshot;
  run: Run;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);
  const [category, setCategory] = useState(r.category);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState(r.status);
  const [handoff, setHandoff] = useState("");
  async function generate() {
    setBusy(true);
    setError("");
    try {
      const result = await portalRequest<{ text: string }>("/api/apology", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: r.id }),
      });
      setDraft(result.text);
      setGenerated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate apology");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel title={r.complaint_reference}>
      <div className="flex flex-wrap gap-2">
        <Tag>{friendly(r.status)}</Tag>
        <Tag>{r.category}</Tag>
        {r.needs_review && <Tag>Staff review required</Tag>}
        {r.refund_requested && <Tag>Refund handoff</Tag>}
      </div>
      <Text as="p" size="2" className="whitespace-pre-wrap break-words">
        {r.customer_description}
      </Text>
      <Text as="p" size="1" color="gray">
        {r.category_reason} · {r.rule_version} · Submitted {time(r.submitted_at)}
      </Text>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">Original rule classification</summary>
        <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-2 font-mono">
          {JSON.stringify(r.original_classification, null, 2)}
        </pre>
      </details>
      <div className="flex flex-wrap gap-3">
        {s.attachments
          .filter((a) => a.complaint_id === r.id)
          .map((a) => (
            <a
              key={a.id}
              href={`/api/evidence?id=${a.id}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary underline"
            >
              {a.original_filename}
            </a>
          ))}
      </div>
      <div className="space-y-3 border-t pt-4">
        <Heading as="h3" size="3">
          Customer portal reply
        </Heading>
        <Text as="p" size="1" color="gray">
          Apology drafting sends only the report text, category, and report status to Groq. No
          private notes or contact details are included.
        </Text>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={disabled || busy} onClick={() => void generate()}>
            {busy ? "Drafting…" : "Draft apology with Groq"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDraft(
                "Hello, we are sorry for the difficulty with your delivery. Our operations team will review the information in your report. Please check this portal for updates.",
              );
              setGenerated(false);
            }}
          >
            Insert apology template
          </Button>
        </div>
        {error && (
          <Notice tone="error" role="alert">
            {error}
          </Notice>
        )}
        {generated && (
          <Notice tone="warning" role="status">
            Groq draft only — review all facts before publishing.
          </Notice>
        )}
        <Field label="Reply text" htmlFor={`reply-${r.id}`}>
          <Textarea
            id={`reply-${r.id}`}
            rows={5}
            value={draft}
            maxLength={4000}
            onChange={(e) => setDraft(e.target.value)}
          />
        </Field>
        <Button
          disabled={disabled || busy || !draft.trim()}
          onClick={() =>
            void run("reply", { reportId: r.id, text: draft })
              .then(() => {
                setDraft("");
                setGenerated(false);
              })
              .catch(() => {})
          }
        >
          Publish reviewed reply to customer portal
        </Button>
        <div className="space-y-3">
          {s.replies
            .filter((reply) => reply.complaint_id === r.id)
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
            .map((reply) => (
              <article key={reply.id} className="rounded-md bg-accent p-3">
                <Text as="p" size="1" color="gray">
                  Published {time(reply.created_at)}
                </Text>
                <Text as="p" size="2" mt="2" className="whitespace-pre-wrap break-words">
                  {reply.body}
                </Text>
              </article>
            ))}
        </div>
      </div>
      <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
        <Field label="Staff category correction" htmlFor={`category-${r.id}`}>
          <OptionSelect
            id={`category-${r.id}`}
            value={category}
            onValueChange={setCategory}
            options={Object.entries(CATEGORY_LABELS).map(([id, label]) => ({ value: id, label }))}
          />
        </Field>
        <Field label="Report status" htmlFor={`report-status-${r.id}`}>
          <OptionSelect
            id={`report-status-${r.id}`}
            value={status}
            onValueChange={setStatus}
            options={[
              { value: "NEW", label: "New" },
              ...["IN_REVIEW", "WAITING_FOR_SELLER", "RESOLVED"].map((v) => ({
                value: v,
                label: friendly(v),
              })),
            ]}
          />
        </Field>
        <div className="space-y-3 sm:col-span-2">
          <Field label="Private audit reason" htmlFor={`reason-${r.id}`}>
            <Input
              id={`reason-${r.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={4000}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={disabled || !reason.trim()}
              onClick={() =>
                void run("correct_category", { reportId: r.id, category, text: reason }).catch(
                  () => {},
                )
              }
            >
              Save category correction
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={disabled || !reason.trim() || status === "NEW"}
              onClick={() =>
                void run("report_status", { reportId: r.id, status, text: reason }).catch(() => {})
              }
            >
              Update report status
            </Button>
          </div>
        </div>
      </div>
      {r.refund_requested && (
        <div className="space-y-3 border-t pt-4">
          <Field
            label="Seller-visible delivery findings for refund review"
            htmlFor={`handoff-${r.id}`}
          >
            <Textarea
              id={`handoff-${r.id}`}
              value={handoff}
              maxLength={4000}
              onChange={(e) => setHandoff(e.target.value)}
              placeholder="Describe verified findings only. This does not approve or execute a refund."
            />
          </Field>
          <Button
            variant="outline"
            disabled={disabled || !handoff.trim()}
            onClick={() =>
              void run("handoff", { reportId: r.id, text: handoff })
                .then(() => setHandoff(""))
                .catch(() => {})
            }
          >
            Update seller refund handoff
          </Button>
        </div>
      )}
    </Panel>
  );
}
