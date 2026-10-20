import { randomToken, uid } from "./engine";
import type { ComplaintCategory, ComplaintStatus, DB } from "./types";
import { COMPLAINT_APP_CATEGORIES, saveComplaint, validateComplaint, type ComplaintPhotoMeta } from "./complaint-app";

export const COMPLAINT_CATEGORIES = COMPLAINT_APP_CATEGORIES;
export const COMPLAINT_STATUSES: Record<ComplaintStatus, string> = { SUBMITTED: "Submitted", INVESTIGATING: "Investigating", RESOLVED: "Resolved", REJECTED: "Rejected" };
function resolveAccess(db: DB, access: string, now = new Date()) {
  const link = db.customerLinks.find((l) => l.access === access);
  if (!link || link.revoked || new Date(link.expiresAt) <= now) return null;
  const shipment = db.shipments.find((s) => s.id === link.shipmentId);
  return shipment ? { link, shipment } : null;
}
/** Customer projection intentionally excludes carrier raw payloads, staff notes and internal workflows. */
export function getCustomerOrder(db: DB, access: string, now = new Date()) {
  const resolved = resolveAccess(db, access, now);
  if (!resolved) return null;
  const { shipment: s, link } = resolved;
  return {
    shipment: { id: s.id, orderId: s.orderId, customerName: s.customerName, status: s.status },
    estimatedDelivery: link.estimatedDelivery,
    complaints: db.complaints.filter((c) => c.shipmentId === s.id).map(({ id, reference, category, description, status, customerResponse, submittedAt, updatedAt }) => ({ id, reference, category, description, status, customerResponse, submittedAt, updatedAt })),
  };
}
export function ensureCustomerLink(db: DB, shipmentId: string, now = new Date()) {
  if (!db.shipments.some((s) => s.id === shipmentId)) return null;
  const existing = db.customerLinks.find((l) => l.shipmentId === shipmentId && !l.revoked && new Date(l.expiresAt) > now);
  if (existing) return existing.access;
  const access = randomToken();
  db.customerLinks.push({ access, shipmentId, revoked: false, expiresAt: new Date(now.getTime() + 168 * 36e5).toISOString(), estimatedDelivery: null });
  return access;
}
export function submitComplaint(db: DB, access: string, input: { category: ComplaintCategory; description: string; photos: ComplaintPhotoMeta[] }, now = new Date()) {
  const r = resolveAccess(db, access, now);
  if (!r) return { ok: false as const, error: "This order link is no longer available." };
  if (r.shipment.status !== "DELIVERED") return { ok: false as const, error: "Complaints are available only after delivery." };
  const error = validateComplaint(input); if (error) return { ok: false as const, error };
  const { reference } = saveComplaint(db, r.shipment.id, r.shipment.customerId, input, now);
  return { ok: true as const, reference };
}
export function updateComplaint(db: DB, id: string, status: ComplaintStatus, customerResponse: string, internalNote: string, actor: string, now = new Date()) {
  const complaint = db.complaints.find((c) => c.id === id);
  if (!complaint || !(status in COMPLAINT_STATUSES)) return { ok: false as const, error: "Complaint not found or invalid status." };
  if ((status === "RESOLVED" || status === "REJECTED") && !customerResponse.trim()) return { ok: false as const, error: "Please add a customer-visible response before closing the complaint." };
  if (complaint.customerResponse !== customerResponse.trim() || ((status === "RESOLVED" || status === "REJECTED") && status !== complaint.status)) complaint.responseVersion++;
  complaint.status = status;
  complaint.customerResponse = customerResponse.trim();
  complaint.updatedAt = now.toISOString();
  db.requestActivity.push({ id: uid("ra"), requestId: id, actor, text: `Complaint status: ${COMPLAINT_STATUSES[status]}. Customer response updated.`, internalNote: internalNote.trim(), at: now.toISOString() });
  return { ok: true as const };
}
/** Owned history uses the same explicit privacy boundary as access-link queries. */
export function getCustomerHistory(db: DB, customerId: string) {
  if (!customerId) return [];
  return db.complaints.filter((c) => c.customerId === customerId && db.shipments.some((s) => s.id === c.shipmentId && s.customerId === customerId)).map(({ id, reference, shipmentId, category, description, photos, status, customerResponse, submittedAt, updatedAt, responseVersion, seenVersion }) => ({ id, reference, orderId: db.shipments.find((s) => s.id === shipmentId)?.orderId ?? "", category, description, photos: structuredClone(photos), status, customerResponse, submittedAt, updatedAt, unread: responseVersion > seenVersion })).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}
export function markComplaintSeen(db: DB, customerId: string, id: string) {
  const c = db.complaints.find((c) => c.id === id && c.customerId === customerId);
  if (c) c.seenVersion = c.responseVersion;
}
export function addInternalComplaintNote(db: DB, id: string, note: string, actor: string, now = new Date()) {
  if (!note.trim() || !db.complaints.some((c) => c.id === id)) return { ok: false as const, error: "Add a note to an existing complaint." };
  db.requestActivity.push({ id: uid("ra"), requestId: id, actor, text: "Internal staff note added.", internalNote: note.trim(), at: now.toISOString() });
  return { ok: true as const };
}