import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PortalSnapshot } from "@/infrastructure/portal/types";
const { state } = vi.hoisted(() => ({ state: { data: null as PortalSnapshot | null } }));
vi.mock("@/infrastructure/portal/use-portal", () => ({
  usePortal: () => ({ data: state.data, isPending: false, error: null, refetch: vi.fn() }),
}));
import { Theme } from "@radix-ui/themes";
import { ActivityWorkspace } from "./ActivityWorkspace";
const inTheme = { wrapper: Theme };
const entry = (n: number) => ({
  id: `log-${n}`,
  action_type: n % 2 ? "REPLY" : "NOTE",
  actor_type: "STAFF",
  actor_user_id: "staff",
  delivery_exception_id: n === 60 ? "case" : null,
  description: `Entry ${n}`,
  created_at: new Date(Date.UTC(2026, 9, 1, 0, n)).toISOString(),
});
beforeEach(() => {
  state.data = {
    isStaff: true,
    staff: [{ user_id: "staff", full_name: "Ops Person", is_active: true, role: "OPERATIONS" }],
    audit: Array.from({ length: 60 }, (_, i) => entry(i + 1)),
  } as unknown as PortalSnapshot;
});
afterEach(cleanup);
it("lists all activity newest first, in pages, with links to exceptions", () => {
  render(<ActivityWorkspace />, inTheme);
  const items = () => screen.getAllByRole("listitem");
  expect(items()).toHaveLength(50);
  expect(items()[0]).toHaveTextContent("Entry 60");
  expect(items()[0]).toHaveTextContent("Ops Person");
  expect(screen.getByRole("link", { name: "Open exception" })).toHaveAttribute(
    "href",
    "/exceptions/case",
  );
  expect(screen.getByText("Showing 50 of 60")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Show more" }));
  expect(items()).toHaveLength(60);
  expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
});
it("searches activity descriptions", () => {
  render(<ActivityWorkspace />, inTheme);
  fireEvent.change(screen.getByRole("searchbox", { name: "Search activity" }), {
    target: { value: "Entry 42" },
  });
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
});
