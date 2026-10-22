"use client";

import Link from "next/link";
import { Heading, Text } from "@radix-ui/themes";
import { ArrowUpRight, MessageSquare, PackageCheck } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { PageHeader, Panel } from "@/shared/ui/patterns";
import { usePlatformData } from "@/infrastructure/demo-platform/platform";

export function CustomerPreviewsView() {
  const db = usePlatformData();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Separate customer experience"
        title="Customer portal previews"
        description="Fictional order links for reviewing the customer support experience — complaints only, no tracking or address changes. No seller account is needed; access security is not connected."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {db?.customerLinks.filter((l) => !l.revoked).map((l) => {
          const s = db.shipments.find((s) => s.id === l.shipmentId);
          if (!s) return null;
          const delivered = s.status === "DELIVERED";
          const Icon = delivered ? PackageCheck : MessageSquare;
          return (
            <Panel key={l.access}>
              <div className="flex h-full flex-col">
                <Icon className="mb-4 size-6 text-primary" aria-hidden />
                <Heading as="h2" size="3">{delivered ? "Delivered — complaints open" : "Not delivered — complaints locked"}</Heading>
                <Text as="p" size="2" mt="2">{s.customerName}</Text>
                <Text as="p" size="1" color="gray" className="font-mono">{s.orderId}</Text>
                <div className="mt-auto pt-5"><Button asChild variant="outline" className="w-full"><Link href={`/customer/${l.access}`}>Open customer portal<ArrowUpRight /></Link></Button></div>
              </div>
            </Panel>
          );
        })}
      </div>
      <Panel title="Standalone complaint app">
        <Text as="p" size="2" color="gray">Customer accounts and the separate complaint submission flow.</Text>
        <Button asChild variant="outline" className="mt-4"><Link href="/customer/complaint">Open complaint app<ArrowUpRight /></Link></Button>
      </Panel>
    </div>
  );
}
