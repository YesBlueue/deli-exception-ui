"use client";

import { Callout, Card, Heading, Text } from "@radix-ui/themes";
import { useState } from "react";
import { AlertCircle, Clock3, MessageSquare, Package } from "lucide-react";
import { ComplaintForm } from "@/features/customer-portal/components/ComplaintForm";
import { Button } from "@/shared/ui/button";
import { BrandMark, EmptyState, PageHeader, Panel, SiteShell } from "@/shared/ui/patterns";
import { Skeleton } from "@/shared/ui/skeleton";
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES } from "@/core/domain/customer";
import { getCustomerOrder, usePlatformData } from "@/infrastructure/demo-platform/platform";
import { fmtTime } from "@/features/exceptions/components/badges";

export function CustomerPortalView({ access }: { access: string }) {
  const db = usePlatformData();
  const [form, setForm] = useState(false);
  const order = db ? getCustomerOrder(db, access) : null;
  const delivered = order?.shipment.status === "DELIVERED";
  return (
    <SiteShell
      brand={<BrandMark icon={Package} name="Shwe Market" />}
      headerAside={<Text size="2" color="gray">Order support</Text>}
      banner="UI prototype · Fictional data in this browser · Links do not provide production security"
      footer="Shwe Market · Customer order support"
    >
      {!db ? (
        <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>
      ) : !order ? (
        <EmptyState icon={AlertCircle} titleAs="h1" title="This order link isn’t available" description="The link may be expired or no longer active. Please ask the seller for a new order link." />
      ) : (
        <div className="space-y-8">
          <PageHeader
            eyebrow={`Hello, ${order.shipment.customerName}`}
            title="Order support"
            actions={
              <div className="text-right">
                <Text as="p" size="1" color="gray">Order reference</Text>
                <Text as="p" size="2" mt="1" className="font-mono">{order.shipment.orderId}</Text>
              </div>
            }
          />
          {form ? (
            <Panel><ComplaintForm access={access} onClose={() => setForm(false)} /></Panel>
          ) : (
            <>
              <Panel title="Something wrong with your delivery?">
                <Text as="p" size="2" color="gray">{delivered ? "Let us know if something wasn’t right with your delivery — damaged, missing or incorrect items." : "You can report damaged, missing or incorrect items once your parcel is delivered."}</Text>
                <Button className="mt-4 h-11 w-full sm:w-auto" variant={delivered ? "default" : "secondary"} disabled={!delivered} onClick={() => setForm(true)}><MessageSquare />Report a delivery issue</Button>
                {!delivered && <Text as="p" size="1" color="gray" mt="2" className="flex items-center gap-1"><Clock3 className="size-3" />Available after delivery</Text>}
              </Panel>
              <section className="space-y-4">
                <Heading as="h2" size="4">Your complaints</Heading>
                {!order.complaints.length ? (
                  <Card size="1"><EmptyState icon={MessageSquare} title="No complaints yet" description="Updates from our support team will appear here." /></Card>
                ) : (
                  order.complaints.map((c) => (
                    <Card key={c.id} size="2" asChild>
                      <article>
                        <div className="flex flex-wrap justify-between gap-2">
                          <Heading as="h3" size="3">{COMPLAINT_CATEGORIES[c.category]}</Heading>
                          <Text size="2" weight="medium" className="text-primary">{COMPLAINT_STATUSES[c.status]}</Text>
                        </div>
                        <Text as="p" size="1" color="gray" mt="1" className="font-mono">{c.reference} · {fmtTime(c.submittedAt)}</Text>
                        <Text as="p" size="2" mt="3" className="whitespace-pre-wrap break-words">{c.description}</Text>
                        {c.customerResponse && (
                          <Callout.Root color="indigo" variant="soft" size="1" mt="4">
                            <Callout.Text size="1" weight="bold">Update from Shwe Market</Callout.Text>
                            <Callout.Text size="2" className="whitespace-pre-wrap break-words">{c.customerResponse}</Callout.Text>
                          </Callout.Root>
                        )}
                      </article>
                    </Card>
                  ))
                )}
              </section>
            </>
          )}
        </div>
      )}
    </SiteShell>
  );
}
