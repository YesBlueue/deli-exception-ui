"use client";

import Link from "next/link";
import { ArrowLeft, Info, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ExceptionComposers } from "@/features/exceptions/components/ExceptionComposers";
import { SlaCountdown } from "@/features/exceptions/components/SlaCountdown";
import { PriorityBadge, SimBadge, StatusBadge, TYPE_LABEL, ago, fmtTime } from "@/features/exceptions/components/badges";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Textarea } from "@/shared/ui/textarea";
import { CARRIERS, EVENT_LABEL } from "@/core/domain/carriers";
import { CURRENT_USER } from "@/core/domain/config";
import { transition, uid } from "@/core/domain/engine";
import { STATUS_LABEL, TRANSITIONS } from "@/core/domain/lifecycle";
import { draftMessage, suggestedAction } from "@/core/domain/priority";
import { updatePlatformData as mutate, usePlatformData as useDB, ensureCustomerLink } from "@/infrastructure/demo-platform/platform";
import type { WorkflowStatus } from "@/core/domain/types";

function Card({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card shadow-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {aside}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function ExceptionDetailView({ id }: { id: string }) {
  const db = useDB();
  const [draft, setDraft] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [to, setTo] = useState<string>("");
  const [reason, setReason] = useState("");
  const [reasonErr, setReasonErr] = useState("");
  const [rawOpen, setRawOpen] = useState<string | null>(null);
  const [customerAccess, setCustomerAccess] = useState<string | null>(null);

  if (!db)
    return (
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>
          <Skeleton className="h-96" />
        </div>
    );

  const x = db.exceptions.find((e) => e.id === id);
  if (!x)
    return (
        <div className="mx-auto max-w-md py-20 text-center">
          <h1 className="text-lg font-semibold">Exception not found</h1>
          <p className="mt-1 text-sm text-muted-foreground">It may belong to another organisation or the demo data was reset.</p>
          <Button asChild variant="outline" className="mt-4"><Link href="/dashboard">Back to inbox</Link></Button>
        </div>
    );

  const s = db.shipments.find((sh) => sh.id === x.shipmentId);
  if (!s) return <p>Shipment not found.</p>;
  const events = db.events.filter((e) => e.shipmentId === s.id).sort((a, b) => b.ingestedAt.localeCompare(a.ingestedAt));
  const message = draft ?? draftMessage(x.type, s.customerName, s.orderId);
  const timeline = [
    ...db.logs.filter((l) => l.exceptionId === x.id).map((l) => ({
      at: l.at,
      actor: l.actor,
      text: l.kind === "TRANSITION" ? `${l.from ? STATUS_LABEL[l.from] : "—"} → ${l.to ? STATUS_LABEL[l.to] : "—"}: ${l.reason}` : l.reason,
      sim: l.actor.includes("simulated"),
    })),
    ...db.actions.filter((a) => a.exceptionId === x.id).map((a) => ({ at: a.at, actor: a.actor, text: a.summary, sim: a.simulated })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const send = () => {
    mutate((d) => {
      d.actions.push({ id: uid("act"), exceptionId: x.id, actor: CURRENT_USER, type: "MESSAGE_SENT", summary: `Approved customer message to ${s.customerName} (simulated — not actually delivered).`, payload: message, approval: "APPROVED", simulated: true, at: new Date().toISOString() });
      const ex = d.exceptions.find((e) => e.id === x.id);
      if (ex && TRANSITIONS[ex.workflowStatus].includes("AWAITING_CUSTOMER")) transition(d, x.id, "AWAITING_CUSTOMER", "Customer message approved and sent (simulated).", CURRENT_USER);
    });
    setConfirm(false);
    toast.success("Message approved", { description: "Simulated send — no SMS or email was delivered." });
  };

  const changeStatus = () => {
    if (!to) return;
    if (!reason.trim()) return setReasonErr("Please give a reason for the audit trail.");
    const r = mutate((d) => transition(d, x.id, to as WorkflowStatus, reason, CURRENT_USER));
    if (!r.ok) return toast.error(r.error);
    toast.success(`Status changed to ${STATUS_LABEL[to as WorkflowStatus]}`);
    setTo("");
    setReason("");
    setReasonErr("");
  };

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-4">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Inbox
        </Link>

        <header className="flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-card sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge p={x.priority} />
              <StatusBadge s={x.workflowStatus} /><SlaCountdown exception={x} />
              <span className="text-xs text-muted-foreground">Opened {ago(x.openedAt)}</span>
            </div>
            <h1 className="text-xl font-semibold">{TYPE_LABEL[x.type]} · <span className="font-mono text-base">{s.orderId}</span></h1>
            <p className="text-sm text-muted-foreground">{x.summary}</p>
          </div>
          <div className="text-sm sm:text-right">
            <div className="font-medium">{s.customerName}</div>
            <div className="text-muted-foreground">{CARRIERS[s.carrierId].name}</div>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3 border-y py-3">
          <div><span className="text-sm font-medium">Customer support</span><p className="text-xs text-muted-foreground">Order-specific post-delivery complaints and support</p></div>
          <div className="flex flex-wrap gap-2"><Button asChild size="sm" variant="ghost"><Link href="/requests">Review customer complaints</Link></Button>{customerAccess ? <Button asChild size="sm" variant="outline"><Link href={`/customer/${customerAccess}`} target="_blank">Open customer portal</Link></Button> : <Button size="sm" variant="outline" onClick={() => setCustomerAccess(mutate((d) => ensureCustomerLink(d, s.id)))}>Prepare customer preview</Button>}</div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card title="Why this priority" aside={<span className="text-xs text-muted-foreground">Evaluated {fmtTime(x.evaluatedAt)} · rule-based</span>}>
              <ul className="space-y-2">
                {x.reasons.map((r) => (
                  <li key={r.rule} className="flex gap-3 text-sm">
                    <code className="h-fit shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{r.rule}</code>
                    <span>{r.text}</span>
                  </li>
                ))}
              </ul>
              {x.missingData.length > 0 && (
                <div className="mt-3 rounded-md border border-medium/30 bg-medium-soft p-3 text-sm text-medium">
                  <div className="font-medium">Missing data</div>
                  <ul className="mt-1 list-disc pl-5">{x.missingData.map((m) => <li key={m}>{m}</li>)}</ul>
                </div>
              )}
            </Card>

            {x.workflowStatus !== "RESOLVED" && (
              <Card title="Suggested next action" aside={<span className="flex items-center gap-1 text-xs text-muted-foreground"><Info className="h-3.5 w-3.5" aria-hidden />AI copilot off — rule-based suggestion</span>}>
                <p className="font-medium text-primary">{suggestedAction(x.type)}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="msg">Customer message draft</Label>
                    <SimBadge>Not sent until approved</SimBadge>
                  </div>
                  <Textarea id="msg" rows={4} value={message} onChange={(e) => setDraft(e.target.value)} maxLength={600} />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">To {s.customerPhone} · {message.length}/600</span>
                    <Button onClick={() => setConfirm(true)} disabled={!message.trim()}>
                      <Send className="h-4 w-4" aria-hidden /> Review &amp; approve
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <ExceptionComposers id={x.id} />
            <Card title="Activity & audit trail">
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ol className="relative space-y-4 border-l pl-5">
                  {timeline.map((t, i) => (
                    <li key={i} className="relative text-sm">
                      <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-primary" aria-hidden />
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{fmtTime(t.at)}</span>·<span>{t.actor}</span>{t.sim && <SimBadge />}
                      </div>
                      <div className="mt-0.5">{t.text}</div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <Card title="Workflow status">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">Current: <StatusBadge s={x.workflowStatus} /></div>
                <div className="space-y-1.5">
                  <Label htmlFor="to">Move to</Label>
                  <Select value={to} onValueChange={setTo}>
                    <SelectTrigger id="to"><SelectValue placeholder="Choose allowed status" /></SelectTrigger>
                    <SelectContent>
                      {TRANSITIONS[x.workflowStatus].map((st) => <SelectItem key={st} value={st}>{STATUS_LABEL[st]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea id="reason" rows={2} value={reason} onChange={(e) => { setReason(e.target.value); setReasonErr(""); }} aria-invalid={!!reasonErr} aria-describedby="reason-err" />
                  {reasonErr && <p id="reason-err" className="text-xs text-destructive">{reasonErr}</p>}
                </div>
                <Button className="w-full" variant="secondary" disabled={!to} onClick={changeStatus}>Update status</Button>
              </div>
            </Card>

            <Card title="Shipment">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Tracking</dt><dd className="font-mono text-xs">{s.trackingId}</dd>
                <dt className="text-muted-foreground">Carrier</dt><dd>{CARRIERS[s.carrierId].name}</dd>
                <dt className="text-muted-foreground">Parcel status</dt><dd>{s.status.replace("_", " ").toLowerCase()}</dd>
                <dt className="text-muted-foreground">Order value</dt><dd>{s.valueMMK === null ? <span className="text-medium">Unknown</span> : `${s.valueMMK.toLocaleString()} MMK`}</dd>
                <dt className="text-muted-foreground">Phone</dt><dd>{s.customerPhone}</dd>
                <dt className="text-muted-foreground">Address</dt><dd>{s.address.recipient}<br />{s.address.street}<br />{s.address.township}, {s.address.city}</dd>
              </dl>
            </Card>

            <Card title="Shipment history">
              <ol className="space-y-3">
                {events.map((e) => (
                  <li key={e.id} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{EVENT_LABEL[e.type]}</span>
                      <span className="text-xs text-muted-foreground">{e.eventTime ? fmtTime(e.eventTime) : <span className="text-medium">no carrier time</span>}</span>
                    </div>
                    <Button variant="link" size="sm" className="h-auto px-0 text-xs" onClick={() => setRawOpen(rawOpen === e.id ? null : e.id)}>
                      {rawOpen === e.id ? "Hide" : "Show"} raw payload
                    </Button>
                    {rawOpen === e.id && <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 font-mono text-[11px]">{JSON.stringify(e.raw, null, 2)}</pre>}
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve this message?</AlertDialogTitle>
            <AlertDialogDescription>
              In this prototype the send is <strong>simulated</strong> — nothing reaches {s.customerName}. It will be logged and the exception moves to “Awaiting customer”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <blockquote className="rounded-md border bg-muted/50 p-3 text-sm">{message}</blockquote>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={send}>Approve &amp; send (simulated)</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
