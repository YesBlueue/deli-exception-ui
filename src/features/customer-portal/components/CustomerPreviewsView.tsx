"use client";

import Link from "next/link";
import { ArrowUpRight, MessageSquare, PackageCheck } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { usePlatformData } from "@/infrastructure/demo-platform/platform";
export function CustomerPreviewsView() {
  const db = usePlatformData();
  return <div className="mx-auto max-w-5xl"><p className="mb-1 text-xs font-medium uppercase text-primary">Separate customer experience</p><h1 className="text-2xl font-semibold">Customer portal previews</h1><p className="mt-2 text-sm text-muted-foreground">Fictional order links for reviewing the customer support experience — complaints only, no tracking or address changes. No seller account is needed; access security is not connected.</p><div className="mt-8 grid gap-4 md:grid-cols-3">{db?.customerLinks.filter((l) => !l.revoked).map((l) => { const s = db.shipments.find((s) => s.id === l.shipmentId); if (!s) return null; const delivered = s.status === "DELIVERED"; const Icon = delivered ? PackageCheck : MessageSquare; return <article key={l.access} className="flex flex-col rounded-lg border bg-card p-6 shadow-card"><Icon className="mb-6 size-8 text-primary" /><h2 className="text-lg font-semibold">{delivered ? "Delivered — complaints open" : "Not delivered — complaints locked"}</h2><p className="mt-3 text-sm">{s.customerName}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{s.orderId}</p><Button asChild variant="outline" className="mt-6 w-full"><Link href={`/customer/${l.access}`}>Open customer portal<ArrowUpRight /></Link></Button></article>; })}</div><div className="mt-8 rounded-lg border bg-card p-6 shadow-card"><h2 className="text-lg font-semibold">Standalone complaint app</h2><p className="mt-2 text-sm text-muted-foreground">Customer accounts and the separate complaint submission flow.</p><Button asChild variant="outline" className="mt-4"><Link href="/customer/complaint">Open complaint app<ArrowUpRight /></Link></Button></div></div>;
}
