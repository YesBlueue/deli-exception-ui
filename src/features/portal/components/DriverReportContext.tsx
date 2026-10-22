"use client";
import { useState } from "react";
import { Text } from "@radix-ui/themes";
import { useDriver } from "@/infrastructure/portal/use-driver";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Field, MetaLine, Notice } from "@/shared/ui/patterns";
import { Panel, Quote, StatusBadge, categoryLabel, time } from "./shared";
export function DriverReportContext({ exceptionId }: { exceptionId: string }) {
  const q = useDriver();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const reports = q.data?.reports.filter((r) => r.exception_id === exceptionId) ?? [];
  if (q.error)
    return (
      <Notice tone="error" role="alert">
        Driver report context unavailable: {q.error.message}
      </Notice>
    );
  return (
    <>
      {reports.map((r) => (
        <Panel key={r.id} title={`Driver report · ${categoryLabel(r.category)}`}>
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
                <span key="driver" className="font-mono">
                  Driver {r.driver_id}
                </span>,
              ]}
            />
          </div>
          {q.data?.evidence
            .filter((e) => e.report_id === r.id)
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
          {r.correction_reason && (
            <Notice tone="warning" role="status">
              {r.correction_reason}
            </Notice>
          )}
          {error && (
            <Notice tone="error" role="alert">
              {error}
            </Notice>
          )}
          <Field label="Correction reason" htmlFor={`driver-correction-${r.id}`}>
            <Textarea
              id={`driver-correction-${r.id}`}
              maxLength={4000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <Button
            variant="outline"
            disabled={busy || reason.trim().length < 10 || r.state === "CLOSED"}
            onClick={() => {
              setBusy(true);
              setError("");
              void q
                .command("request_correction", { reportId: r.id, text: reason })
                .then(() => setReason(""))
                .catch((e) =>
                  setError(e instanceof Error ? e.message : "Correction request failed"),
                )
                .finally(() => setBusy(false));
            }}
          >
            Request driver correction
          </Button>
        </Panel>
      ))}
    </>
  );
}
