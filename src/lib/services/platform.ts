/** Browser adapters only. Replace these adapters with hosted queries during migration. */
import { mutate, readPlatformSnapshot } from "./demo-store";
import { createComplaint, lookupOrder, COMPLAINT_APP_CONFIG, type ComplaintCategory, type ComplaintPhotoMeta } from "@/lib/demo/complaint-app";
import type { CustomerIdentity } from "@/lib/demo/customer-auth";
export { useDB as usePlatformData, mutate as updatePlatformData, resetDemo } from "./demo-store";
export { getCustomerOrder, getCustomerHistory, markComplaintSeen, ensureCustomerLink, submitComplaint, updateComplaint, addInternalComplaintNote } from "@/lib/demo/customer";
export { COMPLAINT_APP_CATEGORIES, COMPLAINT_APP_CONFIG, formatSubmissionTime, photoRequired, validateComplaint } from "@/lib/demo/complaint-app";
export type { ComplaintCategory, ComplaintRecord } from "@/lib/demo/complaint-app";
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
/** Each simulated identity receives its own fictional orders, never another account's rows. */
export function ensureDemoOrders(identity: CustomerIdentity) {
  mutate((db) => {
    if (db.shipments.some((s) => s.customerId === identity.id)) return;
    const source = db.shipments.find((s) => s.id === "shp_06");
    if (!source) throw Error("Demo seed is missing.");
    for (const [orderId, status] of [["ORD-24081", "DELIVERED"], ["ORD-24077", "DELIVERED"], ["ORD-24063", "DELIVERED"], ["ORD-24090", "IN_TRANSIT"], ["ORD-24055", "DELIVERED"]] as const) {
      db.shipments.push({ ...structuredClone(source), id: `${identity.id}:${orderId}`, customerId: identity.id, customerName: identity.name, customerPhone: "", orderId, status, trackingId: `DEMO:${identity.id}:${orderId}` });
    }
  });
}
export async function lookupOrderAsync(customerId: string, rawOrderId: string) {
  await wait(COMPLAINT_APP_CONFIG.lookupDelayMs);
  const db = readPlatformSnapshot();
  if (!db) throw Error("Demo order lookup is only available in a browser.");
  return lookupOrder(db, customerId, rawOrderId);
}
export async function submitComplaintAsync(customerId: string, input: { orderId: string; category: ComplaintCategory; description: string; photos: ComplaintPhotoMeta[] }) {
  await wait(COMPLAINT_APP_CONFIG.submitDelayMs);
  try {
    const saved = await (typeof navigator !== "undefined" && navigator.locks ? navigator.locks.request("resolveiq-complaint-save", () => mutate((db) => createComplaint(db, customerId, input))) : Promise.resolve(mutate((db) => createComplaint(db, customerId, input))));
    return { ok: true as const, record: saved };
  } catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : "Could not save this complaint. Try fewer or smaller photos." }; }
}