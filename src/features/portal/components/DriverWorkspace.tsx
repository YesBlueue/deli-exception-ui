"use client";
import { useState } from "react";
import Link from "next/link";
import { Text } from "@radix-ui/themes";
import { ATTEMPT_CATEGORIES, CONDITION_CATEGORIES, assignedAt } from "@/core/domain/driver-rules";
import { useDriver } from "@/infrastructure/portal/use-driver";
import { portalRequest } from "@/infrastructure/portal/use-portal";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import {
  Field,
  Notice,
  MetaLine,
  OptionSelect,
  PageHeader,
  ProductMark,
  SiteShell,
  StatGrid,
  StatTile,
  Timeline,
} from "@/shared/ui/patterns";
import {
  DEMO_BANNER_TEXT,
  Panel,
  PortalNav,
  PortalState,
  ProvenanceBadge,
  Quote,
  StatusBadge,
  categoryLabel,
  time,
} from "./shared";
const localTime = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
export function DriverWorkspace() {
  const q = useDriver();
  const [kind, setKind] = useState("ATTEMPT");
  const [category, setCategory] = useState("CUSTOMER_UNAVAILABLE");
  const [occurred, setOccurred] = useState(() => localTime(new Date()));
  const [delivery, setDelivery] = useState("");
  const [details, setDetails] = useState("");
  const [correction, setCorrection] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const s = q.data;
  const at = new Date(occurred).getTime();
  const assignments = (s?.assignments ?? []).filter(
    (a) => Number.isFinite(at) && assignedAt(a, a.driver_id, new Date(at).toISOString()),
  );
  const choices = [
    ...new Map(
      assignments.map((a) => [
        a.delivery_id,
        { value: a.delivery_id, label: `${a.order_reference} · ${a.provenance}` },
      ]),
    ).values(),
  ];
  async function submit() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (!Number.isFinite(at)) throw new Error("Enter the occurrence time");
      const result = await q.command(correction ? "correct" : "submit", {
        reportId: correction,
        kind,
        category,
        occurredAt: new Date(at).toISOString(),
        deliveryId: kind === "ATTEMPT" ? delivery : null,
        scopeIds: kind === "CONDITION" && delivery ? [delivery] : [],
        details,
      });
      const reportId = String(result["reportId"]);
      setNotice(`Report received: ${reportId}. Operations will review it.`);
      setDetails("");
      setCorrection(null);
      setFile(null);
      if (file) {
        const form = new FormData();
        form.set("reportId", reportId);
        form.set("file", file);
        try {
          await portalRequest("/api/driver/evidence", { method: "POST", body: form });
        } catch (e) {
          setError(
            `Report saved. Evidence upload failed: ${e instanceof Error ? e.message : "Try uploading again below."}`,
          );
        }
      }
      await q.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <SiteShell
      width="md"
      brand={<ProductMark section="Driver reporting" />}
      headerAside={<PortalNav />}
      banner={DEMO_BANNER_TEXT}
    >
      {!s ? (
        <PortalState loading={q.isPending} error={q.error} retry={() => void q.refetch()} />
      ) : !s.isDriver ? (
        <Notice tone="error" role="alert">
          Active driver membership required.
        </Notice>
      ) : (
        <div className="space-y-6">
          <PageHeader
            title="Report delivery problems"
            description="Report exceptions and conditions. Delivery execution and assignments stay in the existing delivery system."
          />
          <StatGrid label="Driver reporting summary">
            <StatTile
              label="Assigned now"
              value={
                s.assignments.filter((a) => assignedAt(a, a.driver_id, new Date().toISOString()))
                  .length
              }
            />
            <StatTile label="Your reports" value={s.reports.length} />
          </StatGrid>
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
          <Panel title={correction ? "Correct your report" : "New report"}>
            <Field label="Report type" htmlFor="driver-kind">
              <OptionSelect
                id="driver-kind"
                value={kind}
                disabled={!!correction}
                onValueChange={(v) => {
                  setKind(v);
                  setCategory(v === "ATTEMPT" ? "CUSTOMER_UNAVAILABLE" : "CONGESTION");
                  setDelivery("");
                }}
                options={[
                  { value: "ATTEMPT", label: "Delivery attempt exception" },
                  { value: "CONDITION", label: "Route condition" },
                ]}
              />
            </Field>
            <Field label="Category" htmlFor="driver-category">
              <OptionSelect
                id="driver-category"
                value={category}
                onValueChange={setCategory}
                options={Object.entries(
                  kind === "ATTEMPT" ? ATTEMPT_CATEGORIES : CONDITION_CATEGORIES,
                ).map(([value, label]) => ({ value, label }))}
              />
            </Field>
            <Field
              label="When did it occur?"
              htmlFor="driver-time"
              hint="Local time, within the last seven days. Historical assignments determine the eligible packages."
            >
              <Input
                id="driver-time"
                type="datetime-local"
                value={occurred}
                onChange={(e) => {
                  setOccurred(e.target.value);
                  if (!correction) setDelivery("");
                }}
              />
            </Field>
            <Field
              label={kind === "ATTEMPT" ? "Assigned package at that time" : "Condition scope"}
              htmlFor="driver-delivery"
            >
              <OptionSelect
                id="driver-delivery"
                value={delivery}
                disabled={!!correction && kind === "ATTEMPT"}
                onValueChange={setDelivery}
                emptyLabel={
                  kind === "CONDITION"
                    ? "All my packages assigned at occurrence"
                    : "Choose a package"
                }
                options={choices}
              />
            </Field>
            {!choices.length && (
              <Notice tone="warning" role="status">
                No assignment history is available at this time. Check the time or ask operations to
                correct the source history.
              </Notice>
            )}
            <Field label="What happened?" htmlFor="driver-details">
              <Textarea
                id="driver-details"
                rows={4}
                maxLength={4000}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </Field>
            <Field
              label="Optional private image"
              htmlFor="driver-image"
              hint="JPEG, PNG or WebP, up to 2 MB. Only you and operations can access it."
            >
              <Input
                id="driver-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </Field>
            <Button
              disabled={
                busy ||
                details.trim().length < 10 ||
                !choices.length ||
                (kind === "ATTEMPT" && !delivery)
              }
              onClick={() => void submit()}
            >
              {busy ? "Submitting…" : "Submit report"}
            </Button>
            {correction && (
              <Button
                variant="outline"
                onClick={() => {
                  setCorrection(null);
                  setDetails("");
                }}
              >
                Cancel correction
              </Button>
            )}
          </Panel>
          <Panel title="Assignment history">
            <Timeline
              empty="No assignments yet. A trusted administrator must supply demo or source assignment history."
              items={s.assignments.map((a) => ({
                key: a.id,
                body: (
                  <span className="flex flex-wrap items-center gap-2">
                    <Text weight="bold" className="font-mono">
                      {a.order_reference}
                    </Text>
                    {a.provenance === "DEMO" && <ProvenanceBadge provenance={a.provenance} />}
                  </span>
                ),
                time: (
                  <>
                    {time(a.valid_from)} – {a.valid_to ? time(a.valid_to) : "ongoing"}
                  </>
                ),
              }))}
            />
          </Panel>
          {s.reports.map((r) => (
            <Panel key={r.id} title={categoryLabel(r.category)}>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={r.state} />
                  <MetaLine
                    items={[`Occurred ${time(r.occurred_at)}`, `Received ${time(r.received_at)}`]}
                  />
                </div>
                <Quote>{r.details}</Quote>
                <MetaLine
                  items={[
                    <span key="id" className="font-mono">
                      {r.id}
                    </span>,
                  ]}
                />
              </div>
              {r.correction_reason && (
                <Notice tone="warning" role="status">
                  Correction requested: {r.correction_reason}
                </Notice>
              )}
              {r.state === "NEEDS_CORRECTION" && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setCorrection(r.id);
                    setKind(r.kind);
                    setCategory(r.category);
                    setOccurred(localTime(new Date(r.occurred_at)));
                    setDelivery(r.delivery_id ?? r.scope_ids[0] ?? "");
                    setDetails(r.details);
                  }}
                >
                  Correct report
                </Button>
              )}
              {s.evidence
                .filter((e) => e.report_id === r.id)
                .map((e) => (
                  <Link
                    key={e.id}
                    href={`/api/driver/evidence?id=${e.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-6 items-center break-words text-primary underline"
                  >
                    {e.original_filename}
                  </Link>
                ))}
              <DriverEvidenceRetry reportId={r.id} refresh={() => void q.refetch()} />
            </Panel>
          ))}
        </div>
      )}
    </SiteShell>
  );
}
function DriverEvidenceRetry({ reportId, refresh }: { reportId: string; refresh: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  async function upload() {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("reportId", reportId);
      form.set("file", file);
      await portalRequest("/api/driver/evidence", { method: "POST", body: form });
      setFailed(false);
      setMessage("Evidence saved.");
      setFile(null);
      refresh();
    } catch (e) {
      setFailed(true);
      setMessage(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details>
      <summary className="cursor-pointer text-primary">Add or retry evidence</summary>
      <div className="mt-3 space-y-3">
        <Field label="Private image" htmlFor={`retry-${reportId}`}>
          <Input
            id={`retry-${reportId}`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Field>
        <Button variant="outline" disabled={!file || busy} onClick={() => void upload()}>
          Upload evidence
        </Button>
        {message && (
          <Notice tone={failed ? "error" : "success"} role={failed ? "alert" : "status"}>
            {message}
          </Notice>
        )}
      </div>
    </details>
  );
}
