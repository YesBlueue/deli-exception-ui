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
  it("does not limit the description length", () => {
    expect(validateComplaint({ category: "DAMAGED", description: "", photos: [], incidentDate: "2026-10-01", incidentTime: "09:30" })).toBeNull();
    expect(validateComplaint({ category: "DAMAGED", description: "x".repeat(5000), photos: [], incidentDate: "2026-10-01", incidentTime: "09:30" })).toBeNull();
  });
  it("requires the incident date and time and rejects future dates", () => {
    expect(validateComplaint({ category: "DAMAGED", description: "ok", photos: [], incidentDate: "", incidentTime: "09:30" })).toBeTruthy();
    expect(validateComplaint({ category: "DAMAGED", description: "ok", photos: [], incidentDate: "2026-10-01", incidentTime: "" })).toBeTruthy();
    expect(validateComplaint({ category: "DAMAGED", description: "ok", photos: [], incidentDate: "2099-01-01", incidentTime: "09:30" })).toBeTruthy();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(validateComplaint({ category: "DAMAGED", description: "ok", photos: [], incidentDate: todayStr, incidentTime: "09:30" })).toBeNull();
  });
  it("creates complaints with the incident date/time, status NEW and sequential references", () => {
    const before = listComplaints().length;
    const a = createComplaint({ orderId: "ord-24081", category: "MISSING_ITEM", description: "One item was missing from the box.", photos: [], incidentDate: "2026-10-18", incidentTime: "14:05" });
    const b = createComplaint({ orderId: "ORD-24077", category: "OTHER", description: "The courier left it in the rain.", photos: [{ name: "wet.jpg", size: 1200, type: "image/jpeg" }], incidentDate: "2026-10-19", incidentTime: "08:40" });
    expect(a.status).toBe("NEW");
    expect(a.orderId).toBe("ORD-24081");
    expect(a.incidentDate).toBe("2026-10-18");
    expect(a.incidentTime).toBe("14:05");
    expect(a.reference).toMatch(/^CMP-2026-\d{5}$/);
    expect(Number(b.reference.slice(-5))).toBe(Number(a.reference.slice(-5)) + 1);
    expect(listComplaints().length).toBe(before + 2);
  });
});
