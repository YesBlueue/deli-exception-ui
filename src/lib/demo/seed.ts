import { CURRENT_ORG } from "./config";
import { ingestEvent, reevaluate, transition } from "./engine";
import type { CarrierId, DB, NormalizedEventType, Shipment } from "./types";

export const DB_VERSION = 6;

const GSX: Partial<Record<NormalizedEventType, string>> = { SHIPMENT_CREATED: "CRT", IN_TRANSIT: "TRN", ARRIVED_AT_HUB: "HUB", DELAYED: "DLY", LOST: "LST", DELIVERED: "DLV" };
const IRW: Partial<Record<NormalizedEventType, string>> = { SHIPMENT_CREATED: "LABEL_PRINTED", IN_TRANSIT: "ON_THE_WAY", ARRIVED_AT_HUB: "SORTING_CENTER_IN", DELAYED: "DELAYED_IN_NETWORK", INVALID_ADDRESS: "ADDRESS_UNVERIFIABLE", DAMAGED: "PARCEL_DAMAGED" };
const MGL: Partial<Record<NormalizedEventType, string>> = { SHIPMENT_CREATED: "100", IN_TRANSIT: "200", ARRIVED_AT_HUB: "210", DELAYED: "300", INVALID_ADDRESS: "410", DELIVERY_ATTEMPTED: "420", DELIVERED: "500" };

function raw(c: CarrierId, tn: string, t: NormalizedEventType, at: Date | null, n: number) {
  if (c === "gsx") return { awb: tn, evt: GSX[t], evt_id: `GSX-SEED-${tn}-${n}`, ...(at ? { ts: at.toISOString() } : {}) };
  if (c === "irw") return { tracking_number: tn, status: IRW[t], ...(at ? { occurred_at: Math.floor(at.getTime() / 1000) } : {}) };
  const localAt = at ? new Date(at.getTime() + 390 * 60000) : null;
  const p = (x: number) => String(x).padStart(2, "0");
  return {
    consignment: { no: tn },
    event: { code: Number(MGL[t]), ref: `MSEED${tn}${n}` },
    ...(localAt ? { when: `${localAt.getUTCFullYear()}-${p(localAt.getUTCMonth() + 1)}-${p(localAt.getUTCDate())} ${p(localAt.getUTCHours())}:${p(localAt.getUTCMinutes())}` } : {}),
  };
}

