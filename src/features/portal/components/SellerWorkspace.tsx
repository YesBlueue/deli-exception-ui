"use client";
import { usePortal } from "@/infrastructure/portal/use-portal";
import { DemoBanner, Panel, PortalHeader, PortalState, Tag, friendly, time } from "./shared";
export function SellerWorkspace() {
  const q = usePortal();
  const s = q.data;
  return (
    <div className="min-h-screen bg-background">
      <PortalHeader title="Delivery company · Seller updates" />
      <DemoBanner />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        {!s ? (
          <PortalState loading={q.isPending} error={q.error} retry={() => void q.refetch()} />
        ) : !s.sellerId ? (
          <Panel title="Seller access required">
            <p className="text-sm text-muted-foreground">
              An administrator must associate this account with a seller on the backend.
            </p>
          </Panel>
        ) : (
          <>
            <header>
              <h1 className="text-2xl font-semibold">
                {s.sellers.find((v) => v.id === s.sellerId)?.name} · Exception updates
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Relevant exceptions and refund information for your shop. Delivery creation remains
                in the existing delivery system.
              </p>
            </header>
            <Panel title="Your relevant exceptions">
              <div className="divide-y">
                {s.sellerExceptions.map((e) => (
                  <article key={e.id} className="space-y-2 py-4">
                    <p className="font-mono text-sm font-semibold">{e.order_reference}</p>
                    <p className="text-sm">{friendly(e.exception_type)}</p>
                    <div className="flex gap-2">
                      <Tag>{friendly(e.status)}</Tag>
                      <Tag>{e.provenance}</Tag>
                    </div>
                    <p className="text-xs text-muted-foreground">Opened {time(e.detected_at)}</p>
                  </article>
                ))}
                {!s.sellerExceptions.length && (
                  <p className="text-sm text-muted-foreground">No relevant exceptions.</p>
                )}
              </div>
            </Panel>
            <Panel title="Seller updates and refund handoffs">
              <div className="divide-y">
                {s.updates
                  .filter((u) => u.seller_id === s.sellerId)
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .map((u) => (
                    <article key={u.id} className="space-y-2 py-4">
                      <h3 className="text-sm font-semibold">{u.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {s.orders.find((o) => o.id === u.delivery_job_id)?.seller_order_reference} ·{" "}
                        {time(u.created_at)}
                      </p>
                      <p className="whitespace-pre-wrap break-words text-sm">{u.body}</p>
                    </article>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Refund discussions with customers and payment execution take place outside this
                system. A handoff is not a refund approval.
              </p>
            </Panel>
          </>
        )}
      </main>
    </div>
  );
}
