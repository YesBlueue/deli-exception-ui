import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Theme } from "@radix-ui/themes";
import type { NotificationReview } from "@/infrastructure/portal/driver-types";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
import { ReviewPanel } from "./ConditionsWorkspace";
afterEach(cleanup);
const review: NotificationReview = {
  id: "review-1",
  report_id: "condition",
  report_revision: 1,
  fingerprint: "facts-v1",
  body: "Your delivery may be delayed.",
  origin: "TEMPLATE",
  model: null,
  state: "PREPARED",
  created_at: "2026-10-22T09:00:00Z",
  approved_by: null,
  approved_at: null,
  published_at: null,
  assessment: {
    driverActive: true,
    rule: "driver-impact-v1",
    decisions: [
      {
        deliveryId: "package",
        orderReference: "DEMO-100",
        provenance: "DEMO",
        reason: "ELIGIBLE",
        sourceStatus: "IN_TRANSIT",
        sourceUpdatedAt: "2026-10-22T08:00:00Z",
        assignments: [],
        recipients: [
          {
            userId: "verified-account",
            associationId: "association",
            confirmedAt: "2026-10-21T00:00:00Z",
          },
        ],
      },
    ],
  },
};
it("publishes only after staff explicitly reviews the displayed recipients and saved message", () => {
  const run = vi.fn().mockResolvedValue(undefined);
  render(
    <Theme>
      <ReviewPanel review={review} disabled={false} run={run} refresh={vi.fn()} />
    </Theme>,
  );
  const publish = screen.getByRole("button", { name: "Approve and publish reviewed updates" });
  expect(publish).toBeDisabled();
  expect(run).not.toHaveBeenCalled();
  expect(screen.getAllByText(/verified-account/).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(publish);
  expect(run).toHaveBeenCalledExactlyOnceWith("publish", {
    reviewId: "review-1",
    body: review.body,
    fingerprint: "facts-v1",
  });
});
it("invalidates the review when message text or the assessed facts change", () => {
  const run = vi.fn().mockResolvedValue(undefined);
  const refresh = vi.fn();
  const { rerender } = render(
    <Theme>
      <ReviewPanel review={review} disabled={false} run={run} refresh={refresh} />
    </Theme>,
  );
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.change(screen.getByLabelText("Exact message for eligible packages"), {
    target: { value: "Reviewed new wording" },
  });
  expect(screen.getByRole("checkbox")).not.toBeChecked();
  expect(
    screen.getByRole("button", { name: "Approve and publish reviewed updates" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Save edited draft for review" }));
  expect(run).toHaveBeenCalledWith("prepare", {
    reportId: "condition",
    body: "Reviewed new wording",
    origin: "MANUAL",
  });
  rerender(
    <Theme>
      <ReviewPanel
        review={{ ...review, fingerprint: "facts-v2" }}
        disabled={false}
        run={run}
        refresh={refresh}
      />
    </Theme>,
  );
  expect(screen.getByRole("checkbox")).not.toBeChecked();
  expect(run.mock.calls.every((c) => c[0] !== "publish")).toBe(true);
});
