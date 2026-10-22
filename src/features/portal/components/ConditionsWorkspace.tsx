"use client";
import { useState } from "react";
import { Text } from "@radix-ui/themes";
import { useDriver } from "@/infrastructure/portal/use-driver";
import { portalRequest } from "@/infrastructure/portal/use-portal";
import type { ImpactDecision, NotificationReview } from "@/infrastructure/portal/driver-types";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Textarea } from "@/shared/ui/textarea";
import {
  DataTable,
  Field,
  KeyValueList,
  Notice,
  OptionSelect,
  PageHeader,
  StatGrid,
  StatTile,
} from "@/shared/ui/patterns";
import {
  Panel,
  PortalState,
  ProvenanceBadge,
  Quote,
  StatusBadge,
  categoryLabel,
  friendly,
  time,
} from "./shared";
export function ConditionsWorkspace() {
  const q = useDriver();
  const s = q.data;
  const [selected, setSelected] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  async function run(action: string, input: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await q.command(action, input);
      setNotice("Saved to the portal.");
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
      throw e;
    } finally {
      setBusy(false);
    }
  }
  if (!s)
    return <PortalState loading={q.isPending} error={q.error} retry={() => void q.refetch()} />;
  if (!s.isStaff)
    return (
      <Notice tone="error" role="alert">
        Operations access required.
      </Notice>
    );
  const conditions = s.reports.filter((r) => r.kind === "CONDITION");
  const report = conditions.find((r) => r.id === selected) ?? conditions[0];
  const review =
    s.reviews.find((n) => n.report_id === report?.id && n.state === "PREPARED") ??
    s.reviews.find((n) => n.report_id === report?.id);
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Route conditions"
        description="Review historically assigned packages and verified recipients before publishing customer portal updates."
      />
      <StatGrid label="Route condition summary">
        <StatTile
          label="Open conditions"
          value={conditions.filter((r) => r.state === "RECEIVED").length}
        />
        <StatTile
          label="Prepared reviews"
          value={s.reviews.filter((r) => r.state === "PREPARED").length}
        />
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
      <Panel title="Condition reports">
        {!report ? (
          <Text as="p" size="2" color="gray">
            No driver route conditions yet.
          </Text>
        ) : (
          <>
            <Field label="Choose a condition" htmlFor="condition-select">
              <OptionSelect
                id="condition-select"
                value={report.id}
                onValueChange={(v) => {
                  setSelected(v);
                  setText("");
                }}
                options={conditions.map((r) => ({
                  value: r.id,
                  label: `${categoryLabel(r.category)} · ${s.drivers.find((d) => d.id === r.driver_id)?.name ?? r.driver_id.slice(0, 8)} · ${time(r.occurred_at)}`,
                }))}
              />
            </Field>
            <KeyValueList
              items={[
                {
                  label: "Reporter",
                  value: s.drivers.find((d) => d.id === report.driver_id)?.name ?? report.driver_id,
                },
                { label: "Source", value: "Driver reported" },
                { label: "Occurred", value: time(report.occurred_at) },
                { label: "Received", value: time(report.received_at) },
                { label: "State", value: <StatusBadge status={report.state} /> },
                { label: "Revision", value: report.revision },
              ]}
            />
            <Quote>{report.details}</Quote>
            <Text as="p" size="1" color="gray">
              Scope:{" "}
              {report.scope_ids.length
                ? `${report.scope_ids.length} explicitly selected package(s)`
                : "All packages assigned to this driver when the condition occurred"}
              . Current assignment does not replace assignment history.
            </Text>
            {s.evidence
              .filter((e) => e.report_id === report.id)
              .map((e) => (
                <a
                  key={e.id}
                  href={`/api/driver/evidence?id=${e.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-6 items-center break-words text-primary underline"
                >
                  {e.original_filename}
                </a>
              ))}
            {report.correction_reason && (
              <Notice tone="warning" role="status">
                {report.correction_reason}
              </Notice>
            )}
            <Field
              label="Verified new facts or correction reason"
              htmlFor="condition-reason"
              hint="Revising a condition permits a new notice revision. Use only materially changed, reliable information; all revisions need review."
            >
              <Textarea
                id="condition-reason"
                value={text}
                maxLength={4000}
                onChange={(e) => setText(e.target.value)}
              />
            </Field>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                disabled={busy || text.trim().length < 10 || report.state === "CLOSED"}
                onClick={() =>
                  void run("request_correction", { reportId: report.id, text }).catch(() => {})
                }
              >
                Request driver correction
              </Button>
              <Button
                variant="outline"
                disabled={busy || text.trim().length < 10 || report.state === "CLOSED"}
                onClick={() => void run("revise", { reportId: report.id, text }).catch(() => {})}
              >
                Record changed facts and reassess
              </Button>
              <Button
                variant="outline"
                disabled={busy || text.trim().length < 10 || report.state === "CLOSED"}
                onClick={() => void run("close", { reportId: report.id, text }).catch(() => {})}
              >
                Close condition
              </Button>
            </div>
            <Button
              variant="secondary"
              disabled={busy || report.state !== "RECEIVED"}
              onClick={() =>
                void run("prepare", {
                  reportId: report.id,
                  body: review?.body,
                  origin: review?.origin ?? "TEMPLATE",
                  model: review?.model,
                }).catch(() => {})
              }
            >
              Refresh impact and prepare review
            </Button>
          </>
        )}
      </Panel>
      {review && (
        <ReviewPanel
          key={review.id}
          review={review}
          disabled={busy || report?.state !== "RECEIVED"}
          run={run}
          refresh={() => q.refetch()}
        />
      )}
      <Panel title="Explicit demo assignment history">
        <Text as="p" size="2">
          Uses up to three existing fictional deliveries. The first delivery transfers from the
          first driver to the second one hour before provisioning. A condition two hours before
          provisioning includes it for the first driver; a condition after transfer excludes it.
          Provisioning is idempotent.
        </Text>
        {s.drivers.length < 2 && (
          <Notice tone="warning" role="status">
            Two administrator-approved active driver accounts are needed. This action does not grant
            roles or create customer ownership.
          </Notice>
        )}
        <Field label="First driver" htmlFor="demo-first">
          <OptionSelect
            id="demo-first"
            value={first}
            onValueChange={setFirst}
            placeholder="Choose driver"
            options={s.drivers.map((d) => ({ value: d.id, label: d.name }))}
          />
        </Field>
        <Field label="Second driver" htmlFor="demo-second">
          <OptionSelect
            id="demo-second"
            value={second}
            onValueChange={setSecond}
            placeholder="Choose driver"
            options={s.drivers.map((d) => ({ value: d.id, label: d.name }))}
          />
        </Field>
        <Button
          variant="outline"
          disabled={busy || !first || !second || first === second}
          onClick={() =>
            void run("demo_assignments", { firstDriver: first, secondDriver: second }).catch(
              () => {},
            )
          }
        >
          Provision labeled demo assignment history
        </Button>
      </Panel>
    </div>
  );
}
export function ReviewPanel({
  review: n,
  disabled,
  run,
  refresh,
}: {
  review: NotificationReview;
  disabled: boolean;
  run: (action: string, input: Record<string, unknown>) => Promise<void>;
  refresh: () => Promise<unknown>;
}) {
  const [body, setBody] = useState(n.body);
  const [approvedVersion, setApprovedVersion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const version = JSON.stringify([n.id, n.fingerprint, n.body, n.state, body]);
  const checked = approvedVersion === version;
  const eligible = n.assessment.decisions.filter((d) => d.reason === "ELIGIBLE");
  async function generate() {
    setBusy(true);
    setError("");
    setApprovedVersion(null);
    try {
      await portalRequest("/api/driver/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: n.id }),
      });
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Draft unavailable. Use the template or write manually.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel title="Review customer portal updates">
      <Notice tone="warning" role="status">
        Nothing is published until operations explicitly approves the displayed packages,
        recipients, and saved message. Pending packages are excluded from publication.
      </Notice>
      <Text as="p" size="1" color="gray">
        Rule {n.assessment.rule} · {friendly(n.state)} · Wording: {n.origin}
        {n.model ? ` · ${n.model}` : ""}
      </Text>
      {!n.assessment.decisions.length && (
        <Notice tone="warning" role="status">
          No historically assigned packages match. Correct the source history or scope before
          preparing a notice.
        </Notice>
      )}
      <DataTable
        label="Affected package decisions and recipients"
        rows={n.assessment.decisions}
        rowKey={(d) => d.deliveryId}
        renderMobile={(d) => (
          <div className="space-y-2 break-all">
            <Text as="p" size="2" weight="medium">
              {d.orderReference} · {d.provenance}
            </Text>
            <Text as="p" size="2">
              {friendly(d.reason)}
            </Text>
            <Text as="p" size="1" color="gray">
              {friendly(d.sourceStatus)} · {time(d.sourceUpdatedAt)}
            </Text>
            <Text as="p" size="1">
              Recipient accounts:{" "}
              {d.recipients.map((r) => r.userId).join(", ") || "None associated"}
            </Text>
          </div>
        )}
        columns={[
          {
            header: "Package",
            cell: (d: ImpactDecision) => (
              <>
                <Text as="p" className="font-mono">
                  {d.orderReference}
                </Text>
                {d.provenance === "DEMO" && <ProvenanceBadge provenance={d.provenance} />}
              </>
            ),
          },
          {
            header: "Decision",
            cell: (d) => (
              <>
                {friendly(d.reason)}
                <Text as="p" size="1" color="gray">
                  {friendly(d.sourceStatus)} · {time(d.sourceUpdatedAt)}
                </Text>
              </>
            ),
          },
          {
            header: "Verified account recipients",
            cell: (d) => (
              <div className="break-all">
                {d.recipients.length
                  ? d.recipients.map((r) => (
                      <Text as="p" key={r.userId} size="1">
                        {r.userId}
                      </Text>
                    ))
                  : "No associated customer account"}
              </div>
            ),
          },
        ]}
      />
      {!n.assessment.driverActive && (
        <Notice tone="error" role="alert">
          The reporting driver is inactive. Publication is blocked.
        </Notice>
      )}
      {error && (
        <Notice tone="error" role="alert">
          {error}
        </Notice>
      )}
      <Field
        label="Exact message for eligible packages"
        htmlFor="notice-body"
        hint="Do not promise an ETA, successful delivery, or an action that has not occurred."
      >
        <Textarea
          id="notice-body"
          rows={5}
          maxLength={4000}
          value={body}
          disabled={n.state !== "PREPARED"}
          onChange={(e) => {
            setApprovedVersion(null);
            setBody(e.target.value);
          }}
        />
      </Field>
      {n.state === "PREPARED" && (
        <>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              disabled={disabled || busy || !body.trim() || body === n.body}
              onClick={() =>
                void run("prepare", { reportId: n.report_id, body, origin: "MANUAL" }).catch(
                  () => {},
                )
              }
            >
              Save edited draft for review
            </Button>
            <Button variant="secondary" disabled={disabled || busy} onClick={() => void generate()}>
              {busy ? "Drafting…" : "Draft wording with Groq"}
            </Button>
          </div>
          <Field label="Review confirmation" htmlFor="notice-reviewed">
            <div className="flex items-start gap-3">
              <Checkbox
                id="notice-reviewed"
                checked={checked}
                onCheckedChange={(v) => setApprovedVersion(v === true ? version : null)}
                disabled={body !== n.body || disabled}
              />
              <Text size="2">
                I reviewed the {eligible.length} eligible packages, their recipient accounts, and
                the saved message shown above.
              </Text>
            </div>
          </Field>
          <Button
            disabled={
              disabled ||
              busy ||
              !checked ||
              body !== n.body ||
              !eligible.length ||
              !n.assessment.driverActive
            }
            onClick={() =>
              void run("publish", {
                reviewId: n.id,
                body: n.body,
                fingerprint: n.fingerprint,
              }).catch(() => {})
            }
          >
            Approve and publish reviewed updates
          </Button>
        </>
      )}
      {n.state === "PUBLISHED" && (
        <Notice tone="success" role="status">
          Published {time(n.published_at)} · Approved by {n.approved_by}. Retrying this publication
          does not create another message.
        </Notice>
      )}
    </Panel>
  );
}
