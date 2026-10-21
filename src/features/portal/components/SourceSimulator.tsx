"use client";
import { useState } from "react";
import Link from "next/link";
import { usePortal } from "@/infrastructure/portal/use-portal";
import { Panel, PortalState } from "./shared";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
export function SourceSimulator() {
  const q = usePortal();
  const s = q.data;
  const [order, setOrder] = useState("");
  const [code, setCode] = useState("DELAY");
  const [payload, setPayload] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!s)
    return <PortalState loading={q.isPending} error={q.error} retry={() => void q.refetch()} />;
  if (!s.isStaff) return <p>Operations access required.</p>;
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const input = JSON.parse(payload) as Record<string, unknown>;
      const result = await q.command("ingest", input);
      setResult(String(result["outcome"]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid update");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Source update simulator</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A stand-in for relevant updates from the company&apos;s existing delivery system. This is
          not a live integration or a delivery-management interface.
        </p>
      </header>
      <Panel title="Prepare an incoming update">
        <Label htmlFor="source-order">Demo delivery context</Label>
        <select
          id="source-order"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          className="h-10 w-full rounded border bg-card px-3 text-sm"
        >
          <option value="">Choose an order</option>
          {s.orders
            .filter((o) => o.provenance === "DEMO")
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.seller_order_reference} · {o.recipient_name}
              </option>
            ))}
        </select>
        <Label htmlFor="source-type">Source event</Label>
        <select
          id="source-type"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="h-10 w-full rounded border bg-card px-3 text-sm"
        >
          {["DELAY", "DAMAGE", "PACKAGE_MISSING", "IN_TRANSIT", "DELIVERED"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <Button
          disabled={!order}
          variant="outline"
          onClick={() =>
            setPayload(
              JSON.stringify(
                {
                  deliveryId: order,
                  eventCode: code,
                  sourceEventId: crypto.randomUUID(),
                  occurredAt: new Date().toISOString(),
                },
                null,
                2,
              ),
            )
          }
        >
          Generate demo source payload
        </Button>
        <Label htmlFor="source-payload">Incoming normalized payload</Label>
        <Textarea
          id="source-payload"
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          rows={8}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Submit the same event ID twice to test deduplication. An older occurredAt is recorded as
          out of order without overwriting current source context. Set occurredAt to null to test
          missing-time handling.
        </p>
        <Button disabled={busy || !payload.trim()} onClick={() => void submit()}>
          {busy ? "Receiving…" : "Receive simulated update"}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {result && (
          <p role="status" className="text-sm text-primary">
            Processing result: {result}
          </p>
        )}
        <Link href="/dashboard" className="block text-sm text-primary">
          Review exception inbox →
        </Link>
      </Panel>
    </div>
  );
}
