"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { CustomerAccountForm } from "@/features/customer-auth/components/CustomerAccountForm";
import { useCustomerAuth } from "@/features/customer-auth/components/CustomerAuthProvider";
import { ArrowLeft, Camera, CheckCircle2, ImagePlus, Loader2, PackageSearch, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  COMPLAINT_APP_CATEGORIES,
  COMPLAINT_APP_CONFIG,
  formatSubmissionTime,
  lookupOrderAsync,
  photoRequired,
  submitComplaintAsync,
  validateComplaint,
  type ComplaintCategory,
  type ComplaintRecord,
} from "@/infrastructure/demo-platform/platform";
import { usePlatformData, getCustomerHistory, markComplaintSeen, updatePlatformData, ensureDemoOrders } from "@/infrastructure/demo-platform/platform";
import { COMPLAINT_STATUSES } from "@/core/domain/customer";

type Step = "order" | "form" | "done";
interface Photo { name: string; size: number; type: string; dataUrl: string }

export function ComplaintAppView() {
  const { user, loading, mode, logOut } = useCustomerAuth();
  const db = usePlatformData();
  const [record, setRecord] = useState<ComplaintRecord | null>(null);
  const [viewed, setViewed] = useState<string | null>(null);
  const [setupError, setSetupError] = useState("");
  useEffect(() => { if (!user) return; try { ensureDemoOrders(user); setSetupError(""); } catch { setSetupError("Demo orders could not be saved. Allow browser storage and try again."); } }, [user?.id, db?.version, db?.shipments.length]);
  const history = user && db ? getCustomerHistory(db, user.id) : [];
  const unread = history.filter((c) => c.unread).length;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("order");
  const [orderId, setOrderId] = useState("");
  useEffect(() => { setStep("order"); setOrderId(""); setRecord(null); setViewed(null); }, [user?.id]);

  const reset = () => {
    setStep("order");
    setOrderId("");
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    try { await logOut(); } catch { setSetupError("Could not sign out. Please try again."); return; }
    setRecord(null);
    reset();
    router.replace("/customer/complaint");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-4">
          <PackageSearch className="size-5 text-primary" />
          <span className="text-sm font-semibold tracking-tight">Shwe Market Support</span>
          {user && <Button variant="ghost" size="sm" className="ml-auto" onClick={() => void signOut()}>Sign out</Button>}
        </div>
      </header>
      <div className="border-b border-demo/20 bg-demo-soft px-4 py-2 text-center text-xs text-demo">Local Demo Mode — fictional complaint records{mode === "demo" && <p className="mt-1 font-semibold">Demo sign-in (simulated) — not production security</p>}</div>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:py-12">
        {setupError && <p role="alert" className="mb-4 text-sm text-destructive">{setupError}</p>}
        {loading ? <Loader2 className="mx-auto animate-spin text-muted-foreground" aria-label="Loading account" /> : !user ? <CustomerAccountForm onAuthenticated={reset} /> : <div key={user.id}>
        {unread > 0 && <div role="status" className="mb-6 border-l-4 border-primary bg-accent p-4"><p className="text-sm font-semibold">You have {unread} new update(s) from support</p><Button variant="link" className="px-0" onClick={() => document.getElementById("complaint-history")?.scrollIntoView({ behavior: "smooth" })}>View updates</Button></div>}
        {step === "order" && (
          <OrderStep customerId={user.id}
            onFound={(id) => {
              setOrderId(id);
              setStep("form");
            }}
          />
        )}
        {step === "form" && (
          <ComplaintStep customerId={user.id}
            orderId={orderId}
            onBack={() => setStep("order")}
            onSubmitted={(saved) => { setRecord(saved); setStep("done"); }}
          />
        )}
        {step === "done" && <ConfirmationStep record={record} onReset={reset} />}
        <section id="complaint-history" className="mt-10 border-t pt-6"><h2 className="text-lg font-semibold">Your complaints</h2>{history.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No complaints submitted yet.</p> : <div className="mt-3 divide-y">{history.map((c) => <article key={c.id} className="py-4"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-semibold">{c.reference}</span><span className="rounded border bg-muted px-2 py-1 text-xs">{COMPLAINT_STATUSES[c.status]}</span>{c.unread && <span className="rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">New</span>}</div><p className="mt-2 text-sm">{c.orderId} · {COMPLAINT_APP_CATEGORIES[c.category]}</p><p className="mt-1 text-xs text-muted-foreground">{formatSubmissionTime(c.submittedAt)}</p><Button variant="link" className="px-0" onClick={() => { setViewed(viewed === c.id ? null : c.id); updatePlatformData((data) => markComplaintSeen(data, user.id, c.id)); }}>View complaint</Button>{viewed === c.id && <div className="space-y-3 border-l-2 border-primary pl-3"><p className="whitespace-pre-wrap break-words text-sm">{c.description}</p><p className="whitespace-pre-wrap break-words text-sm font-medium">{c.customerResponse || "Awaiting a support response."}</p><div className="flex flex-wrap gap-2">{c.photos.map((p, i) => <img key={i} src={p.dataUrl} alt={p.name} className="size-20 rounded border object-cover" />)}</div></div>}</article>)}</div>}</section>
        </div>}
      </main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Order lookup and complaint submissions are simulated. Cloud and demo accounts are separate.
      </footer>
    </div>
  );
}

function OrderStep({ customerId, onFound }: { customerId: string; onFound: (orderId: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    setError("");
    setChecking(true);
    try { const result = await lookupOrderAsync(customerId, value); if (result.ok) onFound(result.orderId); else setError(result.message); }
    catch { setError("Unable to read demo orders. Please try again."); }
    finally { setChecking(false); }
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Report an Order Problem</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something wrong with your delivery? Tell us here and our support team will look into it.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="order-id">Order ID</Label>
        <Input
          id="order-id"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. ORD-24081"
          autoComplete="off"
          className="h-12 font-mono"
          aria-describedby="order-id-help"
        />
        <p id="order-id-help" className="text-xs text-muted-foreground">
          You can find it in your order confirmation, for example <span className="font-mono">ORD-24081</span>.
        </p>
      </div>
      {error && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="h-12 w-full text-base" disabled={checking}>
        {checking && <Loader2 className="animate-spin" />}
        {checking ? "Checking order…" : "Continue"}
      </Button>
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
        Your order ID is only used to link your complaint to the right order. We don&apos;t share your details.
      </p>
    </form>
  );
}

function ComplaintStep({ customerId, orderId, onBack, onSubmitted }: { customerId: string; orderId: string; onBack: () => void; onSubmitted: (record: ComplaintRecord) => void }) {
  const [category, setCategory] = useState<ComplaintCategory | "">("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const addFiles = async (files: File[]) => {
    setError("");
    if (!files.length) return;
    if (files.length + photos.length > COMPLAINT_APP_CONFIG.maxPhotos) {
      setError(`You can attach up to ${COMPLAINT_APP_CONFIG.maxPhotos} photos.`);
      return;
    }
    const bad = files.find((f) => !COMPLAINT_APP_CONFIG.photoTypes.includes(f.type as (typeof COMPLAINT_APP_CONFIG.photoTypes)[number]));
    if (bad) {
      setError("Photos must be JPEG, PNG or WebP images.");
      return;
    }
    const tooBig = files.find((f) => f.size > COMPLAINT_APP_CONFIG.maxPhotoBytes);
    if (tooBig) {
      setError("Each photo must be 2 MB or smaller.");
      return;
    }
    try {
      const read = await Promise.all(
        files.map(
          (f) =>
            new Promise<Photo>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve({ name: f.name, size: f.size, type: f.type, dataUrl: String(reader.result) });
              reader.onerror = reject;
              reader.readAsDataURL(f);
            }),
        ),
      );
      setPhotos((p) => [...p, ...read]);
    } catch {
      setError("One of the photos could not be read. Please try another image.");
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void addFiles(Array.from(e.dataTransfer.files));
  };

  const submit = async () => {
    setError("");
    if (!category) {
      setError("Please choose a complaint category.");
      return;
    }
    const invalid = validateComplaint({ category, description, photos });
    if (invalid) {
      setError(invalid);
      return;
    }
    setSubmitting(true);
    const result = await submitComplaintAsync(customerId, {
      orderId,
      category,
      description,
      photos,
    });
    setSubmitting(false);
    if (result.ok) {
      onSubmitted({ ...result.record, orderId, unread: false });
    } else {
      setError(result.error);
    }
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">What happened?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Order <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground">{orderId}</span>
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="complaint-category">Complaint category</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as ComplaintCategory)}>
          <SelectTrigger id="complaint-category" className="h-12">
            <SelectValue placeholder="Choose a category…" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(COMPLAINT_APP_CATEGORIES).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="complaint-description">Describe what happened</Label>
        <Textarea
          id="complaint-description"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="For example: the parcel arrived opened and one item was missing…"
        />
        <p className="text-xs text-muted-foreground">Include any details that help our team understand the issue.</p>
      </div>

      <div className="space-y-2">
        <Label>
          Photo evidence{" "}
          {category && photoRequired(category) ? (
            <span className="font-normal text-destructive">(required)</span>
          ) : (
            <span className="font-normal text-muted-foreground">(optional)</span>
          )}
        </Label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`rounded-lg border border-dashed p-4 transition-colors ${dragging ? "border-primary bg-primary/5" : "border-input"}`}
        >
          <div className="flex flex-wrap gap-3">
            {photos.map((p, i) => (
              <div key={i} className="relative">
                <img src={p.dataUrl} alt={p.name} className="size-20 rounded-md border object-cover" />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute -right-2 -top-2 size-6"
                  aria-label={`Remove ${p.name}`}
                  onClick={() => setPhotos(photos.filter((_, n) => n !== i))}
                >
                  <X />
                </Button>
              </div>
            ))}
            {photos.length < COMPLAINT_APP_CONFIG.maxPhotos && (
              <Button type="button" variant="outline" className="h-20 border-dashed" onClick={() => fileInput.current?.click()}>
                <ImagePlus />
                Add photo
              </Button>
            )}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Camera className="size-3.5" />
            JPEG, PNG or WebP, up to 2 MB each. On desktop you can drag photos here. Photos stay on your device in this demo. A photo is required for damaged package, missing item and wrong item reports.
          </p>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            void addFiles(files);
          }}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" className="h-12 flex-1 text-base" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          {submitting ? "Submitting…" : "Submit Complaint"}
        </Button>
        <Button type="button" variant="ghost" className="h-12" onClick={onBack} disabled={submitting}>
          <ArrowLeft />
          Go Back
        </Button>
      </div>
    </form>
  );
}

