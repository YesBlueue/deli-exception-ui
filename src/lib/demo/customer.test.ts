import { describe, expect, it } from "vitest";
import { getCustomerOrder, submitComplaint, updateComplaint } from "./customer";
import { seed } from "./seed";
const now = new Date("2026-10-20T12:00:00Z");
const transit = "preview-K7qp2vXw9LmR4tZa";
const delivered = "preview-V6nb3rYs8DcM5qWx";
const complaint = { category: "DAMAGED" as const, description: "The bottle was broken when it arrived.", photos: [] };
describe("customer portal rules", () => {
  it("does not accept guessable order IDs as access", () => expect(getCustomerOrder(seed(now.getTime()), "ORD-24055", now)).toBeNull());
  it("rejects expired access", () => { const db = seed(now.getTime()); for (const l of db.customerLinks) l.expiresAt = now.toISOString(); expect(getCustomerOrder(db, transit, now)).toBeNull(); });
  it("rejects revoked access", () => { const db = seed(now.getTime()); for (const l of db.customerLinks) l.revoked = true; expect(getCustomerOrder(db, transit, now)).toBeNull(); });
  it("prevents complaints before delivery", () => expect(submitComplaint(seed(now.getTime()), transit, complaint, now).ok).toBe(false));
  it("keeps complaint and tracking statuses separate", () => { const db = seed(now.getTime()); expect(submitComplaint(db, delivered, complaint, now).ok).toBe(true); const c = db.complaints.at(-1); if (!c) throw Error("fixture"); updateComplaint(db, c.id, "RESOLVED", "Replacement arranged.", "private", "Staff", now); expect(c.status).toBe("RESOLVED"); expect(db.shipments.find((s) => s.id === "shp_06")?.status).toBe("DELIVERED"); });
  it("never projects internal staff notes to customers", () => { const db = seed(now.getTime()); updateComplaint(db, "cmp_demo_01", "INVESTIGATING", "We are checking.", "PRIVATE_STAFF_NOTE", "Staff", now); const order = getCustomerOrder(db, delivered, now); expect(order?.complaints[0]?.customerResponse).toBe("We are checking."); expect(JSON.stringify(order)).not.toContain("PRIVATE_STAFF_NOTE"); });
  it("never projects shipment events or tracking data to customers", () => { const order = getCustomerOrder(seed(now.getTime()), delivered, now); expect(order && "stages" in order).toBe(false); expect(JSON.stringify(order)).not.toContain("trackingId"); });
});
