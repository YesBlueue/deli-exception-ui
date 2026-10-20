import { PRIORITY_CONFIG } from "./config";
import type {
  ExceptionType,
  NormalizedEventType,
  Priority,
  PriorityReason,
  Shipment,
  ShipmentEvent,
} from "./types";

export const ACTIONABLE: NormalizedEventType[] = [
  "DELAYED",
  "INVALID_ADDRESS",
  "DELIVERY_ATTEMPTED",
  "LOST",
  "DAMAGED",
];

export function isActionable(t: NormalizedEventType) {
  return ACTIONABLE.includes(t);
}

export function exceptionTypeFor(t: NormalizedEventType): ExceptionType | null {
  switch (t) {
    case "DELAYED":
      return "DELAYED";
    case "INVALID_ADDRESS":
      return "INVALID_ADDRESS";
    case "DELIVERY_ATTEMPTED":
      return "FAILED_DELIVERY";
    case "LOST":
      return "LOST";
    case "DAMAGED":
      return "DAMAGED";
    default:
      return null;
  }
}

export interface PriorityResult {
  priority: Priority;
  reasons: PriorityReason[];
  missingData: string[];
}

/**
 * Deterministic priority engine. Rules are evaluated in precedence order and
 * the highest priority wins; every matching rule is kept as an audit reason.
 */
export function evaluatePriority(
  shipment: Shipment,
  events: ShipmentEvent[],
  now: Date,
  cfg = PRIORITY_CONFIG,
): PriorityResult {
  const reasons: PriorityReason[] = [];
  const missingData: string[] = [];
  const types = new Set(events.map((e) => e.type));
  const rank: Priority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  let best: Priority = "LOW";
  const bump = (p: Priority) => {
    if (rank.indexOf(p) < rank.indexOf(best)) best = p;
  };

  if (types.has("LOST") || types.has("DAMAGED")) {
    bump("CRITICAL");
    reasons.push({
      rule: "R1_LOST_OR_DAMAGED",
      text: `Carrier reported the shipment as ${types.has("LOST") ? "lost" : "damaged"}.`,
    });
  }

  const delayed = events.filter((e) => e.type === "DELAYED");
  let delayHours: number | null = null;
  if (delayed.length) {
    const timed = delayed.filter((e) => e.eventTime);
    if (!timed.length) {
      missingData.push("Delay event has no carrier timestamp, so delay duration is unknown.");
    } else {
      const first = Math.min(...timed.map((e) => new Date(e.eventTime!).getTime()));
      delayHours = (now.getTime() - first) / 36e5;
    }
    if (shipment.valueMMK === null) missingData.push("Order value is unknown.");
  }

  if (
    delayHours !== null &&
    shipment.valueMMK !== null &&
    shipment.valueMMK >= cfg.highValueMMK &&
    delayHours > cfg.highValueDelayHours
  ) {
    bump("CRITICAL");
    reasons.push({
      rule: "R2_HIGH_VALUE_DELAY",
      text: `High-value order (${shipment.valueMMK.toLocaleString()} MMK ≥ ${cfg.highValueMMK.toLocaleString()} MMK) delayed ${Math.floor(delayHours)}h (> ${cfg.highValueDelayHours}h).`,
    });
  }

  if (types.has("INVALID_ADDRESS")) {
    bump("HIGH");
    reasons.push({ rule: "R3_INVALID_ADDRESS", text: "Carrier flagged the delivery address as invalid." });
  }
  if (types.has("DELIVERY_ATTEMPTED")) {
    bump("HIGH");
    reasons.push({ rule: "R3_FAILED_ATTEMPT", text: "Delivery attempt failed and needs intervention." });
  }

  if (delayHours !== null && delayHours > cfg.delayHours) {
    bump("MEDIUM");
    reasons.push({
      rule: "R4_DELAY_24H",
      text: `Shipment delayed ${Math.floor(delayHours)}h (> ${cfg.delayHours}h).`,
    });
  }

  if (!reasons.length) {
    reasons.push({ rule: "R5_NO_ESCALATION", text: "No escalation rule matched." });
  }

  return { priority: best, reasons, missingData };
}

export function suggestedAction(type: ExceptionType): string {
  switch (type) {
    case "LOST":
      return "Confirm loss with carrier and contact customer";
    case "DAMAGED":
      return "Request damage photos and contact customer";
    case "INVALID_ADDRESS":
      return "Contact the customer to confirm the delivery address";
    case "FAILED_DELIVERY":
      return "Confirm availability and reschedule";
    case "DELAYED":
      return "Notify customer of delay";
  }
}

export function draftMessage(type: ExceptionType, name: string, orderId: string): string {
  const first = name.split(" ")[0];
  switch (type) {
    case "INVALID_ADDRESS":
      return `Hi ${first}, the courier couldn't verify the delivery address for order ${orderId}. Please reply to this message or call our support team to confirm your address, so we can get your parcel to you.`;
    case "FAILED_DELIVERY":
      return `Hi ${first}, the courier tried to deliver order ${orderId} but couldn't reach you. Please let us know a good time and phone number for the next attempt.`;
    case "DELAYED":
      return `Hi ${first}, your order ${orderId} is taking longer than expected with the courier. We're following up and will update you as soon as we hear back.`;
    case "LOST":
      return `Hi ${first}, we're sorry — the courier has reported a problem locating order ${orderId}. We're investigating with them and will contact you with next steps.`;
    case "DAMAGED":
      return `Hi ${first}, the courier reported that order ${orderId} may have been damaged in transit. We're reviewing this and will contact you about next steps.`;
  }
}
