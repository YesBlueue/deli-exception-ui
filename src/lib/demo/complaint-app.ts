import { COMPLAINT_REFERENCE_YEAR } from "./config";
import { updateComplaint } from "./customer";
import type { Complaint, ComplaintCategory, DB } from "./types";
export type { ComplaintCategory } from "./types";
export const COMPLAINT_APP_CATEGORIES: Record<ComplaintCategory, string> = { DAMAGED: "Damaged package", MISSING_ITEM: "Missing item", WRONG_ITEM: "Wrong item received", PACKAGE_MISSING: "Package missing", ORDER_DELAY: "Order delay", OTHER: "Other" };
export const PHOTO_REQUIRED_CATEGORIES: readonly ComplaintCategory[] = ["DAMAGED", "MISSING_ITEM", "WRONG_ITEM"];
export const photoRequired = (category: ComplaintCategory) => PHOTO_REQUIRED_CATEGORIES.includes(category);
export const COMPLAINT_APP_CONFIG = { maxPhotos: 3, maxPhotoBytes: 2 * 1024 * 1024, photoTypes: ["image/jpeg", "image/png", "image/webp"], lookupDelayMs: 600, submitDelayMs: 900 } as const;
export interface ComplaintPhotoMeta { name: string; size: number; type: string; dataUrl: string }
export interface ComplaintRecord { id: string; reference: string; orderId: string; category: ComplaintCategory; description: string; photos: ComplaintPhotoMeta[]; submittedAt: string; status: Complaint["status"]; customerResponse: string; updatedAt: string; unread: boolean }
export const normalizeOrderId = (raw: string) => raw.trim().toUpperCase();
export type LookupResult = { ok: true; orderId: string } | { ok: false; reason: "EMPTY" | "UNKNOWN" | "INELIGIBLE"; message: string };
export function lookupOrder(db: DB, customerId: string, raw: string): LookupResult {
  const orderId = normalizeOrderId(raw);
  if (!orderId) return { ok: false, reason: "EMPTY", message: "Please enter your order ID." };
  const order = db.shipments.find((s) => s.orderId === orderId && s.customerId === customerId);
  if (!customerId || !order) return { ok: false, reason: "UNKNOWN", message: "We couldn't find an order linked to your account. Check your order confirmation and try again." };
  if (order.status !== "DELIVERED") return { ok: false, reason: "INELIGIBLE", message: "Complaints can only be submitted after delivery." };
  return { ok: true, orderId };
}
export function validateComplaint(input: { category: string; description: string; photos: ComplaintPhotoMeta[] }): string | null {
  if (!Object.hasOwn(COMPLAINT_APP_CATEGORIES, input.category)) return "Please choose a complaint category.";
  if (photoRequired(input.category as ComplaintCategory) && !input.photos.length) return "Please attach at least one photo for a damaged package, missing item or wrong item report.";
  if (input.photos.length > 3) return "You can attach up to 3 photos.";
  for (const photo of input.photos) {
    if (!COMPLAINT_APP_CONFIG.photoTypes.some((type) => type === photo.type)) return "Photos must be JPEG, PNG or WebP images.";
    if (photo.size <= 0 || photo.size > COMPLAINT_APP_CONFIG.maxPhotoBytes) return "Each photo must be 2 MB or smaller.";
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(photo.dataUrl);
    if (!match || match[1] !== photo.type) return "Attach a valid image, not just a filename.";
    const encoded = match[2];
    if (!encoded || encoded.length % 4 !== 0) return "Attach a valid image.";
    const actualSize = encoded.length * 3 / 4 - (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0);
    if (actualSize !== photo.size || actualSize > COMPLAINT_APP_CONFIG.maxPhotoBytes) return "The image data does not match its size.";
    const signature = photo.type === "image/png" ? encoded.startsWith("iVBORw0KGgo") : photo.type === "image/jpeg" ? encoded.startsWith("/9j/") : encoded.startsWith("UklGR");
    if (!signature) return "The file contents must be JPEG, PNG or WebP.";
  }
  return null;
}
export function createComplaint(db: DB, customerId: string, input: { orderId: string; category: ComplaintCategory; description: string; photos: ComplaintPhotoMeta[] }, now = new Date()): Complaint {
  const result = lookupOrder(db, customerId, input.orderId);
  if (!result.ok) throw Error(result.message);
  const error = validateComplaint(input); if (error) throw Error(error);
  const shipment = db.shipments.find((s) => s.orderId === result.orderId && s.customerId === customerId);
  if (!shipment) throw Error("Order not found.");
  return saveComplaint(db, shipment.id, customerId, input, now);
}
export function saveComplaint(db: DB, shipmentId: string, customerId: string | undefined, input: { category: ComplaintCategory; description: string; photos: ComplaintPhotoMeta[] }, now: Date): Complaint {
  const reference = `CMP-${COMPLAINT_REFERENCE_YEAR}-${String(db.referenceCounter++).padStart(5, "0")}`;
  const record: Complaint = { ...input, id: reference, reference, shipmentId, ...(customerId ? { customerId } : {}), description: input.description.trim(), photos: structuredClone(input.photos), status: "SUBMITTED", customerResponse: "", submittedAt: now.toISOString(), updatedAt: now.toISOString(), responseVersion: 0, seenVersion: 0 };
  db.complaints.push(record);
  db.requestActivity.push({ id: `${reference}-submitted`, requestId: record.id, actor: "Customer", text: "Complaint submitted.", internalNote: "", at: now.toISOString() });
  return record;
}
export function formatSubmissionTime(iso: string): string {
  const at = new Date(iso);
  return `${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(at)}, ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hourCycle: "h12" }).format(at)}`;
}/** Sends a staff-approved message to the customer by reference; reuses the shared response/unread rules. */
export function applySupportResponse(db: DB, reference: string, response: string, status: Complaint["status"], actor: string, now = new Date()) {
  if (!response.trim()) return { ok: false as const, error: "Write a message before sending it to the customer." };
  const c = db.complaints.find((x) => x.reference === reference);
  if (!c) return { ok: false as const, error: "Complaint not found." };
  return updateComplaint(db, c.id, status, response, "", actor, now);
}
