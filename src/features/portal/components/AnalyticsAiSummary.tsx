"use client";
import { Badge, Text } from "@radix-ui/themes";
import { LoaderCircle, Sparkles } from "lucide-react";
import type { AnalyticsPeriod } from "@/core/domain/complaint-analytics";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { EmptyState, KeyValueList, Notice, Panel } from "@/shared/ui/patterns";

export interface AnalyticsSummaryResult {
  text: string;
  generatedAt: string;
  dataAsOf: string;
  model: string;
}
const PERIOD_LABEL = {
  daily: "Daily briefing",
  weekly: "Weekly briefing",
  monthly: "Monthly briefing",
};
const formatTime = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Rangoon",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function AnalyticsAiSummary({
  period,
  summary,
  error,
  busy,
  canGenerate,
  onGenerate,
}: {
  period: AnalyticsPeriod;
  summary: AnalyticsSummaryResult | null;
  error: string | null;
  busy: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
}) {
  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Sparkles className="size-5 shrink-0 text-primary" aria-hidden="true" />
          AI-generated summary
        </span>
      }
      aside={
        <Button disabled={busy || !canGenerate} onClick={onGenerate}>
          {busy ? (
            <LoaderCircle
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <Sparkles className="size-4" aria-hidden="true" />
          )}
          {busy ? "Generating…" : summary ? "Regenerate summary" : "Generate summary"}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color="indigo" variant="soft">
            {PERIOD_LABEL[period]}
          </Badge>
          <Text size="1" color="gray">
            Aggregate data only · Generated on request
          </Text>
        </div>
        {error && (
          <Notice tone="error" role="alert" title="Summary unavailable">
            {error}
          </Notice>
        )}
        {busy && (
          <div role="status" className="space-y-3" aria-label="Generating AI summary">
            <Text as="p" size="2" weight="medium" className="text-primary">
              Preparing your briefing…
            </Text>
            {!summary && (
              <div className="space-y-2" aria-hidden="true">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            )}
          </div>
        )}
        {summary ? (
          <div role="status" aria-label="Generated AI briefing" className="space-y-3">
            <Panel className="border-l-4 border-l-primary bg-accent">
              <div className="space-y-3">
                <Text as="p" size="1" weight="bold" className="text-primary">
                  {error ? "Previously generated briefing" : "Your period, explained"}
                </Text>
                {summary.text
                  .split(/\n\s*\n/)
                  .filter((paragraph) => paragraph.trim())
                  .map((paragraph, i) => (
                    <Text
                      key={i}
                      as="p"
                      size="3"
                      className="whitespace-pre-wrap break-words leading-relaxed"
                    >
                      {paragraph.trim()}
                    </Text>
                  ))}
              </div>
            </Panel>
            <Text as="p" size="1" color="gray">
              Generated {formatTime(summary.generatedAt)} · Check AI wording against the calculated
              insights.
            </Text>
          </div>
        ) : (
          !busy && (
            <EmptyState
              icon={Sparkles}
              title={
                canGenerate ? "Turn the numbers into a clear story" : "No complaints to summarize"
              }
              description={
                canGenerate
                  ? "Generate a short briefing of complaint patterns and comparisons for the selected period."
                  : "Choose a period with received complaints to generate a briefing."
              }
            />
          )
        )}
        <details>
          <summary className="cursor-pointer py-2 text-primary">About this summary</summary>
          <div className="space-y-3 pt-2">
            <Text as="p" size="2" color="gray">
              Groq explains server-calculated aggregates. Customer text, identities, evidence and
              private notes are excluded. AI wording may contain errors; review it alongside the
              calculated insights. Generating a summary makes no workflow changes.
            </Text>
            {summary && (
              <KeyValueList
                items={[
                  { label: "Statistics as of", value: formatTime(summary.dataAsOf) },
                  { label: "Reporting time", value: "Asia/Rangoon" },
                  { label: "Model", value: summary.model },
                ]}
              />
            )}
          </div>
        </details>
      </div>
    </Panel>
  );
}
