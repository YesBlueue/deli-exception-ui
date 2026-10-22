import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { Theme } from "@radix-ui/themes";
const { command, snapshot } = vi.hoisted(() => {
  const now = Date.now();
  return {
    command: vi.fn(),
    snapshot: {
      isDriver: true,
      isStaff: false,
      reports: [],
      reviews: [],
      evidence: [],
      drivers: [],
      assignments: [
        {
          id: "old",
          driver_id: "driver",
          delivery_id: "old-package",
          order_reference: "HISTORICAL-PACKAGE",
          valid_from: new Date(now - 86400000).toISOString(),
          valid_to: new Date(now - 3600000).toISOString(),
          provenance: "DEMO",
        },
        {
          id: "new",
          driver_id: "driver",
          delivery_id: "new-package",
          order_reference: "CURRENT-PACKAGE",
          valid_from: new Date(now - 3600000).toISOString(),
          valid_to: null,
          provenance: "DEMO",
        },
      ],
    },
  };
});
vi.mock("@/infrastructure/portal/use-driver", () => ({
  useDriver: () => ({ data: snapshot, command, refetch: vi.fn(), error: null }),
}));
vi.mock("./shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./shared")>()),
  PortalNav: () => null,
}));
import { DriverWorkspace } from "./DriverWorkspace";
afterEach(cleanup);
// jsdom does not implement the browser scrolling API used by Radix Select.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
afterAll(() => {
  Reflect.deleteProperty(Element.prototype, "scrollIntoView");
});
it("submits a route condition with its actual occurrence time rather than current assignments", async () => {
  command.mockResolvedValue({ reportId: "received-report" });
  render(
    <Theme>
      <DriverWorkspace />
    </Theme>,
  );
  const at = new Date(Date.now() - 2 * 3600000);
  const local = new Date(at.getTime() - at.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  fireEvent.change(screen.getByLabelText("When did it occur?"), { target: { value: local } });
  // Radix Select's pointer interaction is covered separately; keyboard selection
  // exercises the actual report-type control rather than calling component internals.
  fireEvent.keyDown(screen.getByLabelText("Report type"), { key: "ArrowDown" });
  await waitFor(() =>
    expect(screen.getByRole("option", { name: "Route condition" })).toBeInTheDocument(),
  );
  fireEvent.click(screen.getByRole("option", { name: "Route condition" }));
  fireEvent.keyDown(screen.getByLabelText("Condition scope"), { key: "ArrowDown" });
  await waitFor(() =>
    expect(screen.getByRole("option", { name: /HISTORICAL-PACKAGE/ })).toBeInTheDocument(),
  );
  expect(screen.queryByRole("option", { name: /CURRENT-PACKAGE/ })).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
  fireEvent.change(screen.getByLabelText("What happened?"), {
    target: { value: "Road congestion affected the earlier assigned route." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Submit report" }));
  await waitFor(() => expect(command).toHaveBeenCalled());
  expect(command).toHaveBeenCalledWith(
    "submit",
    expect.objectContaining({
      kind: "CONDITION",
      scopeIds: [],
      occurredAt: new Date(local).toISOString(),
    }),
  );
  expect(screen.getByText(/Report received: received-report/)).toBeInTheDocument();
});
