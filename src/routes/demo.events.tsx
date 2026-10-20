import { createFileRoute, Link } from "@tanstack/react-router";
import { FlaskConical } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/ops/AppShell";
import { SimBadge } from "@/components/ops/badges";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CARRIERS, EVENT_LABEL } from "@/lib/demo/carriers";
import { ingestEvent, type IngestResult } from "@/lib/demo/engine";
import { updatePlatformData as mutate, usePlatformData as useDB } from "@/lib/services/platform";
import type { CarrierId, NormalizedEventType } from "@/lib/demo/types";

export const Route = createFileRoute("/demo/events")({
  head: () => ({
    meta: [
      { title: "Carrier event simulator — Delivery Exception Ops" },
      { name: "description", content: "Send fictional carrier events to test normalisation, dedupe and prioritisation." },
      { property: "og:title", content: "Carrier event simulator — Delivery Exception Ops" },
      { property: "og:description", content: "Send fictional carrier events to test normalisation, dedupe and prioritisation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Simulator,
});

function Simulator() {
  const db = useDB();
  const [carrier, setCarrier] = useState<CarrierId>("gsx");
  const [shipmentId, setShipmentId] = useState("");
  const [type, setType] = useState<NormalizedEventType>("DELAYED");
  const [withTs, setWithTs] = useState(true);
  const [payload, setPayload] = useState("");
  const [result, setResult] = useState<IngestResult | null>(null);

  const shipments = useMemo(() => db?.shipments.filter((s) => s.carrierId === carrier) ?? [], [db, carrier]);
  const ship = shipments.find((s) => s.id === shipmentId);

  const generate = () => {
    if (!ship) {
      toast.error("Pick a shipment first");
      return;
    }
    setPayload(JSON.stringify(CARRIERS[carrier].sample(type, ship.trackingId, withTs), null, 2));
    setResult(null);
  };

  const submit = () => {
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(payload);
    } catch {
      setResult({ ok: false, error: "Payload is not valid JSON." });
      return;
    }
    const r = mutate((d) => ingestEvent(d, carrier, raw));
    setResult(r);
    if (!r.ok) toast.error("Simulator rejected the event");
  };

  const linkTokens = db
    ? ([
        ["tok_valid", "Valid — Kyaw Zin Htet (invalid address)"],
        ["tok_delivered", "Delivered shipment — Zaw Lin Oo"],
        ["tok_expired", "Expired link"],
        ["tok_revoked", "Revoked link"],
      ] as [string, string][]).filter(([id]) => db.demoRawTokens[id])
    : [];

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <FlaskConical className="h-6 w-6 text-demo" aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight">Carrier event simulator</h1>
          <SimBadge>Demo only — not a live carrier connection</SimBadge>
        </div>

        {!db ? (
          <Skeleton className="h-96" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-4 rounded-lg border bg-card p-5 shadow-card">
              <div className="space-y-1.5">
                <Label htmlFor="carrier">Carrier</Label>
                <Select value={carrier} onValueChange={(v) => { setCarrier(v as CarrierId); setShipmentId(""); setPayload(""); }}>
                  <SelectTrigger id="carrier"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.values(CARRIERS).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ship">Shipment</Label>
                <Select value={shipmentId} onValueChange={setShipmentId}>
                  <SelectTrigger id="ship"><SelectValue placeholder="Choose shipment" /></SelectTrigger>
                  <SelectContent>{shipments.map((s) => <SelectItem key={s.id} value={s.id}>{s.orderId} · {s.customerName} · {s.status.toLowerCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="type">Event type</Label>
                <Select value={type} onValueChange={(v) => setType(v as NormalizedEventType)}>
                  <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(EVENT_LABEL) as NormalizedEventType[]).map((t) => <SelectItem key={t} value={t}>{EVENT_LABEL[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="ts" checked={withTs} onCheckedChange={setWithTs} />
                <Label htmlFor="ts">Include carrier timestamp</Label>
              </div>
              <Button variant="outline" onClick={generate} disabled={!ship} className="w-full">Generate {CARRIERS[carrier].name} payload</Button>
              <div className="space-y-1.5">
                <Label htmlFor="payload">Raw payload (editable)</Label>
                <Textarea id="payload" rows={8} className="font-mono text-xs" value={payload} onChange={(e) => setPayload(e.target.value)} placeholder="Generate a payload, then edit it if you like." />
                <p className="text-xs text-muted-foreground">Tip: submit the same payload twice to test de-duplication. Irrawaddy sends no event ID, so it dedupes on tracking + type + time.</p>
              </div>
              <Button onClick={submit} disabled={!payload.trim()} className="w-full">Submit event</Button>
            </section>

            <div className="space-y-4">
              <section className="rounded-lg border bg-card p-5 shadow-card" aria-live="polite">
                <h2 className="text-sm font-semibold">Result</h2>
                {!result ? (
                  <p className="mt-2 text-sm text-muted-foreground">No event submitted yet.</p>
                ) : result.ok ? (
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="inline-flex rounded border border-success/30 bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">{result.outcome.replace(/_/g, " ")}</div>
                    <p>{result.message}</p>
                    {result.exceptionId && (
                      <Button asChild size="sm" variant="outline"><Link to="/exceptions/$id" params={{ id: result.exceptionId }}>Open exception</Link></Button>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 rounded-md border border-critical/30 bg-critical-soft p-3 text-sm text-critical">{result.error}</div>
                )}
              </section>

              <section className="rounded-lg border bg-card p-5 shadow-card">
                <h2 className="text-sm font-semibold">Customer address-link test cases</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {linkTokens.map(([id, label]) => (
                    <li key={id}>
                      <a className="text-primary underline-offset-2 hover:underline" href={`/correct-address/${db.demoRawTokens[id]}`} target="_blank" rel="noreferrer">{label}</a>
                    </li>
                  ))}
                  <li><a className="text-primary underline-offset-2 hover:underline" href="/correct-address/not-a-real-token" target="_blank" rel="noreferrer">Invalid link</a></li>
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">To test “delivered while editing”: open the valid link, then submit a Delivered event for ORD-24077 (Irrawaddy) here before pressing submit on the form.</p>
              </section>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
