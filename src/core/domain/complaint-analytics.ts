/** Reporting uses company calendar boundaries, never the browser timezone. */
export const REPORTING_ZONE = "Asia/Rangoon";
const OFFSET = 390 * 60000;
const DAY = 86400000;
export type AnalyticsPeriod = "daily" | "weekly" | "monthly";
export interface AnalyticsFilters {
  period: AnalyticsPeriod;
  date: string;
  seller: string;
  category: string;
  status: string;
  bucket: string;
  page: number;
}
export interface AnalyticsReport {
  id: string;
  complaint_reference: string;
  submitted_at: string;
  category: string;
  status: string;
  delivery_job_id: string;
  exception_id: string | null;
}
export interface AnalyticsInput {
  reports: AnalyticsReport[];
  orders: { id: string; seller_id: string; provenance: string }[];
  sellers: { id: string; name: string }[];
  replies: { complaint_id: string; created_at: string }[];
  history: { complaint_id: string; status: string; description: string; created_at: string }[];
}
export function companyDate(now = Date.now()) {
  return new Date(now + OFFSET).toISOString().slice(0, 10);
}
export function periodBounds(period: AnalyticsPeriod, date: string) {
  const day = new Date(`${date}T00:00:00+06:30`).getTime();
  if (!Number.isFinite(day) || companyDate(day) !== date) throw new Error("Invalid reporting date");
  const local = new Date(day + OFFSET);
  let start = day;
  let end = day + DAY;
  let previous = day - DAY;
  if (period === "weekly") {
    start -= ((local.getUTCDay() + 6) % 7) * DAY;
    end = start + 7 * DAY;
    previous = start - 7 * DAY;
  }
  if (period === "monthly") {
    start = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - OFFSET;
    end = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - OFFSET;
    previous = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 1, 1) - OFFSET;
  }
  return { start, end, previous };
}
export function shiftPeriod(period: AnalyticsPeriod, date: string, direction: number) {
  const b = periodBounds(period, date);
  return companyDate(direction < 0 ? b.previous : b.end);
}
function median(values: number[]) {
  if (!values.length) return null;
  values.sort((a, b) => a - b);
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle]! : (values[middle - 1]! + values[middle]!) / 2;
}
export function durationLabel(ms: number | null) {
  if (ms === null) return "No responses yet";
  if (ms < 60000) return "Under 1 min";
  if (ms < 3600000) return `${Math.round(ms / 60000)} min`;
  return `${(ms / 3600000).toFixed(1)} hours`;
}
export function calculateAnalytics(input: AnalyticsInput, filters: AnalyticsFilters, now: number) {
  const bounds = periodBounds(filters.period, filters.date);
  if (bounds.start > now) throw new Error("Choose a current or past reporting period");
  const end = Math.min(bounds.end, now);
  const partial = now < bounds.end;
  const previousEnd = partial
    ? Math.min(bounds.start, bounds.previous + end - bounds.start)
    : bounds.start;
  const orders = new Map(input.orders.map((o) => [o.id, o]));
  const sellerNames = new Map(input.sellers.map((s) => [s.id, s.name]));
  const matches = input.reports.filter((r) => {
    const o = orders.get(r.delivery_job_id);
    return (
      (!filters.seller || o?.seller_id === filters.seller) &&
      (!filters.category || r.category === filters.category)
    );
  });
  const inRange = (date: string, start: number, finish: number) => {
    const t = Date.parse(date);
    return t >= start && t < finish;
  };
  const current = matches.filter((r) => inRange(r.submitted_at, bounds.start, end));
  const previous = matches.filter((r) => inRange(r.submitted_at, bounds.previous, previousEnd));
  const firstReply = new Map<string, number>();
  for (const r of input.replies) {
    const t = Date.parse(r.created_at);
    if (t <= now)
      firstReply.set(r.complaint_id, Math.min(firstReply.get(r.complaint_id) ?? Infinity, t));
  }
  const responseStats = (rows: AnalyticsReport[]) => {
    const times = rows.flatMap((r) => {
      const t = firstReply.get(r.id);
      return t !== undefined && t >= Date.parse(r.submitted_at)
        ? [t - Date.parse(r.submitted_at)]
        : [];
    });
    return { median: median(times), sample: times.length };
  };
  const response = responseStats(current);
  const previousResponse = responseStats(previous);
  const ids = new Set(matches.map((r) => r.id));
  const resolved = (start: number, finish: number) =>
    new Set(
      input.history
        .filter(
          (h) =>
            ids.has(h.complaint_id) &&
            h.status === "RESOLVED" &&
            h.description === "Report status changed to RESOLVED." &&
            inRange(h.created_at, start, finish),
        )
        .map((h) => h.complaint_id),
    ).size;
  const breakdown = (key: "category" | "status") => {
    const counts = new Map<string, number>();
    for (const r of current) counts.set(r[key], (counts.get(r[key]) ?? 0) + 1);
    return [...counts]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  };
  const categories = breakdown("category");
  const statuses = breakdown("status");
  const step = filters.period === "daily" ? 3600000 : DAY;
  const trend = Array.from({ length: Math.ceil((bounds.end - bounds.start) / step) }, (_, i) => {
    const t = bounds.start + i * step;
    const key = new Date(t).toISOString();
    return {
      key,
      label:
        filters.period === "daily" ? `${String(i).padStart(2, "0")}:00` : companyDate(t).slice(5),
      count:
        t >= end
          ? null
          : current.filter((r) => inRange(r.submitted_at, t, Math.min(t + step, end))).length,
    };
  });
  const sellerRows = input.sellers
    .map((seller) => {
      const own = current.filter((r) => orders.get(r.delivery_job_id)?.seller_id === seller.id);
      const categories = [...new Set(own.map((r) => r.category))].map((key) => ({
        key,
        count: own.filter((r) => r.category === key).length,
      }));
      return {
        ...seller,
        count: own.length,
        unresolved: own.filter((r) => r.status !== "RESOLVED").length,
        categories,
      };
    })
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);
  const selected = current
    .filter(
      (r) =>
        (!filters.status || r.status === filters.status) &&
        (!filters.bucket ||
          inRange(r.submitted_at, Date.parse(filters.bucket), Date.parse(filters.bucket) + step)),
    )
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at) || a.id.localeCompare(b.id));
  const totalPages = Math.max(1, Math.ceil(selected.length / 20));
  const page = Math.min(filters.page, totalPages);
  const rows = selected.slice((page - 1) * 20, page * 20).map((r) => ({
    ...r,
    seller: sellerNames.get(orders.get(r.delivery_job_id)?.seller_id ?? "") ?? "Unknown seller",
    provenance: orders.get(r.delivery_job_id)?.provenance ?? "Unknown",
  }));
  const change = current.length - previous.length;
  const findings = [
    `${current.length} complaints received versus ${previous.length} in the comparison period (${change >= 0 ? "+" : ""}${change}).`,
    current.length < 10 || previous.length < 10
      ? "Small sample: fewer than 10 complaints in at least one period. Changes may be volatile."
      : "Counts describe complaint volume, not the complaint rate per delivery.",
    partial
      ? "This period is incomplete. Comparison uses the same elapsed time, capped at the previous period's length."
      : "Comparison uses the full previous calendar period.",
  ];
  if (categories[0])
    findings.push(
      `${categories[0].key} has the largest category count: ${categories[0].count} of ${current.length} (${Math.round((categories[0].count / current.length) * 100)}%). Ties may exist.`,
    );
  if (previous.length > 0)
    findings.push(
      `Complaint volume changed by ${((change / previous.length) * 100).toFixed(1)}% compared with the previous period.`,
    );
  const categoryChanges = categories
    .map((c) => ({ ...c, previous: previous.filter((r) => r.category === c.key).length }))
    .sort((a, b) => b.count - b.previous - (a.count - a.previous));
  const rising = categoryChanges[0];
  if (rising && rising.count > rising.previous)
    findings.push(
      `${rising.key} increased from ${rising.previous} to ${rising.count} complaints, the largest absolute category increase. Ties may exist.`,
    );
  if (sellerRows[0])
    findings.push(
      `The largest seller complaint count is ${sellerRows[0].count} of ${current.length} received complaints (${Math.round((sellerRows[0].count / current.length) * 100)}%). Delivery volumes are unavailable, so this does not measure seller quality or complaint rates.`,
    );
  if (response.sample)
    findings.push(
      `Median first response is ${durationLabel(response.median)}, based on ${response.sample} of ${current.length} received complaints. Unanswered complaints are excluded.`,
    );
  if (response.median !== null && previousResponse.median !== null)
    findings.push(
      `Previous cohort median first response: ${durationLabel(previousResponse.median)} across ${previousResponse.sample} answered complaints. Response times use replies available now, including replies after the selected period.`,
    );
  return {
    filters,
    generatedAt: new Date(now).toISOString(),
    timezone: REPORTING_ZONE,
    period: {
      start: new Date(bounds.start).toISOString(),
      end: new Date(end).toISOString(),
      previousStart: new Date(bounds.previous).toISOString(),
      previousEnd: new Date(previousEnd).toISOString(),
      partial,
    },
    metrics: {
      received: current.length,
      previousReceived: previous.length,
      resolved: resolved(bounds.start, end),
      previousResolved: resolved(bounds.previous, previousEnd),
      openNow: matches.filter((r) => r.status !== "RESOLVED").length,
      firstResponseMs: response.median,
      responseSample: response.sample,
      previousFirstResponseMs: previousResponse.median,
      previousResponseSample: previousResponse.sample,
    },
    categories,
    statuses,
    trend,
    sellerRows,
    sellers: input.sellers,
    findings,
    table: { rows, total: selected.length, page, totalPages },
    demoCount: current.filter((r) => orders.get(r.delivery_job_id)?.provenance === "DEMO").length,
  };
}
export type ComplaintAnalytics = ReturnType<typeof calculateAnalytics>;
