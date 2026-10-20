import { useState } from "react";
import { MapPin, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requestAddress, updatePlatformData } from "@/lib/services/platform";
import type { Address } from "@/lib/demo/types";
const FIELDS = [{ key: "recipient", label: "Recipient name", auto: "name", max: 80 }, { key: "phone", label: "Phone number", auto: "tel", max: 20 }, { key: "street", label: "Street address", auto: "street-address", max: 160 }, { key: "township", label: "Township", auto: "address-level3", max: 60 }, { key: "city", label: "City", auto: "address-level2", max: 60 }] as const;
export function AddressRequestForm({ access, address, onClose }: { access: string; address: Address; onClose: () => void }) {
  const [values, setValues] = useState(address);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  if (done) return <div className="py-8 text-center"><CheckCircle2 className="mx-auto mb-3 size-10 text-success" /><h3 className="text-xl font-semibold">Address request received</h3><p className="mt-2 text-sm text-muted-foreground">Your request is pending carrier confirmation. Your delivery address has not changed yet.</p><Button className="mt-5" onClick={onClose}>Back to your delivery</Button></div>;
  return <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); const r = updatePlatformData((db) => requestAddress(db, access, values)); if (!r.ok) setError(r.error); else setDone(true); }}>
    <div className="flex items-center gap-2"><MapPin className="size-5 text-primary" /><h3 className="text-lg font-semibold">Request an address change</h3></div>
    <p className="text-sm text-muted-foreground">We’ll send your request for review. The carrier must confirm the new address before it can be used.</p>
    <div className="grid gap-4 sm:grid-cols-2">{FIELDS.map(({ key, label, auto, max }) => <div key={key} className={`space-y-1.5 ${key === "street" ? "sm:col-span-2" : ""}`}><Label htmlFor={`address-${key}`}>{label}</Label><Input id={`address-${key}`} required maxLength={max} autoComplete={auto} inputMode={key === "phone" ? "tel" : undefined} className="h-11" value={values[key]} onChange={(e) => setValues({ ...values, [key]: e.target.value })} /></div>)}</div>
    <div className="space-y-1.5"><Label htmlFor="address-instructions">Delivery instructions <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="address-instructions" maxLength={200} value={values.instructions ?? ""} onChange={(e) => setValues({ ...values, instructions: e.target.value })} placeholder="Building entrance, floor or landmark" /></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2"><Button type="submit" className="h-11">Submit address request</Button><Button type="button" variant="ghost" className="h-11" onClick={onClose}>Cancel</Button></div>
  </form>;
}