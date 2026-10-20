import { randomToken, uid } from "./engine";
import type { ComplaintCategory, ComplaintStatus, DB } from "./types";

export const COMPLAINT_CATEGORIES: Record<ComplaintCategory, string> = { DAMAGED: "Damaged package or product", MISSING: "Missing items", WRONG: "Wrong item", OTHER: "Other delivery issue" };
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
    shipment: { id: s.id, orderId: s.orderId, customerName: s.customerName, carrierId: s.carrierId, trackingId: s.trackingId, status: s.status, address: { ...s.address } },
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
export function submitComplaint(db: DB, access: string, input: { category: ComplaintCategory; description: string; photos: { name: string; dataUrl: string }[] }, now = new Date()) {
  const r = resolveAccess(db, access, now);
  if (!r) return { ok: false as const, error: "This order link is no longer available." };
  if (r.shipment.status !== "DELIVERED") return { ok: false as const, error: "Complaints are available only after delivery." };
  if (!(input.category in COMPLAINT_CATEGORIES) || input.description.trim().length < 10 || input.description.length > 2000) return { ok: false as const, error: "Choose a category and describe the issue in 10–2,000 characters." };
  if (input.photos.length > 3) return { ok: false as const, error: "Add up to three photos." };
  const id = uid("cmp");
  const reference = `CMP-${1001 + db.complaints.length}`;
  db.complaints.push({ ...input, description: input.description.trim(), id, reference, shipmentId: r.shipment.id, status: "SUBMITTED", customerResponse: "", submittedAt: now.toISOString(), updatedAt: now.toISOString() });
  db.requestActivity.push({ id: uid("ra"), requestId: id, actor: "Customer", text: "Complaint submitted.", internalNote: "", at: now.toISOString() });
  return { ok: true as const, reference };
}
export function updateComplaint(db: DB, id: string, status: ComplaintStatus, customerResponse: string, internalNote: string, actor: string, now = new Date()) {
  const complaint = db.complaints.find((c) => c.id === id);
  if (!complaint || !(status in COMPLAINT_STATUSES)) return { ok: false as const, error: "Complaint not found or invalid status." };
  if ((status === "RESOLVED" || status === "REJECTED") && !customerResponse.trim()) return { ok: false as const, error: "Please add a customer-visible response before closing the complaint." };
  complaint.status = status;
  complaint.customerResponse = customerResponse.trim();
  complaint.updatedAt = now.toISOString();
  db.requestActivity.push({ id: uid("ra"), requestId: id, actor, text: `Complaint status: ${COMPLAINT_STATUSES[status]}. Customer response updated.`, internalNote: internalNote.trim(), at: now.toISOString() });
  return { ok: true as const };
}