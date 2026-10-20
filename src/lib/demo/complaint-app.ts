/**
 * Standalone customer complaint app — mock data and simulated actions.
 * Self-contained on purpose: the seller demo DB is not touched, and this
 * module can be swapped for API calls to the shared backend later.
 */

export type ComplaintCategory = "DAMAGED" | "MISSING_ITEM" | "WRONG_ITEM" | "PACKAGE_MISSING" | "OTHER";

export const COMPLAINT_APP_CATEGORIES: Record<ComplaintCategory, string> = {
  DAMAGED: "Damaged package",
  MISSING_ITEM: "Missing item",
  WRONG_ITEM: "Wrong item received",
  PACKAGE_MISSING: "Package missing",
  OTHER: "Other",
};

export const COMPLAINT_APP_CONFIG = {
  descriptionMin: 20,
  descriptionMax: 1000,
  maxPhotos: 3,
  maxPhotoBytes: 2 * 1024 * 1024,
  photoTypes: ["image/jpeg", "image/png", "image/webp"],
  lookupDelayMs: 600,
  submitDelayMs: 900,
} as const;

export interface MockOrder {
  orderId: string;
  /** Delivered orders can receive complaints; others cannot. */
  eligible: boolean;
  ineligibleReason?: string;
}

/** Fictional orders for the demo lookup. Unknown IDs are rejected. */
export const MOCK_ORDERS: MockOrder[] = [
  { orderId: "ORD-24081", eligible: true },
  { orderId: "ORD-24077", eligible: true },
  { orderId: "ORD-24063", eligible: true },
  { orderId: "ORD-24090", eligible: false, ineligibleReason: "This order is still on its way. Complaints can be submitted once it has been delivered." },
  { orderId: "ORD-24055", eligible: false, ineligibleReason: "A complaint is already open for this order. Our support team is reviewing it." },
];

export interface ComplaintPhotoMeta {
  name: string;
  size: number;
  type: string;
}

export interface ComplaintRecord {
  reference: string;
  orderId: string;
  category: ComplaintCategory;
  description: string;
  photos: ComplaintPhotoMeta[];
  submittedAt: string;
  status: "NEW";
}

export type LookupResult =
  | { ok: true; orderId: string }
  | { ok: false; reason: "EMPTY" | "UNKNOWN" | "INELIGIBLE"; message: string };

export function normalizeOrderId(raw: string): string {
  return raw.trim().toUpperCase();
}

export function lookupOrder(rawOrderId: string): LookupResult {
  const orderId = normalizeOrderId(rawOrderId);
  if (!orderId) return { ok: false, reason: "EMPTY", message: "Please enter your order ID." };
  const order = MOCK_ORDERS.find((o) => o.orderId === orderId);
  if (!order) return { ok: false, reason: "UNKNOWN", message: "We couldn't find this order ID. Please check the number on your order confirmation and try again." };
  if (!order.eligible) return { ok: false, reason: "INELIGIBLE", message: order.ineligibleReason ?? "This order is not eligible for a complaint right now." };
  return { ok: true, orderId };
}

export function validateComplaint(input: { category: string; description: string; photos: ComplaintPhotoMeta[] }): string | null {
  if (!(input.category in COMPLAINT_APP_CATEGORIES)) return "Please choose a complaint category.";
  const description = input.description.trim();
  if (description.length < COMPLAINT_APP_CONFIG.descriptionMin) return `Please describe what happened in at least ${COMPLAINT_APP_CONFIG.descriptionMin} characters.`;
  if (description.length > COMPLAINT_APP_CONFIG.descriptionMax) return `Please keep the description under ${COMPLAINT_APP_CONFIG.descriptionMax} characters.`;
  if (input.photos.length > COMPLAINT_APP_CONFIG.maxPhotos) return `You can attach up to ${COMPLAINT_APP_CONFIG.maxPhotos} photos.`;
  return null;
}

/** Simulated complaint store for the demo session. */
const complaints: ComplaintRecord[] = [];
let referenceCounter = 124;

export function listComplaints(): readonly ComplaintRecord[] {
  return complaints;
}

export function createComplaint(input: { orderId: string; category: ComplaintCategory; description: string; photos: ComplaintPhotoMeta[] }, now = new Date()): ComplaintRecord {
  const reference = `CMP-2026-${String(referenceCounter++).padStart(5, "0")}`;
  const record: ComplaintRecord = {
    reference,
    orderId: normalizeOrderId(input.orderId),
    category: input.category,
    description: input.description.trim(),
    photos: input.photos,
    submittedAt: now.toISOString(),
    status: "NEW",
  };
  complaints.push(record);
  return record;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Simulated server lookup — replace with an API call later. */
export async function lookupOrderAsync(rawOrderId: string): Promise<LookupResult> {
  await wait(COMPLAINT_APP_CONFIG.lookupDelayMs);
  return lookupOrder(rawOrderId);
}

/** Simulated server submission — replace with an API call later. */
export async function submitComplaintAsync(input: { orderId: string; category: ComplaintCategory; description: string; photos: ComplaintPhotoMeta[] }): Promise<{ ok: true; record: ComplaintRecord } | { ok: false; error: string }> {
  await wait(COMPLAINT_APP_CONFIG.submitDelayMs);
  const error = validateComplaint(input);
  if (error) return { ok: false, error };
  return { ok: true, record: createComplaint(input) };
}
