import { describe, expect, it } from "vitest";
import { interpolateTemplate, RESPONSE_TEMPLATES } from "./response-templates";
import { seed } from "./seed";
import { createComplaint } from "./complaint-app";
import { applySupportResponse, getCustomerHistory, markComplaintSeen } from "./customer";
const vars = { customerName: "Mya", orderId: "ORD-1", reference: "CMP-2026-00124", reason: "the seal was intact.", carrier: "GSX" };
describe("response templates", () => {
  it("has six templates", () => expect(RESPONSE_TEMPLATES).toHaveLength(6));
  it("fills every variable", () => { for (const t of RESPONSE_TEMPLATES) expect(interpolateTemplate(t.body, vars)).not.toMatch(/\{\{/); });
  it("substitutes values", () => expect(interpolateTemplate("Hi {{customerName}}, {{orderId}} via {{carrier}}", vars)).toBe("Hi Mya, ORD-1 via GSX"));
});
describe("applySupportResponse", () => {
  const now = new Date("2026-10-20T07:00:00Z");
  function setup() { const db = seed(now.getTime()); const s = db.shipments.find((x) => x.id === "shp_06")!; s.customerId = "alice"; const c = createComplaint(db, "alice", { orderId: s.orderId, category: "OTHER", description: "", photos: [] }, now); return { db, c }; }
  it("saves response and status and marks unread until seen", () => {
    const { db, c } = setup();
    expect(applySupportResponse(db, c.reference, "Refund approved", "RESOLVED", "Staff", now).ok).toBe(true);
    const h = getCustomerHistory(db, "alice")[0]!;
    expect(h.customerResponse).toBe("Refund approved"); expect(h.status).toBe("RESOLVED"); expect(h.unread).toBe(true);
    markComplaintSeen(db, "alice", c.id);
    expect(getCustomerHistory(JSON.parse(JSON.stringify(db)), "alice")[0]!.unread).toBe(false);
  });
  it("rejects an empty message", () => expect(applySupportResponse(setup().db, "CMP-2026-00124", "  ", "RESOLVED", "Staff").ok).toBe(false));
  it("rejects unknown reference", () => expect(applySupportResponse(setup().db, "CMP-0", "Hi", "RESOLVED", "Staff").ok).toBe(false));
});
