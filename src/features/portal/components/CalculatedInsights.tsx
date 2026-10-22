"use client";
import Link from "next/link";
import { Text } from "@radix-ui/themes";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  Clock3,
  Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  companyDate,
  durationLabel,
  type ComplaintAnalytics,
} from "@/core/domain/complaint-analytics";
import { CATEGORY_LABELS } from "@/core/domain/exception-rules";
import { Button } from "@/shared/ui/button";
import { EmptyState, Notice, Panel, StatList } from "@/shared/ui/patterns";

const categoryLabel = (key: string) =>
  CATEGORY_LABELS[key as keyof typeof CATEGORY_LABELS] ?? "Manual review";
interface Highlight {
  key: string;
  title: string;
  figure: string;
  detail: string;
  href: string;
  linkLabel: string;
  Icon: LucideIcon;
}
/** Present verified numbers directly; never parse prose or call a model to select a finding. */
export function CalculatedInsights({ data }: { data: ComplaintAnalytics }) {
  const { metrics } = data;
  function complaintLink(category = data.filters.category, previous = false) {
    const params = new URLSearchParams({
      period: data.filters.period,
      date: previous ? companyDate(Date.parse(data.period.previousStart)) : data.filters.date,
    });
    if (data.filters.seller) params.set("seller", data.filters.seller);
    if (category) params.set("category", category);
    return `/analytics?${params}#analytics-complaints`;
  }
  const highlights: Highlight[] = [];
  const change = metrics.received - metrics.previousReceived;
  if (metrics.received || metrics.previousReceived) {
    const percentage = metrics.previousReceived
      ? `${change >= 0 ? "+" : ""}${((change / metrics.previousReceived) * 100).toFixed(1)}%`
      : "no previous complaints";
    highlights.push({
      key: "volume",
      title:
        change > 0
          ? "Complaint volume increased"
          : change < 0
            ? "Complaint volume decreased"
            : "Complaint volume is unchanged",
      figure: `${metrics.previousReceived} → ${metrics.received}`,
      detail:
        change === 0
          ? "The same number of complaints as the previous period."
          : `${Math.abs(change)} ${change > 0 ? "more" : "fewer"} complaints compared with the previous period (${percentage}).`,
      href: complaintLink(undefined, !metrics.received),
      linkLabel: metrics.received ? "View received complaints" : "View previous period complaints",
      Icon: change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : ArrowRight,
    });
  }
  const leading = data.categories[0];
  if (leading && metrics.received >= 2) {
    const tied = data.categories.filter((c) => c.count === leading.count).length > 1;
    highlights.push({
      key: "category",
      title: `${categoryLabel(leading.key)} ${tied ? "is a leading category" : "is the largest category"}`,
      figure: `${Math.round((leading.count / metrics.received) * 100)}%`,
      detail: `${leading.count} of ${metrics.received} complaints received in this period.${tied ? " Shares the largest count with another category." : ""}`,
      href: complaintLink(leading.key),
      linkLabel: "View category complaints",
      Icon: Layers,
    });
  }
  if (metrics.firstResponseMs !== null) {
    const previous = metrics.previousFirstResponseMs;
    const difference = previous === null ? null : metrics.firstResponseMs - previous;
    highlights.push({
      key: "response",
      title:
        difference === null
          ? "Median first response"
          : difference > 0
            ? "First response is slower"
            : difference < 0
              ? "First response is faster"
              : "First response time is unchanged",
      figure:
        difference === null || difference === 0
          ? durationLabel(metrics.firstResponseMs)
          : durationLabel(Math.abs(difference)),
      detail:
        difference === null
          ? `Based on ${metrics.responseSample} of ${metrics.received} received complaints with a published reply. No answered complaints in the comparison period.`
          : `${durationLabel(previous)} → ${durationLabel(metrics.firstResponseMs)} median. Based on ${metrics.responseSample} answered complaints now and ${metrics.previousResponseSample} in the comparison cohort.`,
      href: complaintLink(),
      linkLabel: "View response cohort",
      Icon: Clock3,
    });
  }
  const caveats = [
    metrics.received < 10 ||
    metrics.previousReceived < 10 ||
    (metrics.firstResponseMs !== null &&
      (metrics.responseSample < 10 ||
        (metrics.previousResponseSample > 0 && metrics.previousResponseSample < 10)))
      ? "Small sample: a complaint or response cohort has fewer than 10 records."
      : "",
    data.period.partial
      ? "Period in progress; comparing equal elapsed time, capped at the previous period."
      : "Comparison uses the full previous calendar period.",
    "Delivery-volume rates are unavailable.",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Panel title="Calculated insights">
      <div className="space-y-4">
        <Notice title="Comparison context">{caveats}</Notice>
        {highlights.length ? (
          <div
            className={
              highlights.length === 3
                ? "grid grid-cols-1 gap-4 lg:grid-cols-3"
                : highlights.length === 2
                  ? "grid grid-cols-1 gap-4 lg:grid-cols-2"
                  : "grid grid-cols-1 gap-4"
            }
            aria-label="Key complaint findings"
          >
            {highlights.map(({ key, title, figure, detail, href, linkLabel, Icon }) => (
              <Panel
                key={key}
                title={
                  <span className="flex items-start gap-2">
                    <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                    <span>{title}</span>
                  </span>
                }
              >
                <div className="flex h-full flex-col items-start gap-3">
                  <Text
                    as="p"
                    size="7"
                    weight="bold"
                    className="break-words text-primary tabular-nums"
                  >
                    {figure}
                  </Text>
                  <Text as="p" size="2" color="gray" className="flex-1">
                    {detail}
                  </Text>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-auto min-h-10 whitespace-normal text-left"
                  >
                    <Link href={href}>
                      {linkLabel}
                      <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </Panel>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ChartNoAxesCombined}
            title="No complaint activity to compare"
            description="Choose another period to see calculated findings."
          />
        )}
        <details>
          <summary className="cursor-pointer py-2 text-primary">
            How these figures are calculated
          </summary>
          <div className="space-y-3 pt-2">
            <Text as="p" size="2" color="gray">
              Volume compares complaints submitted in the selected and comparison periods. Category
              shares use current classifications of received complaints; corrections can change
              historical views. The largest category may be tied. Seller/category filters apply to
              all figures.
            </Text>
            <Text as="p" size="2" color="gray">
              First response measures submission to the earliest published customer reply, using
              replies available now, including replies after the selected period. Unanswered
              complaints, private notes and drafts are excluded. Cohorts can have different sample
              sizes.
            </Text>
            <Text as="p" size="2" color="gray">
              Resolved counts each complaint once per period using explicit resolution history,
              including complaints submitted earlier. Open complaints is a current snapshot across
              all submission dates with the selected seller/category. Table status and interval
              filters do not change these findings.
            </Text>
            <StatList
              items={data.findings.map((finding, i) => ({
                key: String(i),
                label: finding.replace(
                  /\b(DELAY|DAMAGE|MISSING_ITEM|WRONG_ITEM|PACKAGE_MISSING|OTHER)\b/g,
                  categoryLabel,
                ),
                value: "",
              }))}
            />
          </div>
        </details>
      </div>
    </Panel>
  );
}
