"use client";
import { useState } from "react";
import { Text } from "@radix-ui/themes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { portalRequest } from "@/infrastructure/portal/use-portal";
import type { DeliveryUpdate } from "@/infrastructure/portal/driver-types";
import { Button } from "@/shared/ui/button";
import { Notice, Timeline } from "@/shared/ui/patterns";
import { Panel, Tag, time } from "./shared";
export function DeliveryUpdates({
  orders,
}: {
  orders: { id: string; seller_order_reference: string | null }[];
}) {
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const q = useQuery<DeliveryUpdate[]>({
    queryKey: ["delivery-updates"],
    queryFn: () => portalRequest("/api/delivery-updates"),
    retry: false,
    refetchInterval: 30000,
  });
  async function read(id: string) {
    setBusy(true);
    setError("");
    try {
      await portalRequest("/api/driver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seen_update", input: { id } }),
      });
      await cache.invalidateQueries({ queryKey: ["delivery-updates"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to mark update read");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel title="Delivery updates">
      {(q.error || error) && (
        <Notice tone="error" role="alert">
          {error || q.error?.message}
        </Notice>
      )}
      {q.isPending ? (
        <Text as="p" size="2" role="status">
          Loading delivery updates…
        </Text>
      ) : (
        <Timeline
          empty="Reviewed delivery updates will appear here, even when you have not submitted a report."
          items={(q.data ?? []).map((u) => ({
            key: u.id,
            time: time(u.published_at),
            body: (
              <div className="space-y-3">
                <Text as="p" size="2" weight="medium">
                  {orders.find((o) => o.id === u.delivery_id)?.seller_order_reference ??
                    "Authorized order"}{" "}
                  {!u.read_at && <Tag>New update</Tag>}
                </Text>
                <Text as="p" size="2" className="whitespace-pre-wrap break-words">
                  {u.body}
                </Text>
                {!u.read_at && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void read(u.id)}
                  >
                    Mark as read
                  </Button>
                )}
              </div>
            ),
          }))}
        />
      )}
    </Panel>
  );
}
