import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CustomerAccountForm } from "@/components/customer/CustomerAccountForm";
import { useCustomerAuth } from "@/components/customer/CustomerAuthProvider";
import { ArrowLeft, Camera, CheckCircle2, ImagePlus, Loader2, PackageSearch, ShieldCheck, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
} from "@/lib/demo/complaint-app";

export const Route = createFileRoute("/customer/complaint")({
  head: () => ({
    meta: [
      { title: "Report an Order Problem — Shwe Market Support" },
      { name: "description", content: "Sign in or create a customer account to report an order problem to Shwe Market Support." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Report an Order Problem — Shwe Market Support" },
      { property: "og:description", content: "Submit a complaint about your order in a few steps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomerComplaintApp,
});

type Step = "order" | "form" | "done";
interface Photo { name: string; size: number; type: string; dataUrl: string }

function CustomerComplaintApp() {
  const { user, loading } = useCustomerAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("order");
  const [orderId, setOrderId] = useState("");

  const reset = () => {
    setStep("order");
    setOrderId("");
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) return;
    lastSubmission = null;
    reset();
    await navigate({ to: "/customer/complaint", replace: true });
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
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:py-12">
        {loading ? <Loader2 className="mx-auto animate-spin text-muted-foreground" aria-label="Loading account" /> : !user ? <CustomerAccountForm /> : <div key={user.id}>
        {step === "order" && (
          <OrderStep
            onFound={(id) => {
              setOrderId(id);
              setStep("form");
            }}
          />
        )}
        {step === "form" && (
          <ComplaintStep
            orderId={orderId}
            onBack={() => setStep("order")}
            onSubmitted={() => setStep("done")}
          />
        )}
        {step === "done" && <ConfirmationStep onReset={reset} />}
        </div>}
      </main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Order lookup and complaint submissions are simulated. Account access requires phone sign-in to be enabled.
      </footer>
    </div>
  );
}

function OrderStep({ onFound }: { onFound: (orderId: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    setError("");
    setChecking(true);
    const result = await lookupOrderAsync(value);
    setChecking(false);
    if (result.ok) onFound(result.orderId);
    else setError(result.message);
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
        Your order ID is only used to link your complaint to the right order. We don't share your details.
      </p>
    </form>
  );
}

function ComplaintStep({ orderId, onBack, onSubmitted }: { orderId: string; onBack: () => void; onSubmitted: () => void }) {
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
    const invalid = validateComplaint({ category, description, photos: photos.map(({ name, size, type }) => ({ name, size, type })) });
    if (invalid) {
      setError(invalid);
      return;
    }
    setSubmitting(true);
    const result = await submitComplaintAsync({
      orderId,
      category,
      description,
      photos: photos.map(({ name, size, type }) => ({ name, size, type })),
    });
    setSubmitting(false);
    if (result.ok) {
      lastSubmission = result.record;
      onSubmitted();
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

/** Last simulated submission, shown on the confirmation screen. */
let lastSubmission: ComplaintRecord | null = null;


function ConfirmationStep({ onReset }: { onReset: () => void }) {
  const record = lastSubmission;
  if (!record) return null;
  return (
    <div className="space-y-6 text-center">
      <CheckCircle2 className="mx-auto size-14 text-success" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your Complaint Has Been Submitted</h1>
        <p className="mt-2 text-sm text-muted-foreground">Thank you — the seller's support team will review your complaint and follow up.</p>
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
          <dd className="line-clamp-3 text-right">{record.description}</dd>
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
