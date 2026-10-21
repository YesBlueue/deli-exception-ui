"use client";

import Link from "next/link";
import { Code, Text } from "@radix-ui/themes";
import { FileQuestion, Info, Send } from "lucide-react";
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
import { BackLink, EmptyState, Field, KeyValueList, Notice, PageHeader, Panel, Timeline } from "@/shared/ui/patterns";
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
      <EmptyState
        icon={FileQuestion}
        titleAs="h1"
        title="Exception not found"
        description="It may belong to another organisation or the demo data was reset."
        action={<Button asChild variant="outline"><Link href="/dashboard">Back to inbox</Link></Button>}
      />
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
      <div className="mx-auto max-w-7xl space-y-6">
        <BackLink href="/dashboard">Inbox</BackLink>

        <PageHeader
          eyebrow={
            <span className="flex flex-wrap items-center gap-2">
              <PriorityBadge p={x.priority} />
              <StatusBadge s={x.workflowStatus} />
              <SlaCountdown exception={x} />
              <span>Opened {ago(x.openedAt)}</span>
            </span>
          }
          title={<>{TYPE_LABEL[x.type]} · <span className="font-mono">{s.orderId}</span></>}
          description={x.summary}
          actions={
            <div className="sm:text-right">
              <Text as="div" size="2" weight="medium">{s.customerName}</Text>
              <Text as="div" size="2" color="gray">{CARRIERS[s.carrierId].name}</Text>
            </div>
          }
        />

        <Panel
          title="Customer support"
          aside={
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="ghost"><Link href="/requests">Review customer complaints</Link></Button>
              {customerAccess ? (
                <Button asChild size="sm" variant="outline"><Link href={`/customer/${customerAccess}`} target="_blank">Open customer portal</Link></Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setCustomerAccess(mutate((d) => ensureCustomerLink(d, s.id)))}>Prepare customer preview</Button>
              )}
            </div>
          }
        >
          <Text as="p" size="2" color="gray">Order-specific post-delivery complaints and support</Text>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <Panel title="Why this priority" aside={<Text size="1" color="gray">Evaluated {fmtTime(x.evaluatedAt)} · rule-based</Text>}>
              <ul className="space-y-2">
                {x.reasons.map((r) => (
                  <li key={r.rule} className="flex gap-3">
                    <Code size="1" color="gray" className="h-fit shrink-0">{r.rule}</Code>
                    <Text size="2">{r.text}</Text>
                  </li>
                ))}
              </ul>
              {x.missingData.length > 0 && (
                <Notice tone="warning" title="Missing data" className="mt-3">
                  <ul className="list-disc pl-5">{x.missingData.map((m) => <li key={m}>{m}</li>)}</ul>
                </Notice>
              )}
            </Panel>

            {x.workflowStatus !== "RESOLVED" && (
              <Panel title="Suggested next action" aside={<Text size="1" color="gray" className="flex items-center gap-1"><Info className="size-3.5" aria-hidden />AI copilot off — rule-based suggestion</Text>}>
                <Text as="p" size="3" weight="medium" className="text-primary">{suggestedAction(x.type)}</Text>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Text as="label" htmlFor="msg" size="2" weight="medium">Customer message draft</Text>
                    <SimBadge>Not sent until approved</SimBadge>
                  </div>
                  <Textarea id="msg" rows={4} value={message} onChange={(e) => setDraft(e.target.value)} maxLength={600} />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Text size="1" color="gray">To {s.customerPhone} · {message.length}/600</Text>
                    <Button onClick={() => setConfirm(true)} disabled={!message.trim()}>
                      <Send aria-hidden /> Review &amp; approve
                    </Button>
                  </div>
                </div>
              </Panel>
            )}

            <ExceptionComposers id={x.id} />

            <Panel title="Activity & audit trail" flush>
              <Timeline
                empty="No activity yet."
                items={timeline.map((t, i) => ({
                  key: String(i),
                  body: t.text,
                  time: <time dateTime={t.at}>{fmtTime(t.at)}</time>,
                  meta: <>· <span>{t.actor}</span>{t.sim && <SimBadge />}</>,
                }))}
              />
            </Panel>
          </div>

          <div className="min-w-0 space-y-6">
            <Panel title="Workflow status">
              <div className="space-y-3">
                <Text as="div" size="2" className="flex items-center gap-2">Current: <StatusBadge s={x.workflowStatus} /></Text>
                <Field label="Move to" htmlFor="to">
                  <Select value={to} onValueChange={setTo}>
                    <SelectTrigger id="to"><SelectValue placeholder="Choose allowed status" /></SelectTrigger>
                    <SelectContent>
                      {TRANSITIONS[x.workflowStatus].map((st) => <SelectItem key={st} value={st}>{STATUS_LABEL[st]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Reason" htmlFor="reason" error={reasonErr} errorId="reason-err">
                  <Textarea id="reason" rows={2} value={reason} onChange={(e) => { setReason(e.target.value); setReasonErr(""); }} aria-invalid={!!reasonErr} aria-describedby="reason-err" />
                </Field>
                <Button className="w-full" variant="secondary" disabled={!to} onClick={changeStatus}>Update status</Button>
              </div>
            </Panel>

            <Panel title="Shipment">
              <KeyValueList
                items={[
                  { label: "Tracking", value: <span className="font-mono text-xs">{s.trackingId}</span> },
                  { label: "Carrier", value: CARRIERS[s.carrierId].name },
                  { label: "Parcel status", value: s.status.replace("_", " ").toLowerCase() },
                  { label: "Order value", value: s.valueMMK === null ? <span className="text-medium">Unknown</span> : `${s.valueMMK.toLocaleString()} MMK` },
                  { label: "Phone", value: s.customerPhone },
                  { label: "Address", value: <>{s.address.recipient}<br />{s.address.street}<br />{s.address.township}, {s.address.city}</> },
                ]}
              />
            </Panel>

            <Panel title="Shipment history" flush>
              <ol className="divide-y">
                {events.map((e) => (
                  <li key={e.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Text size="2" weight="medium">{EVENT_LABEL[e.type]}</Text>
                      <Text size="1" color="gray">{e.eventTime ? fmtTime(e.eventTime) : <span className="text-medium">no carrier time</span>}</Text>
                    </div>
                    <Button variant="link" size="sm" className="px-0 text-xs" onClick={() => setRawOpen(rawOpen === e.id ? null : e.id)}>
                      {rawOpen === e.id ? "Hide" : "Show"} raw payload
                    </Button>
                    {rawOpen === e.id && <pre className="mt-1 overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs">{JSON.stringify(e.raw, null, 2)}</pre>}
                  </li>
                ))}
              </ol>
            </Panel>
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
          <blockquote className="rounded-md border bg-muted p-3 text-sm">{message}</blockquote>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={send}>Approve &amp; send (simulated)</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
