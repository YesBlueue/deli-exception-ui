import { useRef, useState } from "react";
import { CheckCircle2, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMPLAINT_CATEGORIES } from "@/lib/demo/customer";
import { submitComplaint, updatePlatformData } from "@/lib/services/platform";
import type { ComplaintCategory } from "@/lib/demo/types";
export function ComplaintForm({ access, onClose }: { access: string; onClose: () => void }) {
  const [category, setCategory] = useState<ComplaintCategory>("DAMAGED");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<{ name: string; dataUrl: string }[]>([]);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [reading, setReading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  if (reference) return <div className="py-8 text-center"><CheckCircle2 className="mx-auto mb-3 size-10 text-success" /><h3 className="text-xl font-semibold">Your complaint has been received</h3><p className="mt-3 font-mono text-primary">{reference}</p><p className="mt-2 text-sm text-muted-foreground">Our team will review your issue. You can check updates here.</p><Button className="mt-5" onClick={onClose}>View complaint status</Button></div>;
  return <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); try { const r = updatePlatformData((db) => submitComplaint(db, access, { category, description, photos })); if (!r.ok) setError(r.error); else setReference(r.reference); } catch { setError("The photos could not be saved in this browser. Try fewer or smaller photos."); } }}>
    <h3 className="text-lg font-semibold">Report a delivery issue</h3><p className="text-sm text-muted-foreground">Tell us what happened with your delivered order.</p>
    <div className="space-y-1.5"><Label htmlFor="complaint-category">Issue category</Label><Select value={category} onValueChange={(v) => setCategory(v as ComplaintCategory)}><SelectTrigger id="complaint-category" className="h-11"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(COMPLAINT_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
    <div className="space-y-1.5"><Label htmlFor="complaint-description">What happened?</Label><Textarea id="complaint-description" rows={4} maxLength={2000} minLength={10} required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue and which items were affected…" /><p className="text-right text-xs text-muted-foreground">{description.length}/2,000</p></div>
    <div className="space-y-2"><Label>Photos <span className="font-normal text-muted-foreground">(optional)</span></Label><div className="flex flex-wrap gap-3">{photos.map((p, i) => <div key={i} className="relative"><img src={p.dataUrl} alt={p.name} className="size-20 rounded-md border object-cover" /><Button type="button" size="icon" variant="secondary" className="absolute -right-2 -top-2 size-6" aria-label={`Remove ${p.name}`} onClick={() => setPhotos(photos.filter((_, n) => n !== i))}><X /></Button></div>)}<Button type="button" variant="outline" disabled={reading || photos.length >= 3} onClick={() => fileInput.current?.click()} className="h-20 border-dashed"><ImagePlus />{reading ? "Adding…" : "Add photos"}</Button></div><p className="text-xs text-muted-foreground">Up to 3 JPG, PNG or WebP photos, 1 MB each. Saved locally in this prototype.</p>
    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={async (e) => { const files = Array.from(e.target.files ?? []); e.target.value = ""; if (files.length + photos.length > 3 || files.some((f) => f.size > 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(f.type))) return setError("Choose up to 3 JPG, PNG or WebP photos, 1 MB each."); setReading(true); try { const results = await Promise.all(files.map((f) => new Promise<{ name: string; dataUrl: string }>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ name: f.name, dataUrl: String(reader.result) }); reader.onerror = reject; reader.readAsDataURL(f); }))); setPhotos((p) => [...p, ...results]); setError(""); } catch { setError("Could not read this photo."); } finally { setReading(false); } }} /></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2"><Button type="submit" className="h-11" disabled={reading}>Submit complaint</Button><Button type="button" variant="ghost" className="h-11" onClick={onClose}>Cancel</Button></div>
  </form>;
}