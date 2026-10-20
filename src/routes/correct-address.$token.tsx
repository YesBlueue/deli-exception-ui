import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, Link2Off, PackageCheck, ShieldX } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CARRIERS } from "@/lib/demo/carriers";
import { checkToken, submitCorrection } from "@/lib/demo/engine";
import { mutate, useDB } from "@/lib/demo/store";
import type { Address } from "@/lib/demo/types";

export const Route = createFileRoute("/correct-address/$token")({
  head: () => ({
    meta: [
      { title: "Update your delivery address" },
      { name: "description", content: "Submit a delivery address correction for your parcel." },
      { property: "og:title", content: "Update your delivery address" },
      { property: "og:description", content: "Submit a delivery address correction for your parcel." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CorrectAddress,
});

const DELIVERED_MSG = "This package has been marked as delivered, so online address changes are no longer available. Please contact the seller if you need help.";

const STATES = {
  INVALID: { Icon: ShieldX, title: "This link isn't valid", body: "Please check the link from the seller's message, or contact the seller for a new one." },
  EXPIRED: { Icon: Clock, title: "This link has expired", body: "For your security, address links expire. Please contact the seller for a new link." },
  REVOKED: { Icon: Link2Off, title: "This link is no longer active", body: "A newer link may have been sent to you. Please contact the seller if you need help." },
  USED: { Icon: CheckCircle2, title: "A correction was already submitted", body: "We've received an address correction from this link. We'll update you when its status is confirmed." },
  DELIVERED: { Icon: PackageCheck, title: "Package delivered", body: DELIVERED_MSG },
} as const;

type Field = keyof Address;
const FIELDS: { k: Field; label: string; auto?: string; max: number; optional?: boolean }[] = [
  { k: "recipient", label: "Recipient name", auto: "name", max: 80 },
  { k: "phone", label: "Contact phone", auto: "tel", max: 20 },
  { k: "street", label: "Street / address details", auto: "street-address", max: 160 },
  { k: "township", label: "Township", max: 60 },
  { k: "city", label: "City", auto: "address-level2", max: 60 },
];

function validate(v: Address) {
  const e: Partial<Record<Field, string>> = {};
  if (v.recipient.trim().length < 2) e.recipient = "Please enter the recipient's name.";
  if (!/^\+?[0-9 ]{7,15}$/.test(v.phone.trim())) e.phone = "Enter a phone number using digits, e.g. 09 421 556 018.";
  if (v.street.trim().length < 5) e.street = "Please add street, building or house details.";
  if (v.township.trim().length < 2) e.township = "Please enter the township.";
  if (v.city.trim().length < 2) e.city = "Please enter the city.";
  if ((v.instructions ?? "").length > 200) e.instructions = "Keep instructions under 200 characters.";
  return e;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-md space-y-4">
        <div className="text-center text-sm font-semibold text-muted-foreground">Shwe Market</div>
        {children}
        <p className="text-center text-[11px] text-muted-foreground">Prototype page with fictional data.</p>
      </div>
    </div>
  );
}

function CorrectAddress() {
  const { token } = Route.useParams();
  const db = useDB();
  const [values, setValues] = useState<Address | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [lateFail, setLateFail] = useState<keyof typeof STATES | null>(null);

  if (!db) return <Shell><Skeleton className="h-24" /><Skeleton className="h-80" /></Shell>;

  if (done)
    return (
      <Shell>
        <div className="rounded-lg border bg-card p-6 text-center shadow-card">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden />
          <h1 className="mt-3 text-lg font-semibold">Thank you</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your address correction has been submitted. We'll update you when its status is confirmed.</p>
        </div>
      </Shell>
    );

  const check = checkToken(db, token);
  const failure = lateFail ?? (check.ok ? null : check.reason);
  if (failure) {
    const { Icon, title, body } = STATES[failure];
    return (
      <Shell>
        <div className="rounded-lg border bg-card p-6 text-center shadow-card" role="alert">
          <Icon className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
          <h1 className="mt-3 text-lg font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        </div>
      </Shell>
    );
  }

  const s = db.shipments.find((x) => x.id === (check as { shipmentId: string }).shipmentId)!;
  const v = values ?? { ...s.address, instructions: "" };
  const set = (k: Field, val: string) => {
    setValues({ ...v, [k]: val });
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const errs = validate(v);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    const clean: Address = {
      recipient: v.recipient.trim(), phone: v.phone.trim(), street: v.street.trim(),
      township: v.township.trim(), city: v.city.trim(), instructions: v.instructions?.trim() || undefined,
    };
    const r = mutate((d) => submitCorrection(d, token, clean));
    if (r.ok) setDone(true);
    else setLateFail(r.reason);
    setSubmitting(false);
  };

  return (
    <Shell>
      <div className="rounded-lg border bg-card p-5 shadow-card">
        <h1 className="text-lg font-semibold">Update your delivery address</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Order <span className="font-mono">{s.orderId}</span> · {CARRIERS[s.carrierId].name}
        </p>
        <p className="mt-3 rounded-md bg-muted p-3 text-xs text-muted-foreground">
          Submitting sends your correction to the seller. The courier still needs to confirm it, so delivery to the new address isn't guaranteed.
        </p>
      </div>
      <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-lg border bg-card p-5 shadow-card">
        {FIELDS.map((f) => (
          <div key={f.k} className="space-y-1.5">
            <Label htmlFor={f.k}>{f.label}</Label>
            <Input id={f.k} autoComplete={f.auto} maxLength={f.max} value={(v[f.k] as string) ?? ""} onChange={(e) => set(f.k, e.target.value)} aria-invalid={!!errors[f.k]} aria-describedby={`${f.k}-err`} className="h-11" inputMode={f.k === "phone" ? "tel" : undefined} />
            {errors[f.k] && <p id={`${f.k}-err`} className="text-xs text-destructive">{errors[f.k]}</p>}
          </div>
        ))}
        <div className="space-y-1.5">
          <Label htmlFor="instructions">Delivery instructions <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Textarea id="instructions" rows={2} maxLength={200} value={v.instructions ?? ""} onChange={(e) => set("instructions", e.target.value)} placeholder="e.g. Call on arrival, 2nd floor" aria-invalid={!!errors.instructions} />
          {errors.instructions && <p className="text-xs text-destructive">{errors.instructions}</p>}
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>{submitting ? "Submitting…" : "Submit correction"}</Button>
      </form>
    </Shell>
  );
}
