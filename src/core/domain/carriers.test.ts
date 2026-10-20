import { describe, expect, it } from "vitest";
import { CARRIERS } from "./carriers";
import { ingestEvent } from "./engine";
import { seed } from "./seed";
describe("carrier normalization", () => {
  it("normalizes Myanmar local time independent of browser zone", () => expect(CARRIERS.mgl.normalize({ consignment: { no: "test" }, event: { code: 300, ref: "id" }, when: "2026-10-20 13:30" }).eventTime).toBe("2026-10-20T07:00:00.000Z"));
  for (const carrierId of ["gsx", "irw", "mgl"] as const) it(`${carrierId} ignores duplicate events idempotently`, () => { const db = seed(); const s = db.shipments.find((s) => s.carrierId === carrierId); if (!s) throw Error("fixture"); const raw = CARRIERS[carrierId].sample("DELAYED", s.trackingId, true); ingestEvent(db, carrierId, raw); const before = db.events.length; const exceptions = db.exceptions.length; const result = ingestEvent(db, carrierId, raw); expect(result.ok && result.outcome).toBe("DUPLICATE"); expect(db.events.length).toBe(before); expect(db.exceptions.length).toBe(exceptions); });
});