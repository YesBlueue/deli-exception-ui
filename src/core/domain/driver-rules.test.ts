import { describe, expect, it } from "vitest";
import { assignedAt, impactReason } from "./driver-rules";
describe("historical driver impact", () => {
  const a = {
    driver_id: "first",
    delivery_id: "parcel",
    valid_from: "2026-10-22T08:00:00Z",
    valid_to: "2026-10-22T10:00:00Z",
  };
  it("uses the historical owner and excludes the reassignment boundary", () => {
    expect(assignedAt(a, "first", "2026-10-22T09:59:59Z")).toBe(true);
    expect(assignedAt(a, "first", "2026-10-22T10:00:00Z")).toBe(false);
    expect(assignedAt(a, "second", "2026-10-22T09:00:00Z")).toBe(false);
    expect(assignedAt(a, "first", "invalid")).toBe(false);
  });
  const now = Date.parse("2026-10-22T12:00:00Z");
  const base = {
    assignmentCount: 1,
    sourceUpdatedAt: "2026-10-22T11:00:00Z",
    sourceStatus: "IN_TRANSIT",
    customerCount: 1,
  };
  it("requires reliable context and exactly one associated customer", () => {
    expect(impactReason(base, now)).toBe("ELIGIBLE");
    expect(impactReason({ ...base, assignmentCount: 2 }, now)).toBe("PENDING_ASSIGNMENT");
    expect(impactReason({ ...base, customerCount: 0 }, now)).toBe("PENDING_CUSTOMER");
    expect(impactReason({ ...base, customerCount: 2 }, now)).toBe("MANUAL_RECIPIENT_REVIEW");
    for (const sourceUpdatedAt of [null, "2026-10-19T00:00:00Z", "2026-10-23T00:00:00Z"])
      expect(impactReason({ ...base, sourceUpdatedAt }, now)).toBe("PENDING_SOURCE");
    expect(impactReason({ ...base, sourceStatus: "DELIVERED" }, now)).toBe("EXCLUDED_COMPLETE");
  });
});
