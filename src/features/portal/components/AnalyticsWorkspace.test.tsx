import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Theme } from "@radix-ui/themes";
import { calculateAnalytics, type ComplaintAnalytics } from "@/core/domain/complaint-analytics";
const { state, replace, portalRequest } = vi.hoisted(() => ({
  state: {
    data: null as ComplaintAnalytics | null,
    error: null as Error | null,
    search: "period=daily&date=2026-10-22",
  },
  replace: vi.fn(),
  portalRequest: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/analytics",
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(state.search),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: state.data, error: state.error, isPending: false, refetch: vi.fn() }),
}));
vi.mock("@/infrastructure/portal/use-portal", () => ({ portalRequest }));
vi.mock("recharts", () => {
  const Container = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const Empty = () => null;
  return {
    ResponsiveContainer: Container,
    BarChart: Empty,
    LineChart: Empty,
    Bar: Empty,
    Line: Empty,
    CartesianGrid: Empty,
    XAxis: Empty,
    YAxis: Empty,
    Tooltip: Empty,
  };
});
import { AnalyticsWorkspace } from "./AnalyticsWorkspace";
beforeEach(() => {
  vi.clearAllMocks();
  state.search = "period=daily&date=2026-10-22";
  state.error = null;
  state.data = calculateAnalytics(
    {
      reports: [
        {
          id: "report",
          complaint_reference: "RPT-001",
          category: "DAMAGE",
          status: "NEW",
          submitted_at: "2026-10-22T01:00:00+06:30",
          delivery_job_id: "order",
          exception_id: "exception",
        },
      ],
      orders: [{ id: "order", seller_id: "seller", provenance: "DEMO" }],
      sellers: [{ id: "seller", name: "Demo seller" }],
      replies: [],
      history: [],
    },
    {
      period: "daily",
      date: "2026-10-22",
      seller: "",
      category: "",
      status: "",
      bucket: "",
      page: 1,
    },
    Date.parse("2026-10-23T00:00:00Z"),
  );
});
afterEach(cleanup);
it("renders calculated insights and complaint links without generating a summary automatically", () => {
  render(
    <Theme>
      <AnalyticsWorkspace />
    </Theme>,
  );
  expect(screen.getByRole("heading", { name: "Calculated insights" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Complaint volume increased" })).toBeVisible();
  expect(screen.getByText("0 → 1")).toBeVisible();
  expect(screen.queryByRole("heading", { name: /largest category/ })).not.toBeInTheDocument();
  expect(screen.getByText(/1 complaints received versus 0/)).not.toBeVisible();
  expect(screen.getAllByRole("link", { name: /RPT-001/ })[0]).toHaveAttribute(
    "href",
    "/exceptions/exception",
  );
  expect(portalRequest).not.toHaveBeenCalled();
});
it("emphasizes category share and slower response with sample sizes and neutral comparison styling", () => {
  const data = state.data!;
  data.metrics = {
    ...data.metrics,
    received: 14,
    previousReceived: 8,
    firstResponseMs: 3.5 * 3600000,
    previousFirstResponseMs: 2 * 3600000,
    responseSample: 12,
    previousResponseSample: 6,
  };
  data.categories = [
    { key: "DAMAGE", count: 7 },
    { key: "DELAY", count: 7 },
  ];
  render(
    <Theme>
      <AnalyticsWorkspace />
    </Theme>,
  );
  expect(screen.getByText("8 → 14")).toBeVisible();
  expect(screen.getByText("50%")).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "Damaged delivery is a leading category" }),
  ).toBeVisible();
  expect(screen.getByRole("heading", { name: "First response is slower" })).toBeVisible();
  expect(screen.getByText("1.5 hours")).toBeVisible();
  expect(screen.getByText(/Based on 12 answered complaints now and 6/)).toBeVisible();
  expect(screen.getByText("8 → 14")).toHaveClass("text-primary");
});
it("links findings to the selected period while clearing table restrictions", () => {
  const data = state.data!;
  data.metrics.received = 2;
  data.categories = [{ key: "DAMAGE", count: 2 }];
  data.filters.seller = "11111111-1111-4111-8111-111111111111";
  data.filters.status = "RESOLVED";
  data.filters.page = 2;
  render(
    <Theme>
      <AnalyticsWorkspace />
    </Theme>,
  );
  const href = screen.getByRole("link", { name: "View category complaints" }).getAttribute("href")!;
  const url = new URL(href, "http://localhost");
  expect(url.hash).toBe("#analytics-complaints");
  expect(url.searchParams.get("category")).toBe("DAMAGE");
  expect(url.searchParams.get("seller")).toBe(data.filters.seller);
  expect(url.searchParams.get("date")).toBe(data.filters.date);
  expect(url.searchParams.has("status")).toBe(false);
  expect(url.searchParams.has("page")).toBe(false);
  fireEvent.click(screen.getByText("How these figures are calculated"));
  expect(screen.getByText(/1 complaints received versus 0/)).toBeVisible();
});
it("preserves period/date in URL filters and can navigate from yesterday to today", () => {
  render(
    <Theme>
      <AnalyticsWorkspace />
    </Theme>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(replace.mock.calls[0]![0]).toContain("date=2026-10-23");
  fireEvent.click(screen.getByRole("button", { name: /Damaged delivery: 1/ }));
  expect(replace.mock.calls[1]![0]).toContain("category=DAMAGE");
  expect(replace.mock.calls[1]![0]).toContain("period=daily");
});
it("keeps calculated findings when Groq fails", async () => {
  portalRequest.mockRejectedValue(new Error("Groq unavailable"));
  render(
    <Theme>
      <AnalyticsWorkspace />
    </Theme>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Generate summary" }));
  await screen.findByRole("alert");
  expect(screen.getByText("Groq unavailable")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Calculated insights" })).toBeInTheDocument();
});
it("hides a summary that finishes after the user switches periods", async () => {
  let finish!: (value: unknown) => void;
  portalRequest.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const view = render(
    <Theme>
      <AnalyticsWorkspace />
    </Theme>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Generate summary" }));
  expect(screen.getByRole("status", { name: "Generating AI summary" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Generating…" })).toBeDisabled();
  state.search = "period=monthly&date=2026-10-22";
  view.rerender(
    <Theme>
      <AnalyticsWorkspace />
    </Theme>,
  );
  finish({
    text: "Old period summary",
    generatedAt: "2026-10-22T12:00:00Z",
    dataAsOf: "2026-10-22T12:00:00Z",
    model: "test",
  });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Generate summary" })).not.toBeDisabled(),
  );
  expect(screen.queryByText("Old period summary")).not.toBeInTheDocument();
});
it("presents generated text as readable paragraphs with period and source details", async () => {
  portalRequest.mockResolvedValue({
    text: "Complaint volume increased from 8 to 14.\n\nDamage represents half of received complaints.",
    generatedAt: "2026-10-22T12:00:00Z",
    dataAsOf: "2026-10-22T11:59:00Z",
    model: "fixture-model",
  });
  render(
    <Theme>
      <AnalyticsWorkspace />
    </Theme>,
  );
  expect(screen.getByText("Turn the numbers into a clear story")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Generate summary" }));
  const briefing = await screen.findByRole("status", { name: "Generated AI briefing" });
  expect(within(briefing).getByText("Complaint volume increased from 8 to 14.")).toBeVisible();
  expect(
    within(briefing).getByText("Damage represents half of received complaints."),
  ).toBeVisible();
  expect(screen.getByText("Daily briefing")).toBeVisible();
  expect(screen.getByRole("button", { name: "Regenerate summary" })).toBeEnabled();
  expect(screen.getByText("fixture-model")).not.toBeVisible();
  fireEvent.click(screen.getByText("About this summary"));
  expect(screen.getByText("fixture-model")).toBeVisible();
});
it("retains the previous briefing when regeneration fails", async () => {
  portalRequest
    .mockResolvedValueOnce({
      text: "The saved briefing remains available.",
      generatedAt: "2026-10-22T12:00:00Z",
      dataAsOf: "2026-10-22T12:00:00Z",
      model: "fixture-model",
    })
    .mockRejectedValueOnce(new Error("Groq unavailable"));
  render(
    <Theme>
      <AnalyticsWorkspace />
    </Theme>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Generate summary" }));
  await screen.findByRole("status", { name: "Generated AI briefing" });
  fireEvent.click(screen.getByRole("button", { name: "Regenerate summary" }));
  await screen.findByRole("alert");
  expect(screen.getByText("Previously generated briefing")).toBeVisible();
  expect(screen.getByText("The saved briefing remains available.")).toBeVisible();
});
it("shows request errors without fixture fallback", () => {
  state.data = null;
  state.error = new Error("Analytics unavailable");
  render(
    <Theme>
      <AnalyticsWorkspace />
    </Theme>,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Analytics unavailable");
  expect(screen.queryByRole("heading", { name: "Calculated insights" })).not.toBeInTheDocument();
});
