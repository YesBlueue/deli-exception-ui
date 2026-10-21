"use client";

import Link from "next/link";
import { Text } from "@radix-ui/themes";
import { useState } from "react";
import { ArrowUpRight, Inbox } from "lucide-react";
import { ComplaintReview } from "@/features/complaints/components/ComplaintReview";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { ButtonRow, EmptyState, FilterBar, LinkList, PageHeader, Panel, SearchField } from "@/shared/ui/patterns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES } from "@/core/domain/customer";
import { CARRIERS } from "@/core/domain/carriers";
import { ensureCustomerLink, updatePlatformData, usePlatformData } from "@/infrastructure/demo-platform/platform";
import { ago } from "@/features/exceptions/components/badges";

export function ComplaintsView() {
  const db = usePlatformData();
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [access, setAccess] = useState<string | null>(null);
  if (!db) return <Skeleton className="h-96" />;
  const rows = db.complaints.map((c) => ({ id: c.id, shipmentId: c.shipmentId, reference: c.reference, category: c.category, statusCode: c.status, title: COMPLAINT_CATEGORIES[c.category], status: COMPLAINT_STATUSES[c.status], at: c.submittedAt })).map((r) => ({ ...r, shipment: db.shipments.find((s) => s.id === r.shipmentId) })).filter((r) => r.shipment && (category === "all" || r.category === category) && (statusFilter === "all" || r.statusCode === statusFilter) && (!query || `${r.reference} ${r.shipment?.customerId ?? ""} ${r.title} ${r.shipment?.orderId} ${r.shipment?.customerName}`.toLowerCase().includes(query.toLowerCase()))).sort((a, b) => b.at.localeCompare(a.at));
  const active = rows.find((r) => r.id === selected);
  const complaint = db.complaints.find((c) => c.id === active?.id);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader eyebrow="Customer care" title="Customer complaints" description="Post-delivery complaints from customers" />

      <Panel
        title={`${rows.length} complaints`}
        flush
        toolbar={
          <FilterBar search={<SearchField label="Search customer complaints" placeholder="Search reference, customer or order" value={query} onChange={setQuery} />}>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="xl:w-52" aria-label="Filter complaint category"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All categories</SelectItem>{Object.entries(COMPLAINT_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="xl:w-44" aria-label="Filter complaint status"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All statuses</SelectItem>{Object.entries(COMPLAINT_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </FilterBar>
        }
      >
        {!rows.length ? (
          <EmptyState icon={Inbox} title="No matching complaints" />
        ) : (
          <LinkList label="Complaints">
            {rows.map((r) => (
              <ButtonRow key={r.id} selected={r.id === active?.id} onClick={() => { setSelected(r.id); setAccess(null); }}>
                <span className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <span className="min-w-0">
                    <Text as="span" size="1" className="block font-mono text-primary">{r.reference}</Text>
                    <Text as="span" size="2" weight="medium" className="block">{r.title}</Text>
                    <Text as="span" size="1" color="gray" className="mt-0.5 block">{r.shipment?.customerName} · {r.shipment?.orderId}</Text>
                  </span>
                  <span className="text-right">
                    <Text as="span" size="1" weight="medium" className="block text-primary">{r.status}</Text>
                    <Text as="span" size="1" color="gray" className="block">{ago(r.at)}</Text>
                  </span>
                </span>
              </ButtonRow>
            ))}
          </LinkList>
        )}
      </Panel>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent maxWidth="42rem" maxHeight="90vh" className="overflow-y-auto">
          <DialogHeader><DialogTitle>Complaint details</DialogTitle></DialogHeader>
          <section className="min-w-0 pt-4">
            {active?.shipment ? (
              <>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                  <div>
                    <Text as="p" size="2" weight="medium">{active.shipment.customerName} · {active.shipment.orderId}</Text>
                    <Text as="p" size="1" color="gray" mt="1">{CARRIERS[active.shipment.carrierId]?.name ?? active.shipment.carrierId} · Shipment: {active.shipment.status.toLowerCase().replaceAll("_", " ")}</Text>
                  </div>
                  {access ? (
                    <Button asChild size="sm" variant="outline"><Link href={`/customer/${access}`} target="_blank">Open customer view<ArrowUpRight /></Link></Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => { const token = updatePlatformData((d) => ensureCustomerLink(d, active.shipmentId)); setAccess(token); }}>Prepare customer preview<ArrowUpRight /></Button>
                  )}
                </div>
                {complaint && <ComplaintReview key={complaint.id} complaint={complaint} shipment={active.shipment} activity={db.requestActivity.filter((a) => a.requestId === complaint.id)} />}
              </>
            ) : (
              <Text as="p" color="gray" className="py-20 text-center">Select a complaint to review.</Text>
            )}
          </section>
        </DialogContent>
      </Dialog>
    </div>
  );
}
