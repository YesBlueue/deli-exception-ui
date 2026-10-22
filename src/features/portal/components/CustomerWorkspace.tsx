"use client";
import { useState } from "react";
import { usePortal, portalRequest } from "@/infrastructure/portal/use-portal";
import { CATEGORY_LABELS, classifyReport } from "@/core/domain/exception-rules";
import { Heading, Text } from "@radix-ui/themes";
import { PackageSearch } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  EmptyState,
  Field,
  MetaLine,
  Notice,
  ProductMark,
  RecordSummary,
  SiteShell,
} from "@/shared/ui/patterns";
import { Textarea } from "@/shared/ui/textarea";
import { cn } from "@/shared/utils";
import { DeliveryUpdates } from "./DeliveryUpdates";
import {
  DEMO_BANNER_TEXT,
  Panel,
  PortalNav,
  PortalState,
  ProvenanceBadge,
  Quote,
  StatusBadge,
  Tag,
  categoryLabel,
  time,
} from "./shared";
export function CustomerWorkspace() {
  const q = usePortal();
  const [selected, setSelected] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const s = q.data;
  const orders = s?.orders.filter((o) => s.customerOrderIds.includes(o.id)) ?? [];
  const reports =
    s?.reports
      .filter((r) => r.customer_user_id === s.user.id)
      .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at)) ?? [];
  const preview = classifyReport(description);
  async function provision() {
    setBusy(true);
    setError("");
    try {
      await q.command("provision_demo");
      setNotice("Your fictional demo orders are ready.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to prepare demo orders");
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (
        files.length > 3 ||
        files.some(
          (f) => f.size > 2097152 || !["image/jpeg", "image/png", "image/webp"].includes(f.type),
        )
      )
        throw new Error("Choose up to three JPEG, PNG or WebP images, 2 MB each.");
      const result = await q.command("submit_report", { deliveryId: selected, description });
      const reportId = String(result["reportId"]);
      // The report is already durable. An attachment failure must not prompt duplicate submission.
      setDescription("");
      setSelected("");
      setFiles([]);
      setOpen(reportId);
      const failed: string[] = [];
      for (const file of files) {
        const form = new FormData();
        form.set("reportId", reportId);
        form.set("file", file);
        try {
          await portalRequest("/api/evidence", { method: "POST", body: form });
        } catch (e) {
          failed.push(e instanceof Error ? e.message : "Image upload failed");
        }
      }
      await q.refetch();
      setNotice("Report saved. Your status and replies will appear below.");
      if (failed.length)
        setError(`Your report was saved, but evidence upload failed: ${failed.join("; ")}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report could not be saved");
    } finally {
      setBusy(false);
    }
  }
  async function view(id: string) {
    setOpen(open === id ? null : id);
    if (open !== id) {
      try {
        await q.command("seen", { reportId: id });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to mark update read");
      }
    }
  }
  return (
    <SiteShell
      width="md"
      brand={<ProductMark section="Customer support" />}
      headerAside={<PortalNav />}
      banner={DEMO_BANNER_TEXT}
    >
      <div className="space-y-6">
        {!s ? (
          <PortalState loading={q.isPending} error={q.error} retry={() => void q.refetch()} />
        ) : (
          <>
            <header>
              <Heading as="h1" size="7">
                Your orders and reports
              </Heading>
              <Text as="p" size="2" color="gray" mt="2">
                Hello, {s.user.name}. Choose an authorized order to report a delivery issue.
              </Text>
            </header>
            {error && (
              <Notice tone="error" role="alert">
                {error}
              </Notice>
            )}
            {notice && (
              <Notice tone="success" role="status">
                {notice}
              </Notice>
            )}
            <DeliveryUpdates orders={orders} />
            {!orders.length ? (
              <Panel title="Prepare your demo orders">
                <Text as="p" size="2" color="gray">
                  This hackathon uses fictional orders from two shops. Preparing a set associates
                  only newly created demo orders with your Google account.
                </Text>
                <Button disabled={busy} onClick={() => void provision()}>
                  Load my demo orders
                </Button>
              </Panel>
            ) : (
              <Panel title="1. Choose an order">
                <div className="grid gap-3 sm:grid-cols-2">
                  {orders.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      aria-pressed={selected === o.id}
                      onClick={() => {
                        setSelected(o.id);
                        setNotice("");
                      }}
                      className={cn(
                        "space-y-2 rounded-md border p-4 text-left transition-colors",
                        selected === o.id ? "border-primary bg-accent" : "bg-card hover:bg-muted",
                      )}
                    >
                      <Text as="span" size="3" weight="bold" className="block font-mono">
                        {o.seller_order_reference}
                      </Text>
                      <Text as="span" size="2" color="gray" className="block">
                        {s.sellers.find((seller) => seller.id === o.seller_id)?.name}
                      </Text>
                      <span className="flex flex-wrap gap-2">
                        <StatusBadge status={o.status} />
                        {o.provenance === "DEMO" && <ProvenanceBadge provenance={o.provenance} />}
                      </span>
                    </button>
                  ))}
                </div>
              </Panel>
            )}
            {selected && (
              <Panel title="2. Tell us what happened">
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submit();
                  }}
                >
                  <Field label="Describe the issue" htmlFor="report-description">
                    <Textarea
                      id="report-description"
                      rows={5}
                      minLength={10}
                      maxLength={4000}
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="For example: My order is delayed and I have not had an update."
                    />
                  </Field>
                  {description.length >= 10 && (
                    <Text as="p" size="1" color="gray">
                      Rule preview: {CATEGORY_LABELS[preview.category]}
                      {preview.needsReview ? " · staff review required" : ""}
                      {preview.refund ? " · refund information will also go to the seller" : ""}.
                      Eligibility and categorization are validated when you submit.
                    </Text>
                  )}
                  <Field
                    label="Supporting photos (optional)"
                    htmlFor="report-photos"
                    hint="Up to 3 images, 2 MB each. Only you and authorized operations staff can view them."
                  >
                    <input
                      id="report-photos"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                      className="block w-full rounded-md border border-dashed border-input p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
                    />
                  </Field>
                  <Button disabled={busy || description.trim().length < 10}>
                    {busy ? "Saving…" : "Submit report"}
                  </Button>
                </form>
              </Panel>
            )}
            <Panel title="Your report history">
              {!reports.length && (
                <EmptyState
                  icon={PackageSearch}
                  title="No reports yet."
                  description="Updates and replies appear here."
                />
              )}
              <div className="divide-y">
                {reports.map((r) => {
                  const replies = s.replies
                    .filter((x) => x.complaint_id === r.id)
                    .sort((a, b) => a.created_at.localeCompare(b.created_at));
                  const history = s.history
                    .filter((x) => x.complaint_id === r.id)
                    .sort((a, b) => a.created_at.localeCompare(b.created_at));
                  const seen = s.reads.find((x) => x.complaint_id === r.id)?.seen_at ?? "";
                  const unread = [
                    ...replies,
                    ...history.filter((entry) => entry.status !== "NEW"),
                  ].some((x) => x.created_at > seen);
                  return (
                    <article key={r.id} className="space-y-4 py-4 first:pt-0 last:pb-0">
                      <RecordSummary
                        title={categoryLabel(r.category)}
                        badges={
                          <>
                            <StatusBadge status={r.status} />
                            {unread && <Tag tone="info">New update</Tag>}
                          </>
                        }
                        meta={[
                          <span key="order" className="font-mono text-foreground">
                            {orders.find((o) => o.id === r.delivery_job_id)?.seller_order_reference}
                          </span>,
                          <span key="ref" className="font-mono">
                            {r.complaint_reference}
                          </span>,
                          `Submitted ${time(r.submitted_at)}`,
                        ]}
                        trailing={
                          <Button size="sm" variant="outline" onClick={() => void view(r.id)}>
                            {open === r.id ? "Hide report" : "View report and replies"}
                          </Button>
                        }
                      />
                      {open === r.id && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Text as="p" size="1" color="gray">
                              You wrote
                            </Text>
                            <Quote>{r.customer_description}</Quote>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {s.attachments
                              .filter((a) => a.complaint_id === r.id)
                              .map((a) => (
                                <a
                                  key={a.id}
                                  href={`/api/evidence?id=${a.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm text-primary underline"
                                >
                                  {a.original_filename}
                                </a>
                              ))}
                          </div>
                          {replies.map((reply) => (
                            <div key={reply.id} className="space-y-2 rounded-md bg-accent p-3">
                              <MetaLine
                                items={[
                                  <Text key="from" weight="bold" className="text-primary">
                                    Reply from operations
                                  </Text>,
                                  time(reply.created_at),
                                ]}
                              />
                              <Text as="p" size="2" className="whitespace-pre-wrap break-words">
                                {reply.body}
                              </Text>
                            </div>
                          ))}
                          {!replies.length && (
                            <Text as="p" size="2" color="gray">
                              Awaiting a staff reply.
                            </Text>
                          )}
                          {history.length > 0 && (
                            <div className="space-y-1">
                              <Text as="p" size="1" weight="medium" color="gray">
                                Status history
                              </Text>
                              <ol className="space-y-1">
                                {history.map((h) => (
                                  <li key={h.id}>
                                    <MetaLine items={[time(h.created_at), h.description]} />
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </Panel>
          </>
        )}
      </div>
    </SiteShell>
  );
}
