import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PortalSnapshot } from "@/infrastructure/portal/types";
const { command, portalRequest, state } = vi.hoisted(() => ({
  command: vi.fn(),
  portalRequest: vi.fn(),
  state: { data: null as PortalSnapshot | null },
}));
vi.mock("@/infrastructure/portal/use-portal", () => ({
  usePortal: () => ({ data: state.data, command, isPending: false, error: null, refetch: vi.fn() }),
  portalRequest,
}));
vi.mock("@/infrastructure/portal/use-driver", () => ({
  useDriver: () => ({ data: { reports: [], evidence: [] }, error: null }),
}));
import { Theme } from "@radix-ui/themes";
import { ExceptionWorkspace } from "./ExceptionWorkspace";
// Radix Themes components (e.g. Select) need the <Theme> the root layout provides in the app.
const inTheme = { wrapper: Theme };
beforeEach(() => {
  vi.clearAllMocks();
  command.mockResolvedValue({ ok: true });
  state.data = {
    user: { id: "staff", name: "Operations", email: "ops@example.invalid" },
    isStaff: true,
    sellerId: null,
    customerOrderIds: [],
    orders: [
      {
        id: "order",
        seller_id: "seller",
        seller_order_reference: "DEMO-001",
        recipient_name: "Customer",
        status: "IN_TRANSIT",
        provenance: "DEMO",
        source_system: "hackathon-simulator",
        external_delivery_id: "demo:001",
        source_updated_at: new Date().toISOString(),
        received_at: new Date().toISOString(),
        confirmation_details: null,
      },
    ],
    sellers: [{ id: "seller", name: "Lotus Home" }],
    exceptions: [
      {
        id: "case",
        delivery_job_id: "order",
        exception_type: "DELAY",
        priority: "MEDIUM",
        priority_reason: "Rule-based delay priority",
        status: "NEW",
        detected_at: new Date().toISOString(),
        assignee_user_id: null,
      },
    ],
    reports: [
      {
        id: "report",
        exception_id: "case",
        complaint_reference: "RPT-001",
        customer_description: "My delivery is delayed",
        category: "DELAY",
        category_reason: "Matched delay rule",
        rule_version: "reports-v1",
        needs_review: false,
        refund_requested: false,
        status: "NEW",
        original_classification: { category: "DELAY" },
        submitted_at: new Date().toISOString(),
      },
    ],
    replies: [],
    events: [
      {
        id: "event",
        delivery_job_id: "order",
        event_code: "IN_TRANSIT",
        source: "SIMULATOR",
        source_event_id: "demo-event",
        processing_result: "APPLIED",
        event_at: new Date().toISOString(),
        received_at: new Date().toISOString(),
      },
    ],
    notes: [],
    history: [],
    updates: [],
    audit: [],
    staff: [],
    reads: [],
    attachments: [],
    sellerExceptions: [],
  } as unknown as PortalSnapshot;
});
afterEach(cleanup);
it("renders explainable guidance and context without executing a command", () => {
  render(<ExceptionWorkspace id="case" />, inTheme);
  expect(screen.getByText("Review the latest delivery event.")).toBeInTheDocument();
  expect(screen.getByText(/DELAY_UPDATE/)).toHaveTextContent("guidance-v1");
  expect(screen.getByText("My delivery is delayed")).toBeInTheDocument();
  expect(screen.getByText("demo:001")).toBeInTheDocument();
  expect(command).not.toHaveBeenCalled();
  expect(portalRequest).not.toHaveBeenCalled();
});
it("keeps a Groq apology as an editable draft until staff explicitly publishes", async () => {
  portalRequest.mockResolvedValue({ text: "Hello, we are sorry for the delay." });
  render(<ExceptionWorkspace id="case" />, inTheme);
  fireEvent.click(screen.getByRole("button", { name: "Draft apology with Groq" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Reply text")).toHaveValue("Hello, we are sorry for the delay."),
  );
  expect(command).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Reply text"), {
    target: { value: "Reviewed apology from staff." },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Publish reviewed reply to customer portal" }),
  );
  await waitFor(() =>
    expect(command).toHaveBeenCalledExactlyOnceWith("reply", {
      reportId: "report",
      text: "Reviewed apology from staff.",
    }),
  );
});
it("does not render operational content for a non-staff account", () => {
  state.data!.isStaff = false;
  render(<ExceptionWorkspace id="case" />, inTheme);
  expect(screen.getByText("Operations access required")).toBeInTheDocument();
  expect(screen.queryByText("My delivery is delayed")).not.toBeInTheDocument();
  expect(command).not.toHaveBeenCalled();
});
