import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COMPLAINT_CATEGORIES } from "@/lib/demo/customer";
import { CURRENT_USER } from "@/lib/demo/config";
import { addInternalComplaintNote, updatePlatformData } from "@/lib/services/platform";
import { fmtTime } from "./badges";
import { ReplyComposer } from "./ReplyComposer";
import type { Complaint, RequestActivity, Shipment } from "@/lib/demo/types";
export function ComplaintReview({ complaint, activity, shipment }: { complaint: Complaint; activity: RequestActivity[]; shipment?: Shipment | undefined }) {
  const [note, setNote] = useState("");
  return <div className="space-y-5"><div><p className="text-xs font-medium uppercase text-muted-foreground">Post-delivery complaint · {complaint.reference}</p><h2 className="mt-2 text-xl font-semibold">{COMPLAINT_CATEGORIES[complaint.category]}</h2><p className="mt-3 whitespace-pre-wrap break-words text-sm">{complaint.description}</p><p className="mt-2 text-xs text-muted-foreground">Submitted {fmtTime(complaint.submittedAt)}</p></div>{complaint.photos.length > 0 && <div className="flex flex-wrap gap-3">{complaint.photos.map((p, i) => <a key={i} href={p.dataUrl} target="_blank" rel="noreferrer"><img src={p.dataUrl} alt={p.name} className="size-28 rounded-md border object-cover" /></a>)}</div>}<ReplyComposer complaint={complaint} shipment={shipment} /><div className="space-y-2"><Label htmlFor="internal-note">Internal staff note</Label><Textarea id="internal-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="Investigation details — not visible to the customer" /></div><Button onClick={() => { const r = updatePlatformData((db) => addInternalComplaintNote(db, complaint.id, note, CURRENT_USER)); if (!r.ok) toast.error(r.error); else { toast.success("Internal note saved"); setNote(""); } }}>Save internal note</Button><Activity activity={activity} /></div>;
}
function Activity({ activity }: { activity: RequestActivity[] }) {
  return <section className="border-t pt-5"><h3 className="mb-4 text-sm font-semibold">Activity history</h3>{!activity.length ? <p className="text-sm text-muted-foreground">No staff activity recorded yet.</p> : <ol className="space-y-4 border-l pl-4">{[...activity].reverse().map((a) => <li key={a.id}><p className="text-xs text-muted-foreground">{fmtTime(a.at)} · {a.actor}</p><p className="mt-1 text-sm">{a.text}</p>{a.internalNote && <p className="mt-2 whitespace-pre-wrap break-words bg-muted p-3 text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">Internal only</span>{a.internalNote}</p>}</li>)}</ol>}</section>;
}