export function seed(nowMs = Date.now()): DB {
  const now = new Date(nowMs);
  const ago = (h: number) => new Date(nowMs - h * 36e5);
  const db: DB = { version: DB_VERSION, shipments: [], events: [], exceptions: [], actions: [], logs: [], customerLinks: [], complaints: [], requestActivity: [], referenceCounter: 124 };

  const mk = (id: string, orderId: string, name: string, phone: string, carrierId: CarrierId, trackingId: string, valueMMK: number | null, street: string, township: string, city: string, createdH: number): Shipment => ({
    id, orgId: CURRENT_ORG, orderId, customerName: name, customerPhone: phone, carrierId, trackingId, valueMMK, status: "CREATED",
    address: { recipient: name, phone, street, township, city }, createdAt: ago(createdH).toISOString(),
  });

  db.shipments.push(
    mk("shp_01", "ORD-24081", "Aye Chan Mon", "09 421 556 018", "gsx", "GSX7732014MM", 185_000, "No. 42, Bo Gyoke Road", "Pabedan", "Yangon", 120),
    mk("shp_02", "ORD-24077", "Kyaw Zin Htet", "09 775 120 334", "irw", "IRW-55810293", 64_500, "Bldg 7, Room 3B, Shwe Taung Kyar St", "Bahan", "Yangon", 60),
    mk("shp_03", "ORD-24090", "Hnin Wai Phyo", "09 254 889 701", "mgl", "MGL00918442", 38_000, "78th St, between 30th & 31st", "Chanayethazan", "Mandalay", 50),
    mk("shp_04", "ORD-24063", "Min Thu Kyaw", "09 448 301 662", "gsx", "GSX7731887MM", 312_000, "Yazathingaha Rd, Block 5", "Zabuthiri", "Naypyitaw", 200),
    mk("shp_05", "ORD-24095", "Su Myat Noe", "09 961 400 275", "irw", "IRW-55810877", 42_000, "No. 11, Inya Myaing Rd", "Kamayut", "Yangon", 70),
    mk("shp_06", "ORD-24055", "Zaw Lin Oo", "09 312 774 590", "mgl", "MGL00917705", 27_500, "35th St, near Zegyo", "Chanayethazan", "Mandalay", 150),
    mk("shp_07", "ORD-24099", "Ei Thandar", "09 885 662 143", "gsx", "GSX7732290MM", 55_000, "No. 9, Kaba Aye Pagoda Rd", "Mayangone", "Yangon", 20),
    mk("shp_08", "ORD-24071", "Thet Paing Soe", "09 503 118 946", "mgl", "MGL00918120", null, "Strand Rd, Unit 14", "Mawlamyine", "Mon State", 90),
    mk("shp_09", "ORD-24068", "Nandar Hlaing", "09 690 237 815", "irw", "IRW-55809966", 128_000, "No. 3, Pyay Rd", "Hlaing", "Yangon", 110),
  );

  let n = 0;
  const ev = (sid: string, t: NormalizedEventType, h: number | null) => {
    const s = db.shipments.find((x) => x.id === sid)!;
    ingestEvent(db, s.carrierId, raw(s.carrierId, s.trackingId, t, h === null ? null : ago(h), n++), h === null ? now : ago(h));
  };

  ev("shp_01", "SHIPMENT_CREATED", 118); ev("shp_01", "IN_TRANSIT", 100); ev("shp_01", "DELAYED", 80); ev("shp_01", "ARRIVED_AT_HUB", 30);
  ev("shp_02", "SHIPMENT_CREATED", 58); ev("shp_02", "IN_TRANSIT", 40); ev("shp_02", "INVALID_ADDRESS", 6);
  ev("shp_03", "SHIPMENT_CREATED", 48); ev("shp_03", "ARRIVED_AT_HUB", 20); ev("shp_03", "DELIVERY_ATTEMPTED", 3);
  ev("shp_04", "SHIPMENT_CREATED", 196); ev("shp_04", "IN_TRANSIT", 170); ev("shp_04", "LOST", 26);
  ev("shp_05", "SHIPMENT_CREATED", 68); ev("shp_05", "IN_TRANSIT", 50); ev("shp_05", "DELAYED", 30);
  ev("shp_06", "SHIPMENT_CREATED", 148); ev("shp_06", "INVALID_ADDRESS", 100); ev("shp_06", "DELIVERED", 40);
  ev("shp_07", "SHIPMENT_CREATED", 18); ev("shp_07", "IN_TRANSIT", 10); ev("shp_07", "ARRIVED_AT_HUB", 2);
  ev("shp_08", "SHIPMENT_CREATED", 88); ev("shp_08", "DELAYED", null);
  ev("shp_09", "SHIPMENT_CREATED", 108); ev("shp_09", "DAMAGED", 9);

  // Re-evaluate everything against "now" so delay durations are current.
  const exc = (sid: string) => db.exceptions.find((x) => x.shipmentId === sid)!;
  for (const x of db.exceptions) reevaluate(db, x.id, now);

  const sys = "Thida Aung (CS rep)";
  transition(db, exc("shp_01").id, "ACTION_REQUIRED", "High-value delay needs customer update.", "system", ago(29));
  transition(db, exc("shp_04").id, "AWAITING_CARRIER", "Loss investigation opened with Golden Swift.", sys, ago(20));
  transition(db, exc("shp_06").id, "RESOLVED", "Customer confirmed address by phone; delivered.", sys, ago(39));
  transition(db, exc("shp_09").id, "IN_PROGRESS", "Requested damage photos from customer.", sys, ago(7));
  transition(db, exc("shp_09").id, "RESOLVED", "Customer accepted partial damage; no further action.", sys, ago(1));
  exc("shp_04").assignee = sys;
  exc("shp_09").assignee = sys;

  db.customerLinks = [
    { access: "preview-K7qp2vXw9LmR4tZa", shipmentId: "shp_02", expiresAt: new Date(nowMs + 168 * 36e5).toISOString(), revoked: false, estimatedDelivery: null },
    { access: "preview-V6nb3rYs8DcM5qWx", shipmentId: "shp_06", expiresAt: new Date(nowMs + 168 * 36e5).toISOString(), revoked: false, estimatedDelivery: null },
    { access: "preview-H9mx4pLa7TzQ2wBc", shipmentId: "shp_07", expiresAt: new Date(nowMs + 168 * 36e5).toISOString(), revoked: false, estimatedDelivery: new Date(nowMs + 24 * 36e5).toISOString() },
  ];
  db.complaints.push({ id: "cmp_demo_01", reference: "CMP-2026-00123", shipmentId: "shp_06", category: "MISSING_ITEM", description: "The bottle arrived, but the extra replacement lid was missing from the parcel.", photos: [], status: "INVESTIGATING", customerResponse: "We are checking the packing record with our dispatch team and will update you shortly.", submittedAt: ago(24).toISOString(), updatedAt: ago(18).toISOString(), responseVersion: 1, seenVersion: 0 });
  db.requestActivity.push({ id: "ra_demo_01", requestId: "cmp_demo_01", actor: "Thida Aung", text: "Complaint moved to investigating. Customer update recorded.", internalNote: "Check warehouse packing sheet. Do not share staff contact details.", at: ago(18).toISOString() });

  return db;
}

