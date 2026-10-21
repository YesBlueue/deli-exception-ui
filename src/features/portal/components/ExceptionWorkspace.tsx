"use client";
import Link from "next/link";
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
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Input } from "@/shared/ui/input";
import { Panel, PortalState, Tag, friendly, time } from "./shared";
import type { Tables } from "@/infrastructure/supabase/types";
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
        <p className="text-sm">This account cannot access exception investigations.</p>
      </Panel>
    );
  const ex = s.exceptions.find((v) => v.id === id);
  const order = s.orders.find((v) => v.id === ex?.delivery_job_id);
  if (!ex || !order)
    return (
      <Panel title="Exception unavailable">
        <p className="text-sm">This exception does not exist or is outside your access.</p>
        <Link href="/dashboard" className="text-sm text-primary">
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
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Link href="/dashboard" className="text-sm text-primary">
        ← Exception inbox
      </Link>
      <header className="space-y-3 rounded-lg border bg-card p-5 shadow-card">
        <div className="flex flex-wrap gap-2">
          <Tag tone={ex.priority.toLowerCase() as "high"}>{ex.priority}</Tag>
          <Tag>{friendly(ex.status)}</Tag>
          <Tag>{order.provenance}</Tag>
          <span
            className={`self-center text-xs ${sla.breached ? "text-destructive" : "text-muted-foreground"}`}
          >
            {sla.label}
          </span>
        </div>
        <h1 className="text-2xl font-semibold">
          {CATEGORY_LABELS[ex.exception_type as keyof typeof CATEGORY_LABELS] ??
            friendly(ex.exception_type)}{" "}
          · {order.seller_order_reference}
        </h1>
        <p className="text-sm text-muted-foreground">
          {exceptionSummary(order.seller_order_reference, seller, ex.exception_type, order.status)}
        </p>
        <p className="text-xs text-muted-foreground">
          Opened {time(ex.detected_at)} · Age{" "}
          {Math.max(0, Math.floor((now - Date.parse(ex.detected_at)) / 36e5))}h ·{" "}
          {s.staff.find((v) => v.user_id === ex.assignee_user_id)?.full_name ?? "Unassigned"}
        </p>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded border border-destructive/40 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title="Suggested next action">
            <p className="font-medium text-primary">{suggestion.action}</p>
            <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
            <p className="text-xs text-muted-foreground">
              Rule {suggestion.rule} · {suggestion.version} · Guidance only. No operation runs until
              staff explicitly chooses an action.
            </p>
          </Panel>
          <Panel title="Priority explanation">
            <p className="text-sm">{ex.priority_reason}</p>
            <p className="text-xs text-muted-foreground">
              SLA: critical 2h, high 8h, medium 24h, low 48h from original opening. Source delivery
              status is independent.
            </p>
          </Panel>
          <section className="space-y-5">
            <h2 className="text-lg font-semibold">Linked customer reports</h2>
            {reports.map((r) => (
              <ReportReview key={r.id} report={r} snapshot={s} run={run} disabled={busy} />
            ))}
            {!reports.length && (
              <p className="text-sm text-muted-foreground">
                This exception came from a source update. No customer report is linked.
              </p>
            )}
          </section>
          <Panel title="Private staff notes">
            <Label htmlFor="staff-note">Investigation note</Label>
            <Textarea
              id="staff-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={4000}
              placeholder="Only authorized operations staff can read this."
            />
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
                  <li key={n.id} className="rounded bg-muted p-3">
                    <p className="text-xs text-muted-foreground">
                      {time(n.created_at)} ·{" "}
                      {s.staff.find((v) => v.user_id === n.author_user_id)?.full_name ?? "Staff"}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm">{n.body}</p>
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
                  <article key={u.id} className="space-y-2 py-3">
                    <p className="text-xs text-muted-foreground">
                      {u.title} · {time(u.created_at)}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm">{u.body}</p>
                  </article>
                ))}
            </div>
          </Panel>
          <Panel title="Audit history">
            <ol className="space-y-4">
              {s.audit
                .filter((a) => a.delivery_exception_id === id)
                .sort((a, b) => b.created_at.localeCompare(a.created_at))
                .map((a) => (
                  <li key={a.id}>
                    <p className="text-xs text-muted-foreground">
                      {time(a.created_at)} · {friendly(a.action_type)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm">{a.description}</p>
                  </li>
                ))}
            </ol>
          </Panel>
        </div>
        <aside className="space-y-5">
          <Panel title="Assignment">
            <Label htmlFor="assignee">Operations assignee</Label>
            <select
              id="assignee"
              value={ex.assignee_user_id ?? ""}
              disabled={busy}
              onChange={(e) =>
                void run("assign", { exceptionId: id, assignee: e.target.value }).catch(() => {})
              }
              className="h-10 w-full rounded border bg-card px-3 text-sm"
            >
              <option value="">Unassigned</option>
              {s.staff
                .filter((v) => v.is_active && ["ADMIN", "OPERATIONS"].includes(v.role))
                .map((v) => (
                  <option key={v.user_id} value={v.user_id}>
                    {v.full_name}
                  </option>
                ))}
            </select>
          </Panel>
          <Panel title="Exception workflow">
            <Label htmlFor="exception-status">Move to</Label>
            <select
              id="exception-status"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="h-10 w-full rounded border bg-card px-3 text-sm"
            >
              <option value="">Choose permitted status</option>
              {EXCEPTION_TRANSITIONS[ex.status]?.map((v) => (
                <option key={v} value={v}>
                  {friendly(v)}
                </option>
              ))}
            </select>
            <Label htmlFor="transition-reason">Audit reason</Label>
            <Textarea
              id="transition-reason"
              value={reason}
              maxLength={4000}
              onChange={(e) => setReason(e.target.value)}
            />
            <Button
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
            <dl className="space-y-3 text-sm">
              {[
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
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="mt-1 break-words">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-muted-foreground">
              Delivery creation and execution remain in the existing delivery system.
            </p>
          </Panel>
          <Panel title="Relevant received updates">
            <ol className="space-y-4">
              {s.events
                .filter((e) => e.delivery_job_id === order.id)
                .sort((a, b) => b.received_at.localeCompare(a.received_at))
                .slice(0, 10)
                .map((e) => (
                  <li key={e.id} className="space-y-1 text-sm">
                    <p className="font-medium">
                      {friendly(e.event_code)} · {friendly(e.processing_result)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Occurred {time(e.event_at)}
                      <br />
                      Received {time(e.received_at)}
                      <br />
                      {e.source} · {e.source_event_id}
                    </p>
                  </li>
                ))}
            </ol>
          </Panel>
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
      <Label htmlFor="seller-update">Update for the seller only</Label>
      <Textarea
        id="seller-update"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={4000}
        placeholder="Include only findings that should be shared with the seller."
      />
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
      <p className="whitespace-pre-wrap break-words text-sm">{r.customer_description}</p>
      <p className="text-xs text-muted-foreground">
        {r.category_reason} · {r.rule_version} · Submitted {time(r.submitted_at)}
      </p>
      <details className="text-xs text-muted-foreground">
        <summary>Original rule classification</summary>
        <pre className="mt-2 overflow-auto whitespace-pre-wrap">
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
        <h3 className="text-sm font-semibold">Customer portal reply</h3>
        <p className="text-xs text-muted-foreground">
          Apology drafting sends only the report text, category, and report status to Gemini. No
          private notes or contact details are included.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={disabled || busy} onClick={() => void generate()}>
            {busy ? "Drafting…" : "Draft apology with Gemini"}
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
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {generated && (
          <p role="status" className="text-xs text-medium">
            Gemini draft only — review all facts before publishing.
          </p>
        )}
        <Label htmlFor={`reply-${r.id}`}>Reply text</Label>
        <Textarea
          id={`reply-${r.id}`}
          rows={5}
          value={draft}
          maxLength={4000}
          onChange={(e) => setDraft(e.target.value)}
        />
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
              <article key={reply.id} className="rounded bg-accent p-3">
                <p className="text-xs text-muted-foreground">Published {time(reply.created_at)}</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">{reply.body}</p>
              </article>
            ))}
        </div>
      </div>
      <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
        <div className="space-y-3">
          <Label htmlFor={`category-${r.id}`}>Staff category correction</Label>
          <select
            id={`category-${r.id}`}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 w-full rounded border bg-card px-3 text-sm"
          >
            {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-3">
          <Label htmlFor={`report-status-${r.id}`}>Report status</Label>
          <select
            id={`report-status-${r.id}`}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 w-full rounded border bg-card px-3 text-sm"
          >
            <option value="NEW">New</option>
            {["IN_REVIEW", "WAITING_FOR_SELLER", "RESOLVED"].map((v) => (
              <option key={v} value={v}>
                {friendly(v)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-3 sm:col-span-2">
          <Label htmlFor={`reason-${r.id}`}>Private audit reason</Label>
          <Input
            id={`reason-${r.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={4000}
          />
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
          <Label htmlFor={`handoff-${r.id}`}>
            Seller-visible delivery findings for refund review
          </Label>
          <Textarea
            id={`handoff-${r.id}`}
            value={handoff}
            maxLength={4000}
            onChange={(e) => setHandoff(e.target.value)}
            placeholder="Describe verified findings only. This does not approve or execute a refund."
          />
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
