"use client";

import Link from "next/link";
import { Callout, Text } from "@radix-ui/themes";
import { ArrowRight, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import { LinkList, LinkRow, PageHeader, Panel, StatGrid, StatList, StatTile, Timeline } from "@/shared/ui/patterns";
import { PriorityBadge, StatusBadge, TYPE_LABEL } from "@/features/exceptions/components/badges";
import { CARRIERS } from "@/core/domain/carriers";
import { getSla, isActiveException } from "@/core/domain/sla";
import { SlaCountdown } from "@/features/exceptions/components/SlaCountdown";
import { usePlatformData } from "@/infrastructure/demo-platform/platform";

export function OverviewView() {
  const db = usePlatformData();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const open = db?.exceptions.filter((x) => isActiveException(x.workflowStatus)) ?? [];
  const critical = open.filter((x) => x.priority === "CRITICAL");
  const complaints = db?.complaints.filter((c) => c.status === "SUBMITTED" || c.status === "INVESTIGATING").length ?? 0;
  const breaches = now === null ? 0 : open.filter((x) => getSla(x, now).breached).length;
  const activity = [...(db?.logs.map((l) => ({ id: l.id, at: l.at, text: l.reason })) ?? []), ...(db?.requestActivity.map((a) => ({ id: a.id, at: a.at, text: a.text })) ?? []), ...(db?.actions.map((a) => ({ id: a.id, at: a.at, text: a.summary })) ?? [])].sort((a,b) => b.at.localeCompare(a.at)).slice(0,8);
  const attention = [...critical, ...open.filter((x) => x.priority === "HIGH")];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Shwe Market operations"
        title="Operations overview"
        description="Delivery exceptions and customer care, at a glance."
        actions={<Button asChild variant="outline"><Link href="/dashboard">Open exception inbox<ArrowRight /></Link></Button>}
      />

      <StatGrid label="Summary">
        <StatTile label="Open exceptions" value={db ? open.length : null} tone="accent" />
        <StatTile label="Critical priority" value={db ? critical.length : null} tone="critical" />
        <StatTile label="SLA breaches" value={db ? breaches : null} tone="critical" />
        <StatTile label="Open complaints" value={db ? complaints : null} tone="info" />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Panel title="Priority attention" flush>
          <LinkList label="Critical and high priority exceptions">
            {attention.map((x) => {
              const s = db?.shipments.find((s) => s.id === x.shipmentId);
              if (!s) return null;
              return (
                <LinkRow key={x.id} href={`/exceptions/${x.id}`}>
                  <div className="space-y-1">
                    <Text as="p" size="2" weight="medium">{TYPE_LABEL[x.type]} · {s.customerName}</Text>
                    <Text as="p" size="1" color="gray" className="font-mono">{s.orderId} · {s.trackingId}</Text>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <PriorityBadge p={x.priority} />
                    <StatusBadge s={x.workflowStatus} />
                    <SlaCountdown exception={x} />
                  </div>
                </LinkRow>
              );
            })}
          </LinkList>
        </Panel>

        <Panel title="Customer care queue">
          <div className="space-y-4">
            <Callout.Root color="blue" variant="surface" size="1">
              <Callout.Icon><MessageSquare className="size-4" /></Callout.Icon>
              <Callout.Text weight="medium">{complaints} post-delivery complaints open</Callout.Text>
              <Callout.Text size="1" color="gray">Keep customers updated on investigations</Callout.Text>
            </Callout.Root>
            <Button asChild variant="outline" className="w-full"><Link href="/requests">Review customer complaints<ArrowRight /></Link></Button>
            <Button asChild variant="ghost" className="w-full"><Link href="/customer-demos">Preview customer portal<ArrowRight /></Link></Button>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Active exceptions by carrier" flush>
          <StatList
            items={Object.entries(CARRIERS).map(([id, carrier]) => ({
              key: id,
              label: carrier.name,
              value: open.filter((x) => db?.shipments.some((s) => s.id === x.shipmentId && s.carrierId === id)).length,
            }))}
          />
        </Panel>
        <Panel title="Recent activity" flush>
          <Timeline items={activity.map((a) => ({ key: a.id, body: a.text, time: <time dateTime={a.at}>{new Date(a.at).toLocaleString()}</time> }))} />
        </Panel>
      </div>
    </div>
  );
}
