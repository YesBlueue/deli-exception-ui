"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Card, Heading, Text } from "@radix-ui/themes";

import { CustomerAccountForm } from "@/features/customer-auth/components/CustomerAccountForm";
import { useCustomerAuth } from "@/features/customer-auth/components/CustomerAuthProvider";
import { ArrowLeft, Camera, CheckCircle2, ImagePlus, Loader2, PackageSearch, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { BrandMark, Field, KeyValueList, Notice, PhotoThumb, SiteShell } from "@/shared/ui/patterns";
import { cn } from "@/shared/utils";
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
    <SiteShell
      width="sm"
      brand={<BrandMark icon={PackageSearch} name="Shwe Market Support" />}
      headerAside={user && <Button variant="ghost" size="sm" onClick={() => void signOut()}>Sign out</Button>}
      banner={<>Local Demo Mode — fictional complaint records{mode === "demo" && <p className="mt-1 font-semibold">Demo sign-in (simulated) — not production security</p>}</>}
      footer="Order lookup and complaint submissions are simulated. Cloud and demo accounts are separate."
    >
      {setupError && <Notice tone="error" role="alert" className="mb-4">{setupError}</Notice>}
      {loading ? <Loader2 className="mx-auto animate-spin text-muted-foreground" aria-label="Loading account" /> : !user ? <CustomerAccountForm onAuthenticated={reset} /> : (
        <div key={user.id}>
          {unread > 0 && (
            <Notice tone="info" role="status" title={`You have ${unread} new update(s) from support`} className="mb-6">
              <Button variant="link" className="px-0" onClick={() => document.getElementById("complaint-history")?.scrollIntoView({ behavior: "smooth" })}>View updates</Button>
            </Notice>
          )}
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
          <section id="complaint-history" className="mt-10 border-t pt-6">
            <Heading as="h2" size="4">Your complaints</Heading>
            {history.length === 0 ? <Text as="p" size="2" color="gray" mt="3">No complaints submitted yet.</Text> : (
              <div className="mt-3 divide-y">
                {history.map((c) => (
                  <article key={c.id} className="py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Text size="2" weight="bold" className="font-mono">{c.reference}</Text>
                      <Badge color="gray" variant="soft">{COMPLAINT_STATUSES[c.status]}</Badge>
                      {c.unread && <Badge color="indigo" variant="solid">New</Badge>}
                    </div>
                    <Text as="p" size="2" mt="2">{c.orderId} · {COMPLAINT_APP_CATEGORIES[c.category]}</Text>
                    <Text as="p" size="1" color="gray" mt="1">{formatSubmissionTime(c.submittedAt)}</Text>
                    <Button variant="link" className="px-0" onClick={() => { setViewed(viewed === c.id ? null : c.id); updatePlatformData((data) => markComplaintSeen(data, user.id, c.id)); }}>View complaint</Button>
                    {viewed === c.id && (
                      <div className="mt-2 space-y-3 border-l-2 border-primary pl-3">
                        <Text as="p" size="2" className="whitespace-pre-wrap break-words">{c.description}</Text>
                        <Text as="p" size="2" weight="medium" className="whitespace-pre-wrap break-words">{c.customerResponse || "Awaiting a support response."}</Text>
                        <div className="flex flex-wrap gap-2">{c.photos.map((p, i) => <PhotoThumb key={i} src={p.dataUrl} alt={p.name} />)}</div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </SiteShell>
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
        <Heading as="h1" size="7">Report an Order Problem</Heading>
        <Text as="p" size="2" color="gray" mt="2">Something wrong with your delivery? Tell us here and our support team will look into it.</Text>
      </div>
      <Field label="Order ID" htmlFor="order-id" hint={<span id="order-id-help">You can find it in your order confirmation, for example <span className="font-mono">ORD-24081</span>.</span>}>
        <Input
          id="order-id"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. ORD-24081"
          autoComplete="off"
          className="h-12 font-mono"
          aria-describedby="order-id-help"
        />
      </Field>
      {error && <Notice tone="error" role="alert">{error}</Notice>}
      <Button type="submit" className="h-12 w-full text-base" disabled={checking}>
        {checking && <Loader2 className="animate-spin" />}
        {checking ? "Checking order…" : "Continue"}
      </Button>
      <Text as="p" size="1" color="gray" className="flex items-start gap-1.5">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
        Your order ID is only used to link your complaint to the right order. We don&apos;t share your details.
      </Text>
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
        <Heading as="h1" size="7">What happened?</Heading>
        <Text as="p" size="2" color="gray" mt="2">
          Order <Badge color="gray" variant="soft" className="font-mono">{orderId}</Badge>
        </Text>
      </div>

      <Field label="Complaint category" htmlFor="complaint-category">
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
      </Field>

      <Field label="Describe what happened" htmlFor="complaint-description" hint="Include any details that help our team understand the issue.">
        <Textarea
          id="complaint-description"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="For example: the parcel arrived opened and one item was missing…"
        />
      </Field>

      <Field
        label={<>Photo evidence{" "}{category && photoRequired(category) ? <Text weight="regular" color="red">(required)</Text> : <Text weight="regular" color="gray">(optional)</Text>}</>}
      >
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn("rounded-md border border-dashed p-4 transition-colors", dragging ? "border-primary bg-accent" : "border-input")}
        >
          <div className="flex flex-wrap gap-3">
            {photos.map((p, i) => <PhotoThumb key={i} src={p.dataUrl} alt={p.name} onRemove={() => setPhotos(photos.filter((_, n) => n !== i))} />)}
            {photos.length < COMPLAINT_APP_CONFIG.maxPhotos && (
              <Button type="button" variant="ghost" className="h-20 border border-dashed border-input" onClick={() => fileInput.current?.click()}>
                <ImagePlus />
                Add photo
              </Button>
            )}
          </div>
          <Text as="p" size="1" color="gray" mt="2" className="flex items-center gap-1.5">
            <Camera className="size-3.5 shrink-0" />
            JPEG, PNG or WebP, up to 2 MB each. On desktop you can drag photos here. Photos stay on your device in this demo. A photo is required for damaged package, missing item and wrong item reports.
          </Text>
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
      </Field>

      {error && <Notice tone="error" role="alert">{error}</Notice>}

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
        <Heading as="h1" size="7">Your Complaint Has Been Submitted</Heading>
        <Text as="p" size="2" color="gray" mt="2">Thank you — the seller&apos;s support team will review your complaint and follow up.</Text>
      </div>
      <Card size="2" className="text-left">
        <KeyValueList
          items={[
            { label: "Reference", value: <span className="font-mono font-semibold text-primary">{record.reference}</span> },
            { label: "Order", value: <span className="font-mono">{record.orderId}</span> },
            { label: "Category", value: COMPLAINT_APP_CATEGORIES[record.category] },
            { label: "Report submitted", value: formatSubmissionTime(record.submittedAt) },
            { label: "Description", value: <span className="whitespace-pre-wrap">{record.description}</span> },
            { label: "Photo evidence", value: record.photos.length > 0 ? `${record.photos.length} photo${record.photos.length > 1 ? "s" : ""} attached` : "None attached" },
          ]}
        />
      </Card>
      <Text as="p" size="1" color="gray">Keep your reference number — the support team may ask for it.</Text>
      <Button className="h-12 w-full text-base" onClick={onReset}>
        Submit Another Complaint
      </Button>
    </div>
  );
}
