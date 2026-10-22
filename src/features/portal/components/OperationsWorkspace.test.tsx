import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PortalSnapshot } from "@/infrastructure/portal/types";
const { state, params } = vi.hoisted(() => ({
  state: { data: null as PortalSnapshot | null },
  params: { value: new URLSearchParams() },
}));
vi.mock("@/infrastructure/portal/use-portal", () => ({
  usePortal: () => ({ data: state.data, isPending: false, error: null, refetch: vi.fn() }),
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => params.value }));
import { Theme } from "@radix-ui/themes";
import { OperationsWorkspace } from "./OperationsWorkspace";
const inTheme = { wrapper: Theme };
const hoursAgo = (h: number) => new Date(Date.now() - h * 36e5).toISOString();
const order = (id: string) => ({
  id,
  seller_id: "seller",
  seller_order_reference: id,
  recipient_name: "Customer",
  status: "IN_TRANSIT",
  provenance: "DEMO",
});
const exception = (
  id: string,
  priority: string,
  detectedHoursAgo: number,
  assignee: string | null,
) => ({
  id,
  delivery_job_id: id,
  exception_type: "DELAY",
  priority,
  status: "NEW",
  detected_at: hoursAgo(detectedHoursAgo),
  assignee_user_id: assignee,
});
beforeEach(() => {
  params.value = new URLSearchParams();
  state.data = {
    isStaff: true,
    // HIGH-OVERDUE breaches its 8h SLA; LOW-FRESH is unassigned and within SLA.
    orders: [order("HIGH-OVERDUE"), order("LOW-FRESH"), order("MEDIUM-ASSIGNED")],
    exceptions: [
      exception("HIGH-OVERDUE", "HIGH", 10, "staff"),
      exception("LOW-FRESH", "LOW", 1, null),
      exception("MEDIUM-ASSIGNED", "MEDIUM", 1, "staff"),
    ],
    sellers: [{ id: "seller", name: "Lotus Home" }],
    staff: [{ user_id: "staff", full_name: "Ops Person", is_active: true, role: "OPERATIONS" }],
    reports: [],
    events: [],
    audit: [],
  } as unknown as PortalSnapshot;
});
afterEach(cleanup);
const listed = () =>
  within(screen.getByRole("list", { name: "Exceptions" }))
    .getAllByRole("link")
    .map((row) =>
      ["HIGH-OVERDUE", "LOW-FRESH", "MEDIUM-ASSIGNED"].find((ref) =>
        row.textContent?.includes(ref),
      ),
    );
it("filters the inbox from each summary tile like a button", () => {
  render(<OperationsWorkspace view="inbox" />, inTheme);
  expect(listed()).toEqual(["HIGH-OVERDUE", "MEDIUM-ASSIGNED", "LOW-FRESH"]);
  const tile = (name: RegExp) => screen.getByRole("button", { name });
  expect(tile(/Unassigned/)).not.toHaveAttribute("aria-pressed");

  fireEvent.click(tile(/Unassigned/));
  expect(listed()).toEqual(["LOW-FRESH"]);
  // A second click keeps the filter: tiles apply a filter, they do not toggle it.
  fireEvent.click(tile(/Unassigned/));
  expect(listed()).toEqual(["LOW-FRESH"]);

  fireEvent.click(tile(/High \/ critical/));
  expect(listed()).toEqual(["HIGH-OVERDUE"]);

  fireEvent.click(tile(/SLA breaches/));
  expect(listed()).toEqual(["HIGH-OVERDUE"]);

  fireEvent.click(tile(/Open exceptions/));
  expect(listed()).toHaveLength(3);
});
it("opens the inbox with a tile's filter from the reports page", () => {
  render(<OperationsWorkspace view="reports" />, inTheme);
  expect(screen.getByRole("link", { name: /Unassigned/ })).toHaveAttribute(
    "href",
    "/dashboard?focus=unassigned",
  );
});
it("applies the filter named in ?focus=", () => {
  params.value = new URLSearchParams("focus=unassigned");
  render(<OperationsWorkspace view="inbox" />, inTheme);
  expect(listed()).toEqual(["LOW-FRESH"]);
});
it("keeps the overview free of the exception list and links into the inbox", () => {
  render(<OperationsWorkspace view="overview" />, inTheme);
  expect(screen.queryByRole("list", { name: "Exceptions" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /High \/ critical/ })).toHaveAttribute(
    "href",
    "/dashboard?focus=urgent",
  );
  const categories = screen.getByRole("list", { name: "Open exceptions by category" });
  // All three fixture exceptions are open delays, so the delay tile leads with 100%.
  expect(within(categories).getAllByRole("link")[0]).toHaveAttribute(
    "href",
    "/dashboard?category=DELAY",
  );
  expect(within(categories).getAllByRole("link")[0]).toHaveTextContent("100%");
  expect(screen.getByRole("link", { name: "See all" })).toHaveAttribute("href", "/activity");
});
it("applies the category named in ?category=", () => {
  params.value = new URLSearchParams("category=DAMAGE");
  render(<OperationsWorkspace view="inbox" />, inTheme);
  expect(screen.queryByRole("list", { name: "Exceptions" })).not.toBeInTheDocument();
  expect(screen.getByText("No exceptions match this view.")).toBeInTheDocument();
});
