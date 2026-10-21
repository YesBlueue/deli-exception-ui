"use client";

import Link from "next/link";
import { Badge, Text } from "@radix-ui/themes";
import { FlaskConical } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { SimBadge } from "@/features/exceptions/components/badges";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Field, Notice, PageHeader, Panel } from "@/shared/ui/patterns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
import { CARRIERS, EVENT_LABEL } from "@/core/domain/carriers";
import { ingestEvent, type IngestResult } from "@/core/domain/engine";
import { updatePlatformData as mutate, usePlatformData as useDB } from "@/infrastructure/demo-platform/platform";
import type { CarrierId, NormalizedEventType } from "@/core/domain/types";

export function EventSimulatorView() {
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={<SimBadge>Demo only — not a live carrier connection</SimBadge>}
        title={<span className="flex items-center gap-2"><FlaskConical className="size-6 text-demo" aria-hidden />Carrier event simulator</span>}
      />

      {!db ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Panel title="Event">
            <div className="space-y-4">
              <Field label="Carrier" htmlFor="carrier">
                <Select value={carrier} onValueChange={(v) => { setCarrier(v as CarrierId); setShipmentId(""); setPayload(""); }}>
                  <SelectTrigger id="carrier"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.values(CARRIERS).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Shipment" htmlFor="ship">
                <Select value={shipmentId} onValueChange={setShipmentId}>
                  <SelectTrigger id="ship"><SelectValue placeholder="Choose shipment" /></SelectTrigger>
                  <SelectContent>{shipments.map((s) => <SelectItem key={s.id} value={s.id}>{s.orderId} · {s.customerName} · {s.status.toLowerCase()}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Event type" htmlFor="type">
                <Select value={type} onValueChange={(v) => setType(v as NormalizedEventType)}>
                  <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(EVENT_LABEL) as NormalizedEventType[]).map((t) => <SelectItem key={t} value={t}>{EVENT_LABEL[t]}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <div className="flex items-center gap-2">
                <Switch id="ts" checked={withTs} onCheckedChange={setWithTs} />
                <Label htmlFor="ts">Include carrier timestamp</Label>
              </div>
              <Button variant="outline" onClick={generate} disabled={!ship} className="w-full">Generate {CARRIERS[carrier].name} payload</Button>
              <Field label="Raw payload (editable)" htmlFor="payload" hint="Tip: submit the same payload twice to test de-duplication. Irrawaddy sends no event ID, so it dedupes on tracking + type + time.">
                <Textarea id="payload" rows={8} className="font-mono text-xs" value={payload} onChange={(e) => setPayload(e.target.value)} placeholder="Generate a payload, then edit it if you like." />
              </Field>
              <Button onClick={submit} disabled={!payload.trim()} className="w-full">Submit event</Button>
            </div>
          </Panel>

          <Panel title="Result">
            <div aria-live="polite">
              {!result ? (
                <Text as="p" size="2" color="gray">No event submitted yet.</Text>
              ) : result.ok ? (
                <div className="space-y-3">
                  <Badge color="green" variant="soft">{result.outcome.replace(/_/g, " ")}</Badge>
                  <Text as="p" size="2">{result.message}</Text>
                  {result.exceptionId && (
                    <Button asChild size="sm" variant="outline"><Link href={`/exceptions/${result.exceptionId}`}>Open exception</Link></Button>
                  )}
                </div>
              ) : (
                <Notice tone="error">{result.error}</Notice>
              )}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
