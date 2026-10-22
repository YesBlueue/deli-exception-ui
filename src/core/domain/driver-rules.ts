/** Structured driver inputs; free text never determines operational decisions. */
export const ATTEMPT_CATEGORIES = {
  CUSTOMER_UNAVAILABLE: "Customer unavailable",
  ADDRESS_PROBLEM: "Incorrect or incomplete address",
  PACKAGE_REFUSED: "Package refused",
  OTHER_ATTEMPT: "Other attempt problem",
} as const;
export const CONDITION_CATEGORIES = {
  CONGESTION: "Congestion",
  ROAD_CLOSURE: "Road closure",
  VEHICLE_TROUBLE: "Vehicle trouble",
  SEVERE_WEATHER: "Severe weather",
} as const;
export const DELAY_TEMPLATE =
  "Your delivery may be delayed. We’re sorry for the inconvenience. We’ll share an update here when more information is available.";
export const IMPACT_RULE_VERSION = "driver-impact-v1";
export interface AssignmentInterval {
  driver_id: string;
  delivery_id: string;
  valid_from: string;
  valid_to: string | null;
}
export function assignedAt(a: AssignmentInterval, driver: string, occurredAt: string) {
  const t = Date.parse(occurredAt);
  return (
    a.driver_id === driver &&
    Date.parse(a.valid_from) <= t &&
    (a.valid_to === null || t < Date.parse(a.valid_to))
  );
}
/** Mirrors SQL impact_reason. Authorization/selection remain database-enforced. */
export function impactReason(
  input: {
    assignmentCount: number;
    sourceUpdatedAt: string | null;
    sourceStatus: string;
    customerCount: number;
  },
  now: number,
) {
  if (input.assignmentCount !== 1) return "PENDING_ASSIGNMENT";
  const sourceTime = Date.parse(input.sourceUpdatedAt ?? "");
  if (!Number.isFinite(sourceTime) || sourceTime > now || now - sourceTime > 48 * 36e5)
    return "PENDING_SOURCE";
  if (["DELIVERED", "CANCELLED", "RETURNED"].includes(input.sourceStatus))
    return "EXCLUDED_COMPLETE";
  if (!["IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(input.sourceStatus)) return "PENDING_SOURCE";
  if (input.customerCount === 0) return "PENDING_CUSTOMER";
  if (input.customerCount !== 1) return "MANUAL_RECIPIENT_REVIEW";
  return "ELIGIBLE";
}
