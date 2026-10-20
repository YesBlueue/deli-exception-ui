import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Copy, Info, Link2, MapPin, Send, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/ops/AppShell";
import { PriorityBadge, SimBadge, StatusBadge, TYPE_LABEL, ago, fmtTime } from "@/components/ops/badges";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CARRIERS, EVENT_LABEL } from "@/lib/demo/carriers";
import { CURRENT_USER } from "@/lib/demo/config";
import { carrierRespond, createAddressLink, transition, uid } from "@/lib/demo/engine";
import { STATUS_LABEL, TRANSITIONS } from "@/lib/demo/lifecycle";
import { draftMessage, suggestedAction } from "@/lib/demo/priority";
import { mutate, useDB } from "@/lib/demo/store";
import type { WorkflowStatus } from "@/lib/demo/types";

export const Route = createFileRoute("/exceptions/$id")({
  head: () => ({
    meta: [
      { title: "Exception detail — Delivery Exception Ops" },
      { name: "description", content: "Investigate and resolve a delivery exception." },
      { property: "og:title", content: "Exception detail — Delivery Exception Ops" },
      { property: "og:description", content: "Investigate and resolve a delivery exception." },
    ],
  }),
  component: Detail,
});

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

function Detail() {
  const { id } = Route.useParams();
  const db = useDB();
  const [draft, setDraft] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [to, setTo] = useState<string>("");
  const [reason, setReason] = useState("");
  const [reasonErr, setReasonErr] = useState("");
  const [rawOpen, setRawOpen] = useState<string | null>(null);

  if (!db)
    return (
      <AppShell>
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>
          <Skeleton className="h-96" />
        </div>
      </AppShell>
    );

  const x = db.exceptions.find((e) => e.id === id);
  if (!x)
    return (
      <AppShell>
        <div className="mx-auto max-w-md py-20 text-center">
          <h1 className="text-lg font-semibold">Exception not found</h1>
          <p className="mt-1 text-sm text-muted-foreground">It may belong to another organisation or the demo data was reset.</p>
          <Button asChild variant="outline" className="mt-4"><Link to="/dashboard">Back to inbox</Link></Button>
        </div>
      </AppShell>
    );

  const s = db.shipments.find((sh) => sh.id === x.shipmentId)!;
  const events = db.events.filter((e) => e.shipmentId === s.id).sort((a, b) => b.ingestedAt.localeCompare(a.ingestedAt));
  const message = draft ?? draftMessage(x.type, s.customerName, s.orderId);
  const activeToken = db.tokens.find((t) => t.shipmentId === s.id && !t.revoked && !t.usedAt && new Date(t.expiresAt) > new Date());
  const corrections = db.corrections.filter((c) => c.shipmentId === s.id);
  const timeline = [
    ...db.logs.filter((l) => l.exceptionId === x.id).map((l) => ({
      at: l.at,
      actor: l.actor,
      text: l.kind === "TRANSITION" ? `${l.from ? STATUS_LABEL[l.from] : "—"} → ${STATUS_LABEL[l.to!]}: ${l.reason}` : l.reason,
      sim: l.actor.includes("simulated"),
    })),
    ...db.actions.filter((a) => a.exceptionId === x.id).map((a) => ({ at: a.at, actor: a.actor, text: a.summary, sim: a.simulated })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const delivered = s.status === "DELIVERED";
  const linkUrl = activeToken && typeof window !== "undefined" ? `${window.location.origin}/correct-address/${db.demoRawTokens[activeToken.id]}` : "";

  const send = () => {
    mutate((d) => {
      d.actions.push({ id: uid("act"), exceptionId: x.id, actor: CURRENT_USER, type: "MESSAGE_SENT", summary: `Approved customer message to ${s.customerName} (simulated — not actually delivered).`, payload: message, approval: "APPROVED", simulated: true, at: new Date().toISOString() });
      const ex = d.exceptions.find((e) => e.id === x.id)!;
      if (TRANSITIONS[ex.workflowStatus].includes("AWAITING_CUSTOMER")) transition(d, x.id, "AWAITING_CUSTOMER", "Customer message approved and sent (simulated).", CURRENT_USER);
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

  const makeLink = () => {
    const r = mutate((d) => {
      const res = createAddressLink(d, s.id);
      if (res.ok) d.actions.push({ id: uid("act"), exceptionId: x.id, actor: CURRENT_USER, type: "ADDRESS_LINK_CREATED", summary: "Created secure address correction link (expires in 48h; previous links revoked).", approval: "NOT_REQUIRED", simulated: false, at: new Date().toISOString() });
      return res;
    });
    if (!r.ok) toast.error(r.error);
    else toast.success("Secure link created");
  };

  const revoke = () => {
    mutate((d) => {
      d.tokens.find((t) => t.id === activeToken!.id)!.revoked = true;
      d.actions.push({ id: uid("act"), exceptionId: x.id, actor: CURRENT_USER, type: "ADDRESS_LINK_REVOKED", summary: "Revoked address correction link.", approval: "NOT_REQUIRED", simulated: false, at: new Date().toISOString() });
    });
    toast("Link revoked");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-4">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Inbox
        </Link>

        <header className="flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-card sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge p={x.priority} />
              <StatusBadge s={x.workflowStatus} />
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

            <Card title="Address correction" aside={<span className="text-xs text-muted-foreground">Customer self-service</span>}>
              {delivered ? (
                <p className="text-sm text-muted-foreground">Parcel is delivered — online address changes are closed.</p>
              ) : activeToken ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-2">
                    <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <code className="min-w-0 flex-1 truncate font-mono text-xs">{linkUrl}</code>
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(linkUrl); toast.success("Link copied"); }} aria-label="Copy link"><Copy className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    Expires {fmtTime(activeToken.expiresAt)} · single use
                    <Button size="sm" variant="outline" asChild><a href={linkUrl} target="_blank" rel="noreferrer">Open as customer</a></Button>
                    <Button size="sm" variant="ghost" onClick={revoke}>Revoke</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">No active link. Create one to let the customer fix their address before delivery.</p>
                  <Button variant="outline" onClick={makeLink}><MapPin className="h-4 w-4" aria-hidden /> Create secure link</Button>
                </div>
              )}

              {corrections.length > 0 && (
                <ul className="mt-4 space-y-3 border-t pt-4">
                  {corrections.map((c) => (
                    <li key={c.id} className="space-y-2 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">Submitted {ago(c.submittedAt)}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${c.carrierStatus === "ACCEPTED" ? "border-success/30 bg-success-soft text-success" : c.carrierStatus === "REJECTED" ? "border-critical/30 bg-critical-soft text-critical" : "border-medium/30 bg-medium-soft text-medium"}`}>
                          Carrier: {c.carrierStatus === "PENDING" ? "pending confirmation" : c.carrierStatus.toLowerCase()}
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded border p-2 text-xs"><div className="mb-1 font-medium text-muted-foreground">Previous</div>{c.previous.street}, {c.previous.township}, {c.previous.city}</div>
                        <div className="rounded border border-primary/40 p-2 text-xs"><div className="mb-1 font-medium text-primary">Requested</div>{c.next.recipient} · {c.next.phone}<br />{c.next.street}, {c.next.township}, {c.next.city}{c.next.instructions && <><br /><em>{c.next.instructions}</em></>}</div>
                      </div>
                      {c.carrierStatus === "PENDING" && (
                        <div className="flex flex-wrap items-center gap-2">
                          <SimBadge />
                          <Button size="sm" variant="outline" onClick={() => { mutate((d) => carrierRespond(d, c.id, true)); toast.success("Carrier accepted (simulated)"); }}><Check className="h-3.5 w-3.5" aria-hidden />Carrier accepts</Button>
                          <Button size="sm" variant="outline" onClick={() => { mutate((d) => carrierRespond(d, c.id, false)); toast.error("Carrier rejected the change (simulated)"); }}><X className="h-3.5 w-3.5" aria-hidden />Carrier rejects</Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

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
                    <button className="text-xs text-primary underline-offset-2 hover:underline" onClick={() => setRawOpen(rawOpen === e.id ? null : e.id)}>
                      {rawOpen === e.id ? "Hide" : "Show"} raw payload
                    </button>
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
    </AppShell>
  );
}
