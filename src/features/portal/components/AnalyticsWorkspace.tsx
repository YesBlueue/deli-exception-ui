"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { SegmentedControl, Text } from "@radix-ui/themes";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  companyDate,
  durationLabel,
  shiftPeriod,
  type AnalyticsPeriod,
  type ComplaintAnalytics,
} from "@/core/domain/complaint-analytics";
import { CATEGORY_LABELS } from "@/core/domain/exception-rules";
import { portalRequest } from "@/infrastructure/portal/use-portal";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  LinkList,
  ButtonRow,
  Notice,
  OptionSelect,
  PageHeader,
  Panel,
  StatGrid,
  StatTile,
} from "@/shared/ui/patterns";
import { StatusBadge, friendly } from "./shared";
import { CalculatedInsights } from "./CalculatedInsights";
import { AnalyticsAiSummary, type AnalyticsSummaryResult as Summary } from "./AnalyticsAiSummary";

const dateTime = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Rangoon",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
const categoryName = (key: string) =>
  CATEGORY_LABELS[key as keyof typeof CATEGORY_LABELS] ?? friendly(key);
export function AnalyticsWorkspace() {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryString = search.toString();
  const period = (search.get("period") ?? "weekly") as AnalyticsPeriod;
  const date = search.get("date") ?? companyDate();
  const [summary, setSummary] = useState<{ key: string; result: Summary } | null>(null);
  const [summaryError, setSummaryError] = useState<{ key: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const q = useQuery<ComplaintAnalytics>({
    queryKey: ["complaint-analytics", queryString],
    queryFn: () => portalRequest(`/api/analytics?${queryString}`),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const update = (values: Record<string, string>) => {
    const params = new URLSearchParams(queryString);
    params.delete("page");
    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.replace(`${pathname}?${params}`, { scroll: false });
  };
  const data = q.data;
  useEffect(() => {
    if (data && window.location.hash === "#analytics-complaints") {
      document.getElementById("analytics-complaints")?.scrollIntoView({ block: "start" });
    }
  }, [data]);
  async function generate() {
    const key = queryString;
    setBusy(true);
    setSummaryError(null);
    try {
      const result = await portalRequest<Summary>(`/api/analytics/summary?${key}`, {
        method: "POST",
      });
      setSummary({ key, result });
    } catch (error) {
      setSummaryError({
        key,
        message: error instanceof Error ? error.message : "Summary unavailable",
      });
    } finally {
      setBusy(false);
    }
  }
  const shownSummary = summary?.key === queryString ? summary.result : null;
  const error = summaryError?.key === queryString ? summaryError.message : null;
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Delivery company operations"
        title="Complaint analytics"
        description="Understand complaint volume, categories and response patterns. Company reporting time: Asia/Rangoon; weeks start Monday."
      />
      <Panel
        title="Reporting period"
        toolbar={
          <FilterBar
            search={
              <SegmentedControl.Root
                aria-label="Reporting period"
                value={period}
                onValueChange={(value) => update({ period: value, bucket: "", status: "" })}
              >
                <SegmentedControl.Item value="daily">Daily</SegmentedControl.Item>
                <SegmentedControl.Item value="weekly">Weekly</SegmentedControl.Item>
                <SegmentedControl.Item value="monthly">Monthly</SegmentedControl.Item>
              </SegmentedControl.Root>
            }
          >
            <Button
              variant="outline"
              onClick={() => {
                try {
                  update({ date: shiftPeriod(period, date, -1), bucket: "", status: "" });
                } catch {
                  update({ date: companyDate() });
                }
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={!data || data.period.partial}
              onClick={() => update({ date: shiftPeriod(period, date, 1), bucket: "", status: "" })}
            >
              Next
            </Button>
            <Button
              variant="ghost"
              onClick={() => update({ date: companyDate(), bucket: "", status: "" })}
            >
              Current
            </Button>
          </FilterBar>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Date within period" htmlFor="analytics-date">
            <Input
              id="analytics-date"
              type="date"
              value={date}
              max={companyDate()}
              onChange={(event) =>
                update({ date: event.target.value || companyDate(), bucket: "", status: "" })
              }
            />
          </Field>
          <Field label="Seller">
            <OptionSelect
              label="Seller"
              value={search.get("seller") ?? ""}
              onValueChange={(value) => update({ seller: value })}
              emptyLabel="All sellers"
              options={(data?.sellers ?? []).map((s) => ({ value: s.id, label: s.name }))}
            />
          </Field>
          <Field label="Category">
            <OptionSelect
              label="Category"
              value={search.get("category") ?? ""}
              onValueChange={(value) => update({ category: value })}
              emptyLabel="All categories"
              options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </Field>
        </div>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => router.replace(pathname, { scroll: false })}
        >
          Reset filters
        </Button>
        {data && (
          <Text as="p" size="1" color="gray">
            Selected: {dateTime(data.period.start)} – {dateTime(data.period.end)}. Comparison:{" "}
            {dateTime(data.period.previousStart)} – {dateTime(data.period.previousEnd)}. End times
            are exclusive. Data as of {dateTime(data.generatedAt)}.
          </Text>
        )}
      </Panel>
      {q.isPending && <Notice role="status">Loading complaint statistics…</Notice>}
      {q.error && (
        <Notice tone="error" role="alert">
          {q.error.message}{" "}
          <Button variant="outline" onClick={() => void q.refetch()}>
            Retry
          </Button>
        </Notice>
      )}
      {data && (
        <>
          <Notice title="Data scope">
            Customer complaints only. {data.demoCount} of {data.metrics.received} complaints
            received in this period have demo source context. Driver reports and proactive updates
            are excluded. Seller counts are not complaint rates per delivery.
          </Notice>
          <StatGrid label="Complaint summary">
            <StatTile label="Complaints received" value={data.metrics.received} tone="accent" />
            <StatTile label="Complaints resolved in period" value={data.metrics.resolved} />
            <StatTile label="Open complaints now" value={data.metrics.openNow} />
            <StatTile
              label="Median first response"
              value={durationLabel(data.metrics.firstResponseMs)}
            />
          </StatGrid>
          <CalculatedInsights data={data} />
          <AnalyticsAiSummary
            period={data.filters.period}
            summary={shownSummary}
            error={error}
            busy={busy}
            canGenerate={data.metrics.received > 0}
            onGenerate={() => void generate()}
          />
          {!data.metrics.received ? (
            <Panel>
              <EmptyState
                icon={BarChart3}
                title="No complaints received in this period"
                description="Try another period or reset the filters. Older complaints may still be open or resolved during this period."
              />
            </Panel>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Panel title="Complaints received over time">
                  <div className="h-64 min-w-0" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.trend}>
                        <CartesianGrid vertical={false} stroke="var(--gray-5)" />
                        <XAxis dataKey="label" minTickGap={24} />
                        <YAxis allowDecimals={false} width={32} />
                        <Tooltip />
                        <Line
                          dataKey="count"
                          name="Complaints received"
                          stroke="var(--primary)"
                          strokeWidth={2}
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <Text as="p" size="1" color="gray">
                    Future intervals are blank. Select an interval below to inspect its complaints.
                  </Text>
                  <details>
                    <summary className="cursor-pointer py-2 text-primary">
                      View interval counts and filter
                    </summary>
                    <LinkList label="Complaint intervals">
                      {data.trend
                        .filter((b) => b.count !== null)
                        .map((b) => (
                          <ButtonRow
                            key={b.key}
                            selected={search.get("bucket") === b.key}
                            onClick={() =>
                              update({ bucket: search.get("bucket") === b.key ? "" : b.key })
                            }
                          >
                            {b.label}: {b.count}
                          </ButtonRow>
                        ))}
                    </LinkList>
                  </details>
                </Panel>
                <Panel title="Categories of received complaints">
                  <div className="h-64 min-w-0" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.categories.map((c) => ({ ...c, label: categoryName(c.key) }))}
                        layout="vertical"
                        margin={{ left: 8, right: 20 }}
                      >
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis
                          dataKey="label"
                          type="category"
                          width={110}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip />
                        <Bar dataKey="count" name="Complaints" fill="var(--primary)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <LinkList label="Category counts and filters">
                    {data.categories.map((c) => (
                      <ButtonRow
                        key={c.key}
                        selected={search.get("category") === c.key}
                        onClick={() =>
                          update({ category: search.get("category") === c.key ? "" : c.key })
                        }
                      >
                        {categoryName(c.key)}: {c.count} (
                        {Math.round((c.count / data.metrics.received) * 100)}%)
                      </ButtonRow>
                    ))}
                  </LinkList>
                </Panel>
              </div>
              <Panel title="Current status of received complaints">
                <Text as="p" size="1" color="gray">
                  Current statuses of complaints submitted in this period. Historical periods change
                  as complaints progress. Select a status to filter the table.
                </Text>
                <LinkList>
                  {data.statuses.map((s) => (
                    <ButtonRow
                      key={s.key}
                      selected={search.get("status") === s.key}
                      onClick={() =>
                        update({ status: search.get("status") === s.key ? "" : s.key })
                      }
                    >
                      <StatusBadge status={s.key} /> <Text size="2">{s.count} complaints</Text>
                    </ButtonRow>
                  ))}
                </LinkList>
              </Panel>
              <Panel title="Seller breakdown" flush>
                <DataTable
                  label="Seller complaint counts"
                  rows={data.sellerRows}
                  rowKey={(s) => s.id}
                  columns={[
                    {
                      header: "Seller",
                      cell: (s) => (
                        <button
                          className="text-primary underline"
                          onClick={() => update({ seller: s.id })}
                        >
                          {s.name}
                        </button>
                      ),
                    },
                    { header: "Received", cell: (s) => s.count },
                    { header: "Still unresolved in cohort", cell: (s) => s.unresolved },
                    {
                      header: "Categories",
                      cell: (s) =>
                        s.categories.map((c) => `${categoryName(c.key)}: ${c.count}`).join(" · "),
                    },
                  ]}
                  renderMobile={(s) => (
                    <Button
                      variant="ghost"
                      className="h-auto whitespace-normal text-left"
                      onClick={() => update({ seller: s.id })}
                    >
                      {s.name}: {s.count} received · {s.unresolved} unresolved
                    </Button>
                  )}
                />
              </Panel>
            </>
          )}
          <div id="analytics-complaints" className="scroll-mt-6">
            <Panel
              title={`Complaints received (${data.table.total})`}
              flush
              aside={
                (search.get("bucket") || search.get("status")) && (
                  <Button variant="ghost" onClick={() => update({ bucket: "", status: "" })}>
                    Clear table filters
                  </Button>
                )
              }
            >
              {!data.table.rows.length ? (
                <EmptyState icon={BarChart3} title="No matching complaints" />
              ) : (
                <DataTable
                  label="Complaints received"
                  rows={data.table.rows}
                  rowKey={(r) => r.id}
                  rowHref={(r) => (r.exception_id ? `/exceptions/${r.exception_id}` : "/requests")}
                  columns={[
                    {
                      header: "Reference",
                      cell: (r) => (
                        <Link
                          className="text-primary underline"
                          href={r.exception_id ? `/exceptions/${r.exception_id}` : "/requests"}
                        >
                          {r.complaint_reference}
                        </Link>
                      ),
                    },
                    { header: "Submitted", cell: (r) => dateTime(r.submitted_at) },
                    { header: "Seller", cell: (r) => r.seller },
                    { header: "Category", cell: (r) => categoryName(r.category) },
                    { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
                  ]}
                  renderMobile={(r) => (
                    <div className="space-y-1">
                      <Text as="p" size="2" weight="medium">
                        {r.complaint_reference}
                      </Text>
                      <Text as="p" size="1">
                        {r.seller} · {categoryName(r.category)}
                      </Text>
                      <Text as="p" size="1" color="gray">
                        {dateTime(r.submitted_at)}
                      </Text>
                      <StatusBadge status={r.status} />
                    </div>
                  )}
                />
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t p-3">
                <Button
                  variant="outline"
                  disabled={data.table.page <= 1}
                  onClick={() => update({ page: String(data.table.page - 1) })}
                >
                  Previous page
                </Button>
                <Text size="1">
                  Page {data.table.page} of {data.table.totalPages}
                </Text>
                <Button
                  variant="outline"
                  disabled={data.table.page >= data.table.totalPages}
                  onClick={() => update({ page: String(data.table.page + 1) })}
                >
                  Next page
                </Button>
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
