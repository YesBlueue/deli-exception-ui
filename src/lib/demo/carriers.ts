import type { CarrierId, NormalizedEventType } from "./types";

export interface CarrierAdapter {
  id: CarrierId;
  name: string;
  /** Build a sample raw payload in this carrier's own format */
  sample(type: NormalizedEventType, trackingId: string, withTimestamp: boolean): Record<string, unknown>;
  normalize(raw: Record<string, unknown>): {
    type: NormalizedEventType;
    carrierEventId: string | null;
    eventTime: string | null;
    trackingId: string;
  };
}

const rid = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const invert = <K extends string, V extends string>(m: Record<K, V>) =>
  Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k])) as Record<V, K>;

// Golden Swift Express: short codes, ISO timestamps
const GSX: Record<NormalizedEventType, string> = {
  SHIPMENT_CREATED: "CRT",
  IN_TRANSIT: "TRN",
  ARRIVED_AT_HUB: "HUB",
  DELAYED: "DLY",
  INVALID_ADDRESS: "BAD",
  DELIVERY_ATTEMPTED: "ATT",
  DELIVERED: "DLV",
  LOST: "LST",
  DAMAGED: "DMG",
};
// Irrawaddy Parcel: verbose status strings, epoch seconds
const IRW: Record<NormalizedEventType, string> = {
  SHIPMENT_CREATED: "LABEL_PRINTED",
  IN_TRANSIT: "ON_THE_WAY",
  ARRIVED_AT_HUB: "SORTING_CENTER_IN",
  DELAYED: "DELAYED_IN_NETWORK",
  INVALID_ADDRESS: "ADDRESS_UNVERIFIABLE",
  DELIVERY_ATTEMPTED: "RECIPIENT_UNAVAILABLE",
  DELIVERED: "HANDED_OVER",
  LOST: "MISSING_PARCEL",
  DAMAGED: "PARCEL_DAMAGED",
};
// Mingala Courier: numeric codes, "YYYY-MM-DD HH:mm" local strings
const MGL: Record<NormalizedEventType, string> = {
  SHIPMENT_CREATED: "100",
  IN_TRANSIT: "200",
  ARRIVED_AT_HUB: "210",
  DELAYED: "300",
  INVALID_ADDRESS: "410",
  DELIVERY_ATTEMPTED: "420",
  DELIVERED: "500",
  LOST: "910",
  DAMAGED: "920",
};

export const CARRIERS: Record<CarrierId, CarrierAdapter> = {
  gsx: {
    id: "gsx",
    name: "Golden Swift Express",
    sample: (t, tn, ts) => ({ awb: tn, evt: GSX[t], evt_id: `GSX-${rid()}`, ...(ts ? { ts: new Date().toISOString() } : {}) }),
    normalize: (r) => ({
      type: invert(GSX)[String(r.evt)] ?? fail(r.evt),
      carrierEventId: (r.evt_id as string) ?? null,
      eventTime: r.ts ? new Date(String(r.ts)).toISOString() : null,
      trackingId: String(r.awb),
    }),
  },
  irw: {
    id: "irw",
    name: "Irrawaddy Parcel",
    sample: (t, tn, ts) => ({
      tracking_number: tn,
      status: IRW[t],
      ...(ts ? { occurred_at: Math.floor(Date.now() / 1000) } : {}),
    }),
    normalize: (r) => ({
      type: invert(IRW)[String(r.status)] ?? fail(r.status),
      carrierEventId: null, // this carrier sends no event IDs → fallback dedupe key
      eventTime: r.occurred_at ? new Date(Number(r.occurred_at) * 1000).toISOString() : null,
      trackingId: String(r.tracking_number),
    }),
  },
  mgl: {
    id: "mgl",
    name: "Mingala Courier",
    sample: (t, tn, ts) => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      return {
        consignment: { no: tn },
        event: { code: Number(MGL[t]), ref: `M${rid()}` },
        ...(ts ? { when: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}` } : {}),
      };
    },
    normalize: (r) => {
      const ev = r.event as { code: number; ref?: string };
      return {
        type: invert(MGL)[String(ev?.code)] ?? fail(ev?.code),
        carrierEventId: ev?.ref ?? null,
        eventTime: r.when ? new Date(String(r.when).replace(" ", "T")).toISOString() : null,
        trackingId: String((r.consignment as { no: string })?.no),
      };
    },
  },
};

function fail(v: unknown): never {
  throw new Error(`Unknown carrier event code: ${String(v)}`);
}

export const EVENT_LABEL: Record<NormalizedEventType, string> = {
  SHIPMENT_CREATED: "Shipment created",
  IN_TRANSIT: "In transit",
  ARRIVED_AT_HUB: "Arrived at hub",
  DELAYED: "Delayed",
  INVALID_ADDRESS: "Invalid address",
  DELIVERY_ATTEMPTED: "Delivery attempted",
  DELIVERED: "Delivered",
  LOST: "Lost",
  DAMAGED: "Damaged",
};
