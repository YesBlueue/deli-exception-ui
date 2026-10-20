import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES } from "@/lib/demo/customer";
import { CURRENT_USER } from "@/lib/demo/config";
import { CARRIERS } from "@/lib/demo/carriers";
import { interpolateTemplate, RESPONSE_TEMPLATES } from "@/lib/demo/response-templates";
import { applySupportResponse, updatePlatformData } from "@/lib/services/platform";
import { generateReplyDraft } from "@/lib/ai/reply.functions";
import type { Complaint, ComplaintStatus, Shipment } from "@/lib/demo/types";
const TONES = ["Empathetic", "Professional", "Direct"] as const;
const OUTCOMES = ["Approved", "Rejected", "Need info", "Investigating"] as const;
/** AI and templates only fill the draft; nothing reaches the customer until staff press Send. */
export function ReplyComposer({ complaint, shipment }: { complaint: Complaint; shipment?: Shipment | undefined }) {
  const [status, setStatus] = useState<ComplaintStatus>(complaint.status);
  const [draft, setDraft] = useState(complaint.customerResponse);
  const [notes, setNotes] = useState("");
  const [tone, setTone] = useState<(typeof TONES)[number]>("Empathetic");
  const [outcome, setOutcome] = useState<(typeof OUTCOMES)[number]>("Approved");
  const [busy, setBusy] = useState(false);
  const generate = useServerFn(generateReplyDraft);
  const carrier = shipment ? CARRIERS[shipment.carrierId].name : "our carrier";
  const vars = { customerName: shipment?.customerName.split(" ")[0] ?? "there", orderId: shipment?.orderId ?? "", reference: complaint.reference, reason: notes, carrier };
  async function runAi() {
    setBusy(true);
    try {
      const r = await generate({ data: { category: COMPLAINT_CATEGORIES[complaint.category], description: complaint.description, orderId: vars.orderId, customerName: vars.customerName, reference: complaint.reference, carrier, shipmentStatus: shipment?.status ?? "unknown", outcome, notes, tone } });
      if (r.ok) { setDraft(r.draft); toast.success("Draft ready — review before sending"); } else toast.error(r.error);
    } catch { toast.error("Couldn't reach the AI. Your draft is unchanged."); } finally { setBusy(false); }
  }
  return <section className="space-y-4 rounded-lg border p-4">
    <h3 className="text-sm font-semibold">Reply to customer</h3>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2"><Label>Quick-insert template</Label><Select value="" onValueChange={(id) => { const t = RESPONSE_TEMPLATES.find((x) => x.id === id); if (t) { setDraft(interpolateTemplate(t.body, vars)); setStatus(t.status); } }}><SelectTrigger aria-label="Insert template"><SelectValue placeholder="Choose a template" /></SelectTrigger><SelectContent>{RESPONSE_TEMPLATES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="ai-notes">Key reason / notes</Label><Input id="ai-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="e.g. photos confirm crushed box" /></div>
      <div className="space-y-2"><Label>Decision</Label><Select value={outcome} onValueChange={(v) => setOutcome(v as typeof outcome)}><SelectTrigger aria-label="Decision"><SelectValue /></SelectTrigger><SelectContent>{OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Tone</Label><div className="flex gap-1" role="group" aria-label="Tone">{TONES.map((t) => <Button key={t} type="button" size="sm" variant={tone === t ? "default" : "outline"} onClick={() => setTone(t)}>{t}</Button>)}</div></div>
    </div>
    <Button type="button" variant="secondary" onClick={runAi} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Sparkles />}Generate with AI</Button>
    <div className="space-y-2"><Label htmlFor="customer-response">Message to customer</Label><Textarea id="customer-response" value={draft} onChange={(e) => setDraft(e.target.value)} rows={7} maxLength={2000} placeholder="Review and edit before sending" /></div>
    <div className="flex flex-wrap items-end gap-3"><div className="min-w-44 space-y-2"><Label htmlFor="review-status">Complaint status</Label><Select value={status} onValueChange={(v) => setStatus(v as ComplaintStatus)}><SelectTrigger id="review-status"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(COMPLAINT_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
      <Button onClick={() => { const r = updatePlatformData((db) => applySupportResponse(db, complaint.reference, draft, status, CURRENT_USER)); if (!r.ok) toast.error(r.error); else toast.success("Sent to customer (simulated)"); }}><Send />Send to customer</Button></div>
  </section>;
}
