import { describe, expect, it } from "vitest";
import { ingestEvent, transition } from "./engine";
import { canTransition } from "./lifecycle";
import { evaluatePriority } from "./priority";
import { seed } from "./seed";
import type { Shipment, ShipmentEvent } from "./types";

const now = new Date("2026-10-20T12:00:00Z");
const ship = (valueMMK: number | null): Shipment => ({
  id: "s", orgId: "o", orderId: "O", customerName: "A B", customerPhone: "1", carrierId: "gsx", trackingId: "T", valueMMK, status: "DELAYED",
  address: { recipient: "", phone: "", street: "", township: "", city: "" }, createdAt: now.toISOString(),
});
const ev = (type: ShipmentEvent["type"], hoursAgo: number | null): ShipmentEvent => ({
  id: Math.random().toString(), shipmentId: "s", carrierId: "gsx", carrierEventId: null, dedupeKey: "", raw: {}, type,
  eventTime: hoursAgo === null ? null : new Date(now.getTime() - hoursAgo * 36e5).toISOString(), ingestedAt: now.toISOString(),
});

describe("priority engine", () => {
  it("lost is critical", () => expect(evaluatePriority(ship(1000), [ev("LOST", 1)], now).priority).toBe("CRITICAL"));
  it("damaged is critical", () => expect(evaluatePriority(ship(1000), [ev("DAMAGED", 1)], now).priority).toBe("CRITICAL"));
  it("order of 100,000 MMK delayed over 72h is critical", () => expect(evaluatePriority(ship(100_000), [ev("DELAYED", 73)], now).priority).toBe("CRITICAL"));
  it("order of 99,999 MMK delayed 73h is only medium", () => expect(evaluatePriority(ship(99_999), [ev("DELAYED", 73)], now).priority).toBe("MEDIUM"));
  it("invalid address is high", () => expect(evaluatePriority(ship(1), [ev("INVALID_ADDRESS", 1)], now).priority).toBe("HIGH"));
  it("failed attempt is high", () => expect(evaluatePriority(ship(1), [ev("DELIVERY_ATTEMPTED", 1)], now).priority).toBe("HIGH"));
  it("delay over 24h is medium", () => expect(evaluatePriority(ship(1), [ev("DELAYED", 25)], now).priority).toBe("MEDIUM"));
  it("delay of 23h is low", () => expect(evaluatePriority(ship(1), [ev("DELAYED", 23)], now).priority).toBe("LOW"));
  it("delay without timestamp reports missing data", () => {
    const r = evaluatePriority(ship(null), [ev("DELAYED", null)], now);
    expect(r.priority).toBe("LOW");
    expect(r.missingData.length).toBe(2);
  });
});

describe("events", () => {
  it("routine scans do not create exceptions", () => {
    const db = seed(now.getTime());
    const before = db.exceptions.length;
    const r = ingestEvent(db, "gsx", { awb: "GSX7732290MM", evt: "TRN", evt_id: "X1" }, now);
    expect(r.ok && r.outcome).toBe("HISTORY_ONLY");
    expect(db.exceptions.length).toBe(before);
  });
  it("duplicate events are ignored", () => {
    const db = seed(now.getTime());
    const raw = { awb: "GSX7732290MM", evt: "DLY", evt_id: "DUP1" };
    ingestEvent(db, "gsx", raw, now);
    const evCount = db.events.length;
    const r = ingestEvent(db, "gsx", raw, now);
    expect(r.ok && r.outcome).toBe("DUPLICATE");
    expect(db.events.length).toBe(evCount);
  });
});

describe("lifecycle", () => {
  it("resolved can only be reopened", () => {
    expect(canTransition("RESOLVED", "IN_PROGRESS")).toBe(false);
    expect(canTransition("RESOLVED", "REOPENED")).toBe(true);
  });
  it("transition requires a reason", () => {
    const db = seed(now.getTime());
    expect(transition(db, db.exceptions[0]!.id, "IN_PROGRESS", " ", "me").ok).toBe(false);
  });
});
