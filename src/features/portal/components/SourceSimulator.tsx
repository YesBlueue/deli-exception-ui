"use client";
import { useState } from "react";
import Link from "next/link";
import { Text } from "@radix-ui/themes";
import { usePortal } from "@/infrastructure/portal/use-portal";
import { Panel, PortalState } from "./shared";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Field, Notice, OptionSelect, PageHeader } from "@/shared/ui/patterns";
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
  if (!s.isStaff) return <Text as="p">Operations access required.</Text>;
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
      <PageHeader
        title="Source update simulator"
        description="A stand-in for relevant updates from the company's existing delivery system. This is not a live integration or a delivery-management interface."
      />
      <Panel title="Prepare an incoming update">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Demo delivery context" htmlFor="source-order">
            <OptionSelect
              id="source-order"
              value={order}
              onValueChange={setOrder}
              placeholder="Choose an order"
              options={s.orders
                .filter((o) => o.provenance === "DEMO")
                .map((o) => ({ value: o.id, label: `${o.seller_order_reference} · ${o.recipient_name}` }))}
            />
          </Field>
          <Field label="Source event" htmlFor="source-type">
            <OptionSelect
              id="source-type"
              value={code}
              onValueChange={setCode}
              options={["DELAY", "DAMAGE", "PACKAGE_MISSING", "IN_TRANSIT", "DELIVERED"].map((c) => ({
                value: c,
                label: c,
              }))}
            />
          </Field>
        </div>
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
        <Field
          label="Incoming normalized payload"
          htmlFor="source-payload"
          hint="Submit the same event ID twice to test deduplication. An older occurredAt is recorded as out of order without overwriting current source context. Set occurredAt to null to test missing-time handling."
        >
          <Textarea
            id="source-payload"
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            rows={8}
            className="font-mono text-xs"
          />
        </Field>
        <Button disabled={busy || !payload.trim()} onClick={() => void submit()}>
          {busy ? "Receiving…" : "Receive simulated update"}
        </Button>
        {error && (
          <Notice tone="error" role="alert">
            {error}
          </Notice>
        )}
        {result && (
          <Notice tone="success" role="status">
            Processing result: {result}
          </Notice>
        )}
        <Link href="/dashboard" className="block text-sm text-primary hover:underline">
          Review exception inbox →
        </Link>
      </Panel>
    </div>
  );
}
