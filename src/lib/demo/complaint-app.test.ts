import { describe, expect, it } from "vitest";
import { createComplaint, listComplaints, lookupOrder, validateComplaint } from "./complaint-app";

describe("customer complaint app rules", () => {
  it("rejects an empty order ID", () => {
    const r = lookupOrder("   ");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("EMPTY");
  });
  it("rejects an unknown order ID without revealing order details", () => {
    const r = lookupOrder("ORD-99999");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("UNKNOWN");
      expect(r.message).not.toMatch(/delivered|customer|address/i);
    }
  });
  it("explains ineligible orders", () => {
    const r = lookupOrder("ord-24090");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("INELIGIBLE");
  });
  it("accepts a valid order ID case-insensitively", () => {
    const r = lookupOrder("  ord-24081 ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.orderId).toBe("ORD-24081");
  });
  it("enforces description length limits", () => {
    expect(validateComplaint({ category: "DAMAGED", description: "too short", photos: [] })).toBeTruthy();
    expect(validateComplaint({ category: "DAMAGED", description: "x".repeat(1001), photos: [] })).toBeTruthy();
    expect(validateComplaint({ category: "DAMAGED", description: "The parcel arrived crushed and open.", photos: [] })).toBeNull();
  });
  it("creates complaints with status NEW and sequential references", () => {
    const before = listComplaints().length;
    const a = createComplaint({ orderId: "ord-24081", category: "MISSING_ITEM", description: "One item was missing from the box.", photos: [] });
    const b = createComplaint({ orderId: "ORD-24077", category: "OTHER", description: "The courier left it in the rain.", photos: [{ name: "wet.jpg", size: 1200, type: "image/jpeg" }] });
    expect(a.status).toBe("NEW");
    expect(a.orderId).toBe("ORD-24081");
    expect(a.reference).toMatch(/^CMP-2026-\d{5}$/);
    expect(Number(b.reference.slice(-5))).toBe(Number(a.reference.slice(-5)) + 1);
    expect(listComplaints().length).toBe(before + 2);
  });
});
