"use client";

import { Heading } from "@radix-ui/themes";
import { useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Field } from "@/shared/ui/patterns";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { COMPLAINT_STATUSES } from "@/core/domain/customer";
import { CURRENT_USER } from "@/core/domain/config";
import { CARRIERS } from "@/core/domain/carriers";
import { interpolateTemplate, RESPONSE_TEMPLATES } from "@/core/domain/response-templates";
import { applySupportResponse, updatePlatformData } from "@/infrastructure/demo-platform/platform";
import type { Complaint, ComplaintStatus, Shipment } from "@/core/domain/types";
/** Templates only fill the draft; nothing reaches the customer until staff press Send. */
export function ReplyComposer({
  complaint,
  shipment,
}: {
  complaint: Complaint;
  shipment?: Shipment | undefined;
}) {
  const [status, setStatus] = useState<ComplaintStatus>(complaint.status);
  const [draft, setDraft] = useState(complaint.customerResponse);
  const [notes, setNotes] = useState("");
  const carrier = shipment ? (CARRIERS[shipment.carrierId]?.name ?? "our carrier") : "our carrier";
  const vars = {
    customerName: shipment?.customerName.split(" ")[0] ?? "there",
    orderId: shipment?.orderId ?? "",
    reference: complaint.reference,
    reason: notes,
    carrier,
  };
  return (
    <section className="space-y-4 rounded-md border p-4">
      <Heading as="h3" size="3">Reply to customer</Heading>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Quick-insert template">
          <Select
            value=""
            onValueChange={(id) => {
              const t = RESPONSE_TEMPLATES.find((x) => x.id === id);
              if (t) {
                setDraft(interpolateTemplate(t.body, vars));
                setStatus(t.status);
              }
            }}
          >
            <SelectTrigger aria-label="Insert template">
              <SelectValue placeholder="Choose a template" />
            </SelectTrigger>
            <SelectContent>
              {RESPONSE_TEMPLATES.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Key reason / notes" htmlFor="reply-reason">
          <Input
            id="reply-reason"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            placeholder="e.g. photos confirm crushed box"
          />
        </Field>
      </div>
      <Field label="Message to customer" htmlFor="customer-response">
        <Textarea
          id="customer-response"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={7}
          maxLength={2000}
          placeholder="Review and edit before sending"
        />
      </Field>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-44">
          <Field label="Complaint status" htmlFor="review-status">
            <Select value={status} onValueChange={(v) => setStatus(v as ComplaintStatus)}>
              <SelectTrigger id="review-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COMPLAINT_STATUSES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Button
          onClick={() => {
            const r = updatePlatformData((db) =>
              applySupportResponse(db, complaint.reference, draft, status, CURRENT_USER),
            );
            if (!r.ok) toast.error(r.error);
            else toast.success("Sent to customer (simulated)");
          }}
        >
          <Send />
          Send to customer
        </Button>
      </div>
    </section>
  );
}
