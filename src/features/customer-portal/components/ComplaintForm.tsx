"use client";

import { Heading, Text } from "@radix-ui/themes";
import { useRef, useState } from "react";
import { CheckCircle2, ImagePlus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Field, Notice, PhotoThumb } from "@/shared/ui/patterns";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { COMPLAINT_APP_CATEGORIES as COMPLAINT_CATEGORIES, photoRequired } from "@/infrastructure/demo-platform/platform";
import { submitAccessComplaintAsync } from "@/infrastructure/demo-platform/platform";
import type { ComplaintCategory } from "@/core/domain/types";
export function ComplaintForm({ access, onClose }: { access: string; onClose: () => void }) {
  const [category, setCategory] = useState<ComplaintCategory>("DAMAGED");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<{ name: string; dataUrl: string; size: number; type: string }[]>([]);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  if (reference)
    return (
      <div className="py-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 size-10 text-success" />
        <Heading as="h3" size="5">Your complaint has been received</Heading>
        <Text as="p" mt="3" className="font-mono text-primary">{reference}</Text>
        <Text as="p" size="2" color="gray" mt="2">Our team will review your issue. You can check updates here.</Text>
        <Button className="mt-5" onClick={onClose}>View complaint status</Button>
      </div>
    );
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setSaving(true); void submitAccessComplaintAsync(access, { category, description, photos }).then((r) => { if (!r.ok) setError(r.error); else setReference(r.reference); }).finally(() => setSaving(false)); }}>
      <div>
        <Heading as="h3" size="4">Report a delivery issue</Heading>
        <Text as="p" size="2" color="gray" mt="1">Tell us what happened with your delivered order.</Text>
      </div>
      <Field label="Issue category" htmlFor="complaint-category">
        <Select value={category} onValueChange={(v) => setCategory(v as ComplaintCategory)}>
          <SelectTrigger id="complaint-category" className="h-11"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(COMPLAINT_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="What happened?" htmlFor="complaint-description">
        <Textarea id="complaint-description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue and which items were affected…" />
      </Field>
      <Field label={<>Photos <Text weight="regular" color="gray">{photoRequired(category) ? "(required)" : "(optional)"}</Text></>} hint="Up to 3 JPG, PNG or WebP photos, 2 MB each. Saved locally in this prototype.">
        <div className="flex flex-wrap gap-3">
          {photos.map((p, i) => <PhotoThumb key={i} src={p.dataUrl} alt={p.name} onRemove={() => setPhotos(photos.filter((_, n) => n !== i))} />)}
          <Button type="button" variant="ghost" disabled={reading || photos.length >= 3} onClick={() => fileInput.current?.click()} className="h-20 border border-dashed border-input"><ImagePlus />{reading ? "Adding…" : "Add photos"}</Button>
        </div>
      </Field>
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={async (e) => { const files = Array.from(e.target.files ?? []); e.target.value = ""; if (files.length + photos.length > 3 || files.some((f) => f.size > 2 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(f.type))) return setError("Choose up to 3 JPG, PNG or WebP photos, 2 MB each."); setReading(true); try { const results = await Promise.all(files.map((f) => new Promise<{ name: string; dataUrl: string; size: number; type: string }>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ name: f.name, dataUrl: String(reader.result), size: f.size, type: f.type }); reader.onerror = reject; reader.readAsDataURL(f); }))); setPhotos((p) => [...p, ...results]); setError(""); } catch { setError("Could not read this photo."); } finally { setReading(false); } }} />
      {error && <Notice tone="error" role="alert">{error}</Notice>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="h-11" disabled={reading || saving}>{saving ? "Submitting…" : "Submit complaint"}</Button>
        <Button type="button" variant="ghost" className="h-11" disabled={saving} onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}
