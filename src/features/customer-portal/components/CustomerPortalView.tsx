"use client";

import { useState } from "react";
import { AlertCircle, Clock3, MessageSquare, Package } from "lucide-react";
import { ComplaintForm } from "@/features/customer-portal/components/ComplaintForm";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES } from "@/core/domain/customer";
import { getCustomerOrder, usePlatformData } from "@/infrastructure/demo-platform/platform";
import { fmtTime } from "@/features/exceptions/components/badges";
export function CustomerPortalView({ access }: { access: string }) {
  const db = usePlatformData();
  const [form, setForm] = useState(false);
  const order = db ? getCustomerOrder(db, access) : null;
  const delivered = order?.shipment.status === "DELIVERED";
  return <div className="min-h-screen bg-background">
    <div className="border-b bg-demo-soft px-4 py-2 text-center text-xs text-demo">UI prototype · Fictional data in this browser · Links do not provide production security</div>
    <header className="border-b bg-card"><div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-5"><div className="flex items-center gap-3"><Package className="size-7 text-primary" /><span className="text-xl font-semibold">Shwe Market<span className="ml-1 text-primary">.</span></span></div><span className="text-xs text-muted-foreground sm:text-sm">Order support</span></div></header>
    {!db ? <div className="mx-auto max-w-2xl space-y-4 p-6"><Skeleton className="h-32" /><Skeleton className="h-64" /></div> : !order ? <main className="mx-auto max-w-md px-5 py-20 text-center"><AlertCircle className="mx-auto size-10 text-muted-foreground" /><h1 className="mt-4 text-2xl font-semibold">This order link isn’t available</h1><p className="mt-3 text-muted-foreground">The link may be expired or no longer active. Please ask the seller for a new order link.</p></main> : <main className="mx-auto max-w-2xl px-5 pb-12 pt-8 sm:pt-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="mb-2 text-sm text-muted-foreground">Hello, {order.shipment.customerName}</p><h1 className="text-3xl font-semibold">Order support</h1></div><div className="text-right"><p className="text-xs text-muted-foreground">Order reference</p><p className="mt-1 font-mono text-sm">{order.shipment.orderId}</p></div></div>
      {form ? <div className="border-y py-6"><ComplaintForm access={access} onClose={() => setForm(false)} /></div> : <div className="space-y-8">
        <section className="rounded-lg border bg-card p-5 shadow-card"><h2 className="text-lg font-semibold">Something wrong with your delivery?</h2><p className="mt-2 text-sm text-muted-foreground">{delivered ? "Let us know if something wasn’t right with your delivery — damaged, missing or incorrect items." : "You can report damaged, missing or incorrect items once your parcel is delivered."}</p><Button className="mt-4 h-11 w-full sm:w-auto" variant={delivered ? "default" : "secondary"} disabled={!delivered} onClick={() => setForm(true)}><MessageSquare />Report a delivery issue</Button>{!delivered && <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3" />Available after delivery</p>}</section>
        <section><h2 className="mb-4 text-lg font-semibold">Your complaints</h2>{!order.complaints.length ? <div className="border-y py-10 text-center"><MessageSquare className="mx-auto mb-3 size-7 text-muted-foreground" /><p className="font-medium">No complaints yet</p><p className="mt-1 text-sm text-muted-foreground">Updates from our support team will appear here.</p></div> : <div className="space-y-4">{order.complaints.map((c) => <article key={c.id} className="rounded-lg border bg-card p-5"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{COMPLAINT_CATEGORIES[c.category]}</h3><span className="text-sm font-medium text-primary">{COMPLAINT_STATUSES[c.status]}</span></div><p className="mt-2 font-mono text-xs text-muted-foreground">{c.reference} · {fmtTime(c.submittedAt)}</p><p className="mt-4 whitespace-pre-wrap break-words text-sm">{c.description}</p>{c.customerResponse && <div className="mt-4 border-l-2 border-primary bg-accent p-3"><p className="mb-1 text-xs font-semibold text-primary">Update from Shwe Market</p><p className="whitespace-pre-wrap break-words text-sm">{c.customerResponse}</p></div>}</article>)}</div>}</section>
      </div>}
    </main>}
    <footer className="mx-auto max-w-2xl border-t px-5 py-5 text-xs text-muted-foreground">Shwe Market · Customer order support</footer>
  </div>;
}
