import { carrierRespond, randomToken, uid } from "./engine";
import type { Address, ComplaintCategory, ComplaintStatus, DB } from "./types";

export const COMPLAINT_CATEGORIES: Record<ComplaintCategory, string> = { DAMAGED: "Damaged package or product", MISSING: "Missing items", WRONG: "Wrong item", OTHER: "Other delivery issue" };
export const COMPLAINT_STATUSES: Record<ComplaintStatus, string> = { SUBMITTED: "Submitted", INVESTIGATING: "Investigating", RESOLVED: "Resolved", REJECTED: "Rejected" };
export function validateAddress(a: Address): string | null {
  if (a.recipient.trim().length < 2) return "Please enter a recipient name.";
  if (!/^\+?[0-9 ]{7,15}$/.test(a.phone.trim())) return "Please enter a valid phone number.";
  if (a.street.trim().length < 5 || a.township.trim().length < 2 || a.city.trim().length < 2) return "Please complete your street address, township and city.";
  if ((a.instructions ?? "").length > 200) return "Delivery instructions must be 200 characters or fewer.";
  return null;
}
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
    stages: db.events.filter((e) => e.shipmentId === s.id).map((e) => ({ id: e.id, type: e.type, at: e.eventTime })).sort((a, b) => (a.at ?? "").localeCompare(b.at ?? "")),
    addressRequests: db.corrections.filter((c) => c.shipmentId === s.id).map((c) => ({ id: c.id, address: c.next, status: c.carrierStatus, submittedAt: c.submittedAt })),
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
export function requestAddress(db: DB, access: string, address: Address, now = new Date()) {
  const r = resolveAccess(db, access, now);
  if (!r) return { ok: false as const, error: "This order link is no longer available." };
  if (r.shipment.status === "DELIVERED") return { ok: false as const, error: "Address changes are closed after delivery." };
  const error = validateAddress(address);
  if (error) return { ok: false as const, error };
  if (db.corrections.some((c) => c.shipmentId === r.shipment.id && c.carrierStatus === "PENDING")) return { ok: false as const, error: "An address request is already pending." };
  const id = uid("cor");
  const next = Object.fromEntries(Object.entries(address).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])) as unknown as Address;
  db.corrections.push({ id, shipmentId: r.shipment.id, previous: { ...r.shipment.address }, next, submittedAt: now.toISOString(), carrierStatus: "PENDING", carrierRespondedAt: null });
  db.requestActivity.push({ id: uid("ra"), requestId: id, actor: "Customer", text: "Address request received. Awaiting carrier confirmation.", internalNote: "", at: now.toISOString() });
  return { ok: true as const, id };
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
export function reviewAddress(db: DB, id: string, accept: boolean, note: string, actor: string, now = new Date()) {
  const result = carrierRespond(db, id, accept, now);
  if (result.ok) db.requestActivity.push({ id: uid("ra"), requestId: id, actor, text: `Carrier ${accept ? "accepted" : "rejected"} the address request (simulated).`, internalNote: note.trim(), at: now.toISOString() });
  return result;
}