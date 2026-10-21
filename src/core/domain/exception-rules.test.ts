import { describe, expect, it } from "vitest";
import { classifyReport, nextAction, exceptionSla, EXCEPTION_TRANSITIONS } from "./exception-rules";
describe("documented report rules", () => {
  it.each([
    ["My order is delayed, please investigate", "DELAY", false, false],
    ["The box arrived damaged. I request a refund.", "DAMAGE", true, false],
    ["The package was not received at my address", "PACKAGE_MISSING", false, false],
    ["I received the wrong item in my package", "WRONG_ITEM", false, false],
    ["There is a missing item in this order", "MISSING_ITEM", false, false],
    ["My order is late and the box is broken", "OTHER", false, true],
    ["Please investigate this unusual situation", "OTHER", false, true],
    ["I would like a refund", "OTHER", true, true],
  ])("classifies %s without AI", (description, category, refund, needsReview) => {
    expect(classifyReport(description)).toMatchObject({
      category,
      refund,
      needsReview,
      version: "reports-v1",
    });
  });
});
const now = Date.parse("2026-10-21T10:00:00Z");
const context = {
  category: "DELAY",
  sourceStatus: "IN_TRANSIT",
  sourceUpdatedAt: "2026-10-21T09:00:00Z",
  refund: false,
  needsReview: false,
  confirmation: null,
  hasRelevantEvent: true,
};
describe("read-only next-action guidance", () => {
  it("explains delay guidance without mutating its input", () => {
    const original = structuredClone(context);
    expect(nextAction(context, now)).toMatchObject({
      rule: "DELAY_UPDATE",
      action: "Review the latest delivery event.",
      version: "guidance-v1",
    });
    expect(context).toEqual(original);
  });
  it.each([null, "invalid", "2026-10-18T10:00:00Z", "2026-10-22T10:00:00Z"])(
    "uses manual review for missing/stale/invalid/future data: %s",
    (sourceUpdatedAt) => {
      expect(nextAction({ ...context, sourceUpdatedAt, refund: true }, now).rule).toBe(
        "MANUAL_CONTEXT",
      );
    },
  );
  it("requires available confirmation details before suggesting inspection", () => {
    const missing = { ...context, category: "PACKAGE_MISSING", sourceStatus: "DELIVERED" };
    expect(nextAction(missing, now).rule).toBe("MANUAL_CONFIRMATION");
    expect(nextAction({ ...missing, confirmation: "Received at reception" }, now).rule).toBe(
      "DELIVERY_CONFIRMATION",
    );
  });
  it("keeps refund handoff separate from the issue category", () => {
    expect(
      nextAction({ ...context, category: "DAMAGE", sourceStatus: "DELIVERED", refund: true }, now)
        .rule,
    ).toBe("REFUND_HANDOFF");
    expect(nextAction({ ...context, needsReview: true, refund: true }, now).rule).toBe(
      "MANUAL_CONTEXT",
    );
  });
  it("does not infer a next action from conflicting or unsupported context", () => {
    expect(nextAction({ ...context, hasRelevantEvent: false }, now).rule).toBe("MANUAL_CONTEXT");
    expect(nextAction({ ...context, sourceStatus: "DELIVERED" }, now).rule).toBe("MANUAL_CONTEXT");
    expect(nextAction({ ...context, sourceStatus: "UNSUPPORTED" }, now).rule).toBe(
      "MANUAL_CONTEXT",
    );
    expect(nextAction({ ...context, category: "OTHER" }, now).rule).toBe("MANUAL_CONTEXT");
  });
  it("excludes resolved cases from SLA breaches", () => {
    expect(
      exceptionSla({ detected_at: "2020-01-01", priority: "CRITICAL", status: "RESOLVED" }, now)
        .breached,
    ).toBe(false);
    expect(EXCEPTION_TRANSITIONS["RESOLVED"]).toEqual(["REOPENED"]);
    expect(Object.keys(EXCEPTION_TRANSITIONS)).not.toContain("AWAITING_CARRIER");
  });
});
