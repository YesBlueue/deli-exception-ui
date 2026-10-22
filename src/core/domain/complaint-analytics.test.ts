import { expect, it } from "vitest";
import {
  calculateAnalytics,
  companyDate,
  periodBounds,
  shiftPeriod,
  type AnalyticsFilters,
  type AnalyticsInput,
  type AnalyticsReport,
} from "./complaint-analytics";
const time = (date: string) => Date.parse(`${date}+06:30`);
const filters: AnalyticsFilters = {
  period: "daily",
  date: "2026-10-22",
  seller: "",
  category: "",
  status: "",
  bucket: "",
  page: 1,
};
function report(
  id: string,
  submitted_at = "2026-10-22T01:00:00+06:30",
  extra: Partial<AnalyticsReport> = {},
): AnalyticsReport {
  return {
    id,
    complaint_reference: id,
    submitted_at,
    category: "DAMAGE",
    status: "NEW",
    delivery_job_id: "order",
    exception_id: "exception",
    ...extra,
  };
}
function input(reports: AnalyticsReport[]): AnalyticsInput {
  return {
    reports,
    orders: [{ id: "order", seller_id: "seller", provenance: "DEMO" }],
    sellers: [{ id: "seller", name: "Demo seller" }],
    replies: [],
    history: [],
  };
}
it("uses Rangoon midnight, Monday weeks, leap months and calendar navigation", () => {
  expect(companyDate(Date.parse("2026-10-21T18:00:00Z"))).toBe("2026-10-22");
  expect(periodBounds("weekly", "2026-10-22").start).toBe(time("2026-10-19T00:00:00"));
  const leap = periodBounds("monthly", "2024-02-29");
  expect(leap.end - leap.start).toBe(29 * 86400000);
  expect(shiftPeriod("monthly", "2026-03-31", -1)).toBe("2026-02-01");
  expect(shiftPeriod("weekly", "2026-10-22", 1)).toBe("2026-10-26");
  expect(() => periodBounds("daily", "2026-02-30")).toThrow();
});
it("compares partial periods at equal elapsed time and excludes future and boundary records", () => {
  const data = input([
    report("start", "2026-10-22T00:00:00+06:30"),
    report("future", "2026-10-22T20:00:00+06:30"),
    report("end", "2026-10-23T00:00:00+06:30"),
    report("previous", "2026-10-21T01:00:00+06:30"),
    report("previous-late", "2026-10-21T13:00:00+06:30"),
  ]);
  const result = calculateAnalytics(data, filters, time("2026-10-22T12:00:00"));
  expect(result.metrics.received).toBe(1);
  expect(result.metrics.previousReceived).toBe(1);
  expect(result.period.partial).toBe(true);
  expect(result.trend[0]?.count).toBe(1);
  expect(result.trend[12]?.count).toBeNull();
});
it("compares full calendar months and caps a longer partial month at previous month end", () => {
  const result = calculateAnalytics(
    input([]),
    { ...filters, period: "monthly", date: "2026-03-31" },
    time("2026-03-31T12:00:00"),
  );
  expect(result.period.previousEnd).toBe(new Date(time("2026-03-01T00:00:00")).toISOString());
  const full = calculateAnalytics(
    input([]),
    { ...filters, period: "monthly", date: "2026-02-15" },
    time("2026-04-01T00:00:00"),
  );
  expect(full.period.previousStart).toBe(new Date(time("2026-01-01T00:00:00")).toISOString());
  expect(full.period.partial).toBe(false);
});
it("counts explicit resolutions once, including older reports, but excludes reply-history status snapshots", () => {
  const data = input([
    report("old", "2026-10-01T01:00:00+06:30"),
    report("snapshot", "2026-10-01T01:00:00+06:30", { status: "RESOLVED" }),
  ]);
  const resolution = {
    complaint_id: "old",
    status: "RESOLVED",
    description: "Report status changed to RESOLVED.",
    created_at: "2026-10-22T02:00:00+06:30",
  };
  data.history = [
    resolution,
    { ...resolution, created_at: "2026-10-22T03:00:00+06:30" },
    {
      ...resolution,
      complaint_id: "snapshot",
      description: "A staff reply was published in your portal.",
    },
  ];
  const result = calculateAnalytics(data, filters, time("2026-10-23T00:00:00"));
  expect(result.metrics.resolved).toBe(1);
  expect(result.metrics.received).toBe(0);
  expect(result.metrics.openNow).toBe(1);
});
it("uses earliest published reply, median of answered cohort, and no invented zero response", () => {
  const data = input([report("a"), report("b"), report("unanswered")]);
  data.replies = [
    { complaint_id: "a", created_at: "2026-10-22T05:00:00+06:30" },
    { complaint_id: "a", created_at: "2026-10-22T02:00:00+06:30" },
    { complaint_id: "b", created_at: "2026-10-22T04:00:00+06:30" },
  ];
  const result = calculateAnalytics(data, filters, time("2026-10-23T00:00:00"));
  expect(result.metrics.firstResponseMs).toBe(2 * 3600000);
  expect(result.metrics.responseSample).toBe(2);
  expect(
    calculateAnalytics(input([]), filters, time("2026-10-23T00:00:00")).metrics.firstResponseMs,
  ).toBeNull();
});
it("applies seller/category across metrics and paginates table filters without altering totals", () => {
  const data = input(Array.from({ length: 25 }, (_, i) => report(String(i))));
  data.reports.push(report("other", undefined, { category: "DELAY", status: "RESOLVED" }));
  const result = calculateAnalytics(
    data,
    { ...filters, seller: "seller", category: "DAMAGE", page: 2, status: "NEW" },
    time("2026-10-23T00:00:00"),
  );
  expect(result.metrics.received).toBe(25);
  expect(result.table.total).toBe(25);
  expect(result.table.rows).toHaveLength(5);
  expect(result.table.totalPages).toBe(2);
  const empty = calculateAnalytics(
    data,
    { ...filters, category: "DAMAGE", status: "RESOLVED" },
    time("2026-10-23T00:00:00"),
  );
  expect(empty.metrics.received).toBe(25);
  expect(empty.table.total).toBe(0);
  expect(
    calculateAnalytics(data, { ...filters, seller: "missing" }, time("2026-10-23T00:00:00")).metrics
      .openNow,
  ).toBe(0);
});
it("rejects future periods and keeps zero comparison counts finite", () => {
  expect(() =>
    calculateAnalytics(input([]), { ...filters, date: "2026-10-24" }, time("2026-10-23T00:00:00")),
  ).toThrow();
  const result = calculateAnalytics(input([report("a")]), filters, time("2026-10-23T00:00:00"));
  expect(result.findings.join(" ")).not.toMatch(/Infinity|NaN/);
});
