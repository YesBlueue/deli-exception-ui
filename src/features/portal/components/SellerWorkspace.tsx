"use client";
import { Heading, Text } from "@radix-ui/themes";
import { Inbox } from "lucide-react";
import { usePortal } from "@/infrastructure/portal/use-portal";
import {
  EmptyState,
  MetaLine,
  PageHeader,
  ProductMark,
  RecordSummary,
  SiteShell,
} from "@/shared/ui/patterns";
import {
  DEMO_BANNER_TEXT,
  Panel,
  PortalNav,
  PortalState,
  ProvenanceBadge,
  StatusBadge,
  categoryLabel,
  time,
} from "./shared";
export function SellerWorkspace() {
  const q = usePortal();
  const s = q.data;
  return (
    <SiteShell
      width="lg"
      brand={<ProductMark section="Seller updates" />}
      headerAside={<PortalNav />}
      banner={DEMO_BANNER_TEXT}
    >
      <div className="space-y-6">
        {!s ? (
          <PortalState loading={q.isPending} error={q.error} retry={() => void q.refetch()} />
        ) : !s.sellerId ? (
          <Panel title="Seller access required">
            <Text as="p" size="2" color="gray">
              An administrator must associate this account with a seller on the backend.
            </Text>
          </Panel>
        ) : (
          <>
            <PageHeader
              title={<>{s.sellers.find((v) => v.id === s.sellerId)?.name} · Exception updates</>}
              description="Relevant exceptions and refund information for your shop. Delivery creation remains in the existing delivery system."
            />
            <Panel title="Your relevant exceptions">
              {!s.sellerExceptions.length ? (
                <EmptyState icon={Inbox} title="No relevant exceptions." />
              ) : (
                <div className="divide-y">
                  {s.sellerExceptions.map((e) => (
                    <article key={e.id} className="py-3 first:pt-0 last:pb-0">
                      <RecordSummary
                        title={categoryLabel(e.exception_type)}
                        badges={
                          <>
                            <StatusBadge status={e.status} />
                            {e.provenance === "DEMO" && (
                              <ProvenanceBadge provenance={e.provenance} />
                            )}
                          </>
                        }
                        meta={[
                          <span key="order" className="font-mono text-foreground">
                            {e.order_reference}
                          </span>,
                          `Opened ${time(e.detected_at)}`,
                        ]}
                      />
                    </article>
                  ))}
                </div>
              )}
            </Panel>
            <Panel title="Seller updates and refund handoffs">
              <div className="divide-y">
                {s.updates
                  .filter((u) => u.seller_id === s.sellerId)
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .map((u) => (
                    <article key={u.id} className="space-y-1 py-3 first:pt-0">
                      <Heading as="h3" size="3">
                        {u.title}
                      </Heading>
                      <MetaLine
                        items={[
                          <span key="order" className="font-mono">
                            {
                              s.orders.find((o) => o.id === u.delivery_job_id)
                                ?.seller_order_reference
                            }
                          </span>,
                          time(u.created_at),
                        ]}
                      />
                      <Text as="p" size="2" className="whitespace-pre-wrap break-words">
                        {u.body}
                      </Text>
                    </article>
                  ))}
              </div>
              <Text as="p" size="1" color="gray">
                Refund discussions with customers and payment execution take place outside this
                system. A handoff is not a refund approval.
              </Text>
            </Panel>
          </>
        )}
      </div>
    </SiteShell>
  );
}