function ConfirmationStep({ record, onReset }: { record: ComplaintRecord | null; onReset: () => void }) {
  if (!record) return null;
  return (
    <div className="space-y-6 text-center">
      <CheckCircle2 className="mx-auto size-14 text-success" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your Complaint Has Been Submitted</h1>
        <p className="mt-2 text-sm text-muted-foreground">Thank you — the seller&apos;s support team will review your complaint and follow up.</p>
      </div>
      <dl className="space-y-3 rounded-lg border bg-card p-5 text-left text-sm shadow-card">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Reference</dt>
          <dd className="font-mono font-semibold text-primary">{record.reference}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Order</dt>
          <dd className="font-mono">{record.orderId}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Category</dt>
          <dd>{COMPLAINT_APP_CATEGORIES[record.category]}</dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="shrink-0 text-muted-foreground">Report submitted</dt>
          <dd className="text-right">{formatSubmissionTime(record.submittedAt)}</dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="shrink-0 text-muted-foreground">Description</dt>
          <dd className="min-w-0 whitespace-pre-wrap break-words text-right">{record.description}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Photo evidence</dt>
          <dd>{record.photos.length > 0 ? `${record.photos.length} photo${record.photos.length > 1 ? "s" : ""} attached` : "None attached"}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">Keep your reference number — the support team may ask for it.</p>
      <Button className="h-12 w-full text-base" onClick={onReset}>
        Submit Another Complaint
      </Button>
    </div>
  );
}
