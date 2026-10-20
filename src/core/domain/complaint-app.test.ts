import { describe, expect, it } from "vitest";
import { createComplaint, formatSubmissionTime, lookupOrder, validateComplaint } from "./complaint-app";
import { seed } from "./seed";
import { addInternalComplaintNote, getCustomerHistory, markComplaintSeen, updateComplaint } from "./customer";
const now = new Date("2026-10-20T07:12:34.000Z");
function fixture() { const db = seed(now.getTime()); const order = db.shipments.find((s) => s.id === "shp_06"); if (!order) throw Error("fixture"); order.customerId = "alice"; return db; }
const photo = { name: "photo.png", type: "image/png", size: 8, dataUrl: "data:image/png;base64,iVBORw0KGgo=" };
describe("complaint rules", () => {
  it("rejects empty IDs", () => expect(lookupOrder(fixture(), "alice", " ").ok).toBe(false));
  it("rejects unknown orders", () => expect(lookupOrder(fixture(), "alice", "ORD-99999").ok).toBe(false));
  it("rejects other customers' orders", () => expect(lookupOrder(fixture(), "bob", "ORD-24055").ok).toBe(false));
  it("rechecks delivery on submission", () => { const db = fixture(); const s = db.shipments.find((s) => s.customerId === "alice"); if (!s) throw Error("fixture"); s.status = "IN_TRANSIT"; expect(() => createComplaint(db, "alice", { orderId: s.orderId, category: "OTHER", description: "", photos: [] }, now)).toThrow(/after delivery/); });
  it("accepts normalized IDs", () => expect(lookupOrder(fixture(), "alice", " ord-24055 ").ok).toBe(true));
  it("has no minimum description length", () => expect(validateComplaint({ category: "OTHER", description: "", photos: [] })).toBeNull());
  it("has no maximum description length", () => expect(validateComplaint({ category: "OTHER", description: "x".repeat(10000), photos: [] })).toBeNull());
  for (const category of ["DAMAGED", "MISSING_ITEM", "WRONG_ITEM"]) it(`${category} requires photos`, () => expect(validateComplaint({ category, description: "", photos: [] })).toMatch(/photo/));
  for (const category of ["PACKAGE_MISSING", "ORDER_DELAY", "OTHER"]) it(`${category} keeps photos optional`, () => expect(validateComplaint({ category, description: "", photos: [] })).toBeNull());
  it("allows at most three photos", () => expect(validateComplaint({ category: "OTHER", description: "", photos: Array(4).fill(photo) })).toMatch(/3 photos/));
  it("rejects photos over 2 MB", () => expect(validateComplaint({ category: "OTHER", description: "", photos: [{ ...photo, size: 2 * 1024 * 1024 + 1 }] })).toMatch(/2 MB/));
  it("rejects unsupported formats", () => expect(validateComplaint({ category: "OTHER", description: "", photos: [{ ...photo, type: "image/gif" }] })).toMatch(/JPEG/));
  it("requires real image data", () => expect(validateComplaint({ category: "DAMAGED", description: "", photos: [{ ...photo, dataUrl: "filename.png" }] })).toMatch(/valid image/));
  it("accepts matching image data", () => expect(validateComplaint({ category: "DAMAGED", description: "", photos: [photo] })).toBeNull());
  it("increments persisted reference from 00124", () => { const db = fixture(); const input = { orderId: "ORD-24055", category: "OTHER" as const, description: "", photos: [] }; const a = createComplaint(db, "alice", input, now); const restored = JSON.parse(JSON.stringify(db)); const b = createComplaint(restored, "alice", input, now); expect(a.reference).toBe("CMP-2026-00124"); expect(b.reference).toBe("CMP-2026-00125"); expect(b.status).toBe("SUBMITTED"); expect(b.submittedAt).toBe(now.toISOString()); });
  it("persists unread replies and clears only when viewed", () => { const db = fixture(); const c = createComplaint(db, "alice", { orderId: "ORD-24055", category: "OTHER", description: "", photos: [] }, now); updateComplaint(db, c.id, "RESOLVED", "Replacement arranged", "", "Staff", now); addInternalComplaintNote(db, c.id, "SECRET_NOTE", "Staff", now); expect(getCustomerHistory(db, "alice")[0]?.unread).toBe(true); expect(JSON.stringify(getCustomerHistory(db, "alice"))).not.toContain("SECRET_NOTE"); expect(getCustomerHistory(db, "bob")).toEqual([]); markComplaintSeen(db, "bob", c.id); expect(getCustomerHistory(db, "alice")[0]?.unread).toBe(true); markComplaintSeen(db, "alice", c.id); expect(getCustomerHistory(JSON.parse(JSON.stringify(db)), "alice")[0]?.unread).toBe(false); });
  it("formats AM/PM without a timezone suffix", () => { expect(formatSubmissionTime(now.toISOString())).toMatch(/20 Oct 2026, \d{1,2}:\d{2}:\d{2} (AM|PM)$/); expect(formatSubmissionTime(now.toISOString())).not.toMatch(/GMT|UTC/); });
});
