"use client";

import { Heading, Text } from "@radix-ui/themes";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Field, PhotoThumb, Timeline } from "@/shared/ui/patterns";
import { Textarea } from "@/shared/ui/textarea";
import { COMPLAINT_CATEGORIES } from "@/core/domain/customer";
import { CURRENT_USER } from "@/core/domain/config";
import { addInternalComplaintNote, updatePlatformData } from "@/infrastructure/demo-platform/platform";
import { fmtTime } from "@/features/exceptions/components/badges";
import { ReplyComposer } from "./ReplyComposer";
import type { Complaint, RequestActivity, Shipment } from "@/core/domain/types";

export function ComplaintReview({ complaint, activity, shipment }: { complaint: Complaint; activity: RequestActivity[]; shipment?: Shipment | undefined }) {
  const [note, setNote] = useState("");
  return (
    <div className="space-y-6">
      <div>
        <Text as="p" size="1" color="gray">Post-delivery complaint · {complaint.reference}</Text>
        <Heading as="h2" size="5" mt="1">{COMPLAINT_CATEGORIES[complaint.category]}</Heading>
        <Text as="p" size="2" mt="3" className="whitespace-pre-wrap break-words">{complaint.description}</Text>
        <Text as="p" size="1" color="gray" mt="2">Submitted {fmtTime(complaint.submittedAt)}</Text>
      </div>
      {complaint.photos.length > 0 && <div className="flex flex-wrap gap-3">{complaint.photos.map((p, i) => <PhotoThumb key={i} src={p.dataUrl} alt={p.name} size="lg" />)}</div>}
      <ReplyComposer complaint={complaint} shipment={shipment} />
      <div className="space-y-2">
        <Field label="Internal staff note" htmlFor="internal-note">
          <Textarea id="internal-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="Investigation details — not visible to the customer" />
        </Field>
        <Button variant="secondary" onClick={() => { const r = updatePlatformData((db) => addInternalComplaintNote(db, complaint.id, note, CURRENT_USER)); if (!r.ok) toast.error(r.error); else { toast.success("Internal note saved"); setNote(""); } }}>Save internal note</Button>
      </div>
      <Activity activity={activity} />
    </div>
  );
}

function Activity({ activity }: { activity: RequestActivity[] }) {
  return (
    <section className="border-t pt-4">
      <Heading as="h3" size="3" mb="1">Activity history</Heading>
      <div className="-mx-4">
        <Timeline
          empty="No staff activity recorded yet."
          items={[...activity].reverse().map((a) => ({
            key: a.id,
            time: <time dateTime={a.at}>{fmtTime(a.at)}</time>,
            meta: <>· <span>{a.actor}</span></>,
            body: (
              <>
                <p>{a.text}</p>
                {a.internalNote && (
                  <div className="mt-2 rounded-md bg-muted p-3">
                    <Text as="span" size="1" weight="medium" color="gray" className="mb-1 block">Internal only</Text>
                    <span className="whitespace-pre-wrap break-words">{a.internalNote}</span>
                  </div>
                )}
              </>
            ),
          }))}
        />
      </div>
    </section>
  );
}
