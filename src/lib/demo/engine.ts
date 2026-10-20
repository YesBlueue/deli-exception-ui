/**
 * Pure business logic over the in-browser demo DB. In a production build this
 * would run server-side; in this prototype it runs locally and is simulated.
 */
import { CARRIERS } from "./carriers";
import { CURRENT_ORG, PRIORITY_CONFIG } from "./config";
import { canTransition } from "./lifecycle";
import { evaluatePriority, exceptionTypeFor, isActionable } from "./priority";
import type {
  CarrierId,
  DB,
  NormalizedEventType,
  ShipmentStatus,
  WorkflowStatus,
} from "./types";

export const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;

export function randomToken() {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const STATUS_FOR: Record<NormalizedEventType, ShipmentStatus> = {
  SHIPMENT_CREATED: "CREATED",
  IN_TRANSIT: "IN_TRANSIT",
  ARRIVED_AT_HUB: "AT_HUB",
  DELAYED: "DELAYED",
  INVALID_ADDRESS: "ADDRESS_ISSUE",
  DELIVERY_ATTEMPTED: "ATTEMPTED",
  DELIVERED: "DELIVERED",
  LOST: "LOST",
  DAMAGED: "DAMAGED",
};

export type IngestResult =
  | { ok: true; outcome: "DUPLICATE" | "HISTORY_ONLY" | "EXCEPTION_CREATED" | "EXCEPTION_UPDATED" | "EXCEPTION_REOPENED"; exceptionId?: string; message: string }
  | { ok: false; error: string };

export function ingestEvent(db: DB, carrierId: CarrierId, raw: Record<string, unknown>, now = new Date()): IngestResult {
  const adapter = CARRIERS[carrierId];
  let n;
  try {
    n = adapter.normalize(raw);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const shipment = db.shipments.find((s) => s.trackingId === n.trackingId && s.carrierId === carrierId);
  if (!shipment) return { ok: false, error: `No ${adapter.name} shipment with tracking ID ${n.trackingId}.` };

  const dedupeKey = n.carrierEventId
    ? `${carrierId}:${n.carrierEventId}`
    : `${carrierId}:${n.trackingId}:${n.type}:${n.eventTime ?? "no-time"}`;
  if (db.events.some((e) => e.dedupeKey === dedupeKey)) {
    db.logs.push({ id: uid("log"), exceptionId: null, actor: "system", kind: "AUTOMATION", reason: `Duplicate event ignored (${dedupeKey}).`, at: now.toISOString() });
    return { ok: true, outcome: "DUPLICATE", message: "Duplicate event ignored — no new timeline entry or exception." };
  }

  db.events.push({
    id: uid("evt"),
    shipmentId: shipment.id,
    carrierId,
    carrierEventId: n.carrierEventId,
    dedupeKey,
    raw,
    type: n.type,
    eventTime: n.eventTime,
    ingestedAt: now.toISOString(),
  });
  shipment.status = STATUS_FOR[n.type];

  const existing = db.exceptions.find((x) => x.shipmentId === shipment.id);

  if (!isActionable(n.type)) {
    if (existing) reevaluate(db, existing.id, now);
    return { ok: true, outcome: "HISTORY_ONLY", message: "Routine scan added to shipment history only." };
  }

  const type = exceptionTypeFor(n.type)!;
  if (!existing) {
    const id = uid("exc");
    db.exceptions.push({
      id,
      orgId: CURRENT_ORG,
      shipmentId: shipment.id,
      type,
      priority: "LOW",
      reasons: [],
      missingData: [],
      evaluatedAt: now.toISOString(),
      workflowStatus: "NEW",
      summary: "",
      openedAt: now.toISOString(),
      resolvedAt: null,
      assignee: null,
    });
    reevaluate(db, id, now);
    db.logs.push({ id: uid("log"), exceptionId: id, actor: "system", kind: "TRANSITION", from: null, to: "NEW", reason: `Opened from ${adapter.name} event ${n.type}.`, at: now.toISOString() });
    return { ok: true, outcome: "EXCEPTION_CREATED", exceptionId: id, message: "New actionable exception created." };
  }

  existing.type = type;
  reevaluate(db, existing.id, now);
  if (existing.workflowStatus === "RESOLVED" && PRIORITY_CONFIG.reopenResolvedOnNewEvent) {
    log(db, existing.id, "system", "RESOLVED", "REOPENED", `New carrier event ${n.type} reopened the exception.`, now);
    existing.workflowStatus = "REOPENED";
    existing.resolvedAt = null;
    return { ok: true, outcome: "EXCEPTION_REOPENED", exceptionId: existing.id, message: "Resolved exception was reopened by the new event." };
  }
  return { ok: true, outcome: "EXCEPTION_UPDATED", exceptionId: existing.id, message: "Existing exception updated and re-prioritised." };
}

export function reevaluate(db: DB, exceptionId: string, now = new Date()) {
  const x = db.exceptions.find((e) => e.id === exceptionId)!;
  const s = db.shipments.find((sh) => sh.id === x.shipmentId)!;
  const evs = db.events.filter((e) => e.shipmentId === s.id);
  const r = evaluatePriority(s, evs, now);
  const changed = r.priority !== x.priority;
  x.priority = r.priority;
  x.reasons = r.reasons;
  x.missingData = r.missingData;
  x.evaluatedAt = now.toISOString();
  x.summary = summarize(x.type, s.carrierId);
  if (changed) {
    db.logs.push({ id: uid("log"), exceptionId, actor: "priority-engine", kind: "AUTOMATION", reason: `Priority set to ${r.priority} by ${r.reasons.map((x) => x.rule).join(", ")}.`, at: now.toISOString() });
  }
}

function summarize(type: string, carrier: CarrierId) {
  const c = CARRIERS[carrier].name;
  return {
    DELAYED: `${c} reports the parcel is delayed in its network.`,
    INVALID_ADDRESS: `${c} could not verify the delivery address.`,
    FAILED_DELIVERY: `${c} attempted delivery but the recipient was unavailable.`,
    LOST: `${c} reports the parcel as missing.`,
    DAMAGED: `${c} reports the parcel was damaged in transit.`,
  }[type]!;
}

function log(db: DB, exceptionId: string, actor: string, from: WorkflowStatus, to: WorkflowStatus, reason: string, now: Date) {
  db.logs.push({ id: uid("log"), exceptionId, actor, kind: "TRANSITION", from, to, reason, at: now.toISOString() });
}

export function transition(db: DB, exceptionId: string, to: WorkflowStatus, reason: string, actor: string, now = new Date()) {
  const x = db.exceptions.find((e) => e.id === exceptionId);
  if (!x) return { ok: false as const, error: "Exception not found." };
  if (!reason.trim()) return { ok: false as const, error: "A reason is required." };
  if (!canTransition(x.workflowStatus, to)) return { ok: false as const, error: `Cannot move from ${x.workflowStatus} to ${to}.` };
  log(db, x.id, actor, x.workflowStatus, to, reason.trim(), now);
  x.workflowStatus = to;
  x.resolvedAt = to === "RESOLVED" ? now.toISOString() : null;
  return { ok: true as const };
}
